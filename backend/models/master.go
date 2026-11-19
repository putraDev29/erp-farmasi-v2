package models

import "github.com/google/uuid"

type Category struct {
	BaseModel
	CompanyID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string     `gorm:"size:30;not null" json:"code"`
	Name        string     `gorm:"size:100;not null" json:"name"`
	Description string     `gorm:"size:255" json:"description"`
	ParentID    *uuid.UUID `gorm:"type:uuid;index" json:"parent_id"`
}

type Brand struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string    `gorm:"size:30;not null" json:"code"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
}

type Unit struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string    `gorm:"size:20;not null" json:"code"`
	Name        string    `gorm:"size:50;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
}

type Product struct {
	BaseModel
	CompanyID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	Code          string     `gorm:"size:50;not null;index" json:"code"`
	Barcode       string     `gorm:"size:50;index" json:"barcode"`
	SKU           string     `gorm:"size:100;index" json:"sku"`
	Name          string     `gorm:"size:200;not null;index" json:"name"`
	Type          string     `gorm:"size:30;default:'BARANG';not null" json:"type"` // BARANG, JASA, RAKITAN_PROSES, RAKITAN_NON_PROSES, NON_INVENTORY, BIAYA, VARIAN
	IsSerial      bool       `gorm:"default:false" json:"is_serial"`
	CategoryID    *uuid.UUID `gorm:"type:uuid;index" json:"category_id"`
	SubCategoryID *uuid.UUID `gorm:"type:uuid;index" json:"sub_category_id"`
	BrandID       *uuid.UUID `gorm:"type:uuid;index" json:"brand_id"`
	Rack          string     `gorm:"size:100" json:"rack"`
	SalesStatus   string     `gorm:"size:30;default:'MASIH_DIJUAL'" json:"sales_status"` // MASIH_DIJUAL, TIDAK_DIJUAL, BISA_BELI_TIDAK_DIJUAL
	MinStock      float64    `gorm:"type:numeric(12,2);default:0" json:"min_stock"`
	MaxStock      float64    `gorm:"type:numeric(12,2);default:0" json:"max_stock"`
	SupplierID    *uuid.UUID `gorm:"type:uuid;index" json:"supplier_id"`
	Description   string     `gorm:"type:text" json:"description"`
	Notes         string     `gorm:"type:text" json:"notes"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`

	// Tab 2: Satuan dan Harga
	LockPriceOnSale bool       `gorm:"default:false" json:"lock_price_on_sale"`
	PricingType     string     `gorm:"size:30;default:'SATU_HARGA'" json:"pricing_type"` // SATU_HARGA, SATUAN, LEVEL, JUMLAH
	BaseUnitID      *uuid.UUID `gorm:"type:uuid;index" json:"base_unit_id"`
	PurchasePrice   float64    `gorm:"type:numeric(15,2);default:0" json:"purchase_price"`
	MarkupPercent   float64    `gorm:"type:numeric(7,2);default:0" json:"markup_percent"`
	SellingPrice    float64    `gorm:"type:numeric(15,2);default:0" json:"selling_price"`
	Points          float64    `gorm:"type:numeric(10,2);default:0" json:"points"`
	SalesCommission float64    `gorm:"type:numeric(15,2);default:0" json:"sales_commission"`

	// Tab 3: Dimensi Barang
	Weight float64 `gorm:"type:numeric(10,2);default:0" json:"weight"` // gram
	Length float64 `gorm:"type:numeric(10,2);default:0" json:"length"` // cm
	Width  float64 `gorm:"type:numeric(10,2);default:0" json:"width"`  // cm
	Height float64 `gorm:"type:numeric(10,2);default:0" json:"height"` // cm

	// Tab 5: Akuntansi (Perkiraan Akun)
	CogsAccountID                *uuid.UUID `gorm:"type:uuid;index" json:"cogs_account_id"`
	SalesAccountID               *uuid.UUID `gorm:"type:uuid;index" json:"sales_account_id"`
	ServiceRevenueAccountID      *uuid.UUID `gorm:"type:uuid;index" json:"service_revenue_account_id"`
	InventoryAccountID           *uuid.UUID `gorm:"type:uuid;index" json:"inventory_account_id"`
	NonInventoryExpenseAccountID *uuid.UUID `gorm:"type:uuid;index" json:"non_inventory_expense_account_id"`
	WipInventoryAccountID        *uuid.UUID `gorm:"type:uuid;index" json:"wip_inventory_account_id"`
	AssemblyLaborAccountID       *uuid.UUID `gorm:"type:uuid;index" json:"assembly_labor_account_id"`
	AssemblyOverheadAccountID    *uuid.UUID `gorm:"type:uuid;index" json:"assembly_overhead_account_id"`

	// Tab 7: Share Item
	CanShare         bool       `gorm:"default:false" json:"can_share"`
	ShareLink        string     `gorm:"size:255" json:"share_link"`
	YoutubeVideoID   string     `gorm:"size:100" json:"youtube_video_id"`
	ItemCondition    string     `gorm:"size:20;default:'BARU'" json:"item_condition"` // BARU, BEKAS
	ShareWarehouseID *uuid.UUID `gorm:"type:uuid;index" json:"share_warehouse_id"`
	SubDescription   string     `gorm:"type:text" json:"sub_description"`
	LongDescription  string     `gorm:"type:text" json:"long_description"`

	// Tab 8 & 9: Marketplace & Data Pendukung Pajak
	SyncMarketplace        bool    `gorm:"default:false" json:"sync_marketplace"`
	MarketplaceCode        string  `gorm:"size:100" json:"marketplace_code"`
	TaxType                string  `gorm:"size:50;default:'NON_PAJAK'" json:"tax_type"`
	TaxIncludePercent      float64 `gorm:"type:numeric(7,2);default:0" json:"tax_include_percent"`
	TaxReferenceCode       string  `gorm:"size:10" json:"tax_reference_code"` // Max 5 char DJP
	TaxGoodsServicesOption string  `gorm:"size:100" json:"tax_goods_services_option"`

	Category                 *Category        `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	SubCategory              *Category        `gorm:"foreignKey:SubCategoryID" json:"sub_category,omitempty"`
	Brand                    *Brand           `gorm:"foreignKey:BrandID" json:"brand,omitempty"`
	BaseUnit                 *Unit            `gorm:"foreignKey:BaseUnitID" json:"base_unit,omitempty"`
	Supplier                 *Supplier        `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	ShareWarehouse           *Warehouse       `gorm:"foreignKey:ShareWarehouseID" json:"share_warehouse,omitempty"`
	CogsAccount              *Account         `gorm:"foreignKey:CogsAccountID" json:"cogs_account,omitempty"`
	SalesAccount             *Account         `gorm:"foreignKey:SalesAccountID" json:"sales_account,omitempty"`
	ServiceRevenueAccount    *Account         `gorm:"foreignKey:ServiceRevenueAccountID" json:"service_revenue_account,omitempty"`
	InventoryAccount         *Account         `gorm:"foreignKey:InventoryAccountID" json:"inventory_account,omitempty"`
	NonInventoryAccount      *Account         `gorm:"foreignKey:NonInventoryExpenseAccountID" json:"non_inventory_account,omitempty"`
	WipAccount               *Account         `gorm:"foreignKey:WipInventoryAccountID" json:"wip_account,omitempty"`
	AssemblyLaborAccount     *Account         `gorm:"foreignKey:AssemblyLaborAccountID" json:"assembly_labor_account,omitempty"`
	AssemblyOverheadAccount  *Account         `gorm:"foreignKey:AssemblyOverheadAccountID" json:"assembly_overhead_account,omitempty"`
	Conversions              []UnitConversion `gorm:"foreignKey:ProductID" json:"conversions,omitempty"`
	Prices                   []ProductPrice   `gorm:"foreignKey:ProductID" json:"prices,omitempty"`
	Discounts                []ItemDiscount   `gorm:"foreignKey:ProductID" json:"discounts,omitempty"`
	Images                   []ProductImage   `gorm:"foreignKey:ProductID" json:"images,omitempty"`
	StockBalances            []StockBalance   `gorm:"foreignKey:ProductID" json:"stock_balances,omitempty"`
	TotalStock               float64          `gorm:"-" json:"total_stock"`
	AvgCost                  float64          `gorm:"-" json:"avg_cost"`
}

