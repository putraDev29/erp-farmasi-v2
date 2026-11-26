package models

import (
	"time"

	"github.com/google/uuid"
)

type PurchaseOrder struct {
	BaseModel
	CompanyID        uuid.UUID           `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID         uuid.UUID           `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID      *uuid.UUID          `gorm:"type:uuid;index" json:"warehouse_id"`
	SupplierID       uuid.UUID           `gorm:"type:uuid;not null;index" json:"supplier_id"`
	OrderNo          string              `gorm:"size:50;uniqueIndex;not null" json:"order_no"`
	Date             time.Time           `gorm:"not null" json:"date"`
	ExpectedDate     *time.Time          `json:"expected_date"`
	Status           string              `gorm:"size:20;default:'PENDING';not null" json:"status"` // PENDING, PARTIAL, COMPLETED, CANCELLED
	ProcessStatus    string              `gorm:"size:30;default:'Belum Proses';not null" json:"process_status"` // Belum Proses, Proses Sebagian, Selesai
	PaymentStatus    string              `gorm:"size:20;default:'UNPAID';not null" json:"payment_status"` // UNPAID, DP, PARTIAL, PAID
	DPAmount         float64             `gorm:"type:numeric(15,2);default:0" json:"dp_amount"`
	PaidAmount       float64             `gorm:"type:numeric(15,2);default:0" json:"paid_amount"`
	RemainingAmount  float64             `gorm:"type:numeric(15,2);default:0" json:"remaining_amount"`
	CashAccountID    *uuid.UUID          `gorm:"type:uuid;index" json:"cash_account_id"`
	Subtotal         float64             `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	TaxPercent       float64             `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	TaxAmount        float64             `gorm:"type:numeric(15,2);default:0" json:"tax_amount"`
	Discount         float64             `gorm:"type:numeric(15,2);default:0" json:"discount"`
	ShippingFee      float64             `gorm:"type:numeric(15,2);default:0" json:"shipping_fee"`
	TotalAmount      float64             `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	TotalOrderedQty  float64             `gorm:"type:numeric(15,4);default:0" json:"total_ordered_qty"`
	TotalReceivedQty float64             `gorm:"type:numeric(15,4);default:0" json:"total_received_qty"`
	Notes            string              `gorm:"type:text" json:"notes"`
	DeliveryMethod   string              `gorm:"size:20;default:'DIKIRIM';not null" json:"delivery_method"` // DIKIRIM, DIAMBIL
	// PBF / SP Requirements
	SPType           string              `gorm:"size:50;default:'REGULER'" json:"sp_type"` // REGULER, NARKOTIKA, PSIKOTROPIKA, PREKURSOR, OOT
	SPNumber         string              `gorm:"size:100" json:"sp_number"`
	APJName          string              `gorm:"size:150" json:"apj_name"`
	APJSIPANo        string              `gorm:"column:apj_sipa_no;size:100" json:"apj_sipa_no"`
	PbfDocumentURL   string              `gorm:"type:text" json:"pbf_document_url"`
	IsVerified       bool                `gorm:"default:false" json:"is_verified"`
	VerifiedAt       *time.Time          `json:"verified_at"`
	VerifiedBy       *uuid.UUID          `gorm:"type:uuid" json:"verified_by"`
	ComputerName     string              `gorm:"size:100;default:'ISB-SEWA11-S-NB'" json:"computer_name"`
	CreatedBy        uuid.UUID           `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy        *uuid.UUID          `gorm:"type:uuid" json:"updated_by"`
	Items            []PurchaseOrderItem `gorm:"foreignKey:PurchaseOrderID" json:"items,omitempty"`

	Warehouse *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Supplier  *Supplier  `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	User      *User      `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier  *User      `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
	Verifier  *User      `gorm:"foreignKey:VerifiedBy" json:"verifier,omitempty"`
}

type PurchaseOrderItem struct {
	BaseModel
	PurchaseOrderID uuid.UUID  `gorm:"type:uuid;not null;index" json:"purchase_order_id"`
	SupplierID      *uuid.UUID `gorm:"type:uuid;index" json:"supplier_id"`
	ProductID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID          uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	Qty             float64    `gorm:"type:numeric(15,4);not null" json:"qty"`
	ReceivedQty     float64    `gorm:"type:numeric(15,4);default:0" json:"received_qty"`
	CancelledQty    float64    `gorm:"type:numeric(15,4);default:0" json:"cancelled_qty"`
	UnitPrice       float64    `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	Discount        float64    `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount     float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	IsFulfilled     bool       `gorm:"default:false" json:"is_fulfilled"`
	PurchaseID      *uuid.UUID `gorm:"type:uuid;index" json:"purchase_id"`
	FulfilledAt     *time.Time `json:"fulfilled_at"`

	Supplier *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Product  *Product  `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit     *Unit     `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type Purchase struct {
	BaseModel
	CompanyID       uuid.UUID      `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID        uuid.UUID      `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	SupplierID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"supplier_id"`
	PurchaseOrderID *uuid.UUID     `gorm:"type:uuid;index" json:"purchase_order_id"`
	InvoiceNo       string         `gorm:"size:50;uniqueIndex;not null" json:"invoice_no"`
	Date            time.Time      `gorm:"not null" json:"date"`
	DueDate         time.Time      `gorm:"not null" json:"due_date"`
	Status          string         `gorm:"size:20;default:'DRAFT';not null" json:"status"` // DRAFT, POSTED, CANCELLED
	PaymentStatus   string         `gorm:"size:20;default:'UNPAID';not null" json:"payment_status"` // UNPAID, PARTIAL, PAID
	Subtotal        float64        `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	TaxPercent      float64        `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	TaxAmount       float64        `gorm:"type:numeric(15,2);default:0" json:"tax_amount"`
	Discount        float64        `gorm:"type:numeric(15,2);default:0" json:"discount"`
	ShippingFee     float64        `gorm:"type:numeric(15,2);default:0" json:"shipping_fee"`
	TotalAmount     float64        `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	PaidAmount      float64        `gorm:"type:numeric(15,2);default:0" json:"paid_amount"`
	DPAmount        float64        `gorm:"type:numeric(15,2);default:0" json:"dp_amount"`
	RemainingAmount float64        `gorm:"type:numeric(15,2);default:0" json:"remaining_amount"`
	CashAccountID   *uuid.UUID     `gorm:"type:uuid;index" json:"cash_account_id"`
	DeliveryMethod  string         `gorm:"size:20;default:'DIKIRIM';not null" json:"delivery_method"` // DIKIRIM, DIAMBIL
	Notes           string         `gorm:"type:text" json:"notes"`
	// PBF Invoicing Requirements
	PBFInvoiceNo       string      `gorm:"size:100" json:"pbf_invoice_no"`
	PBFDeliveryOrderNo string      `gorm:"size:100" json:"pbf_delivery_order_no"`
	TaxInvoiceNo       string      `gorm:"size:100" json:"tax_invoice_no"`
	PbfDocumentURL     string      `gorm:"type:text" json:"pbf_document_url"`
	ComputerName       string      `gorm:"size:50;default:'WEB-CLIENT'" json:"computer_name"`
	IsVerified         bool        `gorm:"default:false" json:"is_verified"`
	VerifiedAt         *time.Time  `json:"verified_at"`
	VerifiedBy         *uuid.UUID  `gorm:"type:uuid" json:"verified_by"`
	// Alur Verifikasi Bertingkat: Gudang & Admin
	VerificationStatus  string      `gorm:"size:50;default:'MENUNGGU_PENERIMAAN'" json:"verification_status"` // MENUNGGU_PENERIMAAN, VERIFIKASI_GUDANG, APPROVED, REJECTED
	WarehouseVerifiedAt *time.Time  `json:"warehouse_verified_at"`
	WarehouseVerifiedBy *uuid.UUID  `gorm:"type:uuid" json:"warehouse_verified_by"`
	WarehouseNotes      string      `gorm:"type:text" json:"warehouse_notes"`
	AdminApprovedAt     *time.Time  `json:"admin_approved_at"`
	AdminApprovedBy     *uuid.UUID  `gorm:"type:uuid" json:"admin_approved_by"`
	AdminNotes          string      `gorm:"type:text" json:"admin_notes"`
	RejectReason        string      `gorm:"type:text" json:"reject_reason"`
	CreatedBy           uuid.UUID   `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy           *uuid.UUID  `gorm:"type:uuid" json:"updated_by"`
	Items               []PurchaseItem `gorm:"foreignKey:PurchaseID" json:"items,omitempty"`

	Warehouse         *Warehouse     `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Supplier          *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	PurchaseOrder     *PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`
	User              *User          `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier          *User          `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
	Verifier          *User          `gorm:"foreignKey:VerifiedBy" json:"verifier,omitempty"`
	WarehouseVerifier *User          `gorm:"foreignKey:WarehouseVerifiedBy" json:"warehouse_verifier,omitempty"`
	AdminApprover     *User          `gorm:"foreignKey:AdminApprovedBy" json:"admin_approver,omitempty"`
}

