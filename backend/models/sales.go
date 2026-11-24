package models

import (
	"time"

	"github.com/google/uuid"
)

type SalesOrder struct {
	BaseModel
	CompanyID          uuid.UUID        `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID           uuid.UUID        `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID        *uuid.UUID       `gorm:"type:uuid;index" json:"warehouse_id"`
	CustomerID         uuid.UUID        `gorm:"type:uuid;not null;index" json:"customer_id"`
	SalesRepID         *uuid.UUID       `gorm:"type:uuid;index" json:"sales_rep_id"`
	OrderNo            string           `gorm:"size:50;uniqueIndex;not null" json:"order_no"`
	Date               time.Time        `gorm:"not null" json:"date"`
	ExpectedDate       *time.Time       `json:"expected_date"`
	Status             string           `gorm:"size:50;default:'PENDING';not null" json:"status"` // PENDING, DIPROSES, DIKIRIM, DITERIMA, SELESAI, BATAL
	ProcessStatus      string           `gorm:"size:100;default:'Belum Proses';not null" json:"process_status"`
	PaymentStatus      string           `gorm:"size:20;default:'UNPAID';not null" json:"payment_status"` // UNPAID, DP, PARTIAL, PAID, TEMPO
	DPAmount           float64          `gorm:"type:numeric(15,2);default:0" json:"dp_amount"`
	CashAccountID      *uuid.UUID       `gorm:"type:uuid;index" json:"cash_account_id"`
	Subtotal           float64          `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	TaxPercent         float64          `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	TaxAmount          float64          `gorm:"type:numeric(15,2);default:0" json:"tax_amount"`
	Discount           float64          `gorm:"type:numeric(15,2);default:0" json:"discount"`
	ShippingFee        float64          `gorm:"type:numeric(15,2);default:0" json:"shipping_fee"`
	TotalAmount        float64          `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	PaidAmount         float64          `gorm:"type:numeric(15,2);default:0" json:"paid_amount"` // DP / Uang Muka
	RemainingAmount    float64          `gorm:"type:numeric(15,2);default:0" json:"remaining_amount"`
	Notes              string           `gorm:"type:text" json:"notes"`
	// Multichannel & Marketplace Integration
	Type               string           `gorm:"size:20;default:'BACKOFFICE';not null" json:"type"` // POS, BACKOFFICE, MARKETPLACE
	Source             string           `gorm:"size:50;default:'BACKOFFICE'" json:"source"`       // MARKETPLACE, MOBILE, SHOPEE, TOKOPEDIA, BACKOFFICE
	MarketplaceStore   string           `gorm:"size:100" json:"marketplace_store"`                // Nama Toko / Mobile App
	MarketplaceOrderNo string           `gorm:"size:100" json:"marketplace_order_no"`            // No Nota Marketplace / SP Mobile
	// PBF / SP Pemesan Requirements
	CustomerSPNumber   string     `gorm:"size:100" json:"customer_sp_number"`
	CustomerSPDate     *time.Time `json:"customer_sp_date"`
	CustomerSPType     string     `gorm:"size:50;default:'REGULER'" json:"customer_sp_type"`
	PBFOriginInvoiceNo string     `gorm:"size:100" json:"pbf_origin_invoice_no"`
	// Pengiriman & Ekspedisi (Sync Delivery)
	DeliveryOrderNo    string     `gorm:"size:100" json:"delivery_order_no"`
	DeliveryTrackingNo string     `gorm:"size:100" json:"delivery_tracking_no"`
	DeliveryCourier    string     `gorm:"size:100" json:"delivery_courier"`
	DeliveryDate       *time.Time `json:"delivery_date"`
	ReceivedDate       *time.Time `json:"received_date"`
	ReceivedBy         string     `gorm:"size:100" json:"received_by"`
	// Cetak Faktur (Continuous Form Dot Matrix)
	IsPrinted          bool       `gorm:"default:false;not null" json:"is_printed"`
	PrintCount         int        `gorm:"default:0;not null" json:"print_count"`
	PrintedAt          *time.Time `json:"printed_at"`
	PrintedBy          *uuid.UUID `gorm:"type:uuid" json:"printed_by"`
	// Faktur Penjualan (Converted Invoice Link)
	SaleInvoiceID      *uuid.UUID `gorm:"type:uuid;index" json:"sale_invoice_id"`
	// Persetujuan & Pengiriman Log
	AdminApprovedAt    *time.Time `json:"admin_approved_at"`
	AdminApprovedBy    *uuid.UUID `gorm:"type:uuid" json:"admin_approved_by"`
	WarehouseShippedAt *time.Time `json:"warehouse_shipped_at"`
	WarehouseShippedBy *uuid.UUID `gorm:"type:uuid" json:"warehouse_shipped_by"`
	ReceivedProofURL   string     `gorm:"size:255" json:"received_proof_url"`
	ComputerName       string     `gorm:"size:100;default:'ISB-SEWA11-S-NB'" json:"computer_name"`
	CreatedBy          uuid.UUID        `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy          *uuid.UUID       `gorm:"type:uuid" json:"updated_by"`
	Items              []SalesOrderItem `gorm:"foreignKey:SalesOrderID" json:"items,omitempty"`

	Warehouse        *Warehouse           `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Customer         *Customer            `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	SalesRep         *SalesRepresentative `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	Sale             *Sale                `gorm:"foreignKey:SaleInvoiceID" json:"sale,omitempty"`
	User             *User                `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier         *User                `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
	AdminApprover    *User                `gorm:"foreignKey:AdminApprovedBy" json:"admin_approver,omitempty"`
	WarehouseShipper *User                `gorm:"foreignKey:WarehouseShippedBy" json:"warehouse_shipper,omitempty"`
}

type SalesOrderItem struct {
	BaseModel
	SalesOrderID uuid.UUID  `gorm:"type:uuid;not null;index" json:"sales_order_id"`
	ProductID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID       uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	Qty          float64    `gorm:"type:numeric(15,4);not null" json:"qty"`
	DeliveredQty float64    `gorm:"type:numeric(15,4);default:0" json:"delivered_qty"`
	UnitPrice    float64    `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	Discount     float64    `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount  float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	BatchNumber  string     `gorm:"size:100" json:"batch_number"`
	ExpiredDate  *time.Time `json:"expired_date"`

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
	Status          string        `gorm:"size:50;default:'POSTED';not null" json:"status"` // DRAFT, POSTED, CANCELLED, MENUNGGU_PENGIRIMAN, DIKIRIM, SELESAI
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
	DeliveryCourier    string     `gorm:"size:100" json:"delivery_courier"`
	DeliveryDate       *time.Time `json:"delivery_date"`
	WarehouseNotes     string     `gorm:"type:text" json:"warehouse_notes"`
	AdminNotes         string     `gorm:"type:text" json:"admin_notes"`
	ReceivedProofURL   string     `gorm:"size:255" json:"received_proof_url"`
	ReceivedDate       *time.Time `json:"received_date"`
	ReceivedBy         string     `gorm:"size:100" json:"received_by"`
	AdminApprovedAt    *time.Time `json:"admin_approved_at"`
	AdminApprovedBy    *uuid.UUID `gorm:"type:uuid" json:"admin_approved_by"`
	WarehouseShippedAt *time.Time `json:"warehouse_shipped_at"`
	WarehouseShippedBy *uuid.UUID `gorm:"type:uuid" json:"warehouse_shipped_by"`
	// Cetak Faktur (Hanya Boleh 1 Kali)
	IsPrinted          bool       `gorm:"default:false;not null" json:"is_printed"`
	PrintCount         int        `gorm:"default:0;not null" json:"print_count"`
	PrintedAt          *time.Time `json:"printed_at"`
	PrintedBy          *uuid.UUID `gorm:"type:uuid" json:"printed_by"`
	ComputerName       string     `gorm:"size:100;default:'ISB-SEWA11-S-NB'" json:"computer_name"`
	CreatedBy          uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy          *uuid.UUID `gorm:"type:uuid" json:"updated_by"`
	Items              []SaleItem    `gorm:"foreignKey:SaleID" json:"items,omitempty"`
	Payments           []SalePayment `gorm:"foreignKey:SaleID" json:"payments,omitempty"`

	Warehouse        *Warehouse           `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Customer         *Customer            `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	OriginPurchase   *Purchase            `gorm:"foreignKey:OriginPurchaseID" json:"origin_purchase,omitempty"`
	SalesRep         *SalesRepresentative `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	SalesOrder       *SalesOrder          `gorm:"foreignKey:SalesOrderID" json:"sales_order,omitempty"`
	User             *User                `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier         *User                `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
	AdminApprover    *User                `gorm:"foreignKey:AdminApprovedBy" json:"admin_approver,omitempty"`
	WarehouseShipper *User                `gorm:"foreignKey:WarehouseShippedBy" json:"warehouse_shipper,omitempty"`
}

