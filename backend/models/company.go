package models

import "github.com/google/uuid"

type Company struct {
	BaseModel
	Code      string `gorm:"size:20;uniqueIndex;not null" json:"code"`
	Name      string `gorm:"size:150;not null" json:"name"`
	TaxNumber string `gorm:"size:50" json:"tax_number"`
	Address   string `gorm:"type:text" json:"address"`
	Phone     string `gorm:"size:30" json:"phone"`
	Email     string `gorm:"size:100" json:"email"`
	Currency  string `gorm:"size:10;default:'IDR'" json:"currency"`
	LogoURL      string `gorm:"type:text" json:"logo_url"`
	StampURL     string `gorm:"type:text" json:"stamp_url"`
	SignatureURL string `gorm:"type:text" json:"signature_url"`
	APJName      string `gorm:"size:150" json:"apj_name"`
	APJSIPA      string `gorm:"size:150" json:"apj_sipa"`
	APJPhone     string `gorm:"size:50" json:"apj_phone"`
	IsActive     bool   `gorm:"default:true" json:"is_active"`

	Branches []Branch `gorm:"foreignKey:CompanyID" json:"branches,omitempty"`
}

type Branch struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code        string    `gorm:"size:20;not null" json:"code"`
	Name        string    `gorm:"size:150;not null" json:"name"`
	Address     string    `gorm:"type:text" json:"address"`
	Phone       string    `gorm:"size:30" json:"phone"`
	IsHeadOffice bool     `gorm:"default:false" json:"is_head_office"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`

	Company    *Company    `gorm:"foreignKey:CompanyID" json:"company,omitempty"`
	Warehouses []Warehouse `gorm:"foreignKey:BranchID" json:"warehouses,omitempty"`
}

type Warehouse struct {
	BaseModel
	BranchID    uuid.UUID `gorm:"type:uuid;not null;index" json:"branch_id"`
	Code        string    `gorm:"size:20;not null" json:"code"`
	Name        string    `gorm:"size:150;not null" json:"name"`
	Function    string    `gorm:"size:50;default:'Utama'" json:"function"` // Utama, Cabang, Gudang
	Description string    `gorm:"size:255" json:"description"`
	AccountCode string    `gorm:"size:50" json:"account_code"` // e.g. 1-2010 - PERSEDIAAN BARANG
	Address     string    `gorm:"type:text" json:"address"`
	Phone       string    `gorm:"size:50" json:"phone"`
	Fax         string    `gorm:"size:50" json:"fax"`
	Whatsapp    string    `gorm:"size:50" json:"whatsapp"`
	Email       string    `gorm:"size:100" json:"email"`
	Type        string    `gorm:"size:30;default:'GENERAL'" json:"type"` // GENERAL, COLD_CHAIN, PHARMACY, DAMAGED
	IsActive    bool      `gorm:"default:true" json:"is_active"`

	Branch *Branch `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
}

type Department struct {
	BaseModel
	CompanyID uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	Code      string    `gorm:"size:20;not null" json:"code"`
	Name      string    `gorm:"size:100;not null" json:"name"`
}
