package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CompanyID uuid.UUID `gorm:"type:uuid;index" json:"company_id"`
	UserID    uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	Action    string    `gorm:"size:50;not null;index" json:"action"` // CREATE, UPDATE, DELETE, POST, REVERSE
	Entity    string    `gorm:"size:50;not null;index" json:"entity"` // e.g. "PRODUCT", "PURCHASE", "SALE", "JOURNAL"
	EntityID  string    `gorm:"size:100;not null;index" json:"entity_id"`
	OldValues string    `gorm:"type:text" json:"old_values,omitempty"`
	NewValues string    `gorm:"type:text" json:"new_values,omitempty"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`
	UserAgent string    `gorm:"size:255" json:"user_agent"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