type SaleItem struct {
	BaseModel
	SaleID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"sale_id"`
	ProductID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID      uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	Qty         float64    `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice   float64    `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	CostPrice   float64    `gorm:"type:numeric(15,4);default:0" json:"cost_price"`
	Discount    float64    `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	BatchNumber string     `gorm:"size:100" json:"batch_number"`
	ExpiredDate *time.Time `json:"expired_date"`

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
	Status       string            `gorm:"size:30;default:'DRAFT';not null;index" json:"status"` // DRAFT, VERIFIKASI_GUDANG, DISETUJUI_ADMIN, BARANG_DITERIMA, SELESAI, DITOLAK
	TotalAmount  float64           `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	Reason       string            `gorm:"type:text" json:"reason"`
	CreatedBy    uuid.UUID         `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy    *uuid.UUID        `gorm:"type:uuid" json:"updated_by"`
	Items        []SalesReturnItem `gorm:"foreignKey:SalesReturnID" json:"items,omitempty"`

	// Verifikasi Fisik Gudang
	WarehouseVerifiedAt *time.Time `json:"warehouse_verified_at"`
	WarehouseVerifiedBy *uuid.UUID `gorm:"type:uuid" json:"warehouse_verified_by"`
	WarehouseNotes      string     `gorm:"type:text" json:"warehouse_notes"`

	// Persetujuan Admin / Apoteker
	AdminApprovedAt *time.Time `json:"admin_approved_at"`
	AdminApprovedBy *uuid.UUID `gorm:"type:uuid" json:"admin_approved_by"`
	AdminNotes      string     `gorm:"type:text" json:"admin_notes"`
	RejectReason    string     `gorm:"type:text" json:"reject_reason"`

	// Restock Masuk Gudang (Kondisi Baik)
	IsStockRestocked bool       `gorm:"default:false;not null" json:"is_stock_restocked"`
	RestockedAt      *time.Time `json:"restocked_at"`
	RestockedBy      *uuid.UUID `gorm:"type:uuid" json:"restocked_by"`

	// Finalisasi & Penyelesaian Keuangan
	SettlementType      string     `gorm:"size:50" json:"settlement_type"` // POTONG_PIUTANG, KREDIT_PELANGGAN, KAS_PENGEMBALIAN
	CashAccountID       *uuid.UUID `gorm:"type:uuid;index" json:"cash_account_id"`
	DebtDeductionAmount float64    `gorm:"type:numeric(15,2);default:0" json:"debt_deduction_amount"` // Potong Piutang
	CreditBalanceAmount float64    `gorm:"type:numeric(15,2);default:0" json:"credit_balance_amount"` // Kredit / Deposit Pelanggan
	RefundAmount        float64    `gorm:"type:numeric(15,2);default:0" json:"refund_amount"`         // Kas Refund
	FinalizedAt         *time.Time `json:"finalized_at"`
	FinalizedBy         *uuid.UUID `gorm:"type:uuid" json:"finalized_by"`

	Sale              *Sale                  `gorm:"foreignKey:SaleID" json:"sale,omitempty"`
	Customer          *Customer              `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	SalesRep          *SalesRepresentative   `gorm:"foreignKey:SalesRepID" json:"sales_rep,omitempty"`
	Warehouse         *Warehouse             `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	User              *User                  `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier          *User                  `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
	WarehouseVerifier *User                  `gorm:"foreignKey:WarehouseVerifiedBy" json:"warehouse_verifier,omitempty"`
	AdminApprover     *User                  `gorm:"foreignKey:AdminApprovedBy" json:"admin_approver,omitempty"`
	Finalizer         *User                  `gorm:"foreignKey:FinalizedBy" json:"finalizer,omitempty"`
	StatusLogs        []SalesReturnStatusLog `gorm:"foreignKey:SalesReturnID" json:"status_logs,omitempty"`
}

