package handlers

import (
	"net/http"

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
	var users []models.User
	database.DB.Where("company_id = ?", companyID).
		Preload("Roles").Preload("Branch").
		Find(&users)

	utils.SendSuccess(c, "Daftar pengguna", users)
}

type CreateUserRequest struct {
	Username string    `json:"username" binding:"required"`
	Email    string    `json:"email" binding:"required"`
	Password string    `json:"password" binding:"required"`
	FullName string    `json:"full_name" binding:"required"`
	Phone    string    `json:"phone"`
	BranchID uuid.UUID `json:"branch_id" binding:"required"`
	RoleIDs  []string  `json:"role_ids"`
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
		CompanyID:    companyID,
		BranchID:     req.BranchID,
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPwd,
		FullName:     req.FullName,
		Phone:        req.Phone,
		IsActive:     true,
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
		FullName string `json:"full_name"`
		Phone    string `json:"phone"`
		IsActive *bool  `json:"is_active"`
		Password string `json:"password"`
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

	database.DB.Save(&user)
	utils.SendSuccess(c, "Data pengguna diperbarui", user)
}

// Roles & Permissions
func (h *UserHandler) GetRoles(c *gin.Context) {
	var roles []models.Role
	database.DB.Preload("Permissions").Find(&roles)
	utils.SendSuccess(c, "Daftar peran", roles)
}

func (h *UserHandler) GetPermissions(c *gin.Context) {
	var perms []models.Permission
	database.DB.Find(&perms)
	utils.SendSuccess(c, "Daftar wewenang", perms)
}
