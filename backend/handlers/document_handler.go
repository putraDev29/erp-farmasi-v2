package handlers

import (
	"fmt"
	"io"
	"mime/multipart"
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

type DocumentHandler struct{}

func NewDocumentHandler() *DocumentHandler {
	return &DocumentHandler{}
}

// UploadDocument handles single file or multiple file uploads (Bundle / Multi-file)
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userIDVal, hasUser := c.Get("user_id")
	var uploadedBy *uuid.UUID
	if hasUser {
		uid := userIDVal.(uuid.UUID)
		uploadedBy = &uid
	}

	entityType := c.PostForm("entity_type")
	entityIDStr := c.PostForm("entity_id")
	docType := c.PostForm("document_type")
	uploadMode := c.DefaultPostForm("upload_mode", "SINGLE")
	notes := c.PostForm("notes")
	expiryDateStr := c.PostForm("expiry_date")

	var docExpiryDate *time.Time
	if expiryDateStr != "" {
		if t, err := time.Parse("2006-01-02", expiryDateStr); err == nil {
			docExpiryDate = &t
		} else if t, err := time.Parse(time.RFC3339, expiryDateStr); err == nil {
			docExpiryDate = &t
		}
	}

	if entityType == "" || entityIDStr == "" {
		utils.SendError(c, http.StatusBadRequest, "entity_type dan entity_id wajib diisi", nil)
		return
	}

	entityID, err := uuid.Parse(entityIDStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "entity_id tidak valid (harus UUID)", err.Error())
		return
	}

	if docType == "" {
		if uploadMode == "BUNDLE" {
			docType = "BUNDLE_ALL"
		} else {
			docType = "OTHER"
		}
	}

	// Aturan Persetujuan CDOB Farmasi:
	// Untuk pembelian dan penjualan tidak perlu persetujuan (otomatis APPROVED).
	// Yang memerlukan persetujuan perusahaan/APJ hanya dokumen pelanggan PBF (entity_type == "customer").
	var approvalStatus string = "PENDING"
	var approvedBy *uuid.UUID = nil
	var approvedAt *time.Time = nil
	var approvalNotes string = ""

	if entityType == "customer" {
		approvalStatus = "PENDING"
	} else {
		approvalStatus = "APPROVED"
		now := time.Now()
		approvedBy = uploadedBy
		approvedAt = &now
		approvalNotes = "Disetujui otomatis (Arsip Transaksi/Supplier)"
	}

	// Prepare upload directory
	uploadDir := filepath.Join(".", "uploads", "documents")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyiapkan direktori penyimpanan", err.Error())
		return
	}

	// Read multipart form
	form, err := c.MultipartForm()
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "Gagal membaca form multipart", err.Error())
		return
	}

	// Support both "file" and "files" keys
	var filesToProcess []*multipart.FileHeader
	if fList, ok := form.File["files"]; ok && len(fList) > 0 {
		filesToProcess = append(filesToProcess, fList...)
	}
	if fSingle, ok := form.File["file"]; ok && len(fSingle) > 0 {
		filesToProcess = append(filesToProcess, fSingle...)
	}

	if len(filesToProcess) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Tidak ada file yang diunggah", nil)
		return
	}

	var savedAttachments []models.DocumentAttachment

	for _, fileHeader := range filesToProcess {
		origName := filepath.Base(fileHeader.Filename)
		cleanExt := strings.ToLower(filepath.Ext(origName))
		safeBase := strings.TrimSuffix(origName, cleanExt)
		safeBase = strings.ReplaceAll(safeBase, " ", "_")
		if len(safeBase) > 40 {
			safeBase = safeBase[:40]
		}

		storedFileName := fmt.Sprintf("%s_%d%s", safeBase, time.Now().UnixNano(), cleanExt)
		destPath := filepath.Join(uploadDir, storedFileName)

		// Open source file
		src, err := fileHeader.Open()
		if err != nil {
			continue
		}

		// Create destination file
		dst, err := os.Create(destPath)
		if err != nil {
			src.Close()
			continue
		}

		_, err = io.Copy(dst, src)
		src.Close()
		dst.Close()

		if err != nil {
			os.Remove(destPath)
			continue
		}

		// Web accessible path
		webPath := fmt.Sprintf("/uploads/documents/%s", storedFileName)
		mimeType := fileHeader.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		attachment := models.DocumentAttachment{
			CompanyID:      companyID,
			EntityType:     entityType,
			EntityID:       entityID,
			DocumentType:   docType,
			UploadMode:     uploadMode,
			FileName:       storedFileName,
			OriginalName:   origName,
			FilePath:       webPath,
			FileSize:       fileHeader.Size,
			MimeType:       mimeType,
			Notes:          notes,
			ExpiryDate:     docExpiryDate,
			UploadedBy:     uploadedBy,
			ApprovalStatus: approvalStatus,
			ApprovalNotes:  approvalNotes,
			ApprovedBy:     approvedBy,
			ApprovedAt:     approvedAt,
		}

		if err := database.DB.Create(&attachment).Error; err == nil {
			database.DB.Preload("User").First(&attachment, attachment.ID)
			savedAttachments = append(savedAttachments, attachment)
		}
	}

	if len(savedAttachments) == 0 {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan file", nil)
		return
	}

	utils.SendSuccess(c, fmt.Sprintf("%d dokumen berhasil diunggah", len(savedAttachments)), savedAttachments)
}

