package services

import (
	"errors"
	"fmt"
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

// MutateStock performs concurrency-safe stock updates with moving average costing,
// batch management, and strict FEFO (First Expired, First Out) deduction for pharmacy compliance.
func MutateStock(tx *gorm.DB, params StockMutationParams) (*models.StockBalance, error) {
	if params.Qty <= 0 {
		return nil, errors.New("kuantitas mutasi harus lebih besar dari 0")
	}

	var balance models.StockBalance
	// Lock the stock balance row
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("warehouse_id = ? AND product_id = ?", params.WarehouseID, params.ProductID).
		First(&balance).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if params.MovementType == "OUT" {
				return nil, fmt.Errorf("stok tidak mencukupi di gudang ini (stok 0)")
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
				return nil, err
			}
		} else {
			return nil, err
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
				return nil, fmt.Errorf("stok tidak mencukupi (Tersedia: %.2f, Diminta: %.2f)", balance.AvailableQty, params.Qty)
			}
			balance.Qty -= params.Qty
			balance.AvailableQty = balance.Qty - balance.ReservedQty
		}

		if err := tx.Save(&balance).Error; err != nil {
			return nil, err
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
		// Outbound: Deduct batches following FEFO (Earliest Expired First) or target batch
		var batches []models.ProductBatch
		orderClause := "expired_date ASC, created_at ASC"
		if params.BatchNumber != "" {
			orderClause = fmt.Sprintf("CASE WHEN batch_number = '%s' THEN 0 ELSE 1 END, expired_date ASC, created_at ASC", params.BatchNumber)
		}
		tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("warehouse_id = ? AND product_id = ? AND current_qty > 0", params.WarehouseID, params.ProductID).
			Order(orderClause).
			Find(&batches)

		remainingQtyToDeduct := params.Qty
		var deductedBatches []DeductedBatchResult

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
	}

	return &balance, nil
}
