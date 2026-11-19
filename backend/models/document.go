package models

import (
	"time"

	"github.com/google/uuid"
)

type DocumentAttachment struct {
	BaseModel
	CompanyID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"company_id"`
	EntityType     string     `gorm:"size:50;not null;index" json:"entity_type"` // purchase, purchase_order, sale, sales_order, supplier, customer
	EntityID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"entity_id"`
	DocumentType   string     `gorm:"size:50;not null;index" json:"document_type"` // FAKTUR_PBF, SURAT_JALAN, FAKTUR_PAJAK, COA, SURAT_PESANAN, FAKTUR_PBF_ASAL, BUNDLE_ALL, OTHER
	UploadMode     string     `gorm:"size:20;default:'SINGLE'" json:"upload_mode"` // SINGLE, BUNDLE
	FileName       string     `gorm:"size:255;not null" json:"file_name"`
	OriginalName   string     `gorm:"size:255;not null" json:"original_name"`
	FilePath       string     `gorm:"size:500;not null" json:"file_path"`
	FileSize       int64      `gorm:"default:0" json:"file_size"`
	MimeType       string     `gorm:"size:100" json:"mime_type"`
	Notes          string     `gorm:"type:text" json:"notes"`
	ExpiryDate     *time.Time `json:"expiry_date"`
	UploadedBy     *uuid.UUID `gorm:"type:uuid" json:"uploaded_by"`

	// Persetujuan Perusahaan (Approval Workflow)
	ApprovalStatus string     `gorm:"size:30;default:'PENDING';not null" json:"approval_status"` // PENDING, APPROVED, REJECTED
	ApprovalNotes  string     `gorm:"type:text" json:"approval_notes"`
	ApprovedBy     *uuid.UUID `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt     *time.Time `json:"approved_at"`

	User     *User `gorm:"foreignKey:UploadedBy" json:"user,omitempty"`
	Approver *User `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}

type PbfRequirement struct {
	DocumentType string `json:"document_type"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	IsRequired   bool   `json:"is_required"`
}
