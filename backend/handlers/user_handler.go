package handlers

import (
	"net/http"
	"strings"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	q := strings.TrimSpace(c.Query("q"))
	roleID := strings.TrimSpace(c.Query("role_id"))
	status := strings.TrimSpace(c.Query("status"))

	query := database.DB.Where("company_id = ?", companyID).
		Preload("Roles").Preload("Branch").
		Order("created_at DESC")

	if q != "" {
		search := "%" + strings.ToLower(q) + "%"
		query = query.Where("LOWER(username) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?",
			search, search, search, search)
	}

	if status == "active" {
		query = query.Where("is_active = ?", true)
	} else if status == "inactive" {
		query = query.Where("is_active = ?", false)
	}

	var users []models.User
	query.Find(&users)

	// Filter by role if requested
	if roleID != "" {
		if rUUID, err := uuid.Parse(roleID); err == nil {
			var filtered []models.User
			for _, u := range users {
				for _, r := range u.Roles {
					if r.ID == rUUID {
						filtered = append(filtered, u)
						break
					}
				}
			}
			users = filtered
		}
	}

	utils.SendSuccess(c, "Daftar pengguna", users)
}

type CreateUserRequest struct {
	Username            string    `json:"username" binding:"required"`
	Email               string    `json:"email" binding:"required"`
	Password            string    `json:"password" binding:"required"`
	FullName            string    `json:"full_name" binding:"required"`
	Phone               string    `json:"phone"`
	BranchID            uuid.UUID `json:"branch_id" binding:"required"`
	RoleIDs             []string  `json:"role_ids"`
	LoginPeriodActive   bool      `json:"login_period_active"`
	LoginPeriodFrom     string    `json:"login_period_from"`
	LoginPeriodTo       string    `json:"login_period_to"`
	LoginWithShift      bool      `json:"login_with_shift"`
	WaDeviceID          string    `json:"wa_device_id"`
	WarehouseAccessType string    `json:"warehouse_access_type"`
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pengguna tidak lengkap", err.Error())
		return
	}

	hashedPwd, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memproses kata sandi", err.Error())
		return
	}

	user := models.User{
		CompanyID:           companyID,
		BranchID:            req.BranchID,
		Username:            req.Username,
		Email:               req.Email,
		PasswordHash:        hashedPwd,
		FullName:            req.FullName,
		Phone:               req.Phone,
		IsActive:            true,
		LoginPeriodActive:   req.LoginPeriodActive,
		LoginPeriodFrom:     req.LoginPeriodFrom,
		LoginPeriodTo:       req.LoginPeriodTo,
		LoginWithShift:      req.LoginWithShift,
		WaDeviceID:          req.WaDeviceID,
		WarehouseAccessType: req.WarehouseAccessType,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusBadRequest, "Username atau email sudah digunakan", err.Error())
		return
	}

	for _, rIDStr := range req.RoleIDs {
		if rID, err := uuid.Parse(rIDStr); err == nil {
			var role models.Role
			if err := tx.First(&role, rID).Error; err == nil {
				tx.Model(&user).Association("Roles").Append(&role)
			}
		}
	}

	tx.Commit()

	// Reload with relations
	database.DB.Preload("Roles").Preload("Branch").First(&user, user.ID)
	utils.SendCreated(c, "Pengguna berhasil dibuat", user)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pengguna tidak ditemukan", err.Error())
		return
	}

	var updateData struct {
		FullName            string   `json:"full_name"`
		Phone               string   `json:"phone"`
		IsActive            *bool    `json:"is_active"`
		Password            string   `json:"password"`
		BranchID            *string  `json:"branch_id"`
		RoleIDs             []string `json:"role_ids"`
		LoginPeriodActive   *bool    `json:"login_period_active"`
		LoginPeriodFrom     string   `json:"login_period_from"`
		LoginPeriodTo       string   `json:"login_period_to"`
		LoginWithShift      *bool    `json:"login_with_shift"`
		WaDeviceID          string   `json:"wa_device_id"`
		WarehouseAccessType string   `json:"warehouse_access_type"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembaruan tidak valid", err.Error())
		return
	}

	if updateData.FullName != "" {
		user.FullName = updateData.FullName
	}
	if updateData.Phone != "" {
		user.Phone = updateData.Phone
	}
	if updateData.IsActive != nil {
		user.IsActive = *updateData.IsActive
	}
	if updateData.Password != "" {
		hashed, _ := utils.HashPassword(updateData.Password)
		user.PasswordHash = hashed
	}
	if updateData.BranchID != nil {
		if bID, err := uuid.Parse(*updateData.BranchID); err == nil {
			user.BranchID = bID
		}
	}
	if updateData.LoginPeriodActive != nil {
		user.LoginPeriodActive = *updateData.LoginPeriodActive
	}
	if updateData.LoginPeriodFrom != "" {
		user.LoginPeriodFrom = updateData.LoginPeriodFrom
	}
	if updateData.LoginPeriodTo != "" {
		user.LoginPeriodTo = updateData.LoginPeriodTo
	}
	if updateData.LoginWithShift != nil {
		user.LoginWithShift = *updateData.LoginWithShift
	}
	if updateData.WaDeviceID != "" {
		user.WaDeviceID = updateData.WaDeviceID
	}
	if updateData.WarehouseAccessType != "" {
		user.WarehouseAccessType = updateData.WarehouseAccessType
	}

	tx := database.DB.Begin()
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui pengguna", err.Error())
		return
	}

	if updateData.RoleIDs != nil {
		tx.Model(&user).Association("Roles").Clear()
		for _, rIDStr := range updateData.RoleIDs {
			if rID, err := uuid.Parse(rIDStr); err == nil {
				var role models.Role
				if err := tx.First(&role, rID).Error; err == nil {
					tx.Model(&user).Association("Roles").Append(&role)
				}
			}
		}
	}
	tx.Commit()

	database.DB.Preload("Roles").Preload("Branch").First(&user, user.ID)
	utils.SendSuccess(c, "Data pengguna diperbarui", user)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pengguna tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	tx.Model(&user).Association("Roles").Clear()
	tx.Model(&user).Association("BranchAccesses").Clear()
	tx.Model(&user).Association("WarehouseAccesses").Clear()
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pengguna", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Pengguna berhasil dihapus", nil)
}

// ==========================================
// Roles & Permissions (Kelompok Akses User)
// ==========================================

func (h *UserHandler) GetRoles(c *gin.Context) {
	// Ensure ADMINISTRATOR role exists
	var adminRole models.Role
	if err := database.DB.Where("name = ?", "ADMINISTRATOR").First(&adminRole).Error; err != nil {
		adminRole = models.Role{
			Name:        "ADMINISTRATOR",
			Description: "Akses penuh ke seluruh modul sistem apotek dan POS",
			IsSystem:    true,
		}
		database.DB.Create(&adminRole)
		EnsureDefaultRolePermissions(adminRole.ID, "ADMINISTRATOR")
	}

	var roles []models.Role
	database.DB.Order("is_system DESC, name ASC").Find(&roles)

	// Ensure permissions exist for each role
	for _, r := range roles {
		EnsureDefaultRolePermissions(r.ID, r.Name)
	}

	utils.SendSuccess(c, "Daftar kelompok akses", roles)
}

type RoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func (h *UserHandler) CreateRole(c *gin.Context) {
	var req RoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Nama kelompok akses wajib diisi", err.Error())
		return
	}

	trimmedName := strings.TrimSpace(req.Name)
	if trimmedName == "" {
		utils.SendError(c, http.StatusBadRequest, "Nama kelompok akses tidak boleh kosong", "")
		return
	}

	var existing models.Role
	if err := database.DB.Where("LOWER(name) = ?", strings.ToLower(trimmedName)).First(&existing).Error; err == nil {
		utils.SendError(c, http.StatusBadRequest, "Nama kelompok akses sudah ada", nil)
		return
	}

	role := models.Role{
		Name:        trimmedName,
		Description: strings.TrimSpace(req.Description),
		IsSystem:    false,
	}

	if err := database.DB.Create(&role).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat kelompok akses", err.Error())
		return
	}

	// Seed default permissions
	EnsureDefaultRolePermissions(role.ID, role.Name)

	utils.SendCreated(c, "Kelompok akses berhasil dibuat", role)
}

func (h *UserHandler) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Kelompok akses tidak ditemukan", err.Error())
		return
	}

	var req RoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembaruan tidak valid", err.Error())
		return
	}

	trimmedName := strings.TrimSpace(req.Name)
	if trimmedName != "" && trimmedName != role.Name {
		// check uniqueness
		var duplicate models.Role
		if err := database.DB.Where("LOWER(name) = ? AND id != ?", strings.ToLower(trimmedName), id).First(&duplicate).Error; err == nil {
			utils.SendError(c, http.StatusBadRequest, "Nama kelompok akses sudah digunakan", nil)
			return
		}
		role.Name = trimmedName
	}

	if req.Description != "" {
		role.Description = strings.TrimSpace(req.Description)
	}

	if err := database.DB.Save(&role).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui kelompok akses", err.Error())
		return
	}

	utils.SendSuccess(c, "Kelompok akses diperbarui", role)
}

func (h *UserHandler) DeleteRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Kelompok akses tidak ditemukan", err.Error())
		return
	}

	if role.IsSystem || strings.ToUpper(role.Name) == "ADMINISTRATOR" || strings.ToUpper(role.Name) == "SUPERADMIN" {
		utils.SendError(c, http.StatusForbidden, "Kelompok akses sistem tidak dapat dihapus", nil)
		return
	}

	// Check if assigned to any user
	var userCount int64
	database.DB.Table("user_roles").Where("role_id = ?", id).Count(&userCount)
	if userCount > 0 {
		utils.SendError(c, http.StatusConflict, "Kelompok akses ini masih digunakan oleh pengguna aktif dan tidak dapat dihapus", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("role_id = ?", id).Delete(&models.RoleModulePermission{})
	tx.Model(&role).Association("Permissions").Clear()
	if err := tx.Delete(&role).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus kelompok akses", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Kelompok akses berhasil dihapus", nil)
}

func (h *UserHandler) GetRolePermissions(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Kelompok akses tidak ditemukan", err.Error())
		return
	}

	perms := EnsureDefaultRolePermissions(role.ID, role.Name)
	utils.SendSuccess(c, "Data hak akses modul", perms)
}

type UpdatePermissionItem struct {
	ID                    *uuid.UUID `json:"id"`
	Category              string     `json:"category"`
	Module                string     `json:"module"`
	CanOpen               bool       `json:"can_open"`
	CanCreate             bool       `json:"can_create"`
	CanEdit               bool       `json:"can_edit"`
	CanDelete             bool       `json:"can_delete"`
	LockTransactionNumber bool       `json:"lock_transaction_number"`
	LockDate              bool       `json:"lock_date"`
	Value                 int        `json:"value"`
}

func (h *UserHandler) UpdateRolePermissions(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Kelompok akses tidak ditemukan", err.Error())
		return
	}

	var items []UpdatePermissionItem
	if err := c.ShouldBindJSON(&items); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Format payload hak akses tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()
	for _, item := range items {
		if item.ID != nil && *item.ID != uuid.Nil {
			tx.Model(&models.RoleModulePermission{}).
				Where("id = ? AND role_id = ?", *item.ID, id).
				Updates(map[string]interface{}{
					"can_open":                item.CanOpen,
					"can_create":              item.CanCreate,
					"can_edit":                item.CanEdit,
					"can_delete":              item.CanDelete,
					"lock_transaction_number": item.LockTransactionNumber,
					"lock_date":               item.LockDate,
					"value":                   item.Value,
				})
		} else {
			// Find by role_id + category + module
			var existing models.RoleModulePermission
			err := tx.Where("role_id = ? AND category = ? AND module = ?", id, item.Category, item.Module).First(&existing).Error
			if err == nil {
				tx.Model(&existing).Updates(map[string]interface{}{
					"can_open":                item.CanOpen,
					"can_create":              item.CanCreate,
					"can_edit":                item.CanEdit,
					"can_delete":              item.CanDelete,
					"lock_transaction_number": item.LockTransactionNumber,
					"lock_date":               item.LockDate,
					"value":                   item.Value,
				})
			} else {
				p := models.RoleModulePermission{
					RoleID:                id,
					Category:              item.Category,
					Module:                item.Module,
					CanOpen:               item.CanOpen,
					CanCreate:             item.CanCreate,
					CanEdit:               item.CanEdit,
					CanDelete:             item.CanDelete,
					LockTransactionNumber: item.LockTransactionNumber,
					LockDate:              item.LockDate,
					Value:                 item.Value,
				}
				tx.Create(&p)
			}
		}
	}
	tx.Commit()

	var updatedList []models.RoleModulePermission
	database.DB.Where("role_id = ?", id).Order("category ASC, id ASC").Find(&updatedList)

	utils.SendSuccess(c, "Hak akses berhasil disimpan", updatedList)
}

func (h *UserHandler) GetPermissions(c *gin.Context) {
	var perms []models.Permission
	database.DB.Find(&perms)
	utils.SendSuccess(c, "Daftar wewenang", perms)
}
