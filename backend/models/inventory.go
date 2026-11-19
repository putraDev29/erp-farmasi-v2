package models

import (
	"time"

	"github.com/google/uuid"
)

type StockBalance struct {
	BaseModel
	WarehouseID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_wh_product" json:"warehouse_id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_wh_product" json:"product_id"`
	Qty          float64   `gorm:"type:numeric(15,4);default:0;not null" json:"qty"`
	ReservedQty  float64   `gorm:"type:numeric(15,4);default:0;not null" json:"reserved_qty"`
	AvailableQty float64   `gorm:"type:numeric(15,4);default:0;not null" json:"available_qty"`
	AvgCost      float64   `gorm:"type:numeric(15,4);default:0;not null" json:"avg_cost"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Product   *Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type StockMovement struct {
	BaseModel
	CompanyID    uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID     uuid.UUID `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID  uuid.UUID `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	DocType      string    `gorm:"size:50;not null;index" json:"doc_type"` // PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT, OPNAME, ADJUSTMENT, ASSEMBLY_IN, ASSEMBLY_OUT, OPENING, ITEM_IN, ITEM_OUT
	DocNo        string    `gorm:"size:50;not null;index" json:"doc_no"`
	MovementType string    `gorm:"size:10;not null" json:"movement_type"` // IN or OUT
	Qty          float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	CostPerUnit  float64   `gorm:"type:numeric(15,4);default:0" json:"cost_per_unit"`
	TotalCost    float64   `gorm:"type:numeric(15,4);default:0" json:"total_cost"`
	BalanceAfter float64   `gorm:"type:numeric(15,4);not null" json:"balance_after"`
	Notes        string    `gorm:"type:text" json:"notes"`
	CreatedBy    uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Product   *Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	User      *User      `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type StockOpname struct {
	BaseModel
	CompanyID   uuid.UUID         `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID    uuid.UUID         `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID uuid.UUID         `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	OpnameNo    string            `gorm:"size:50;uniqueIndex;not null" json:"opname_no"`
	Date        time.Time         `gorm:"not null" json:"date"`
	Status      string            `gorm:"size:20;default:'DRAFT';not null" json:"status"` // DRAFT, COMPLETED, CANCELLED
	Notes       string            `gorm:"type:text" json:"notes"`
	CreatedBy   uuid.UUID         `gorm:"type:uuid;not null" json:"created_by"`
	Items       []StockOpnameItem `gorm:"foreignKey:OpnameID" json:"items,omitempty"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	User      *User      `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type StockOpnameItem struct {
	BaseModel
	OpnameID      uuid.UUID `gorm:"type:uuid;not null;index" json:"opname_id"`
	ProductID     uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	SystemQty     float64   `gorm:"type:numeric(15,4);not null" json:"system_qty"`
	PhysicalQty   float64   `gorm:"type:numeric(15,4);not null" json:"physical_qty"`
	DifferenceQty float64   `gorm:"type:numeric(15,4);not null" json:"difference_qty"`
	CostPerUnit   float64   `gorm:"type:numeric(15,4);default:0" json:"cost_per_unit"`
	TotalVariance float64   `gorm:"type:numeric(15,4);default:0" json:"total_variance"`
	Notes         string    `gorm:"size:255" json:"notes"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// 1. Item Masuk (Inbound Item Entry)
type ItemEntry struct {
	BaseModel
	CompanyID     uuid.UUID       `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID      uuid.UUID       `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID   uuid.UUID       `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	DocNo         string          `gorm:"size:50;uniqueIndex;not null" json:"doc_no"`
	Date          time.Time       `gorm:"not null" json:"date"`
	AccountCode   string          `gorm:"size:50;default:'5-2201 - ITEM MASUK'" json:"account_code"`
	TotalItems    float64         `gorm:"type:numeric(15,4);default:0" json:"total_items"`
	SubTotal      float64         `gorm:"type:numeric(15,2);default:0" json:"sub_total"`
	Notes         string          `gorm:"type:text" json:"notes"`
	ComputerName  string          `gorm:"size:100;default:'SERVER'" json:"computer_name"`
	CreatedBy     uuid.UUID       `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy     *uuid.UUID      `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName string          `gorm:"size:100" json:"created_by_name"`
	UpdatedByName string          `gorm:"size:100" json:"updated_by_name"`
	Items         []ItemEntryItem `gorm:"foreignKey:ItemEntryID" json:"items,omitempty"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
}

type ItemEntryItem struct {
	BaseModel
	ItemEntryID uuid.UUID `gorm:"type:uuid;not null;index" json:"item_entry_id"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductCode string    `gorm:"size:50" json:"product_code"`
	ProductName string    `gorm:"size:150" json:"product_name"`
	Brand       string    `gorm:"size:100" json:"brand"`
	Qty         float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitID      *uuid.UUID `gorm:"type:uuid" json:"unit_id,omitempty"`
	UnitName    string    `gorm:"size:50" json:"unit_name"`
	UnitPrice   float64   `gorm:"type:numeric(15,2);default:0" json:"unit_price"`
	TotalPrice  float64   `gorm:"type:numeric(15,2);default:0" json:"total_price"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// 2. Item Keluar (Outbound Item Exit)
type ItemExit struct {
	BaseModel
	CompanyID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	DocNo         string         `gorm:"size:50;uniqueIndex;not null" json:"doc_no"`
	Date          time.Time      `gorm:"not null" json:"date"`
	AccountCode   string         `gorm:"size:50;default:'5-2202 - ITEM KELUAR'" json:"account_code"`
	TotalItems    float64        `gorm:"type:numeric(15,4);default:0" json:"total_items"`
	Notes         string         `gorm:"type:text" json:"notes"`
	ComputerName  string         `gorm:"size:100;default:'SERVER'" json:"computer_name"`
	CreatedBy     uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy     *uuid.UUID     `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName string         `gorm:"size:100" json:"created_by_name"`
	UpdatedByName string         `gorm:"size:100" json:"updated_by_name"`
	Items         []ItemExitItem `gorm:"foreignKey:ItemExitID" json:"items,omitempty"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
}

type ItemExitItem struct {
	BaseModel
	ItemExitID  uuid.UUID `gorm:"type:uuid;not null;index" json:"item_exit_id"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductCode string    `gorm:"size:50" json:"product_code"`
	ProductName string    `gorm:"size:150" json:"product_name"`
	Brand       string    `gorm:"size:100" json:"brand"`
	Qty         float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitID      *uuid.UUID `gorm:"type:uuid" json:"unit_id,omitempty"`
	UnitName    string    `gorm:"size:50" json:"unit_name"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// 3. Pesanan Item Transfer (Transfer Order)
type ItemTransferOrder struct {
	BaseModel
	CompanyID       uuid.UUID               `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID        uuid.UUID               `gorm:"type:uuid;not null;index" json:"branch_id"`
	OrderNo         string                  `gorm:"size:50;uniqueIndex;not null" json:"order_no"`
	Date            time.Time               `gorm:"not null" json:"date"`
	DeliveryDate    time.Time               `gorm:"not null" json:"delivery_date"`
	FromWarehouseID uuid.UUID               `gorm:"type:uuid;not null;index" json:"from_warehouse_id"`
	ToWarehouseID   uuid.UUID               `gorm:"type:uuid;not null;index" json:"to_warehouse_id"`
	TotalQty        float64                 `gorm:"type:numeric(15,4);default:0" json:"total_qty"`
	ReceivedQty     float64                 `gorm:"type:numeric(15,4);default:0" json:"received_qty"`
	Status          string                  `gorm:"size:20;default:'PENDING';not null" json:"status"` // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
	ProcessStatus   string                  `gorm:"size:20;default:'BELUM';not null" json:"process_status"` // BELUM, SEBAGIAN, SELESAI
	Notes           string                  `gorm:"type:text" json:"notes"`
	CreatedBy       uuid.UUID               `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy       *uuid.UUID              `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName   string                  `gorm:"size:100" json:"created_by_name"`
	UpdatedByName   string                  `gorm:"size:100" json:"updated_by_name"`
	Items           []ItemTransferOrderItem `gorm:"foreignKey:TransferOrderID" json:"items,omitempty"`

	FromWarehouse *Warehouse `gorm:"foreignKey:FromWarehouseID" json:"from_warehouse,omitempty"`
	ToWarehouse   *Warehouse `gorm:"foreignKey:ToWarehouseID" json:"to_warehouse,omitempty"`
}

type ItemTransferOrderItem struct {
	BaseModel
	TransferOrderID uuid.UUID `gorm:"type:uuid;not null;index" json:"transfer_order_id"`
	ProductID       uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductCode     string    `gorm:"size:50" json:"product_code"`
	ProductName     string    `gorm:"size:150" json:"product_name"`
	Brand           string    `gorm:"size:100" json:"brand"`
	Qty             float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	ReceivedQty     float64   `gorm:"type:numeric(15,4);default:0" json:"received_qty"`
	UnitID          *uuid.UUID `gorm:"type:uuid" json:"unit_id,omitempty"`
	UnitName        string    `gorm:"size:50" json:"unit_name"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// 4. Item Transfer (Physical Warehouse Transfer)
type WarehouseTransfer struct {
	BaseModel
	CompanyID       uuid.UUID               `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID        uuid.UUID               `gorm:"type:uuid;not null;index" json:"branch_id"`
	TransferOrderID *uuid.UUID              `gorm:"type:uuid;index" json:"transfer_order_id,omitempty"`
	TransferNo      string                  `gorm:"size:50;uniqueIndex;not null" json:"transfer_no"`
	Date            time.Time               `gorm:"not null" json:"date"`
	FromWarehouseID uuid.UUID               `gorm:"type:uuid;not null;index" json:"from_warehouse_id"`
	ToWarehouseID   uuid.UUID               `gorm:"type:uuid;not null;index" json:"to_warehouse_id"`
	TotalItems      float64                 `gorm:"type:numeric(15,4);default:0" json:"total_items"`
	Status          string                  `gorm:"size:20;default:'RECEIVED';not null" json:"status"` // DRAFT, SENT, RECEIVED, CANCELLED
	Notes           string                  `gorm:"type:text" json:"notes"`
	ComputerName    string                  `gorm:"size:100;default:'SERVER'" json:"computer_name"`
	CreatedBy       uuid.UUID               `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy       *uuid.UUID              `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedByName   string                  `gorm:"size:100" json:"created_by_name"`
	UpdatedByName   string                  `gorm:"size:100" json:"updated_by_name"`
	Items           []WarehouseTransferItem `gorm:"foreignKey:TransferID" json:"items,omitempty"`

	TransferOrder *ItemTransferOrder `gorm:"foreignKey:TransferOrderID" json:"transfer_order,omitempty"`
	FromWarehouse *Warehouse         `gorm:"foreignKey:FromWarehouseID" json:"from_warehouse,omitempty"`
	ToWarehouse   *Warehouse         `gorm:"foreignKey:ToWarehouseID" json:"to_warehouse,omitempty"`
	User          *User              `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type WarehouseTransferItem struct {
	BaseModel
	TransferID  uuid.UUID `gorm:"type:uuid;not null;index" json:"transfer_id"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductCode string    `gorm:"size:50" json:"product_code"`
	ProductName string    `gorm:"size:150" json:"product_name"`
	Brand       string    `gorm:"size:100" json:"brand"`
	Qty         float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitID      *uuid.UUID `gorm:"type:uuid" json:"unit_id,omitempty"`
	UnitName    string    `gorm:"size:50" json:"unit_name"`
	Cost        float64   `gorm:"type:numeric(15,4);default:0" json:"cost"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// 5. Saldo Awal (Beginning Stock Balance)
type InitialStockEntry struct {
	BaseModel
	CompanyID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	ProductID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	ProductCode   string     `gorm:"size:50;not null" json:"product_code"`
	ProductName   string     `gorm:"size:150;not null" json:"product_name"`
	WarehouseName string     `gorm:"size:100" json:"warehouse_name"`
	Date          time.Time  `gorm:"not null" json:"date"`
	Qty           float64    `gorm:"type:numeric(15,4);default:0;not null" json:"qty"`
	UnitID        *uuid.UUID `gorm:"type:uuid" json:"unit_id,omitempty"`
	UnitName      string     `gorm:"size:50" json:"unit_name"`
	UnitPrice     float64    `gorm:"type:numeric(15,4);default:0;not null" json:"unit_price"`
	TotalPrice    float64    `gorm:"type:numeric(15,2);default:0;not null" json:"total_price"`
	Notes         string     `gorm:"type:text" json:"notes"`
	CreatedBy     uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
	CreatedByName string     `gorm:"size:100" json:"created_by_name"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Product   *Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}
