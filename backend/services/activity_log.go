package services

import (
	"farmasi/backend/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ActivityLogParam struct {
	CompanyID    uuid.UUID
	UserID       uuid.UUID
	Category     string // TRANSAKSI, MASTER, AKUNTANSI, IMPOR, SISTEM, AUTO_PATCH
	Action       string // INSERT, UPDATE, DELETE, POST, VERIFIKASI, APPROVAL, LOGIN, LOGOUT, dll
	Entity       string // PENJUALAN, PEMBELIAN, KAS, ITEM, SUPPLIER, PELANGGAN, USER, LOGIN, dll
	EntityID     string
	DocNo        string // No Transaksi / Kode e.g. 079109/KSR/UTAMA/112, INV/..., PO/...
	Description  string // Keterangan e.g. Insert Penjualan, Edit Item
	Status       string // Sukses, Gagal, Info, OK
	OldValues    string
	NewValues    string
	IPAddress    string
	UserAgent    string
	ComputerName string
}

// RecordActivity mencatat aktivitas pengguna ke dalam audit_logs database
func RecordActivity(tx *gorm.DB, param ActivityLogParam) {
	if param.Status == "" {
		param.Status = "Sukses"
	}
	if param.ComputerName == "" {
		param.ComputerName = "ISB-SEWA11-S-NB"
	}
	if param.Category == "" {
		param.Category = "TRANSAKSI"
	}

	logEntry := models.AuditLog{
		CompanyID:    param.CompanyID,
		UserID:       param.UserID,
		Category:     param.Category,
		Action:       param.Action,
		Entity:       param.Entity,
		EntityID:     param.EntityID,
		DocNo:        param.DocNo,
		Description:  param.Description,
		Status:       param.Status,
		OldValues:    param.OldValues,
		NewValues:    param.NewValues,
		IPAddress:    param.IPAddress,
		UserAgent:    param.UserAgent,
		ComputerName: param.ComputerName,
		CreatedAt:    time.Now(),
	}

	if tx != nil {
		tx.Create(&logEntry)
	}
}
