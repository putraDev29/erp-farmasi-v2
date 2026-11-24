package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CompanyID    uuid.UUID `gorm:"type:uuid;index" json:"company_id"`
	UserID       uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Category     string    `gorm:"size:50;not null;default:'TRANSAKSI';index" json:"category"` // TRANSAKSI, MASTER, AKUNTANSI, IMPOR, SISTEM, AUTO_PATCH
	Action       string    `gorm:"size:50;not null;index" json:"action"`                       // CREATE, UPDATE, DELETE, POST, REVERSE, LOGIN, LOGOUT
	Entity       string    `gorm:"size:50;not null;index" json:"entity"`                       // PENJUALAN, PEMBELIAN, KAS, ITEM, SUPPLIER, PELANGGAN, USER, LOGIN, dll
	EntityID     string    `gorm:"size:100;not null;index" json:"entity_id"`
	DocNo        string    `gorm:"size:100;index" json:"doc_no"`                               // No Transaksi / Kode e.g. 079109/KSR/UTAMA/112
	Description  string    `gorm:"type:text" json:"description"`                               // Keterangan e.g. Insert Penjualan, Edit Item
	Status       string    `gorm:"size:20;default:'Sukses';not null" json:"status"`            // Sukses, Gagal, Info, OK
	OldValues    string    `gorm:"type:text" json:"old_values,omitempty"`
	NewValues    string    `gorm:"type:text" json:"new_values,omitempty"`
	IPAddress    string    `gorm:"size:45" json:"ip_address"`
	UserAgent    string    `gorm:"size:255" json:"user_agent"`
	ComputerName string    `gorm:"size:100;default:'Desktop (Windows)'" json:"computer_name"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