type PurchaseItem struct {
	BaseModel
	PurchaseID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"purchase_id"`
	ProductID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID      uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	Qty         float64    `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice   float64    `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	Discount    float64    `gorm:"type:numeric(15,2);default:0" json:"discount"`
	TotalAmount float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	BatchNumber string     `gorm:"size:100" json:"batch_number"`
	ExpiredDate *time.Time `json:"expired_date"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type PurchaseReturn struct {
	BaseModel
	CompanyID    uuid.UUID            `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID     uuid.UUID            `gorm:"type:uuid;not null;index" json:"branch_id"`
	WarehouseID  uuid.UUID            `gorm:"type:uuid;not null;index" json:"warehouse_id"`
	SupplierID   uuid.UUID            `gorm:"type:uuid;not null;index" json:"supplier_id"`
	PurchaseID   *uuid.UUID           `gorm:"type:uuid;index" json:"purchase_id"`
	ReturnNo       string               `gorm:"size:50;uniqueIndex;not null" json:"return_no"`
	ReturnMode     string               `gorm:"size:20;default:'MODE_1';not null" json:"return_mode"` // MODE_1, MODE_2
	DeliveryMethod string               `gorm:"size:20;default:'DIAMBIL';not null" json:"delivery_method"` // DIAMBIL, DIKIRIM
	Date         time.Time            `gorm:"not null" json:"date"`
	TaxType      string               `gorm:"size:20;default:'NON'" json:"tax_type"` // NON, INCLUDE, EXCLUDE
	Subtotal     float64              `gorm:"type:numeric(15,2);default:0" json:"subtotal"`
	TaxPercent   float64              `gorm:"type:numeric(5,2);default:0" json:"tax_percent"`
	TaxAmount    float64              `gorm:"type:numeric(15,2);default:0" json:"tax_amount"`
	OtherCost    float64              `gorm:"type:numeric(15,2);default:0" json:"other_cost"`
	TotalAmount  float64              `gorm:"type:numeric(15,2);default:0" json:"total_amount"`
	Status       string               `gorm:"size:30;default:'DRAFT';not null;index" json:"status"` // DRAFT, VERIFIKASI_GUDANG, DISETUJUI_ADMIN, DALAM_PENGIRIMAN, MENUNGGU_KONFIRMASI_PBF, SELESAI, DITOLAK, CANCELLED
	Reason       string               `gorm:"type:text" json:"reason"`
	ComputerName string               `gorm:"size:50;default:'WEB-CLIENT'" json:"computer_name"`

	// Verifikasi Fisik Gudang
	WarehouseVerifiedAt *time.Time `json:"warehouse_verified_at"`
	WarehouseVerifiedBy *uuid.UUID `gorm:"type:uuid" json:"warehouse_verified_by"`
	WarehouseNotes      string     `gorm:"type:text" json:"warehouse_notes"`

	// Persetujuan Admin
	AdminApprovedAt *time.Time `json:"admin_approved_at"`
	AdminApprovedBy *uuid.UUID `gorm:"type:uuid" json:"admin_approved_by"`
	AdminNotes      string     `gorm:"type:text" json:"admin_notes"`
	RejectReason    string     `gorm:"type:text" json:"reject_reason"`

	// Pengiriman ke PBF
	ShippedAt          *time.Time `json:"shipped_at"`
	ShippedBy          *uuid.UUID `gorm:"type:uuid" json:"shipped_by"`
	ShippingCourier    string     `gorm:"size:100" json:"shipping_courier"`
	ShippingTrackingNo string     `gorm:"size:100" json:"shipping_tracking_no"`
	ShippingNotes      string     `gorm:"type:text" json:"shipping_notes"`

	// Konfirmasi Penerimaan PBF
	PbfConfirmedAt      *time.Time `json:"pbf_confirmed_at"`
	PbfConfirmedBy      *uuid.UUID `gorm:"type:uuid" json:"pbf_confirmed_by"`
	PbfReturnDocNo      string     `gorm:"size:100" json:"pbf_return_doc_no"` // Nota retur / Nota kredit dari PBF
	PbfNotes            string     `gorm:"type:text" json:"pbf_notes"`
	AcceptedTotalAmount float64    `gorm:"type:numeric(15,2);default:0" json:"accepted_total_amount"`
	RejectedTotalAmount float64    `gorm:"type:numeric(15,2);default:0" json:"rejected_total_amount"`

	// Integrasi Hutang & Keuangan
	SettlementStatus    string     `gorm:"size:20;default:'PENDING';index" json:"settlement_status"` // PENDING, SETTLED
	SettlementType      string     `gorm:"size:50" json:"settlement_type"` // POTONG_HUTANG, KREDIT_SUPPLIER, KEMBALI_DANA_KAS
	SettledPurchaseID   *uuid.UUID `gorm:"type:uuid;index" json:"settled_purchase_id"`
	SettledAt           *time.Time `json:"settled_at"`
	SettledBy           *uuid.UUID `gorm:"type:uuid" json:"settled_by"`
	CashAccountID       *uuid.UUID `gorm:"type:uuid;index" json:"cash_account_id"`
	DebtDeductionAmount float64    `gorm:"type:numeric(15,2);default:0" json:"debt_deduction_amount"`
	CreditBalanceAmount float64    `gorm:"type:numeric(15,2);default:0" json:"credit_balance_amount"`
	RefundAmount        float64    `gorm:"type:numeric(15,2);default:0" json:"refund_amount"`

	// Control Flags
	IsStockDeducted  bool `gorm:"default:false" json:"is_stock_deducted"`
	IsStockRestored  bool `gorm:"default:false" json:"is_stock_restored"`
	IsJournalCreated bool `gorm:"default:false" json:"is_journal_created"`

	CreatedBy  uuid.UUID                 `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy  *uuid.UUID                `gorm:"type:uuid" json:"updated_by"`
	Items      []PurchaseReturnItem      `gorm:"foreignKey:PurchaseReturnID" json:"items,omitempty"`
	StatusLogs []PurchaseReturnStatusLog `gorm:"foreignKey:PurchaseReturnID" json:"status_logs,omitempty"`

	Purchase          *Purchase  `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
	Supplier          *Supplier  `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Warehouse         *Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	User              *User      `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier          *User      `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
	WarehouseVerifier *User      `gorm:"foreignKey:WarehouseVerifiedBy" json:"warehouse_verifier,omitempty"`
	AdminApprover     *User      `gorm:"foreignKey:AdminApprovedBy" json:"admin_approver,omitempty"`
	Shipper           *User      `gorm:"foreignKey:ShippedBy" json:"shipper,omitempty"`
	CashAccount       *Account   `gorm:"foreignKey:CashAccountID" json:"cash_account,omitempty"`
}

type PurchaseReturnItem struct {
	BaseModel
	PurchaseReturnID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"purchase_return_id"`
	ProductID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID            uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	OriginalInvoiceNo string     `gorm:"size:50" json:"original_invoice_no"`
	Brand             string     `gorm:"size:100" json:"brand"`
	PurchasedQty      float64    `gorm:"type:numeric(15,4);default:0" json:"purchased_qty"`
	PurchasedUnit     string     `gorm:"size:50" json:"purchased_unit"`
	Qty               float64    `gorm:"type:numeric(15,4);not null" json:"qty"`
	UnitPrice         float64    `gorm:"type:numeric(15,2);not null" json:"unit_price"`
	DiscountPercent   float64    `gorm:"type:numeric(5,2);default:0" json:"discount_percent"`
	TotalAmount       float64    `gorm:"type:numeric(15,2);not null" json:"total_amount"`

	// Batch & Kedaluwarsa
	BatchNumber   string     `gorm:"size:100" json:"batch_number"`
	ExpiredDate   *time.Time `json:"expired_date"`
	ItemCondition string     `gorm:"size:100" json:"item_condition"` // RUSAK, KEDALUWARSA, TIDAK_SESUAI_SP, BAIK
	Reason        string     `gorm:"type:text" json:"reason"`

	// Konfirmasi PBF
	AcceptedQty float64 `gorm:"type:numeric(15,4);default:0" json:"accepted_qty"`
	RejectedQty float64 `gorm:"type:numeric(15,4);default:0" json:"rejected_qty"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Unit    *Unit    `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type PurchaseReturnStatusLog struct {
	BaseModel
	PurchaseReturnID uuid.UUID `gorm:"type:uuid;not null;index" json:"purchase_return_id"`
	Status           string    `gorm:"size:50;not null" json:"status"`
	Action           string    `gorm:"size:100;not null" json:"action"`
	Notes            string    `gorm:"type:text" json:"notes"`
	UserID           uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	CreatedAt        time.Time `json:"created_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type SupplierPayment struct {
	BaseModel
	CompanyID        uuid.UUID               `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID         uuid.UUID               `gorm:"type:uuid;not null;index" json:"branch_id"`
	SupplierID       uuid.UUID               `gorm:"type:uuid;not null;index" json:"supplier_id"`
	PaymentNo        string                  `gorm:"size:50;uniqueIndex;not null" json:"payment_no"`
	Date             time.Time               `gorm:"not null" json:"date"`
	BankID           *uuid.UUID              `gorm:"type:uuid;index" json:"bank_id"`
	PaymentMethod    string                  `gorm:"size:50;not null" json:"payment_method"` // TUNAI, TRANSFER, CEK_BG, etc.
	CheckNo          string                  `gorm:"size:50" json:"check_no"` // Nomor Cek/BG
	CheckStatus      string                  `gorm:"size:30;default:'BELUM_LUNAS'" json:"check_status"` // BELUM_LUNAS, LUNAS, BATAL
	IsCheckCleared   bool                    `gorm:"default:false" json:"is_check_cleared"`
	CheckClearedDate *time.Time              `json:"check_cleared_date"`
	TotalAmount      float64                 `gorm:"type:numeric(15,2);not null" json:"total_amount"`
	TotalDiscount    float64                 `gorm:"type:numeric(15,2);default:0" json:"total_discount"`
	Notes            string                  `gorm:"type:text" json:"notes"`
	ComputerName     string                  `gorm:"size:50;default:'WEB-CLIENT'" json:"computer_name"`
	CreatedBy        uuid.UUID               `gorm:"type:uuid;not null" json:"created_by"`
	UpdatedBy        *uuid.UUID              `gorm:"type:uuid" json:"updated_by"`
	Details          []SupplierPaymentDetail `gorm:"foreignKey:SupplierPaymentID" json:"details,omitempty"`

	Supplier *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Bank     *Bank     `gorm:"foreignKey:BankID" json:"bank,omitempty"`
	User     *User     `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
	Modifier *User     `gorm:"foreignKey:UpdatedBy" json:"modifier,omitempty"`
}

type SupplierPaymentDetail struct {
	BaseModel
	SupplierPaymentID uuid.UUID      `gorm:"type:uuid;not null;index" json:"supplier_payment_id"`
	PurchaseID        *uuid.UUID     `gorm:"type:uuid;index" json:"purchase_id"`
	PurchaseOrderID   *uuid.UUID     `gorm:"type:uuid;index" json:"purchase_order_id"`
	AmountPaid        float64        `gorm:"type:numeric(15,2);not null" json:"amount_paid"`
	Discount          float64        `gorm:"type:numeric(15,2);default:0" json:"discount"`

	Purchase      *Purchase      `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
	PurchaseOrder *PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`
}

