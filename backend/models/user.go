package models

import (
	"time"

	"github.com/google/uuid"
)

type Permission struct {
	BaseModel
	Name        string `gorm:"size:100;uniqueIndex;not null" json:"name"` // e.g. "product:create"
	Module      string `gorm:"size:50;not null;index" json:"module"`     // e.g. "master", "purchasing", "sales"
	Description string `gorm:"size:255" json:"description"`
}

type Role struct {
	BaseModel
	Name              string                 `gorm:"size:50;uniqueIndex;not null" json:"name"`
	Description       string                 `gorm:"size:255" json:"description"`
	IsSystem          bool                   `gorm:"default:false" json:"is_system"`
	Permissions       []Permission           `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
	ModulePermissions []RoleModulePermission `gorm:"foreignKey:RoleID" json:"module_permissions,omitempty"`
}

type RoleModulePermission struct {
	BaseModel
	RoleID                uuid.UUID `gorm:"type:uuid;index;not null" json:"role_id"`
	Category              string    `gorm:"size:50;not null" json:"category"`
	Module                string    `gorm:"size:150;not null" json:"module"`
	CanOpen               bool      `gorm:"default:false" json:"can_open"`
	CanCreate             bool      `gorm:"default:false" json:"can_create"`
	CanEdit               bool      `gorm:"default:false" json:"can_edit"`
	CanDelete             bool      `gorm:"default:false" json:"can_delete"`
	LockTransactionNumber bool      `gorm:"default:false" json:"lock_transaction_number"`
	LockDate              bool      `gorm:"default:false" json:"lock_date"`
}

type RolePermission struct {
	RoleID       uuid.UUID `gorm:"type:uuid;primaryKey" json:"role_id"`
	PermissionID uuid.UUID `gorm:"type:uuid;primaryKey" json:"permission_id"`
}

type User struct {
	BaseModel
	CompanyID    uuid.UUID  `gorm:"type:uuid;index" json:"company_id"`
	BranchID     uuid.UUID  `gorm:"type:uuid;index" json:"branch_id"`
	Username     string     `gorm:"size:50;uniqueIndex;not null" json:"username"`
	Email        string     `gorm:"size:100;uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	FullName     string     `gorm:"size:150;not null" json:"full_name"`
	Phone        string     `gorm:"size:30" json:"phone"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at"`

	Company         *Company          `gorm:"foreignKey:CompanyID" json:"company,omitempty"`
	Branch          *Branch           `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
	Roles           []Role            `gorm:"many2many:user_roles;" json:"roles,omitempty"`
	BranchAccesses  []BranchAccess    `gorm:"foreignKey:UserID" json:"branch_accesses,omitempty"`
	WarehouseAccesses []WarehouseAccess `gorm:"foreignKey:UserID" json:"warehouse_accesses,omitempty"`
}

type UserRole struct {
	UserID uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	RoleID uuid.UUID `gorm:"type:uuid;primaryKey" json:"role_id"`
}

type BranchAccess struct {
	UserID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	BranchID uuid.UUID `gorm:"type:uuid;primaryKey" json:"branch_id"`
}

type WarehouseAccess struct {
	UserID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	WarehouseID uuid.UUID `gorm:"type:uuid;primaryKey" json:"warehouse_id"`
}
