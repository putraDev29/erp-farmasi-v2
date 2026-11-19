package handlers

import (
	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SettingHandler struct{}

func NewSettingHandler() *SettingHandler {
	return &SettingHandler{}
}

// Numbering formats
func (h *SettingHandler) GetNumberingFormats(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var formats []models.NumberingFormat
	database.DB.Where("company_id = ?", companyID).Order("doc_type ASC").Find(&formats)
	utils.SendSuccess(c, "Format penomoran transaksi", formats)
}

// Audit Logs
func (h *SettingHandler) GetAuditLogs(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	entity := c.Query("entity")
	action := c.Query("action")

	query := database.DB.Where("company_id = ?", companyID).Preload("User").Order("created_at DESC").Limit(100)
	if entity != "" {
		query = query.Where("entity = ?", entity)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}

	var logs []models.AuditLog
	query.Find(&logs)

	utils.SendSuccess(c, "Jejak audit sistem (Audit Trail)", logs)
}