// GetDocuments returns attachments for given entity
func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	entityType := c.Query("entity_type")
	entityIDStr := c.Query("entity_id")
	docType := c.Query("document_type")

	if entityType == "" || entityIDStr == "" {
		utils.SendError(c, http.StatusBadRequest, "entity_type dan entity_id wajib diisi", nil)
		return
	}

	entityID, err := uuid.Parse(entityIDStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "entity_id tidak valid", err.Error())
		return
	}

	query := database.DB.Where("company_id = ? AND entity_type = ? AND entity_id = ?", companyID, entityType, entityID)
	if docType != "" {
		query = query.Where("document_type = ?", docType)
	}

	var docs []models.DocumentAttachment
	if err := query.Order("created_at desc").Preload("User").Preload("Approver").Find(&docs).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil daftar dokumen", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar dokumen berhasil diambil", docs)
}

// DeleteDocument removes document record and file
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	idStr := c.Param("id")

	docID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var doc models.DocumentAttachment
	if err := database.DB.Where("id = ? AND company_id = ?", docID, companyID).First(&doc).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Dokumen tidak ditemukan", err.Error())
		return
	}

	// Remove physical file
	physicalPath := filepath.Join(".", filepath.Clean(doc.FilePath))
	os.Remove(physicalPath)

	if err := database.DB.Delete(&doc).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus dokumen", err.Error())
		return
	}

	utils.SendSuccess(c, "Dokumen berhasil dihapus", nil)
}

