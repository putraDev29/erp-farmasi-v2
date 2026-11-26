package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"farmasi/backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type StockMutationParams struct {
	CompanyID    uuid.UUID
	BranchID     uuid.UUID
	WarehouseID  uuid.UUID
	ProductID    uuid.UUID
	DocType      string
	DocNo        string
	MovementType string // "IN" or "OUT"
	Qty          float64
	UnitCost     float64
	BatchNumber  string
	ExpiredDate  *time.Time
	Notes        string
	CreatedBy    uuid.UUID
}

type DeductedBatchResult struct {
	BatchNumber string
	ExpiredDate *time.Time
	Qty         float64
	CostPrice   float64
}

// GetAvailableBatchesFEFO retrieves active batches ordered by FEFO (earliest expiry first)
func GetAvailableBatchesFEFO(db *gorm.DB, warehouseID, productID uuid.UUID) ([]models.ProductBatch, error) {
	var batches []models.ProductBatch
	err := db.Where("warehouse_id = ? AND product_id = ? AND current_qty > 0", warehouseID, productID).
		Order("expired_date ASC, created_at ASC").
		Find(&batches).Error
	return batches, err
}

// MutateStockWithBatches performs concurrency-safe stock updates with moving average costing,
// batch management, and strict FEFO (First Expired, First Out) deduction for pharmacy compliance.
// It returns the updated StockBalance and the list of deducted batches (with quantities and EDs).
func MutateStockWithBatches(tx *gorm.DB, params StockMutationParams) (*models.StockBalance, []DeductedBatchResult, error) {
	if params.Qty <= 0 {
		return nil, nil, errors.New("kuantitas mutasi harus lebih besar dari 0")
	}

	var deductedBatches []DeductedBatchResult
	var balance models.StockBalance
	// Lock the stock balance row
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("warehouse_id = ? AND product_id = ?", params.WarehouseID, params.ProductID).
		First(&balance).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if params.MovementType == "OUT" {
				return nil, nil, fmt.Errorf("stok tidak mencukupi di gudang ini (stok 0)")
			}
			// Create new record for IN
			balance = models.StockBalance{
				WarehouseID:  params.WarehouseID,
				ProductID:    params.ProductID,
				Qty:          params.Qty,
				ReservedQty:  0,
				AvailableQty: params.Qty,
				AvgCost:      params.UnitCost,
				BatchNumber:  params.BatchNumber,
				ExpiredDate:  params.ExpiredDate,
			}
			if err := tx.Create(&balance).Error; err != nil {
				return nil, nil, err
			}
		} else {
			return nil, nil, err
		}
	} else {
		// Existing balance
		if params.MovementType == "IN" {
			newQty := balance.Qty + params.Qty
			// Calculate moving average cost
			totalOldVal := balance.Qty * balance.AvgCost
			totalNewVal := params.Qty * params.UnitCost
			if newQty > 0 {
				balance.AvgCost = (totalOldVal + totalNewVal) / newQty
			}
			balance.Qty = newQty
			balance.AvailableQty = balance.Qty - balance.ReservedQty
			if params.BatchNumber != "" {
				balance.BatchNumber = params.BatchNumber
			}
			if params.ExpiredDate != nil {
				balance.ExpiredDate = params.ExpiredDate
			}
		} else if params.MovementType == "OUT" {
			if balance.AvailableQty < params.Qty {
				return nil, nil, fmt.Errorf("stok tidak mencukupi (Tersedia: %.2f, Diminta: %.2f)", balance.AvailableQty, params.Qty)
			}
			balance.Qty -= params.Qty
			balance.AvailableQty = balance.Qty - balance.ReservedQty
		}

		if err := tx.Save(&balance).Error; err != nil {
			return nil, nil, err
		}
	}

	// ========================================================
	// FEFO (First Expired, First Out) BATCH LOGIC
	// ========================================================
	if params.MovementType == "IN" {
		// If inbound with batch info, record into ProductBatch
		batchNo := params.BatchNumber
		if batchNo == "" {
			batchNo = balance.BatchNumber
		}
		expDate := params.ExpiredDate
		if expDate == nil {
			expDate = balance.ExpiredDate
		}
		if expDate == nil {
			defaultExp := time.Now().AddDate(2, 0, 0)
			expDate = &defaultExp
		}

		if batchNo != "" {
			var existingBatch models.ProductBatch
			errBatch := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("warehouse_id = ? AND product_id = ? AND batch_number = ?", params.WarehouseID, params.ProductID, batchNo).
				First(&existingBatch).Error

			if errBatch == nil {
				existingBatch.CurrentQty += params.Qty
				existingBatch.InitialQty += params.Qty
				if expDate != nil {
					existingBatch.ExpiredDate = *expDate
				}
				tx.Save(&existingBatch)
			} else {
				newBatch := models.ProductBatch{
					CompanyID:   params.CompanyID,
					BranchID:    params.BranchID,
					WarehouseID: params.WarehouseID,
					ProductID:   params.ProductID,
					BatchNumber: batchNo,
					ExpiredDate: *expDate,
					InitialQty:  params.Qty,
					CurrentQty:  params.Qty,
					CostPrice:   params.UnitCost,
					DocNo:       params.DocNo,
				}
				tx.Create(&newBatch)
			}
		}

		// Record StockMovement
		movement := models.StockMovement{
			CompanyID:    params.CompanyID,
			BranchID:     params.BranchID,
			WarehouseID:  params.WarehouseID,
			ProductID:    params.ProductID,
			DocType:      params.DocType,
			DocNo:        params.DocNo,
			MovementType: params.MovementType,
			Qty:          params.Qty,
			CostPerUnit:  params.UnitCost,
			TotalCost:    params.Qty * params.UnitCost,
			BalanceAfter: balance.Qty,
			BatchNumber:  batchNo,
			ExpiredDate:  expDate,
			Notes:        params.Notes,
			CreatedBy:    params.CreatedBy,
			CreatedAt:    time.Now(),
		}
		tx.Create(&movement)

	} else if params.MovementType == "OUT" {
		// Outbound: Deduct batches following target batch (if chosen by ED) first, or FEFO (Earliest Expired First)
		var batches []models.ProductBatch
		qBatch := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("warehouse_id = ? AND product_id = ? AND current_qty > 0", params.WarehouseID, params.ProductID)
		if params.BatchNumber != "" {
			qBatch = qBatch.Order(clause.Expr{
				SQL:  "CASE WHEN batch_number = ? THEN 0 ELSE 1 END, expired_date ASC, created_at ASC",
				Vars: []interface{}{params.BatchNumber},
			})
		} else {
			qBatch = qBatch.Order("expired_date ASC, created_at ASC")
		}
		qBatch.Find(&batches)

		// Self-healing fallback: if no batches found directly on product_id,
		// check if batches exist under related/original product_id (e.g. copied/duplicated or code match)
		if len(batches) == 0 {
			var p models.Product
			if tx.Unscoped().First(&p, params.ProductID).Error == nil {
				cleanCode := strings.TrimSuffix(p.Code, "-COPY")
				var relatedProd models.Product
				if tx.Unscoped().Where("(code = ? OR code = ?) AND id != ?", cleanCode, p.Code+"-COPY", params.ProductID).First(&relatedProd).Error == nil {
					qFallback := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
						Where("warehouse_id = ? AND product_id = ? AND current_qty > 0", params.WarehouseID, relatedProd.ID)
					if params.BatchNumber != "" {
						qFallback = qFallback.Order(clause.Expr{
							SQL:  "CASE WHEN batch_number = ? THEN 0 ELSE 1 END, expired_date ASC, created_at ASC",
							Vars: []interface{}{params.BatchNumber},
						})
					} else {
						qFallback = qFallback.Order("expired_date ASC, created_at ASC")
					}
					qFallback.Find(&batches)
					if len(batches) > 0 {
						// Auto-migrate orphaned batches to the active product ID
						tx.Model(&models.ProductBatch{}).Where("product_id = ?", relatedProd.ID).Update("product_id", params.ProductID)
					}
				}
			}
		}

		remainingQtyToDeduct := params.Qty

		for i := range batches {
			if remainingQtyToDeduct <= 0 {
				break
			}
			b := &batches[i]
			takeQty := b.CurrentQty
			if takeQty > remainingQtyToDeduct {
				takeQty = remainingQtyToDeduct
			}

			b.CurrentQty -= takeQty
			tx.Save(b)

			remainingQtyToDeduct -= takeQty
			expCopy := b.ExpiredDate
			deductedBatches = append(deductedBatches, DeductedBatchResult{
				BatchNumber: b.BatchNumber,
				ExpiredDate: &expCopy,
				Qty:         takeQty,
				CostPrice:   b.CostPrice,
			})

			// Record StockMovement per batch
			tx.Create(&models.StockMovement{
				CompanyID:    params.CompanyID,
				BranchID:     params.BranchID,
				WarehouseID:  params.WarehouseID,
				ProductID:    params.ProductID,
				DocType:      params.DocType,
				DocNo:        params.DocNo,
				MovementType: "OUT",
				Qty:          takeQty,
				CostPerUnit:  params.UnitCost,
				TotalCost:    takeQty * params.UnitCost,
				BalanceAfter: balance.Qty + remainingQtyToDeduct, // Running balance reflection
				BatchNumber:  b.BatchNumber,
				ExpiredDate:  &expCopy,
				Notes:        fmt.Sprintf("%s (FEFO Batch: %s, ED: %s)", params.Notes, b.BatchNumber, b.ExpiredDate.Format("02/01/2006")),
				CreatedBy:    params.CreatedBy,
				CreatedAt:    time.Now(),
			})
		}

		// If remaining qty could not be matched by explicit ProductBatch records (e.g. legacy stock)
		if remainingQtyToDeduct > 0 {
			batchNo := balance.BatchNumber
			if batchNo == "" {
				batchNo = "DEFAULT"
			}
			deductedBatches = append(deductedBatches, DeductedBatchResult{
				BatchNumber: batchNo,
				ExpiredDate: balance.ExpiredDate,
				Qty:         remainingQtyToDeduct,
				CostPrice:   params.UnitCost,
			})
			tx.Create(&models.StockMovement{
				CompanyID:    params.CompanyID,
				BranchID:     params.BranchID,
				WarehouseID:  params.WarehouseID,
				ProductID:    params.ProductID,
				DocType:      params.DocType,
				DocNo:        params.DocNo,
				MovementType: "OUT",
				Qty:          remainingQtyToDeduct,
				CostPerUnit:  params.UnitCost,
				TotalCost:    remainingQtyToDeduct * params.UnitCost,
				BalanceAfter: balance.Qty,
				BatchNumber:  batchNo,
				ExpiredDate:  balance.ExpiredDate,
				Notes:        params.Notes,
				CreatedBy:    params.CreatedBy,
				CreatedAt:    time.Now(),
			})
		}

		// Update StockBalance header to point to next available FEFO batch
		var nextEarliest models.ProductBatch
		if errNext := tx.Where("warehouse_id = ? AND product_id = ? AND current_qty > 0", params.WarehouseID, params.ProductID).
			Order("expired_date ASC, created_at ASC").
			First(&nextEarliest).Error; errNext == nil {
			balance.BatchNumber = nextEarliest.BatchNumber
			expCopy := nextEarliest.ExpiredDate
			balance.ExpiredDate = &expCopy
			tx.Save(&balance)
		}
	}

	return &balance, deductedBatches, nil
}

// MutateStock is a backward-compatible wrapper around MutateStockWithBatches.
func MutateStock(tx *gorm.DB, params StockMutationParams) (*models.StockBalance, error) {
	bal, _, err := MutateStockWithBatches(tx, params)
	return bal, err
}
