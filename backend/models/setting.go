package models

import "github.com/google/uuid"

type Setting struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;index" json:"company_id"`
	Key         string    `gorm:"size:100;not null;index" json:"key"`
	Value       string    `gorm:"type:text" json:"value"`
	Group       string    `gorm:"size:50;not null;index" json:"group"` // GENERAL, SALES, PURCHASING, ACCOUNTING, PRINTER
	Description string    `gorm:"size:255" json:"description"`
}

type NumberingFormat struct {
	BaseModel
	CompanyID     uuid.UUID `gorm:"type:uuid;index" json:"company_id"`
	DocType       string    `gorm:"size:50;not null;index" json:"doc_type"` // PO, PI, SO, SI, SR, PR, JV, ST, SO_OPNAME
	Prefix        string    `gorm:"size:20;not null" json:"prefix"`
	Suffix        string    `gorm:"size:20" json:"suffix"`
	CounterLength int       `gorm:"default:5" json:"counter_length"`
	CurrentNumber int64     `gorm:"default:0" json:"current_number"`
	ResetPeriod   string    `gorm:"size:20;default:'YEARLY'" json:"reset_period"` // DAILY, MONTHLY, YEARLY, NEVER
}