// UpdateDocument handles updating document metadata or replacing the attached file
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userIDVal, hasUser := c.Get("user_id")
	var approverID *uuid.UUID
	if hasUser && userIDVal != nil {
		uid := userIDVal.(uuid.UUID)
		approverID = &uid
	}

	idStr := c.Param("id")

	docID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var doc models.DocumentAttachment
	if err := database.DB.Where("id = ? AND company_id = ?", docID, companyID).First(&doc).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Dokumen tidak ditemukan", err.Error())
		return
	}

	// Check if this is multipart form (with optional new file) or JSON
	contentType := c.ContentType()
	if strings.Contains(contentType, "multipart/form-data") {
		docType := c.PostForm("document_type")
		notes := c.PostForm("notes")
		expiryDateStr := c.PostForm("expiry_date")

		if docType != "" {
			doc.DocumentType = docType
		}
		if notes != "" {
			doc.Notes = notes
		}
		if expiryDateStr != "" {
			if t, err := time.Parse("2006-01-02", expiryDateStr); err == nil {
				doc.ExpiryDate = &t
			} else if t, err := time.Parse(time.RFC3339, expiryDateStr); err == nil {
				doc.ExpiryDate = &t
			}
		}

		// Optional file replacement
		fileHeader, err := c.FormFile("file")
		if err == nil && fileHeader != nil {
			uploadDir := filepath.Join(".", "uploads", "documents")
			if err := os.MkdirAll(uploadDir, 0755); err == nil {
				origName := filepath.Base(fileHeader.Filename)
				cleanExt := strings.ToLower(filepath.Ext(origName))
				safeBase := strings.TrimSuffix(origName, cleanExt)
				safeBase = strings.ReplaceAll(safeBase, " ", "_")
				if len(safeBase) > 40 {
					safeBase = safeBase[:40]
				}

				storedFileName := fmt.Sprintf("%s_%d%s", safeBase, time.Now().UnixNano(), cleanExt)
				destPath := filepath.Join(uploadDir, storedFileName)

				src, err := fileHeader.Open()
				if err == nil {
					dst, err := os.Create(destPath)
					if err == nil {
						if _, err := io.Copy(dst, src); err == nil {
							// Successfully written new file -> remove old file
							oldPath := filepath.Join(".", filepath.Clean(doc.FilePath))
							os.Remove(oldPath)

							mimeType := fileHeader.Header.Get("Content-Type")
							if mimeType == "" {
								mimeType = "application/octet-stream"
							}

							doc.FileName = storedFileName
							doc.OriginalName = origName
							doc.FilePath = fmt.Sprintf("/uploads/documents/%s", storedFileName)
							doc.FileSize = fileHeader.Size
							doc.MimeType = mimeType

							// Hanya dokumen pelanggan yang perlu verifikasi ulang
							if doc.EntityType == "customer" {
								doc.ApprovalStatus = "PENDING"
								doc.ApprovedBy = nil
								doc.ApprovedAt = nil
								doc.ApprovalNotes = "File diganti oleh pengguna (menunggu verifikasi ulang)"
							} else {
								doc.ApprovalStatus = "APPROVED"
								now := time.Now()
								doc.ApprovedBy = approverID
								doc.ApprovedAt = &now
								doc.ApprovalNotes = "File diganti (disetujui otomatis)"
							}
						}
						dst.Close()
					}
					src.Close()
				}
			}
		}
	} else {
		// JSON metadata update
		var req struct {
			DocumentType string  `json:"document_type"`
			Notes        string  `json:"notes"`
			ExpiryDate   *string `json:"expiry_date"`
		}
		if err := c.ShouldBindJSON(&req); err == nil {
			if req.DocumentType != "" {
				doc.DocumentType = req.DocumentType
			}
			if req.Notes != "" {
				doc.Notes = req.Notes
			}
			if req.ExpiryDate != nil {
				if *req.ExpiryDate == "" {
					doc.ExpiryDate = nil
				} else if t, err := time.Parse("2006-01-02", *req.ExpiryDate); err == nil {
					doc.ExpiryDate = &t
				} else if t, err := time.Parse(time.RFC3339, *req.ExpiryDate); err == nil {
					doc.ExpiryDate = &t
				}
			}
		}
	}

	if err := database.DB.Save(&doc).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui dokumen", err.Error())
		return
	}

	database.DB.Preload("User").Preload("Approver").First(&doc, doc.ID)
	utils.SendSuccess(c, "Dokumen berhasil diperbarui", doc)
}