type SalesReturnItem struct {
	BaseModel
	SalesReturnID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"sales_return_id"`
	ProductID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID            uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	OriginalInvoiceNo string     `gorm:"size:100" json:"original_invoice_no"`
	Brand             string     `gorm:"size:100" json:"brand"`
	SoldQty           float64    `gorm:"type:numeric(15,4);default:0" json:"sold_qty"`
	SoldUnit          string     `gorm:"size:50" json:"sold_unit"`
	Qty               float64    `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice         float64    `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	DiscountPercent   float64    `gorm:"type:numeric(5,2);default:0" json:"discount_percent"`
	TotalAmount       float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	BatchNumber       string     `gorm:"size:100" json:"batch_number"`
	ExpiredDate       *time.Time `json:"expired_date"`
	Condition         string     `gorm:"size:50;default:'BAIK'" json:"condition"` // BAIK, RUSAK
	AcceptedQty       float64    `gorm:"type:numeric(15,4);default:0" json:"accepted_qty"`
	RejectedQty       float64    `gorm:"type:numeric(15,4);default:0" json:"rejected_qty"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type SalesReturnStatusLog struct {
	BaseModel
	SalesReturnID uuid.UUID `gorm:"type:uuid;not null;index" json:"sales_return_id"`
	Status        string    `gorm:"size:50;not null" json:"status"`
	Action        string    `gorm:"size:100;not null" json:"action"`
	Notes         string    `gorm:"type:text" json:"notes"`
	UserID        uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
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
	TotalDiscount  float64                 `gorm:"type:numeric(15,2);default:0" json:"total_discount"`
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
	CustomerPaymentID uuid.UUID   `gorm:"type:uuid;not null;index" json:"customer_payment_id"`
	SaleID            *uuid.UUID  `gorm:"type:uuid;index" json:"sale_id"`
	SalesOrderID      *uuid.UUID  `gorm:"type:uuid;index" json:"sales_order_id"`
	AmountPaid        float64     `gorm:"type:numeric(15,2);not null" json:"amount_paid"`
	Discount          float64     `gorm:"type:numeric(15,2);default:0" json:"discount"`

	Sale       *Sale       `gorm:"foreignKey:SaleID" json:"sale,omitempty"`
	SalesOrder *SalesOrder `gorm:"foreignKey:SalesOrderID" json:"sales_order,omitempty"`
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
