package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CompanyHandler struct{}

func NewCompanyHandler() *CompanyHandler {
	return &CompanyHandler{}
}

// Companies
func (h *CompanyHandler) GetCompanies(c *gin.Context) {
	var companies []models.Company
	database.DB.Preload("Branches.Warehouses").Find(&companies)
	utils.SendSuccess(c, "Daftar perusahaan", companies)
}

func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var comp models.Company
	if err := database.DB.First(&comp, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Perusahaan tidak ditemukan", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&comp); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	database.DB.Save(&comp)
	utils.SendSuccess(c, "Perusahaan berhasil diperbarui", comp)
}

func (h *CompanyHandler) UploadAsset(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "File tidak ditemukan", err.Error())
		return
	}

	uploadDir := filepath.Join(".", "uploads", "company")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat direktori upload", err.Error())
		return
	}

	origName := filepath.Base(fileHeader.Filename)
	cleanExt := strings.ToLower(filepath.Ext(origName))
	storedFileName := fmt.Sprintf("asset_%d%s", time.Now().UnixNano(), cleanExt)
	destPath := filepath.Join(uploadDir, storedFileName)

	if err := c.SaveUploadedFile(fileHeader, destPath); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan file", err.Error())
		return
	}

	webPath := fmt.Sprintf("/uploads/company/%s", storedFileName)
	utils.SendSuccess(c, "File berhasil diunggah", gin.H{
		"url":      webPath,
		"filename": storedFileName,
	})
}

// Branches
func (h *CompanyHandler) GetBranches(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var branches []models.Branch
	database.DB.Where("company_id = ?", companyID).Preload("Warehouses").Find(&branches)
	utils.SendSuccess(c, "Daftar cabang", branches)
}

func (h *CompanyHandler) CreateBranch(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var branch models.Branch
	if err := c.ShouldBindJSON(&branch); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data cabang tidak valid", err.Error())
		return
	}

	branch.CompanyID = companyID
	if err := database.DB.Create(&branch).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat cabang", err.Error())
		return
	}

	utils.SendCreated(c, "Cabang berhasil dibuat", branch)
}

func (h *CompanyHandler) UpdateBranch(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var branch models.Branch
	if err := database.DB.First(&branch, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Cabang tidak ditemukan", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&branch); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	database.DB.Save(&branch)
	utils.SendSuccess(c, "Cabang berhasil diperbarui", branch)
}

// Warehouses
func (h *CompanyHandler) GetWarehouses(c *gin.Context) {
	branchID := c.MustGet("branch_id").(uuid.UUID)
	all := c.Query("all")

	var warehouses []models.Warehouse
	query := database.DB.Preload("Branch")
	if all != "true" {
		query = query.Where("branch_id = ?", branchID)
	}
	query.Find(&warehouses)

	utils.SendSuccess(c, "Daftar gudang", warehouses)
}

func (h *CompanyHandler) CreateWarehouse(c *gin.Context) {
	var wh models.Warehouse
	if err := c.ShouldBindJSON(&wh); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data gudang tidak valid", err.Error())
		return
	}

	if wh.BranchID == uuid.Nil {
		wh.BranchID = c.MustGet("branch_id").(uuid.UUID)
	}

	if strings.TrimSpace(wh.Code) == "" || strings.EqualFold(wh.Code, "auto") {
		var count int64
		database.DB.Model(&models.Warehouse{}).Where("branch_id = ?", wh.BranchID).Count(&count)
		wh.Code = fmt.Sprintf("GUD-%02d", count+1)
	}

	if err := database.DB.Create(&wh).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat gudang", err.Error())
		return
	}

	utils.SendCreated(c, "Gudang berhasil dibuat", wh)
}

func (h *CompanyHandler) UpdateWarehouse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var wh models.Warehouse
	if err := database.DB.First(&wh, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Gudang tidak ditemukan", err.Error())
		return
	}

	if err := c.ShouldBindJSON(&wh); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	database.DB.Save(&wh)
	utils.SendSuccess(c, "Gudang berhasil diperbarui", wh)
}

func (h *CompanyHandler) DeleteWarehouse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	if err := database.DB.Delete(&models.Warehouse{}, id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus gudang", err.Error())
		return
	}

	utils.SendSuccess(c, "Gudang berhasil dihapus", nil)
}