type ItemDiscount struct {
	BaseModel
	ProductID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	CustomerGroupID *uuid.UUID `gorm:"type:uuid;index" json:"customer_group_id"`
	GroupCode       string     `gorm:"size:50;not null" json:"group_code"`
	Discount1       float64    `gorm:"type:numeric(7,2);default:0" json:"discount_1"`
	Discount2       float64    `gorm:"type:numeric(7,2);default:0" json:"discount_2"`
	Discount3       float64    `gorm:"type:numeric(7,2);default:0" json:"discount_3"`
	Discount4       float64    `gorm:"type:numeric(7,2);default:0" json:"discount_4"`

	CustomerGroup *CustomerGroup `gorm:"foreignKey:CustomerGroupID" json:"customer_group,omitempty"`
}

type ProductImage struct {
	BaseModel
	ProductID  uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	ImageURL   string    `gorm:"type:text;not null" json:"image_url"`
	OrderIndex int       `gorm:"default:0" json:"order_index"`
	Caption    string    `gorm:"size:255" json:"caption"`
}

type UnitConversion struct {
	BaseModel
	ProductID  uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	FromUnitID uuid.UUID `gorm:"type:uuid;not null" json:"from_unit_id"`
	ToUnitID   uuid.UUID `gorm:"type:uuid;not null" json:"to_unit_id"`
	Multiplier float64   `gorm:"type:numeric(12,4);not null;default:1" json:"multiplier"`

	FromUnit *Unit `gorm:"foreignKey:FromUnitID" json:"from_unit,omitempty"`
	ToUnit   *Unit `gorm:"foreignKey:ToUnitID" json:"to_unit,omitempty"`
}

