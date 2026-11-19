package models

import (
	"time"

	"github.com/google/uuid"
)

type BillOfMaterial struct {
	BaseModel
	CompanyID    uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code         string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name         string    `gorm:"size:150;not null" json:"name"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"` // Finished product (type: ASSEMBLY)
	UnitID       uuid.UUID `gorm:"type:uuid;not null" json:"unit_id"`
	YieldQty     float64   `gorm:"type:numeric(15,4);default:1;not null" json:"yield_qty"`
	LaborCost    float64   `gorm:"type:numeric(15,2);default:0" json:"labor_cost"`
	OverheadCost float64   `gorm:"type:numeric(15,2);default:0" json:"overhead_cost"`
	Notes        string    `gorm:"type:text" json:"notes"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	Items        []BOMItem `gorm:"foreignKey:BOMID" json:"items,omitempty"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type BOMItem struct {
	BaseModel
	BOMID     uuid.UUID `gorm:"type:uuid;not null;index" json:"bom_id"`
	ProductID uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"` // Raw material component
	UnitID    uuid.UUID `gorm:"type:uuid;not null" json:"unit_id"`
	Qty       float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	ScrapRate float64   `gorm:"type:numeric(5,2);default:0" json:"scrap_rate"` // % scrap

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

// Pesanan Perakitan (Assembly Order)
type AssemblyOrder struct {
	BaseModel
	CompanyID         uuid.UUID           `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID          uuid.UUID           `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID       uuid.UUID           `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	OrderNo           string              `gorm:"size:50;uniqueIndex;not null" json:"order_no"`
	Date              time.Time           `gorm:"not null" json:"date"`
	CustomerID        *uuid.UUID          `gorm:"type:uuid;index" json:"customer_id,omitempty"`
	CustomerCode      string              `gorm:"size:50" json:"customer_code"`
	CustomerName      string              `gorm:"size:150" json:"customer_name"`
	BOMID             *uuid.UUID          `gorm:"type:uuid;index" json:"bom_id,omitempty"`
	ProductID         *uuid.UUID          `gorm:"type:uuid;index" json:"product_id,omitempty"` // Finished product
	ProductName       string              `gorm:"size:150" json:"product_name"`
	UnitID            *uuid.UUID          `gorm:"type:uuid" json:"unit_id,omitempty"`
	OrderedQty        float64             `gorm:"type:numeric(15,4);default:1;not null" json:"ordered_qty"`
	ProcessedQty      float64             `gorm:"type:numeric(15,4);default:0" json:"processed_qty"`
	TargetQty         float64             `gorm:"type:numeric(15,4);default:1;not null" json:"target_qty"`
	FinishedQty       float64             `gorm:"type:numeric(15,4);default:0" json:"finished_qty"`
	TotalMaterialCost float64             `gorm:"type:numeric(15,2);default:0" json:"total_material_cost"`
	LaborCost         float64             `gorm:"type:numeric(15,2);default:0" json:"labor_cost"`
	OverheadCost      float64             `gorm:"type:numeric(15,2);default:0" json:"overhead_cost"`
	TotalCost         float64             `gorm:"type:numeric(15,2);default:0" json:"total_cost"`
	UnitCost          float64             `gorm:"type:numeric(15,4);default:0" json:"unit_cost"`
	Status            string              `gorm:"size:20;default:'PENDING';not null" json:"status"` // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
	ProcessStatus     string              `gorm:"size:20;default:'BELUM';not null" json:"process_status"` // BELUM, SEBAGIAN, SELESAI
	Notes             string              `gorm:"type:text" json:"notes"`
	CreatedBy         uuid.UUID           `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy         *uuid.UUID          `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName     string              `gorm:"size:100" json:"created_by_name"`
	UpdatedByName     string              `gorm:"size:100" json:"updated_by_name"`
	Items             []AssemblyOrderItem `gorm:"foreignKey:AssemblyOrderID" json:"items,omitempty"`

	Customer  *Customer       `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	BOM       *BillOfMaterial `gorm:"foreignKey:BOMID" json:"bom,omitempty"`
	Product   *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Warehouse *Warehouse      `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	User      *User           `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type AssemblyOrderItem struct {
	BaseModel
	AssemblyOrderID uuid.UUID `gorm:"type:uuid;not null;index" json:"assembly_order_id"`
	ProductID       uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"` // Raw material
	UnitID          uuid.UUID `gorm:"type:uuid;not null" json:"unit_id"`
	PlannedQty      float64   `gorm:"type:numeric(15,4);not null" json:"planned_qty"`
	ActualQty       float64   `gorm:"type:numeric(15,4);not null" json:"actual_qty"`
	CostPerUnit     float64   `gorm:"type:numeric(15,4);default:0" json:"cost_per_unit"`
	TotalCost       float64   `gorm:"type:numeric(15,2);default:0" json:"total_cost"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

// Proses Perakitan
type AssemblyProcess struct {
	BaseModel
	CompanyID       uuid.UUID   `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID        uuid.UUID   `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID     uuid.UUID   `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	AssemblyOrderID *uuid.UUID  `gorm:"type:uuid;index" json:"assembly_order_id,omitempty"`
	ProcessNo       string      `gorm:"size:50;uniqueIndex;not null" json:"process_no"`
	Date            time.Time   `gorm:"not null" json:"date"`
	CustomerCode    string      `gorm:"size:50" json:"customer_code"`
	CustomerName    string      `gorm:"size:150" json:"customer_name"`
	ProductID       *uuid.UUID  `gorm:"type:uuid;index" json:"product_id,omitempty"`
	ProductName     string      `gorm:"size:150" json:"product_name"`
	ProcessQty      float64     `gorm:"type:numeric(15,4);default:1;not null" json:"process_qty"`
	FinishedQty     float64     `gorm:"type:numeric(15,4);default:0" json:"finished_qty"`
	Notes           string      `gorm:"type:text" json:"notes"`
	Status          string      `gorm:"size:20;default:'IN_PROGRESS';not null" json:"status"`
	CreatedBy       uuid.UUID   `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy       *uuid.UUID  `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName   string      `gorm:"size:100" json:"created_by_name"`
	UpdatedByName   string      `gorm:"size:100" json:"updated_by_name"`

	AssemblyOrder *AssemblyOrder `gorm:"foreignKey:AssemblyOrderID" json:"assembly_order,omitempty"`
	Warehouse     *Warehouse     `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Product       *Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// Proses Jadi
type AssemblyFinished struct {
	BaseModel
	CompanyID         uuid.UUID   `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID          uuid.UUID   `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID       uuid.UUID   `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	AssemblyProcessID *uuid.UUID  `gorm:"type:uuid;index" json:"assembly_process_id,omitempty"`
	FinishedNo        string      `gorm:"size:50;uniqueIndex;not null" json:"finished_no"`
	Date              time.Time   `gorm:"not null" json:"date"`
	CustomerCode      string      `gorm:"size:50" json:"customer_code"`
	CustomerName      string      `gorm:"size:150" json:"customer_name"`
	ProductID         *uuid.UUID  `gorm:"type:uuid;index" json:"product_id,omitempty"`
	ProductName       string      `gorm:"size:150" json:"product_name"`
	TotalProcess      float64     `gorm:"type:numeric(15,4);default:1;not null" json:"total_process"`
	Notes             string      `gorm:"type:text" json:"notes"`
	Status            string      `gorm:"size:20;default:'COMPLETED';not null" json:"status"`
	CreatedBy         uuid.UUID   `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy         *uuid.UUID  `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName     string      `gorm:"size:100" json:"created_by_name"`
	UpdatedByName     string      `gorm:"size:100" json:"updated_by_name"`

	AssemblyProcess *AssemblyProcess `gorm:"foreignKey:AssemblyProcessID" json:"assembly_process,omitempty"`
	Warehouse       *Warehouse       `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Product         *Product         `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}