// ApproveDocument updates company approval status (APPROVED / REJECTED)
func (h *DocumentHandler) ApproveDocument(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userIDVal, _ := c.Get("user_id")
	var approverID *uuid.UUID
	if userIDVal != nil {
		uid := userIDVal.(uuid.UUID)
		approverID = &uid
	}

	idStr := c.Param("id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"` // APPROVED, REJECTED, PENDING
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Status persetujuan wajib diisi (APPROVED / REJECTED)", err.Error())
		return
	}

	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status != "APPROVED" && status != "REJECTED" && status != "PENDING" {
		utils.SendError(c, http.StatusBadRequest, "Status harus APPROVED, REJECTED, atau PENDING", nil)
		return
	}

	var doc models.DocumentAttachment
	if err := database.DB.Where("id = ? AND company_id = ?", docID, companyID).First(&doc).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Dokumen tidak ditemukan", err.Error())
		return
	}

	now := time.Now()
	doc.ApprovalStatus = status
	doc.ApprovalNotes = req.Notes

	if status == "PENDING" {
		doc.ApprovedBy = nil
		doc.ApprovedAt = nil
	} else {
		doc.ApprovedBy = approverID
		doc.ApprovedAt = &now
	}

	if err := database.DB.Save(&doc).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status persetujuan", err.Error())
		return
	}

	database.DB.Preload("User").Preload("Approver").First(&doc, doc.ID)

	actionLabel := "disetujui"
	if status == "REJECTED" {
		actionLabel = "ditolak"
	} else if status == "PENDING" {
		actionLabel = "diatur ke menunggu persetujuan"
	}
	utils.SendSuccess(c, fmt.Sprintf("Dokumen berhasil %s oleh perusahaan", actionLabel), doc)
}

// GetPbfRequirements returns document checklist templates
func (h *DocumentHandler) GetPbfRequirements(c *gin.Context) {
	target := c.Query("target") // purchase, sales, supplier, customer

	switch target {
	case "purchase":
		reqs := []models.PbfRequirement{
			{
				DocumentType: "FAKTUR_PBF",
				Title:        "Faktur Asli PBF / Prinsipal",
				Description:  "Scan / PDF faktur resmi pembelian dari distributor farmasi (PBF).",
				IsRequired:   true,
			},
			{
				DocumentType: "SURAT_JALAN",
				Title:        "Surat Jalan / Delivery Order (DO) PBF",
				Description:  "Bukti fisik serah terima barang obat/alkes dari kurir PBF berstempel penerima.",
				IsRequired:   true,
			},
			{
				DocumentType: "FAKTUR_PAJAK",
				Title:        "e-Faktur Pajak PBF",
				Description:  "Faktur pajak elektronik resmi dari PBF dengan QR Code Ditjen Pajak.",
				IsRequired:   false,
			},
			{
				DocumentType: "COA",
				Title:        "Certificate of Analysis (CoA)",
				Description:  "Sertifikat analisis mutu bets dari produsen/industri farmasi terkait.",
				IsRequired:   false,
			},
		}
		utils.SendSuccess(c, "Persyaratan dokumen pembelian PBF", reqs)
	case "purchase_order":
		reqs := []models.PbfRequirement{
			{
				DocumentType: "SURAT_PESANAN",
				Title:        "Surat Pesanan (SP) Resmi Bertandatangan APJ",
				Description:  "Scan SP fisik yang ditandatangani basah oleh Apoteker Penanggung Jawab dan berstempel apotek.",
				IsRequired:   true,
			},
		}
		utils.SendSuccess(c, "Persyaratan dokumen pesanan pembelian PBF", reqs)
	case "sales", "sales_order":
		reqs := []models.PbfRequirement{
			{
				DocumentType: "SURAT_PESANAN",
				Title:        "Surat Pesanan (SP) Asli Pemesan / Sarana",
				Description:  "Surat Pesanan dari Apotek/RS/Klinik pemesan berstempel dan ditandatangani APJ pemesan.",
				IsRequired:   true,
			},
			{
				DocumentType: "FAKTUR_PBF_ASAL",
				Title:        "Faktur Pembelian PBF / Prinsipal Asal",
				Description:  "Bukti faktur perolehan asli saat kita membeli dari PBF untuk menjamin rantai pasok sah (CDOB BPOM).",
				IsRequired:   true,
			},
			{
				DocumentType: "SURAT_JALAN",
				Title:        "Surat Jalan / DO Pengiriman",
				Description:  "Bukti penyerahan produk ke sarana pemesan.",
				IsRequired:   false,
			},
			{
				DocumentType: "FAKTUR_PAJAK",
				Title:        "Faktur Pajak Penjualan",
				Description:  "Dokumen faktur pajak keluaran transaksi.",
				IsRequired:   false,
			},
		}
		utils.SendSuccess(c, "Persyaratan dokumen penjualan PBF", reqs)
	case "supplier":
		reqs := []models.PbfRequirement{
			{
				DocumentType: "IZIN_PBF",
				Title:        "Surat Izin Usaha PBF / Cabang",
				Description:  "Izin PBF resmi Kemenkes / Dinas Kesehatan terkait.",
				IsRequired:   true,
			},
			{
				DocumentType: "SERTIFIKAT_CDOB",
				Title:        "Sertifikat CDOB BPOM",
				Description:  "Sertifikat Cara Distribusi Obat yang Baik yang masih aktif.",
				IsRequired:   true,
			},
			{
				DocumentType: "SIPA_APJ",
				Title:        "SIPA Apoteker Penanggung Jawab",
				Description:  "Surat Izin Praktik Apoteker penanggung jawab teknis PBF.",
				IsRequired:   true,
			},
		}
		utils.SendSuccess(c, "Persyaratan dokumen supplier PBF", reqs)
	case "customer":
		reqs := []models.PbfRequirement{
			{
				DocumentType: "IZIN_SARANA",
				Title:        "Izin Sarana (SIA / Izin RS / Izin Klinik)",
				Description:  "Legalitas sarana pemesan obat/alkes.",
				IsRequired:   true,
			},
			{
				DocumentType: "SIPA_APJ",
				Title:        "SIPA Apoteker Penanggung Jawab Pemesan",
				Description:  "SIPA / SIPTTK penanggung jawab yang berwenang menandatangani SP.",
				IsRequired:   true,
			},
		}
		utils.SendSuccess(c, "Persyaratan dokumen sarana pelanggan", reqs)
	default:
		utils.SendError(c, http.StatusBadRequest, "Target requirement tidak dikenali", nil)
	}
}