type ProductPrice struct {
	BaseModel
	ProductID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"product_id"`
	UnitID          uuid.UUID  `gorm:"type:uuid;not null" json:"unit_id"`
	CustomerGroupID *uuid.UUID `gorm:"type:uuid;index" json:"customer_group_id"`
	MinQty          float64    `gorm:"type:numeric(12,2);default:1" json:"min_qty"`
	Price           float64    `gorm:"type:numeric(15,2);not null" json:"price"`

	Unit          *Unit          `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
	CustomerGroup *CustomerGroup `gorm:"foreignKey:CustomerGroupID" json:"customer_group,omitempty"`
}

type CustomerGroup struct {
	BaseModel
	CompanyID       uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code            string    `gorm:"size:30;not null" json:"code"`
	Name            string    `gorm:"size:100;not null" json:"name"`
	DiscountPercent float64   `gorm:"type:numeric(5,2);default:0" json:"discount_percent"`
	PriceLevel      int       `gorm:"default:1" json:"price_level"`
}

type Territory struct {
	BaseModel
	CompanyID uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code      string    `gorm:"size:30;not null" json:"code"`
	Name      string    `gorm:"size:100;not null" json:"name"`
}

type SubTerritory struct {
	BaseModel
	CompanyID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	TerritoryID *uuid.UUID `gorm:"type:uuid;index" json:"territory_id"`
	Code        string     `gorm:"size:30;not null" json:"code"`
	Name        string     `gorm:"size:100;not null" json:"name"`

	Territory *Territory `gorm:"foreignKey:TerritoryID" json:"territory,omitempty"`
}

type Customer struct {
	BaseModel
	CompanyID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	Code              string     `gorm:"size:50;not null;index" json:"code"`
	Name              string     `gorm:"size:150;not null;index" json:"name"`
	CustomerGroupID   *uuid.UUID `gorm:"type:uuid;index" json:"customer_group_id"`
	TerritoryID       *uuid.UUID `gorm:"type:uuid;index" json:"territory_id"`
	Phone             string     `gorm:"size:30" json:"phone"`
	Email             string     `gorm:"size:100" json:"email"`
	Address           string     `gorm:"type:text" json:"address"`
	City              string     `gorm:"size:100" json:"city"`
	Province          string     `gorm:"size:100" json:"province"`
	ContactPerson     string     `gorm:"size:100" json:"contact_person"`
	TotalOrders       float64    `gorm:"type:numeric(12,2);default:0" json:"total_orders"`
	TotalSpent        float64    `gorm:"type:numeric(15,2);default:0" json:"total_spent"`
	AvgSpent          float64    `gorm:"type:numeric(15,2);default:0" json:"avg_spent"`
	LastVisit         string     `gorm:"size:50" json:"last_visit"`
	Notes             string     `gorm:"type:text" json:"notes"`
	CreditLimit       float64    `gorm:"type:numeric(15,2);default:0" json:"credit_limit"`
	TermOfPaymentDays int        `gorm:"default:0" json:"term_of_payment_days"`
	Points            int64      `gorm:"default:0" json:"points"`
	IsActive          bool       `gorm:"default:true" json:"is_active"`

	CustomerGroup *CustomerGroup `gorm:"foreignKey:CustomerGroupID" json:"customer_group,omitempty"`
	Territory     *Territory     `gorm:"foreignKey:TerritoryID" json:"territory,omitempty"`
}

