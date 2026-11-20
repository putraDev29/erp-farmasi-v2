package models

import (
	"time"

	"github.com/google/uuid"
)

type SalesOrder struct {
	BaseModel
	CompanyID   uuid.UUID        `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID    uuid.UUID        `gorm:"type:uuid;not null;index" json:"branch_id"`
	CustomerID  uuid.UUID        `gorm:"type:uuid;not null;index" json:"customer_id"`
	SalesRepID  *uuid.UUID       `gorm:"type:uuid;index" json:"sales_rep_id"`
	OrderNo     string           `gorm:"size:50;uniqueIndex;not null" json:"order_no"`
	Date        time.Time        `gorm:"not null" json:"date"`
	Status      string           `gorm:"size:20;default:'PENDING';not null" json:"status"` // PENDING, CONFIRMED, COMPLETED, CANCELLED
	Subtotal    float64          `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	TaxPercent  float64          `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	TaxAmount   float64          `gorm:"type:numeric(15,2);default:0" json:"tax_amount"`
	Discount    float64          `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount float64          `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	Notes       string           `gorm:"type:text" json:"notes"`
	// PBF / SP Pemesan Requirements
	CustomerSPNumber   string     `gorm:"size:100" json:"customer_sp_number"`
	CustomerSPDate     *time.Time `json:"customer_sp_date"`
	CustomerSPType     string     `gorm:"size:50;default:'REGULER'" json:"customer_sp_type"`
	PBFOriginInvoiceNo string     `gorm:"size:100" json:"pbf_origin_invoice_no"`
	CreatedBy   uuid.UUID        `gorm:"type:uuid;not null" json:"created_by"`
	Items       []SalesOrderItem `gorm:"foreignKey:SalesOrderID" json:"items,omitempty"`

	Customer  *Customer            `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	SalesRep  *SalesRepresentative `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	User      *User                `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type SalesOrderItem struct {
	BaseModel
	SalesOrderID uuid.UUID `gorm:"type:uuid;not null;index" json:"sales_order_id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID       uuid.UUID `gorm:"type:uuid;not null" json:"unit_id"`
	Qty          float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice    float64   `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	Discount     float64   `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount  float64   `gorm:"type:numeric(15,2);not null" json:"total_amount"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type Sale struct {
	BaseModel
	CompanyID       uuid.UUID     `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID        uuid.UUID     `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID     uuid.UUID     `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	CustomerID      uuid.UUID     `gorm:"type:uuid;not null;index" json:"customer_id"`
	SalesOrderID    *uuid.UUID    `gorm:"type:uuid;index" json:"sales_order_id"`
	SalesRepID      *uuid.UUID    `gorm:"type:uuid;index" json:"sales_rep_id"`
	InvoiceNo       string        `gorm:"size:50;uniqueIndex;not null" json:"invoice_no"`
	Date            time.Time     `gorm:"not null" json:"date"`
	DueDate         time.Time     `gorm:"not null" json:"due_date"`
	Type            string        `gorm:"size:20;default:'POS';not null" json:"type"` // POS, BACKOFFICE, MARKETPLACE
	Status          string        `gorm:"size:20;default:'POSTED';not null" json:"status"` // DRAFT, POSTED, CANCELLED
	PaymentStatus   string        `gorm:"size:20;default:'PAID';not null" json:"payment_status"` // UNPAID, PARTIAL, PAID
	Subtotal        float64       `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	TaxPercent      float64       `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	TaxAmount       float64       `gorm:"type:numeric(15,2);default:0" json:"tax_amount"`
	Discount        float64       `gorm:"type:numeric(15,2);default:0" json:"discount"`
	ShippingFee     float64       `gorm:"type:numeric(15,2);default:0" json:"shipping_fee"`
	TotalAmount     float64       `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	PaidAmount      float64       `gorm:"type:numeric(15,2);default:0" json:"paid_amount"`
	ChangeAmount    float64       `gorm:"type:numeric(15,2);default:0" json:"change_amount"`
	RemainingAmount float64       `gorm:"type:numeric(15,2);default:0" json:"remaining_amount"`
	Notes           string        `gorm:"type:text" json:"notes"`
	// PBF / Penjualan Farmasi Requirements
	CustomerSPNumber   string     `gorm:"size:100" json:"customer_sp_number"`
	CustomerSPDate     *time.Time `json:"customer_sp_date"`
	CustomerSPType     string     `gorm:"size:50;default:'REGULER'" json:"customer_sp_type"`
	PBFOriginInvoiceNo string     `gorm:"size:100" json:"pbf_origin_invoice_no"`
	OriginPurchaseID   *uuid.UUID `gorm:"type:uuid;index" json:"origin_purchase_id"`
	TaxInvoiceNo       string     `gorm:"size:100" json:"tax_invoice_no"`
	DeliveryOrderNo    string     `gorm:"size:100" json:"delivery_order_no"`
	CreatedBy       uuid.UUID     `gorm:"type:uuid;not null" json:"created_by"`
	Items           []SaleItem    `gorm:"foreignKey:SaleID" json:"items,omitempty"`
	Payments        []SalePayment `gorm:"foreignKey:SaleID" json:"payments,omitempty"`

	Warehouse      *Warehouse           `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Customer       *Customer            `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	OriginPurchase *Purchase            `gorm:"foreignKey:OriginPurchaseID" json:"origin_purchase,omitempty"`
	SalesRep       *SalesRepresentative `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	User           *User                `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type SaleItem struct {
	BaseModel
	SaleID      uuid.UUID `gorm:"type:uuid;not null;index" json:"sale_id"`
	ProductID   uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID      uuid.UUID `gorm:"type:uuid;not null" json:"unit_id"`
	Qty         float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice   float64   `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	CostPrice   float64   `gorm:"type:numeric(15,4);default:0" json:"cost_price"`
	Discount    float64   `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount float64   `gorm:"type:numeric(15,2);not null" json:"total_amount"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type SalePayment struct {
	BaseModel
	SaleID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"sale_id"`
	Method        string     `gorm:"size:50;not null" json:"method"` // CASH, CARD, QRIS, BANK_TRANSFER
	BankID        *uuid.UUID `gorm:"type:uuid;index" json:"bank_id"`
	Amount        float64    `gorm:"type:numeric(15,2);not null" json:"amount"`
	ReferenceNo   string     `gorm:"size:100" json:"reference_no"`

	Bank *Bank `gorm:"foreignKey:BankID" json:"bank,omitempty"`
}

type SalesReturn struct {
	BaseModel
	CompanyID    uuid.UUID         `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID     uuid.UUID         `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID  uuid.UUID         `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	CustomerID   uuid.UUID         `gorm:"type:uuid;not null;index" json:"customer_id"`
	SalesRepID   *uuid.UUID        `gorm:"type:uuid;index" json:"sales_rep_id"`
	SaleID       *uuid.UUID        `gorm:"type:uuid;index" json:"sale_id"`
	ReturnNo     string            `gorm:"size:50;uniqueIndex;not null" json:"return_no"`
	Date         time.Time         `gorm:"not null" json:"date"`
	ReturnMode   string            `gorm:"size:20;default:'MODE_1'" json:"return_mode"` // MODE_1 or MODE_2
	TaxType      string            `gorm:"size:20;default:'NON'" json:"tax_type"`
	TaxPercent   float64           `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	OtherCost    float64           `gorm:"type:numeric(15,2);default:0" json:"other_cost"`
	Discount     float64           `gorm:"type:numeric(15,2);default:0" json:"discount"`
	ComputerName string            `gorm:"size:100;default:'KOMPUTER-01'" json:"computer_name"`
	Status       string            `gorm:"size:20;default:'POSTED';not null" json:"status"` // DRAFT, POSTED, CANCELLED
	TotalAmount  float64           `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	Reason       string            `gorm:"type:text" json:"reason"`
	CreatedBy    uuid.UUID         `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy    *uuid.UUID        `gorm:"type:uuid" json:"updated_by"`
	Items        []SalesReturnItem `gorm:"foreignKey:SalesReturnID" json:"items,omitempty"`

	Sale      *Sale                `gorm:"foreignKey:SaleID" json:"sale,omitempty"`
	Customer  *Customer            `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	SalesRep  *SalesRepresentative `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	Warehouse *Warehouse           `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	User      *User                `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier  *User                `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
}

type SalesReturnItem struct {
	BaseModel
	SalesReturnID     uuid.UUID `gorm:"type:uuid;not null;index" json:"sales_return_id"`
	ProductID         uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID            uuid.UUID `gorm:"type:uuid;not null" json:"unit_id"`
	OriginalInvoiceNo string    `gorm:"size:100" json:"original_invoice_no"`
	Brand             string    `gorm:"size:100" json:"brand"`
	SoldQty           float64   `gorm:"type:numeric(15,4);default:0" json:"sold_qty"`
	SoldUnit          string    `gorm:"size:50" json:"sold_unit"`
	Qty               float64   `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice         float64   `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	DiscountPercent   float64   `gorm:"type:numeric(5,2);default:0" json:"discount_percent"`
	TotalAmount       float64   `gorm:"type:numeric(15,2);not null" json:"total_amount"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type CustomerPayment struct {
	BaseModel
	CompanyID      uuid.UUID               `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID       uuid.UUID               `gorm:"type:uuid;not null;index" json:"branch_id"`
	CustomerID     uuid.UUID               `gorm:"type:uuid;not null;index" json:"customer_id"`
	PaymentNo      string                  `gorm:"size:50;uniqueIndex;not null" json:"payment_no"`
	Date           time.Time               `gorm:"not null" json:"date"`
	BankID         *uuid.UUID              `gorm:"type:uuid;index" json:"bank_id"`
	AccountID      *uuid.UUID              `gorm:"type:uuid;index" json:"account_id"`
	PaymentMethod  string                  `gorm:"size:50;not null" json:"payment_method"`
	BGCheckNo      string                  `gorm:"size:100" json:"bg_check_no"`
	BGCheckDueDate *time.Time              `json:"bg_check_due_date"`
	IsCleared      bool                    `gorm:"default:false" json:"is_cleared"`
	ClearedDate    *time.Time              `json:"cleared_date"`
	TotalAmount    float64                 `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	Notes          string                  `gorm:"type:text" json:"notes"`
	CreatedBy      uuid.UUID               `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy      *uuid.UUID              `gorm:"type:uuid" json:"updated_by"`
	Details        []CustomerPaymentDetail `gorm:"foreignKey:CustomerPaymentID" json:"details,omitempty"`

	Customer *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Bank     *Bank     `gorm:"foreignKey:BankID" json:"bank,omitempty"`
	User     *User     `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier *User     `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
}

type CustomerPaymentDetail struct {
	BaseModel
	CustomerPaymentID uuid.UUID `gorm:"type:uuid;not null;index" json:"customer_payment_id"`
	SaleID            uuid.UUID `gorm:"type:uuid;not null;index" json:"sale_id"`
	AmountPaid        float64   `gorm:"type:numeric(15,2);not null" json:"amount_paid"`

	Sale *Sale `gorm:"foreignKey:SaleID" json:"sale,omitempty"`
}

type SalesCommissionPayment struct {
	BaseModel
	CompanyID      uuid.UUID            `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID       uuid.UUID            `gorm:"type:uuid;not null;index" json:"branch_id"`
	SalesRepID     uuid.UUID            `gorm:"type:uuid;not null;index" json:"sales_rep_id"`
	PaymentNo      string               `gorm:"size:50;uniqueIndex;not null" json:"payment_no"`
	Date           time.Time            `gorm:"not null" json:"date"`
	PaymentMethod  string               `gorm:"size:50;default:'KAS'" json:"payment_method"`
	BGCheckNo      string               `gorm:"size:100" json:"bg_check_no"`
	BGCheckDueDate *time.Time           `json:"bg_check_due_date"`
	IsCleared      bool                 `gorm:"default:false" json:"is_cleared"`
	ClearedDate    *time.Time           `json:"cleared_date"`
	TotalAmount    float64              `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	Notes          string               `gorm:"type:text" json:"notes"`
	CreatedBy      uuid.UUID            `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy      *uuid.UUID           `gorm:"type:uuid" json:"updated_by"`

	SalesRep *SalesRepresentative `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	User     *User                `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier *User                `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
}

type SalesDelivery struct {
	BaseModel
	CompanyID    uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID     uuid.UUID `gorm:"type:uuid;not null;index" json:"branch_id"`
	DeliveryNo   string    `gorm:"size:50;uniqueIndex;not null" json:"delivery_no"`
	TrackingNo   string    `gorm:"size:100;index" json:"tracking_no"`
	Courier      string    `gorm:"size:100;default:'JNE'" json:"courier"`
	Sender       string    `gorm:"size:100;default:'APOTEK BERKAT PURNAMA'" json:"sender"`
	Recipient    string    `gorm:"size:100;not null" json:"recipient"`
	TotalOrder   float64   `gorm:"type:numeric(15,2);default:0" json:"total_order"`
	Status       string    `gorm:"size:50;default:'DIPROSES'" json:"status"`
	DeliveryDate time.Time `gorm:"not null" json:"delivery_date"`
	Notes        string    `gorm:"type:text" json:"notes"`
	CreatedBy    uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`

	User *User `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}
