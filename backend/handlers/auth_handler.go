package handlers

import (
	"net/http"
	"time"

	"farmasi/backend/config"
	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Username dan password wajib diisi", err.Error())
		return
	}

	var user models.User
	if err := database.DB.Preload("Roles").Preload("Company").Preload("Branch").
		Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
		utils.SendError(c, http.StatusUnauthorized, "Username atau password salah", nil)
		return
	}

	if !user.IsActive {
		utils.SendError(c, http.StatusForbidden, "Akun Anda dinonaktifkan. Hubungi administrator.", nil)
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		utils.SendError(c, http.StatusUnauthorized, "Username atau password salah", nil)
		return
	}

	var roleNames []string
	for _, r := range user.Roles {
		roleNames = append(roleNames, r.Name)
	}

	token, err := utils.GenerateToken(
		user.ID,
		user.CompanyID,
		user.BranchID,
		user.Username,
		user.Email,
		roleNames,
		h.cfg.JWTSecret,
		h.cfg.JWTExpirationHours,
	)
	if err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat sesi login", err.Error())
		return
	}

	now := time.Now()
	user.LastLoginAt = &now
	database.DB.Model(&user).Update("last_login_at", now)

	// Log audit
	database.DB.Create(&models.AuditLog{
		CompanyID: user.CompanyID,
		UserID:    user.ID,
		Action:    "LOGIN",
		Entity:    "USER",
		EntityID:  user.ID.String(),
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		CreatedAt: now,
	})

	utils.SendSuccess(c, "Login berhasil", gin.H{
		"token": token,
		"user": gin.H{
			"id":         user.ID,
			"username":   user.Username,
			"full_name":  user.FullName,
			"email":      user.Email,
			"roles":      roleNames,
			"company_id": user.CompanyID,
			"branch_id":  user.BranchID,
			"company":    user.Company,
			"branch":     user.Branch,
		},
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		utils.SendError(c, http.StatusUnauthorized, "Tidak terotentikasi", nil)
		return
	}

	userID := userIDVal.(uuid.UUID)
	var user models.User
	if err := database.DB.Preload("Roles.Permissions").Preload("Company").Preload("Branch").
		Where("id = ?", userID).First(&user).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pengguna tidak ditemukan", nil)
		return
	}

	var roleNames []string
	var permNames []string
	permMap := make(map[string]bool)

	for _, r := range user.Roles {
		roleNames = append(roleNames, r.Name)
		for _, p := range r.Permissions {
			if !permMap[p.Name] {
				permMap[p.Name] = true
				permNames = append(permNames, p.Name)
			}
		}
	}

	utils.SendSuccess(c, "Data pengguna", gin.H{
		"id":          user.ID,
		"username":    user.Username,
		"full_name":   user.FullName,
		"email":       user.Email,
		"phone":       user.Phone,
		"company_id":  user.CompanyID,
		"branch_id":   user.BranchID,
		"roles":       roleNames,
		"permissions": permNames,
		"company":     user.Company,
		"branch":      user.Branch,
	})
}
