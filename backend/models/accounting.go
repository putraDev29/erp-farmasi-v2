package models

import (
	"time"

	"github.com/google/uuid"
)

type Account struct {
	BaseModel
	CompanyID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	Code          string     `gorm:"size:50;not null;uniqueIndex:idx_comp_acc_code" json:"code"`
	Name          string     `gorm:"size:150;not null" json:"name"`
	Type          string     `gorm:"size:30;not null;index" json:"type"` // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
	Subtype       string     `gorm:"size:50" json:"subtype"`             // CASH_BANK, RECEIVABLE, INVENTORY, CURRENT_ASSET, FIXED_ASSET, PAYABLE, EQUITY, SALES, COGS, OPERATING_EXPENSE
	NormalBalance string     `gorm:"size:10;not null" json:"normal_balance"` // DEBIT or CREDIT
	ParentID      *uuid.UUID `gorm:"type:uuid;index" json:"parent_id"`
	IsHeader      bool       `gorm:"default:false" json:"is_header"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
	Balance       float64    `gorm:"type:numeric(18,2);default:0" json:"balance"`

	Parent   *Account  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Account `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

type Journal struct {
	BaseModel
	CompanyID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"branch_id"`
	DocNo       string         `gorm:"size:50;uniqueIndex;not null" json:"doc_no"`
	Date        time.Time      `gorm:"not null;index" json:"date"`
	RefType     string         `gorm:"size:50;index" json:"ref_type"` // PURCHASE, SALE, PAYMENT, MANUAL, OPNAME, TRANSFER, DEPRECIATION
	RefNo       string         `gorm:"size:50;index" json:"ref_no"`
	Description string         `gorm:"type:text" json:"description"`
	Status      string         `gorm:"size:20;default:'POSTED';not null" json:"status"` // DRAFT, POSTED, REVERSED
	TotalDebit  float64        `gorm:"type:numeric(18,2);default:0;not null" json:"total_debit"`
	TotalCredit float64        `gorm:"type:numeric(18,2);default:0;not null" json:"total_credit"`
	CreatedBy   uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	Entries     []JournalEntry `gorm:"foreignKey:JournalID" json:"entries,omitempty"`

	User *User `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

type JournalEntry struct {
	BaseModel
	JournalID   uuid.UUID `gorm:"type:uuid;not null;index" json:"journal_id"`
	AccountID   uuid.UUID `gorm:"type:uuid;not null;index" json:"account_id"`
	Debit       float64   `gorm:"type:numeric(18,2);default:0;not null" json:"debit"`
	Credit      float64   `gorm:"type:numeric(18,2);default:0;not null" json:"credit"`
	Description string    `gorm:"size:255" json:"description"`

	Journal *Journal `gorm:"foreignKey:JournalID" json:"journal,omitempty"`
	Account *Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

type FixedAsset struct {
	BaseModel
	CompanyID          uuid.UUID   `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID           uuid.UUID   `gorm:"type:uuid;not null;index" json:"branch_id"`
	AssetCode          string      `gorm:"size:50;uniqueIndex;not null" json:"asset_code"`
	Name               string      `gorm:"size:150;not null" json:"name"`
	AcquisitionDate    time.Time   `gorm:"not null" json:"acquisition_date"`
	AcquisitionCost    float64     `gorm:"type:numeric(15,2);not null" json:"acquisition_cost"`
	SalvageValue       float64     `gorm:"type:numeric(15,2);default:0" json:"salvage_value"`
	UsefulLifeMonths   int         `gorm:"not null" json:"useful_life_months"`
	MonthlyDeprecRate  float64     `gorm:"type:numeric(15,2);default:0" json:"monthly_deprec_rate"`
	AccumulatedDeprec  float64     `gorm:"type:numeric(15,2);default:0" json:"accumulated_deprec"`
	BookValue          float64     `gorm:"type:numeric(15,2);not null" json:"book_value"`
	AssetAccountID     uuid.UUID   `gorm:"type:uuid;not null" json:"asset_account_id"`
	DeprecAccountID    uuid.UUID   `gorm:"type:uuid;not null" json:"deprec_account_id"` // Beban Penyusutan
	AccumDeprecAccID   uuid.UUID   `gorm:"type:uuid;not null" json:"accum_deprec_acc_id"` // Akumulasi Penyusutan
	Status             string      `gorm:"size:20;default:'ACTIVE';not null" json:"status"` // ACTIVE, DISPOSED

	AssetAccount     *Account `gorm:"foreignKey:AssetAccountID" json:"asset_account,omitempty"`
	DeprecAccount    *Account `gorm:"foreignKey:DeprecAccountID" json:"deprec_account,omitempty"`
	AccumDeprecAcc   *Account `gorm:"foreignKey:AccumDeprecAccID" json:"accum_deprec_acc,omitempty"`
}

type AssetDepreciation struct {
	BaseModel
	FixedAssetID uuid.UUID `gorm:"type:uuid;not null;index" json:"fixed_asset_id"`
	PeriodDate   time.Time `gorm:"not null" json:"period_date"`
	Amount       float64   `gorm:"type:numeric(15,2);not null" json:"amount"`
	JournalID    *uuid.UUID `gorm:"type:uuid;index" json:"journal_id"`

	FixedAsset *FixedAsset `gorm:"foreignKey:FixedAssetID" json:"fixed_asset,omitempty"`
}

type AccountingPeriod struct {
	BaseModel
	CompanyID uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Year      int       `gorm:"not null;uniqueIndex:idx_comp_year_month" json:"year"`
	Month     int       `gorm:"not null;uniqueIndex:idx_comp_year_month" json:"month"`
	IsClosed  bool      `gorm:"default:false" json:"is_closed"`
	ClosedAt  *time.Time `json:"closed_at"`
	ClosedBy  *uuid.UUID `gorm:"type:uuid" json:"closed_by"`
}

type CashTransaction struct {
	BaseModel
	CompanyID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"branch_id"`
	TrxNo            string     `gorm:"size:50;uniqueIndex;not null" json:"trx_no"`
	Date             time.Time  `gorm:"not null;index" json:"date"`
	Type             string     `gorm:"size:20;not null;index" json:"type"` // "IN", "OUT", "TRANSFER"
	AccountID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"account_id"` // Kas/Bank Sumber
	OppositeAccID    *uuid.UUID `gorm:"type:uuid;index" json:"opposite_acc_id"` // Akun Lawan
	TargetAccountID  *uuid.UUID `gorm:"type:uuid;index" json:"target_account_id"` // Kas/Bank Tujuan
	Amount           float64    `gorm:"type:numeric(18,2);not null" json:"amount"`
	PayeeRecipient   string     `gorm:"size:150" json:"payee_recipient"` // Penerima / Pembayar
	Description      string     `gorm:"type:text" json:"description"`
	JournalID        *uuid.UUID `gorm:"type:uuid;index" json:"journal_id"`
	CreatedBy        uuid.UUID  `gorm:"type:uuid;not null" json:"created_by"`

	Account        *Account              `gorm:"foreignKey:AccountID" json:"account,omitempty"`
	OppositeAcc    *Account              `gorm:"foreignKey:OppositeAccID" json:"opposite_acc,omitempty"`
	TargetAccount  *Account              `gorm:"foreignKey:TargetAccountID" json:"target_account,omitempty"`
	Items          []CashTransactionItem `gorm:"foreignKey:TransactionID" json:"items,omitempty"`
}

type CashTransactionItem struct {
	BaseModel
	TransactionID uuid.UUID `gorm:"type:uuid;not null;index" json:"transaction_id"`
	AccountID     uuid.UUID `gorm:"type:uuid;not null;index" json:"account_id"`
	Amount        float64   `gorm:"type:numeric(18,2);not null" json:"amount"`
	Notes         string    `gorm:"size:255" json:"notes"`

	Account *Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

type DepositRecord struct {
	BaseModel
	CompanyID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"branch_id"`
	DocNo          string     `gorm:"size:50;uniqueIndex;not null" json:"doc_no"`
	Date           time.Time  `gorm:"not null;index" json:"date"`
	PartyType      string     `gorm:"size:20;not null;index" json:"party_type"` // "SUPPLIER", "CUSTOMER", "BALANCE"
	DepositType    string     `gorm:"size:50" json:"deposit_type"` // DPIN, DOUT
	SupplierID     *uuid.UUID `gorm:"type:uuid;index" json:"supplier_id"`
	CustomerID     *uuid.UUID `gorm:"type:uuid;index" json:"customer_id"`
	CashAccountID  uuid.UUID  `gorm:"type:uuid;not null" json:"cash_account_id"`
	DepositAccID   uuid.UUID  `gorm:"type:uuid;not null" json:"deposit_acc_id"`
	Currency       string     `gorm:"size:10;default:'IDR'" json:"currency"`
	Amount         float64    `gorm:"type:numeric(18,2);not null" json:"amount"`
	Notes          string     `gorm:"type:text" json:"notes"`
	CreatedBy      *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	UpdatedBy      *uuid.UUID `gorm:"type:uuid" json:"updated_by"`
	JournalID      *uuid.UUID `gorm:"type:uuid;index" json:"journal_id"`

	Supplier    *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Customer    *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	CashAccount *Account  `gorm:"foreignKey:CashAccountID" json:"cash_account,omitempty"`
	DepositAcc  *Account  `gorm:"foreignKey:DepositAccID" json:"deposit_acc,omitempty"`
	Creator     *User     `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater     *User     `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
}

type AssetGroup struct {
	BaseModel
	CompanyID      uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code           string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name           string    `gorm:"size:150;not null" json:"name"`
	UsefulLifeYear int       `gorm:"not null;default:4" json:"useful_life_year"`
	DeprecRate     float64   `gorm:"type:numeric(5,2);default:25" json:"deprec_rate"` // Persentase tarif
	Method         string    `gorm:"size:50;default:'GARIS_LURUS'" json:"method"` // GARIS_LURUS, SALDO_MENURUN
	AssetAccID     *uuid.UUID `gorm:"type:uuid" json:"asset_acc_id"`
	DeprecAccID    *uuid.UUID `gorm:"type:uuid" json:"deprec_acc_id"`
	AccumAccID     *uuid.UUID `gorm:"type:uuid" json:"accum_acc_id"`

	AssetAcc    *Account `gorm:"foreignKey:AssetAccID" json:"asset_acc,omitempty"`
	DeprecAcc   *Account `gorm:"foreignKey:DeprecAccID" json:"deprec_acc,omitempty"`
	AccumAcc    *Account `gorm:"foreignKey:AccumAccID" json:"accum_acc,omitempty"`
}

type AccountSetting struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Key         string    `gorm:"size:100;uniqueIndex;not null" json:"key"` // e.g. "sales_income_acc", "cogs_acc", "inventory_acc", "cash_default_acc"
	AccountID   uuid.UUID `gorm:"type:uuid;not null" json:"account_id"`
	Description string    `gorm:"size:255" json:"description"`

	Account *Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

type AuditNoteItem struct {
	BaseModel
	AuditNoteID uuid.UUID `gorm:"type:uuid;not null;index" json:"audit_note_id"`
	AccountID   uuid.UUID `gorm:"type:uuid;not null;index" json:"account_id"`
	Position    string    `gorm:"size:20;not null" json:"position"` // "DEBIT" or "KREDIT"

	Account *Account `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

type AuditNote struct {
	BaseModel
	CompanyID uuid.UUID       `gorm:"type:uuid;not null;index" json:"company_id"`
	Code      string          `gorm:"size:50;index" json:"code"`     // e.g. "1000", "1027"
	Name      string          `gorm:"size:255;not null" json:"name"` // e.g. "Biaya Promosi"
	Date      time.Time       `gorm:"index" json:"date"`
	DocNo     string          `gorm:"size:50;index" json:"doc_no"`
	Category  string          `gorm:"size:50;index" json:"category"`
	Notes     string          `gorm:"type:text" json:"notes"`
	UserID    *uuid.UUID      `gorm:"type:uuid" json:"user_id,omitempty"`
	Items     []AuditNoteItem `gorm:"foreignKey:AuditNoteID;constraint:OnDelete:CASCADE" json:"items"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type InitialBalanceEntry struct {
	BaseModel
	CompanyID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	BranchID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"branch_id"`
	Type        string     `gorm:"size:20;not null;index" json:"type"` // "ACCOUNT", "PAYABLE", "RECEIVABLE"
	AccountID   *uuid.UUID `gorm:"type:uuid;index" json:"account_id"`
	SupplierID  *uuid.UUID `gorm:"type:uuid;index" json:"supplier_id"`
	CustomerID  *uuid.UUID `gorm:"type:uuid;index" json:"customer_id"`
	InvoiceNo   string     `gorm:"size:50" json:"invoice_no"`
	Date        time.Time  `gorm:"not null" json:"date"`
	DueDate     *time.Time `json:"due_date"`
	Amount      float64    `gorm:"type:numeric(18,2);not null" json:"amount"`
	Debit       float64    `gorm:"type:numeric(18,2);default:0" json:"debit"`
	Credit      float64    `gorm:"type:numeric(18,2);default:0" json:"credit"`
	Notes       string     `gorm:"type:text" json:"notes"`

	Account  *Account  `gorm:"foreignKey:AccountID" json:"account,omitempty"`
	Supplier *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Customer *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
}