type Supplier struct {
	BaseModel
	CompanyID         uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code              string    `gorm:"size:50;not null;index" json:"code"`
	Name              string    `gorm:"size:150;not null;index" json:"name"`
	Phone             string    `gorm:"size:50" json:"phone"`
	Email             string    `gorm:"size:100" json:"email"`
	Address           string    `gorm:"type:text" json:"address"`
	City              string    `gorm:"size:100" json:"city"`
	Province          string    `gorm:"size:100" json:"province"`
	ContactPerson     string    `gorm:"size:100" json:"contact_person"`
	Notes             string    `gorm:"type:text" json:"notes"`
	TermOfPaymentDays int       `gorm:"default:0" json:"term_of_payment_days"`
	BankName          string    `gorm:"size:50" json:"bank_name"`
	BankAccount       string    `gorm:"size:50" json:"bank_account"`
	BankHolder        string    `gorm:"size:100" json:"bank_holder"`
	IsActive          bool      `gorm:"default:true" json:"is_active"`
}

type Bank struct {
	BaseModel
	CompanyID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	Code          string     `gorm:"size:30;not null" json:"code"`
	Name          string     `gorm:"size:100;not null" json:"name"`
	AccountNumber string     `gorm:"size:50" json:"account_number"`
	AccountHolder string     `gorm:"size:100" json:"account_holder"`
	BranchName    string     `gorm:"size:100" json:"branch_name"`
	AccountID     *uuid.UUID `gorm:"type:uuid;index" json:"account_id"` // COA link
	IsActive      bool       `gorm:"default:true" json:"is_active"`
}

type SubCategory struct {
	BaseModel
	CompanyID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	CategoryID  *uuid.UUID `gorm:"type:uuid;index" json:"category_id"`
	Code        string     `gorm:"size:30;not null" json:"code"`
	Name        string     `gorm:"size:100;not null" json:"name"`
	Description string     `gorm:"size:255" json:"description"`

	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type Variant struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string    `gorm:"size:50;not null" json:"code"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
}

type EMoney struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string    `gorm:"size:50;not null" json:"code"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
}

type ShippingFee struct {
	BaseModel
	CompanyID  uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Expedition string    `gorm:"size:50;not null" json:"expedition"`
	FromCity   string    `gorm:"size:100;not null" json:"from_city"`
	ToCity     string    `gorm:"size:100;not null" json:"to_city"`
	Country    string    `gorm:"size:100;default:'Indonesia'" json:"country"`
	Cost1      float64   `gorm:"type:numeric(15,2);default:0" json:"cost_1"`
	Cost2      float64   `gorm:"type:numeric(15,2);default:0" json:"cost_2"`
	Cost3      float64   `gorm:"type:numeric(15,2);default:0" json:"cost_3"`
	Notes      string    `gorm:"size:255" json:"notes"`
}

type PaymentMethod struct {
	BaseModel
	CompanyID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	Code       string     `gorm:"size:30;not null" json:"code"`
	Name       string     `gorm:"size:100;not null" json:"name"`
	Type       string     `gorm:"size:30;default:'CASH'" json:"type"` // CASH, BANK_TRANSFER, CARD, QRIS, EWALLET
	BankID     *uuid.UUID `gorm:"type:uuid;index" json:"bank_id"`
	FeePercent float64    `gorm:"type:numeric(5,2);default:0" json:"fee_percent"`
	IsActive   bool       `gorm:"default:true" json:"is_active"`

	Bank *Bank `gorm:"foreignKey:BankID" json:"bank,omitempty"`
}

