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
	Notes        string
	CreatedBy    uuid.UUID
}

// MutateStock performs concurrency-safe stock updates with moving average costing and writes to stock_movements
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

	// Create StockMovement record
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
		Notes:        params.Notes,
		CreatedBy:    params.CreatedBy,
		CreatedAt:    time.Now(),
	}

	if err := tx.Create(&movement).Error; err != nil {
		return nil, err
	}

	return &balance, nil
}