type SalesRepresentative struct {
	BaseModel
	CompanyID      uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code           string    `gorm:"size:30;not null" json:"code"`
	Name           string    `gorm:"size:100;not null" json:"name"`
	Address        string    `gorm:"type:text" json:"address"`
	City           string    `gorm:"size:100" json:"city"`
	Province       string    `gorm:"size:100" json:"province"`
	ContactPerson  string    `gorm:"size:100" json:"contact_person"`
	Phone          string    `gorm:"size:30" json:"phone"`
	Email          string    `gorm:"size:100" json:"email"`
	Notes          string    `gorm:"type:text" json:"notes"`
	CommissionRate float64   `gorm:"type:numeric(5,2);default:0" json:"commission_rate"`
	IsActive       bool      `gorm:"default:true" json:"is_active"`
}

type PeriodicDiscount struct {
	BaseModel
	CompanyID       uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code            string    `gorm:"size:50;not null" json:"code"`
	PeriodType      string    `gorm:"size:50;default:'HARIAN'" json:"period_type"` // HARIAN, BULANAN, EVENT
	IsActive        bool      `gorm:"default:true" json:"is_active"`
	Priority        int       `gorm:"default:1" json:"priority"`
	DiscountPercent float64   `gorm:"type:numeric(5,2);default:0" json:"discount_percent"`
	StartDate       string    `gorm:"size:30" json:"start_date"`
	EndDate         string    `gorm:"size:30" json:"end_date"`
}

type PeriodicPromotion struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string    `gorm:"size:50;not null" json:"code"`
	PeriodType  string    `gorm:"size:50;default:'HARIAN'" json:"period_type"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	Priority    int       `gorm:"default:1" json:"priority"`
	Description string    `gorm:"size:255" json:"description"`
	StartDate   string    `gorm:"size:30" json:"start_date"`
	EndDate     string    `gorm:"size:30" json:"end_date"`
}

type TebusMurahPromotion struct {
	BaseModel
	CompanyID     uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code          string    `gorm:"size:50;not null" json:"code"`
	PeriodType    string    `gorm:"size:50;default:'HARIAN'" json:"period_type"`
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	Priority      int       `gorm:"default:1" json:"priority"`
	MinTotalSpent float64   `gorm:"type:numeric(15,2);default:0" json:"min_total_spent"`
	StartDate     string    `gorm:"size:30" json:"start_date"`
	EndDate       string    `gorm:"size:30" json:"end_date"`
}

type CustomerPointSetting struct {
	BaseModel
	CompanyID               uuid.UUID `gorm:"type:uuid;not null;index;unique" json:"company_id"`
	PointType               string    `gorm:"size:50;default:'TIDAK_MEMAKAI'" json:"point_type"` // TIDAK_MEMAKAI, POTONGAN, TUKAR_HADIAH, POINT_ITEM
	InvoiceMultipleAmount   float64   `gorm:"type:numeric(15,2);default:100000" json:"invoice_multiple_amount"`
	CollectStartDate        string    `gorm:"size:30;default:'2023-01-01'" json:"collect_start_date"`
	CollectEndDate          string    `gorm:"size:30;default:'2026-12-31'" json:"collect_end_date"`
	RedeemStartDate         string    `gorm:"size:30;default:'2023-01-01'" json:"redeem_start_date"`
	RedeemEndDate           string    `gorm:"size:30;default:'2026-12-31'" json:"redeem_end_date"`
	GeneralCustomerName     string    `gorm:"size:100;default:'KASIR'" json:"general_customer_name"`
	NonMemberEarnPoints     bool      `gorm:"default:false" json:"non_member_earn_points"`
	PrintNoteDefault        string    `gorm:"type:text" json:"print_note_default"`
	PointRedeemValue        float64   `gorm:"type:numeric(15,2);default:100" json:"point_redeem_value"`
	PointValidityDays       int       `gorm:"default:30" json:"point_validity_days"`
	ShowClaimButtonInSales  bool      `gorm:"default:false" json:"show_claim_button_in_sales"`
	PrintNoteVoucher        string    `gorm:"type:text" json:"print_note_voucher"`
	PrintNoteGift           string    `gorm:"type:text" json:"print_note_gift"`
}
