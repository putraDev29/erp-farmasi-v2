package handlers

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/services"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SalesHandler struct{}

func NewSalesHandler() *SalesHandler {
	return &SalesHandler{}
}

func getUserRoles(c *gin.Context) []string {
	rolesVal, exists := c.Get("roles")
	if !exists {
		return nil
	}
	roles, ok := rolesVal.([]string)
	if !ok {
		return nil
	}
	return roles
}

func isUserGudang(c *gin.Context) bool {
	username, _ := c.Get("username")
	if uStr, ok := username.(string); ok && strings.ToLower(uStr) == "gudang" {
		return true
	}
	roles := getUserRoles(c)
	for _, r := range roles {
		if strings.Contains(strings.ToUpper(r), "GUDANG") {
			return true
		}
	}
	return false
}

// ==========================================
// 1. SALES ORDERS (SO)
// ==========================================

func (h *SalesHandler) GetSalesOrders(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	query := database.DB.Where("sales_orders.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN customers ON customers.id = sales_orders.customer_id").
			Where("sales_orders.order_no ILIKE ? OR customers.name ILIKE ? OR customers.code ILIKE ? OR sales_orders.notes ILIKE ? OR sales_orders.customer_sp_number ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if status := c.Query("status"); status != "" && status != "Semua" {
		query = query.Where("sales_orders.status = ?", status)
	}

	if orderType := c.Query("type"); orderType != "" && orderType != "all" && orderType != "Semua" {
		query = query.Where("sales_orders.type = ?", strings.ToUpper(orderType))
	}

	if source := c.Query("source"); source != "" && source != "all" && source != "Semua" {
		query = query.Where("sales_orders.source = ?", strings.ToUpper(source))
	}

	if processStatus := c.Query("process_status"); processStatus != "" && processStatus != "Semua" {
		if processStatus == "PROCESSED" {
			query = query.Where("sales_orders.sale_invoice_id IS NOT NULL OR sales_orders.process_status ILIKE '%faktur%'")
		} else if processStatus == "UNPROCESSED" {
			query = query.Where("sales_orders.sale_invoice_id IS NULL AND (sales_orders.process_status NOT ILIKE '%faktur%' OR sales_orders.process_status IS NULL)")
		} else {
			query = query.Where("sales_orders.process_status = ?", processStatus)
		}
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("sales_orders.warehouse_id = ?", warehouseID)
	}

	if customerID := c.Query("customer_id"); customerID != "" && customerID != "all" {
		query = query.Where("sales_orders.customer_id = ?", customerID)
	}

	if hasDebt := c.Query("has_debt"); hasDebt == "true" {
		query = query.Where("sales_orders.remaining_amount > 0")
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("sales_orders.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("sales_orders.date <= ?", endDate)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "order_no", "code", "kode":
		query = query.Order("sales_orders.order_no " + sortDir)
	case "pelanggan", "customer", "name", "nama":
		query = query.Joins("LEFT JOIN customers ON customers.id = sales_orders.customer_id").Order("customers.name " + sortDir)
	case "total":
		query = query.Order("sales_orders.total_amount " + sortDir)
	case "created_at", "waktu_input", "terbaru":
		query = query.Order("sales_orders.created_at " + sortDir)
	default:
		query = query.Order("sales_orders.created_at " + sortDir + ", sales_orders.date " + sortDir)
	}

	var sos []models.SalesOrder
	if err := query.Preload("Warehouse").
		Preload("Customer").
		Preload("SalesRep").
		Preload("User").
		Preload("User.Roles").
		Preload("Modifier").
		Preload("Modifier.Roles").
		Preload("AdminApprover").
		Preload("WarehouseShipper").
		Preload("Sale").
		Preload("Items.Product").
		Preload("Items.Unit").
		Find(&sos).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil daftar pesanan penjualan", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar pesanan penjualan (SO)", sos)
}

func (h *SalesHandler) GetSalesOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Warehouse").
		Preload("Customer").
		Preload("SalesRep").
		Preload("User").
		Preload("AdminApprover").
		Preload("WarehouseShipper").
		Preload("Sale").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail pesanan penjualan", so)
}

func (h *SalesHandler) CreateSalesOrder(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak memiliki wewenang untuk membuat pesanan penjualan (Sales Order). Proses ini dilakukan oleh Admin.", nil)
		return
	}
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		WarehouseID        *uuid.UUID `json:"warehouse_id"`
		CustomerID         *uuid.UUID `json:"customer_id"`
		SalesRepID         *uuid.UUID `json:"sales_rep_id"`
		Date               *time.Time `json:"date"`
		ExpectedDate       *time.Time `json:"expected_date"`
		Status             string     `json:"status"`
		Type               string     `json:"type"`
		Source             string     `json:"source"`
		MarketplaceStore   string     `json:"marketplace_store"`
		MarketplaceOrderNo string     `json:"marketplace_order_no"`
		Notes              string     `json:"notes"`
		TaxPercent         float64    `json:"tax_percent"`
		Discount           float64    `json:"discount"`
		ShippingFee        float64    `json:"shipping_fee"`
		PaidAmount         float64    `json:"paid_amount"` // DP / Uang Muka
		CashAccountID      *uuid.UUID `json:"cash_account_id"`
		CustomerSPNumber   string     `json:"customer_sp_number"`
		CustomerSPDate     *time.Time `json:"customer_sp_date"`
		CustomerSPType     string     `json:"customer_sp_type"`
		PBFOriginInvoiceNo string     `json:"pbf_origin_invoice_no"`
		ComputerName       string     `json:"computer_name"`
		Items              []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			UnitID    uuid.UUID `json:"unit_id" binding:"required"`
			Qty       float64   `json:"qty" binding:"required"`
			UnitPrice float64   `json:"unit_price" binding:"required"`
			Discount  float64   `json:"discount"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pesanan penjualan tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	soNo, err := services.GenerateDocNumber(tx, companyID, "SO")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor SO", err.Error())
		return
	}

	var subtotal float64
	for _, it := range req.Items {
		subtotal += (it.Qty * it.UnitPrice) - it.Discount
	}

	taxAmount := (subtotal - req.Discount) * (req.TaxPercent / 100)
	totalAmount := subtotal - req.Discount + taxAmount + req.ShippingFee
	remainingAmount := math.Max(0, totalAmount-req.PaidAmount)

	orderDate := time.Now()
	if req.Date != nil {
		orderDate = *req.Date
	}
	status := "PENDING"
	if req.Status != "" && req.Status != "Select..." {
		status = req.Status
	}

	orderType := "BACKOFFICE"
	if req.Type != "" {
		orderType = strings.ToUpper(req.Type)
	} else if strings.ToUpper(req.Source) == "MARKETPLACE" || strings.ToUpper(req.Source) == "MOBILE" {
		orderType = "MARKETPLACE"
	}

	orderSource := "BACKOFFICE"
	if req.Source != "" {
		orderSource = strings.ToUpper(req.Source)
	} else if orderType == "MARKETPLACE" {
		orderSource = "MOBILE"
	}

	mpStore := req.MarketplaceStore
	if mpStore == "" && (orderType == "MARKETPLACE" || orderSource == "MOBILE" || orderSource == "MARKETPLACE") {
		mpStore = "Mobile App Apotek"
	}

	mpOrderNo := req.MarketplaceOrderNo
	if mpOrderNo == "" && req.CustomerSPNumber != "" {
		mpOrderNo = req.CustomerSPNumber
	}

	whID := req.WarehouseID
	if whID == nil || *whID == uuid.Nil {
		var defaultWh models.Warehouse
		if err := tx.Where("company_id = ?", companyID).Order("is_default DESC, name ASC").First(&defaultWh).Error; err == nil {
			whID = &defaultWh.ID
		}
	}

	var paymentStatus string
	if req.PaidAmount >= totalAmount {
		paymentStatus = "PAID"
		remainingAmount = 0
	} else if req.PaidAmount > 0 {
		paymentStatus = "PARTIAL"
	} else {
		paymentStatus = "TEMPO"
		remainingAmount = totalAmount
	}

	spNumber := req.CustomerSPNumber
	if spNumber == "" {
		if spNo, err := services.GenerateDocNumber(tx, companyID, "SP"); err == nil && spNo != "" {
			spNumber = spNo
		} else {
			spNumber = fmt.Sprintf("SP/%s", strings.TrimPrefix(soNo, "SO/"))
		}
	}
	spDate := req.CustomerSPDate
	if spDate == nil {
		nowDate := time.Now()
		spDate = &nowDate
	}
	spType := req.CustomerSPType
	if spType == "" {
		spType = "REGULER"
	}

	var soCustID uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != uuid.Nil {
		soCustID = *req.CustomerID
	} else {
		var defCust models.Customer
		if err := tx.Where("company_id = ? AND (code = '01' OR code = 'PL0015' OR LOWER(name) LIKE '%cash%' OR LOWER(name) LIKE '%umum%')", companyID).First(&defCust).Error; err == nil && defCust.ID != uuid.Nil {
			soCustID = defCust.ID
		} else {
			defCust = models.Customer{
				CompanyID:    companyID,
				Code:         "PL0015",
				Name:         "CASH / UMUM",
				PharmacyType: "UMUM",
			}
			tx.Create(&defCust)
			soCustID = defCust.ID
		}
	}

	so := models.SalesOrder{
		CompanyID:          companyID,
		BranchID:           branchID,
		WarehouseID:        whID,
		CustomerID:         soCustID,
		SalesRepID:         req.SalesRepID,
		OrderNo:            soNo,
		Date:               orderDate,
		ExpectedDate:       req.ExpectedDate,
		Status:             status,
		ProcessStatus:      "Belum Proses",
		PaymentStatus:      paymentStatus,
		DPAmount:           req.PaidAmount,
		CashAccountID:      req.CashAccountID,
		Subtotal:           subtotal,
		TaxPercent:         req.TaxPercent,
		TaxAmount:          taxAmount,
		Discount:           req.Discount,
		ShippingFee:        req.ShippingFee,
		TotalAmount:        totalAmount,
		PaidAmount:         req.PaidAmount,
		RemainingAmount:    remainingAmount,
		Notes:              req.Notes,
		Type:               orderType,
		Source:             orderSource,
		MarketplaceStore:   mpStore,
		MarketplaceOrderNo: mpOrderNo,
		CustomerSPNumber:   spNumber,
		CustomerSPDate:     spDate,
		CustomerSPType:     spType,
		PBFOriginInvoiceNo: req.PBFOriginInvoiceNo,
		ComputerName:       getComputerName(c, req.ComputerName),
		CreatedBy:          userID,
	}

	if err := tx.Create(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat SO", err.Error())
		return
	}

	for _, it := range req.Items {
		item := models.SalesOrderItem{
			SalesOrderID: so.ID,
			ProductID:    it.ProductID,
			UnitID:       it.UnitID,
			Qty:          it.Qty,
			DeliveredQty: 0,
			UnitPrice:    it.UnitPrice,
			Discount:     it.Discount,
			TotalAmount:  (it.Qty * it.UnitPrice) - it.Discount,
		}
		tx.Create(&item)
	}

	// If customer paid a DP (Uang Muka) on Sales Order, create double-entry journal for DP
	if req.PaidAmount > 0 {
		cashAccountCode := "1-1110" // Default Kas
		if req.CashAccountID != nil {
			var acc models.Account
			if errAcc := tx.First(&acc, *req.CashAccountID).Error; errAcc == nil && acc.Code != "" {
				cashAccountCode = acc.Code
			}
		}

		journalEntries := []services.JournalEntryParam{
			{
				AccountCode: cashAccountCode,
				Debit:       req.PaidAmount,
				Credit:      0,
				Description: fmt.Sprintf("Penerimaan DP Pesanan Penjualan %s", so.OrderNo),
			},
			{
				AccountCode: "2-1200", // Uang Muka Penjualan / DP Pelanggan
				Debit:       0,
				Credit:      req.PaidAmount,
				Description: fmt.Sprintf("Uang Muka Penjualan SO %s", so.OrderNo),
			},
		}

		_, errJ := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        orderDate,
			RefType:     "SALES_ORDER_DP",
			RefNo:       so.OrderNo,
			Description: fmt.Sprintf("DP Pesanan Penjualan %s", so.OrderNo),
			CreatedBy:   userID,
			Entries:     journalEntries,
		})
		if errJ != nil {
			log.Printf("[SalesOrder] Warning: Journal DP creation error: %v", errJ)
		}

		var cashAcc models.Account
		if errA := tx.Where("company_id = ? AND code = ?", companyID, cashAccountCode).First(&cashAcc).Error; errA == nil {
			custName := "Pelanggan"
			var c models.Customer
			if errC := tx.First(&c, soCustID).Error; errC == nil && c.Name != "" {
				custName = c.Name
			}
			trx := models.CashTransaction{
				CompanyID:   companyID,
				BranchID:    branchID,
				AccountID:   cashAcc.ID,
				Date:        orderDate,
				Type:        "IN",
				Amount:      req.PaidAmount,
				TrxNo:       so.OrderNo,
				Description: fmt.Sprintf("Penerimaan DP Pesanan Penjualan %s (%s)", so.OrderNo, custName),
				CreatedBy:   userID,
			}
			_ = tx.Create(&trx).Error
		}
	}

	tx.Commit()
	utils.SendCreated(c, "Pesanan Penjualan (SO) berhasil dibuat", so)
}

func (h *SalesHandler) UpdateSalesOrder(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak memiliki wewenang untuk mengubah data pesanan penjualan. Silakan hubungi Admin.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	var req struct {
		WarehouseID        *uuid.UUID `json:"warehouse_id"`
		CustomerID         uuid.UUID  `json:"customer_id"`
		SalesRepID         *uuid.UUID `json:"sales_rep_id"`
		ExpectedDate       *time.Time `json:"expected_date"`
		Notes              string     `json:"notes"`
		Status             string     `json:"status"`
		ProcessStatus      string     `json:"process_status"`
		TaxPercent         float64    `json:"tax_percent"`
		Discount           float64    `json:"discount"`
		ShippingFee        float64    `json:"shipping_fee"`
		PaidAmount         float64    `json:"paid_amount"`
		CustomerSPNumber   string     `json:"customer_sp_number"`
		CustomerSPDate     *time.Time `json:"customer_sp_date"`
		CustomerSPType     string     `json:"customer_sp_type"`
		PBFOriginInvoiceNo string     `json:"pbf_origin_invoice_no"`
		ComputerName       string     `json:"computer_name"`
		Items              []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			UnitID    uuid.UUID `json:"unit_id" binding:"required"`
			Qty       float64   `json:"qty" binding:"required"`
			UnitPrice float64   `json:"unit_price" binding:"required"`
			Discount  float64   `json:"discount"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data update tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	if req.WarehouseID != nil {
		so.WarehouseID = req.WarehouseID
	}
	if req.CustomerID != uuid.Nil {
		so.CustomerID = req.CustomerID
	}
	if req.SalesRepID != nil {
		so.SalesRepID = req.SalesRepID
	}
	if req.ExpectedDate != nil {
		so.ExpectedDate = req.ExpectedDate
	}
	if req.Notes != "" {
		so.Notes = req.Notes
	}
	if req.Status != "" && req.Status != "Select..." {
		so.Status = req.Status
	}
	if req.ProcessStatus != "" {
		so.ProcessStatus = req.ProcessStatus
	}
	if req.CustomerSPType != "" {
		so.CustomerSPType = req.CustomerSPType
	}
	so.CustomerSPNumber = req.CustomerSPNumber
	so.CustomerSPDate = req.CustomerSPDate
	so.PBFOriginInvoiceNo = req.PBFOriginInvoiceNo
	so.TaxPercent = req.TaxPercent
	so.Discount = req.Discount
	so.ShippingFee = req.ShippingFee
	so.PaidAmount = req.PaidAmount
	userIDVal := c.MustGet("user_id").(uuid.UUID)
	so.UpdatedBy = &userIDVal
	so.ComputerName = getComputerName(c, req.ComputerName)

	if len(req.Items) > 0 {
		tx.Where("sales_order_id = ?", so.ID).Delete(&models.SalesOrderItem{})
		var subtotal float64
		for _, it := range req.Items {
			lineTot := (it.Qty * it.UnitPrice) - it.Discount
			subtotal += lineTot
			item := models.SalesOrderItem{
				SalesOrderID: so.ID,
				ProductID:    it.ProductID,
				UnitID:       it.UnitID,
				Qty:          it.Qty,
				DeliveredQty: 0,
				UnitPrice:    it.UnitPrice,
				Discount:     it.Discount,
				TotalAmount:  lineTot,
			}
			tx.Create(&item)
		}
		taxAmount := (subtotal - req.Discount) * (req.TaxPercent / 100)
		totalAmount := subtotal - req.Discount + taxAmount + req.ShippingFee
		so.Subtotal = subtotal
		so.TaxAmount = taxAmount
		so.TotalAmount = totalAmount
		so.RemainingAmount = math.Max(0, totalAmount-req.PaidAmount)
	}

	if err := tx.Save(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui SO", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Pesanan penjualan berhasil diperbarui", so)
}

// 1.1 PROSES PESANAN (Status DIPROSES)
func (h *SalesHandler) ProcessSalesOrder(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Pemrosesan pesanan awal dilakukan oleh Admin.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	if so.Status != "PENDING" && so.Status != "DRAFT" {
		utils.SendError(c, http.StatusBadRequest, "Hanya pesanan berstatus PENDING yang dapat diproses", nil)
		return
	}

	so.Status = "DIPROSES"
	so.ProcessStatus = "Diproses (Sedang Dikemas)"
	if err := database.DB.Save(&so).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memproses pesanan penjualan", err.Error())
		return
	}

	utils.SendSuccess(c, "Pesanan penjualan berhasil diproses (Sedang Dikemas)", so)
}

// 1.1b VERIFIKASI DAN PERSETUJUAN PESANAN (Admin Approve & Otomatis Masuk Menu Penjualan)
func (h *SalesHandler) ApproveSalesOrder(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Verifikasi dan persetujuan pesanan hanya dapat dilakukan oleh Admin / Apoteker, bukan Petugas Gudang.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	if so.Status != "PENDING" && so.Status != "DRAFT" {
		utils.SendError(c, http.StatusBadRequest, "Hanya pesanan berstatus PENDING atau DRAFT yang dapat disetujui", nil)
		return
	}

	tx := database.DB.Begin()

	now := time.Now()
	so.Status = "APPROVED"
	so.ProcessStatus = "Disetujui Admin (Siap Disiapkan Gudang)"
	so.AdminApprovedAt = &now
	so.AdminApprovedBy = &userID

	// Step 3: Masuk Menu Penjualan (Konversi Otomatis ke Transaksi Penjualan, cegah duplikasi)
	var sale models.Sale
	isAlreadyConverted := false
	if so.SaleInvoiceID != nil && *so.SaleInvoiceID != uuid.Nil {
		if errSale := tx.Where("id = ? AND company_id = ?", *so.SaleInvoiceID, companyID).First(&sale).Error; errSale == nil {
			isAlreadyConverted = true
		}
	}

	if !isAlreadyConverted {
		invNo, errInv := services.GenerateDocNumber(tx, companyID, "SI")
		if errInv != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor faktur penjualan", errInv.Error())
			return
		}

		targetWhID := uuid.Nil
		if so.WarehouseID != nil && *so.WarehouseID != uuid.Nil {
			targetWhID = *so.WarehouseID
		} else {
			var defaultWh models.Warehouse
			if errWh := tx.Where("branch_id = ?", branchID).First(&defaultWh).Error; errWh == nil {
				targetWhID = defaultWh.ID
			} else if errWhAny := tx.First(&defaultWh).Error; errWhAny == nil {
				targetWhID = defaultWh.ID
			}
		}

		effectivePaid := so.PaidAmount
		remainingAmount := math.Max(0, so.TotalAmount-effectivePaid)
		paymentStatus := "UNPAID"
		if remainingAmount <= 0 {
			paymentStatus = "PAID"
		} else if effectivePaid > 0 {
			paymentStatus = "PARTIAL"
		}

		dueDate := now.AddDate(0, 0, 14) // Default tempo 14 hari
		if so.ExpectedDate != nil {
			dueDate = *so.ExpectedDate
		}

		sale = models.Sale{
			CompanyID:          companyID,
			BranchID:           branchID,
			WarehouseID:        targetWhID,
			CustomerID:         so.CustomerID,
			SalesOrderID:       &so.ID,
			SalesRepID:         so.SalesRepID,
			InvoiceNo:          invNo,
			Date:               now,
			DueDate:            dueDate,
			Type:               func() string { if so.Type != "" { return so.Type }; return "BACKOFFICE" }(),
			Status:             "MENUNGGU_PENGIRIMAN",
			PaymentStatus:      paymentStatus,
			Subtotal:           so.Subtotal,
			TaxPercent:         so.TaxPercent,
			TaxAmount:          so.TaxAmount,
			Discount:           so.Discount,
			ShippingFee:        so.ShippingFee,
			TotalAmount:        so.TotalAmount,
			PaidAmount:         effectivePaid,
			ChangeAmount:       0,
			RemainingAmount:    remainingAmount,
			Notes:              fmt.Sprintf("Faktur Penjualan dari Pesanan: %s. %s", so.OrderNo, so.Notes),
			CustomerSPNumber: func() string {
				if so.CustomerSPNumber != "" {
					return so.CustomerSPNumber
				}
				cleanNo := strings.TrimPrefix(invNo, "INV/")
				cleanNo = strings.TrimPrefix(cleanNo, "POS/")
				cleanNo = strings.TrimPrefix(cleanNo, "SO/")
				return fmt.Sprintf("SP/%s", cleanNo)
			}(),
			CustomerSPDate: func() *time.Time {
				if so.CustomerSPDate != nil {
					return so.CustomerSPDate
				}
				return &now
			}(),
			CustomerSPType: func() string {
				if so.CustomerSPType != "" {
					return so.CustomerSPType
				}
				return "REGULER"
			}(),
			PBFOriginInvoiceNo: so.PBFOriginInvoiceNo,
			AdminApprovedAt:    &now,
			AdminApprovedBy:    &userID,
			CreatedBy:          userID,
		}

		if errCreate := tx.Create(&sale).Error; errCreate != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal mengonversi pesanan ke penjualan", errCreate.Error())
			return
		}

		for _, it := range so.Items {
			saleItem := models.SaleItem{
				SaleID:      sale.ID,
				ProductID:   it.ProductID,
				UnitID:      it.UnitID,
				Qty:         it.Qty,
				UnitPrice:   it.UnitPrice,
				CostPrice:   0,
				Discount:    it.Discount,
				TotalAmount: it.TotalAmount,
				BatchNumber: it.BatchNumber,
				ExpiredDate: it.ExpiredDate,
			}
			tx.Create(&saleItem)
		}

		if effectivePaid > 0 {
			sp := models.SalePayment{
				SaleID:      sale.ID,
				Method:      "DP_SO",
				Amount:      effectivePaid,
				ReferenceNo: so.OrderNo,
			}
			tx.Create(&sp)
		}

		so.SaleInvoiceID = &sale.ID
	}

	if errSave := tx.Save(&so).Error; errSave != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyetujui pesanan penjualan", errSave.Error())
		return
	}

	tx.Commit()

	utils.SendSuccess(c, "Pesanan penjualan disetujui Admin dan berhasil masuk ke Menu Penjualan (menunggu pengiriman Gudang)", gin.H{
		"sales_order": so,
		"sale":        sale,
	})
}

// 1.2 PENGIRIMAN PESANAN (Status DIKIRIM & Surat Jalan oleh Petugas GUDANG)
// Gudang menyiapkan obat, memeriksa batch dan expired date, lalu membuat surat jalan. Stok berkurang ketika barang benar-benar dikirim.
func (h *SalesHandler) ShipSalesOrder(c *gin.Context) {
	if !isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Persiapan barang, pemeriksaan nomor batch/ED, dan pengiriman surat jalan HANYA DAPAT DILAKUKAN OLEH PETUGAS GUDANG.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	if so.Status != "APPROVED" && so.Status != "DIPROSES" {
		utils.SendError(c, http.StatusBadRequest, "Pesanan harus disetujui Admin (APPROVED) terlebih dahulu sebelum dapat disiapkan & dikirim oleh Gudang", nil)
		return
	}

	var req struct {
		Courier      string     `json:"courier"`
		TrackingNo   string     `json:"tracking_no"`
		Sender       string     `json:"sender"`
		Recipient    string     `json:"recipient"`
		DeliveryDate *time.Time `json:"delivery_date"`
		Notes        string     `json:"notes"`
		Items        []struct {
			ProductID   uuid.UUID  `json:"product_id"`
			BatchNumber string     `json:"batch_number"`
			ExpiredDate *time.Time `json:"expired_date"`
			Qty         float64    `json:"qty"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pengiriman tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	delNo, err := services.GenerateDocNumber(tx, companyID, "SJ")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor surat jalan", err.Error())
		return
	}

	courier := "Kurir Internal Apotek"
	if req.Courier != "" {
		courier = req.Courier
	}
	sender := "APOTEK BERKAT PURNAMA [UTAMA]"
	if req.Sender != "" {
		sender = req.Sender
	}
	recipient := req.Recipient
	if recipient == "" && so.Customer != nil {
		recipient = so.Customer.Name
	}
	delDate := time.Now()
	if req.DeliveryDate != nil {
		delDate = *req.DeliveryDate
	}

	delivery := models.SalesDelivery{
		CompanyID:    companyID,
		BranchID:     branchID,
		DeliveryNo:   delNo,
		TrackingNo:   req.TrackingNo,
		Courier:      courier,
		Sender:       sender,
		Recipient:    recipient,
		TotalOrder:   so.TotalAmount,
		Status:       "DIKIRIM",
		DeliveryDate: delDate,
		Notes:        fmt.Sprintf("Pengiriman SO: %s. %s", so.OrderNo, req.Notes),
		CreatedBy:    userID,
	}
	if err := tx.Create(&delivery).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat surat jalan pengiriman", err.Error())
		return
	}

	targetWhID := uuid.Nil
	if so.WarehouseID != nil && *so.WarehouseID != uuid.Nil {
		targetWhID = *so.WarehouseID
	} else {
		var defaultWh models.Warehouse
		if errWh := tx.Where("branch_id = ?", branchID).First(&defaultWh).Error; errWh == nil {
			targetWhID = defaultWh.ID
		} else if errWhAny := tx.First(&defaultWh).Error; errWhAny == nil {
			targetWhID = defaultWh.ID
		}
	}

	// Persiapan obat: Gudang memeriksa batch & expired date. STOK BERKURANG KETIKA BARANG BENAR-BENAR DIKIRIM!
	var totalCOGS float64
	for _, it := range so.Items {
		itemBatch := it.BatchNumber
		itemExp := it.ExpiredDate
		for _, reqIt := range req.Items {
			if reqIt.ProductID == it.ProductID {
				if reqIt.BatchNumber != "" {
					itemBatch = reqIt.BatchNumber
				}
				if reqIt.ExpiredDate != nil {
					itemExp = reqIt.ExpiredDate
				}
				break
			}
		}

		var balance models.StockBalance
		errBal := tx.Where("warehouse_id = ? AND product_id = ?", targetWhID, it.ProductID).First(&balance).Error

		costPrice := 0.0
		if errBal == nil && balance.AvgCost > 0 {
			costPrice = balance.AvgCost
		} else if it.Product != nil && it.Product.PurchasePrice > 0 {
			costPrice = it.Product.PurchasePrice
		}

		totalCOGS += costPrice * it.Qty

		// Deduct stock (Barang fisik benar-benar keluar saat dikirim)
		mutBal, errMut := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  targetWhID,
			ProductID:    it.ProductID,
			DocType:      "SALES_DELIVERY",
			DocNo:        delNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     costPrice,
			BatchNumber:  itemBatch,
			ExpiredDate:  itemExp,
			Notes:        fmt.Sprintf("Pengiriman Gudang Surat Jalan: %s (SO: %s)", delNo, so.OrderNo),
			CreatedBy:    userID,
		})
		if errMut != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Gagal mutasi stok keluar obat: "+errMut.Error(), nil)
			return
		}

		if mutBal != nil {
			if itemBatch == "" {
				itemBatch = mutBal.BatchNumber
			}
			if itemExp == nil {
				itemExp = mutBal.ExpiredDate
			}
		}

		// Update SO Item
		tx.Model(&models.SalesOrderItem{}).Where("id = ?", it.ID).Updates(map[string]interface{}{
			"batch_number":  itemBatch,
			"expired_date":  itemExp,
			"delivered_qty": it.Qty,
		})

		// Update Sale Item if linked
		if so.SaleInvoiceID != nil {
			tx.Model(&models.SaleItem{}).Where("sale_id = ? AND product_id = ?", *so.SaleInvoiceID, it.ProductID).Updates(map[string]interface{}{
				"batch_number": itemBatch,
				"expired_date": itemExp,
				"cost_price":   costPrice,
			})
		}
	}

	now := time.Now()
	// Update SO status
	so.Status = "DIKIRIM"
	so.ProcessStatus = "Dalam Pengiriman (Surat Jalan: " + delNo + ")"
	so.DeliveryOrderNo = delNo
	so.DeliveryTrackingNo = req.TrackingNo
	so.DeliveryCourier = courier
	so.DeliveryDate = &delDate
	so.WarehouseShippedAt = &now
	so.WarehouseShippedBy = &userID

	if err := tx.Save(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status pengiriman SO", err.Error())
		return
	}

	// Update Sale status
	if so.SaleInvoiceID != nil {
		tx.Model(&models.Sale{}).Where("id = ?", *so.SaleInvoiceID).Updates(map[string]interface{}{
			"status":               "DIKIRIM",
			"delivery_order_no":    delNo,
			"warehouse_shipped_at": &now,
			"warehouse_shipped_by": &userID,
		})
	}

	// Akuntansi: Transaksi Penjualan, HPP, Persediaan, Piutang, PPN Otomatis Terbit Saat Barang Dikirim
	effectivePaid := so.PaidAmount
	remainingAmount := math.Max(0, so.TotalAmount-effectivePaid)
	netSalesAmount := so.TotalAmount - so.TaxAmount

	var journalEntries []services.JournalEntryParam

	// 1. Debit HPP & Kredit Persediaan Obat
	if totalCOGS > 0 {
		journalEntries = append(journalEntries,
			services.JournalEntryParam{AccountCode: "5-1000", Debit: totalCOGS, Credit: 0, Description: fmt.Sprintf("HPP Pengiriman SO %s (SJ: %s)", so.OrderNo, delNo)},
			services.JournalEntryParam{AccountCode: "1-1300", Debit: 0, Credit: totalCOGS, Description: fmt.Sprintf("Pengurangan Persediaan Obat SO %s (SJ: %s)", so.OrderNo, delNo)},
		)
	}

	// 2. Debit Uang Muka Penjualan / DP jika ada
	if effectivePaid > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1200", // Uang Muka Penjualan / DP
			Debit:       effectivePaid,
			Credit:      0,
			Description: fmt.Sprintf("Pemotongan DP SO %s (SJ: %s)", so.OrderNo, delNo),
		})
	}

	// Resolve accounts from setting
	soDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "sales_price_discount", "sales_discount", "4-1200", "POTONGAN PENJUALAN", "REVENUE", "SALES", "DEBIT")
	soIncomeAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_income", "4-1000", "Pendapatan Penjualan Obat", "REVENUE", "SALES", "CREDIT")
	soReceivableAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_credit_receivable", "1-1200", "Piutang Usaha", "ASSET", "RECEIVABLE", "DEBIT")
	soTaxAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_tax", "2-4110", "Utang PPN Keluaran", "LIABILITY", "TAX_PAYABLE", "CREDIT")

	var itemDiscounts float64
	for _, it := range so.Items {
		itemDiscounts += it.Discount
	}
	totalDiscount := itemDiscounts + so.Discount

	// 3. Debit Piutang Usaha jika ada sisa tagihan
	if remainingAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: soReceivableAcc, // Piutang Usaha
			Debit:       remainingAmount,
			Credit:      0,
			Description: fmt.Sprintf("Piutang Pengiriman SO %s (SJ: %s)", so.OrderNo, delNo),
		})
	}

	// 3b. Debit Akun Penampung Potongan Penjualan (POTONGAN PENJUALAN) jika ada diskon
	if totalDiscount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: soDiscAcc,
			Debit:       totalDiscount,
			Credit:      0,
			Description: fmt.Sprintf("Potongan Penjualan SO %s (SJ: %s)", so.OrderNo, delNo),
		})
	}

	// 4. Kredit Pendapatan Penjualan (sebelum diskon)
	grossSalesAmount := netSalesAmount + totalDiscount
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: soIncomeAcc, // Pendapatan Penjualan
		Debit:       0,
		Credit:      grossSalesAmount,
		Description: fmt.Sprintf("Pendapatan Penjualan SO %s (SJ: %s)", so.OrderNo, delNo),
	})

	// 5. Kredit PPN Keluaran jika ada pajak
	if so.TaxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: soTaxAcc, // Utang PPN Keluaran
			Debit:       0,
			Credit:      so.TaxAmount,
			Description: fmt.Sprintf("PPN Keluaran SO %s (SJ: %s)", so.OrderNo, delNo),
		})
	}

	_, errJ := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        delDate,
		RefType:     "SALES_DELIVERY",
		RefNo:       delNo,
		Description: fmt.Sprintf("Jurnal Pengiriman Gudang SO %s (Surat Jalan: %s)", so.OrderNo, delNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if errJ != nil {
		log.Printf("[ShipSalesOrder] Warning posting journal: %v", errJ)
	}

	tx.Commit()
	utils.SendSuccess(c, "Pesanan penjualan berhasil dikirim oleh Gudang dengan Surat Jalan "+delNo+". Stok obat telah dikeluarkan dan jurnal akuntansi telah dibukukan.", gin.H{
		"sales_order": so,
		"delivery":    delivery,
	})
}

// 1.3 PENERIMAAN PESANAN OLEH PELANGGAN (Status SELESAI / DITERIMA oleh ADMIN)
func (h *SalesHandler) ReceiveSalesOrder(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Konfirmasi barang diterima pelanggan dilakukan oleh Admin / Layanan Pelanggan, bukan Petugas Gudang.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	if so.Status != "DIKIRIM" && so.Status != "SHIPPED" && so.Status != "DIPROSES" && so.Status != "APPROVED" {
		utils.SendError(c, http.StatusBadRequest, "Pesanan harus berstatus DIKIRIM atau DIPROSES terlebih dahulu sebelum dapat dikonfirmasi penerimaan", nil)
		return
	}

	var req struct {
		ReceivedBy       string     `json:"received_by"`
		ReceivedDate     *time.Time `json:"received_date"`
		ReceivedProofURL string     `json:"received_proof_url"`
		Notes            string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data penerimaan tidak valid", err.Error())
		return
	}

	recDate := time.Now()
	if req.ReceivedDate != nil {
		recDate = *req.ReceivedDate
	}
	recBy := req.ReceivedBy
	if recBy == "" {
		recBy = "Pelanggan"
	}

	tx := database.DB.Begin()

	so.Status = "SELESAI"
	so.ProcessStatus = "Selesai (Barang Diterima Pelanggan)"
	so.ReceivedDate = &recDate
	so.ReceivedBy = recBy
	if req.ReceivedProofURL != "" {
		so.ReceivedProofURL = req.ReceivedProofURL
	}
	if req.Notes != "" {
		so.Notes = fmt.Sprintf("%s | Konfirmasi Terima: %s", so.Notes, req.Notes)
	}

	if err := tx.Save(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengonfirmasi penerimaan SO", err.Error())
		return
	}

	if so.SaleInvoiceID != nil {
		tx.Model(&models.Sale{}).Where("id = ?", *so.SaleInvoiceID).Updates(map[string]interface{}{
			"status":             "SELESAI",
			"received_date":      &recDate,
			"received_by":        recBy,
			"received_proof_url": req.ReceivedProofURL,
		})
	}

	// Update delivery status if linked
	if so.DeliveryOrderNo != "" {
		tx.Model(&models.SalesDelivery{}).
			Where("delivery_no = ? AND company_id = ?", so.DeliveryOrderNo, companyID).
			Updates(map[string]interface{}{
				"status": "DITERIMA",
			})
	}

	tx.Commit()
	utils.SendSuccess(c, "Barang pesanan berhasil dikonfirmasi diterima pelanggan! Seluruh alur pesanan penjualan selesai.", so)
}

// 1.3b PENERIMAAN FAKTUR PENJUALAN OLEH PELANGGAN (Menu Penjualan - Status SELESAI / DITERIMA oleh ADMIN)
func (h *SalesHandler) ReceiveSale(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Konfirmasi barang diterima pelanggan dilakukan oleh Admin / Layanan Pelanggan, bukan Petugas Gudang.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var sale models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("SalesOrder").
		First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	var req struct {
		Courier          string     `json:"courier"`
		TrackingNo       string     `json:"tracking_no"`
		DeliveryDate     *time.Time `json:"delivery_date"`
		ReceivedBy       string     `json:"received_by"`
		ReceivedDate     *time.Time `json:"received_date"`
		ReceivedProofURL string     `json:"received_proof_url"`
		Notes            string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data penerimaan tidak valid", err.Error())
		return
	}

	recDate := time.Now()
	if req.ReceivedDate != nil {
		recDate = *req.ReceivedDate
	}
	recBy := req.ReceivedBy
	if recBy == "" {
		recBy = "Pelanggan"
	}

	tx := database.DB.Begin()

	sale.Status = "SELESAI"
	sale.ReceivedDate = &recDate
	sale.ReceivedBy = recBy
	if req.Courier != "" {
		sale.DeliveryCourier = req.Courier
	}
	if req.TrackingNo != "" {
		sale.DeliveryOrderNo = req.TrackingNo
	}
	if req.DeliveryDate != nil {
		sale.DeliveryDate = req.DeliveryDate
	}
	if req.ReceivedProofURL != "" {
		sale.ReceivedProofURL = req.ReceivedProofURL
	}
	if req.Notes != "" {
		sale.AdminNotes = req.Notes
		sale.Notes = fmt.Sprintf("%s | Konfirmasi Terima: %s", sale.Notes, req.Notes)
	}

	if err := tx.Save(&sale).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengonfirmasi penerimaan penjualan", err.Error())
		return
	}

	// Audit Log Konfirmasi Diterima Pelanggan
	tx.Create(&models.AuditLog{
		CompanyID:    companyID,
		UserID:       c.MustGet("user_id").(uuid.UUID),
		Category:     "TRANSAKSI",
		Action:       "KONFIRMASI TERIMA",
		Entity:       "PENJUALAN",
		EntityID:     sale.ID.String(),
		DocNo:        sale.InvoiceNo,
		Description:  fmt.Sprintf("Verifikasi Ekspedisi & Konfirmasi Terima Pelanggan %s", sale.InvoiceNo),
		Status:       "Sukses",
		IPAddress:    c.ClientIP(),
		ComputerName: "ISB-SEWA11-S-NB",
		NewValues:    fmt.Sprintf("Faktur %s dikonfirmasi diterima pelanggan (%s) via %s (Resi/SJ: %s).", sale.InvoiceNo, recBy, sale.DeliveryCourier, sale.DeliveryOrderNo),
		CreatedAt:    time.Now(),
	})

	// Update linked Sales Order if exists
	if sale.SalesOrderID != nil {
		tx.Model(&models.SalesOrder{}).Where("id = ?", *sale.SalesOrderID).Updates(map[string]interface{}{
			"status":             "SELESAI",
			"process_status":     "Selesai (Barang Diterima Pelanggan)",
			"received_date":      &recDate,
			"received_by":        recBy,
			"received_proof_url": req.ReceivedProofURL,
		})
	}

	// Update delivery status if linked
	if sale.DeliveryOrderNo != "" {
		tx.Model(&models.SalesDelivery{}).
			Where("delivery_no = ? AND company_id = ?", sale.DeliveryOrderNo, companyID).
			Updates(map[string]interface{}{
				"status": "DITERIMA",
			})
	}

	tx.Commit()
	utils.SendSuccess(c, "Barang penjualan berhasil dikonfirmasi diterima pelanggan! Status penjualan telah SELESAI.", sale)
}

// 1.3c PENGIRIMAN FAKTUR PENJUALAN (Menu Penjualan - Persiapan & Pengiriman Barang HANYA OLEH PETUGAS GUDANG)
func (h *SalesHandler) ShipSale(c *gin.Context) {
	if !isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Persiapan barang, pemeriksaan nomor batch/ED, dan pengiriman surat jalan HANYA DAPAT DILAKUKAN OLEH PETUGAS GUDANG.", nil)
		return
	}
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var sale models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("SalesOrder").
		First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	if sale.Status == "DIKIRIM" || sale.Status == "SELESAI" {
		utils.SendError(c, http.StatusBadRequest, "Faktur penjualan sudah dalam status dikirim atau selesai", nil)
		return
	}

	var req struct {
		Courier      string     `json:"courier"`
		TrackingNo   string     `json:"tracking_no"`
		Sender       string     `json:"sender"`
		Recipient    string     `json:"recipient"`
		DeliveryDate *time.Time `json:"delivery_date"`
		Notes        string     `json:"notes"`
		Items        []struct {
			ProductID   uuid.UUID  `json:"product_id"`
			BatchNumber string     `json:"batch_number"`
			ExpiredDate *time.Time `json:"expired_date"`
			Qty         float64    `json:"qty"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pengiriman tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	delNo, err := services.GenerateDocNumber(tx, companyID, "SJ")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor surat jalan", err.Error())
		return
	}

	courier := "Kurir Internal Apotek"
	if req.Courier != "" {
		courier = req.Courier
	}
	sender := "APOTEK BERKAT PURNAMA [UTAMA]"
	if req.Sender != "" {
		sender = req.Sender
	}
	recipient := req.Recipient
	if recipient == "" && sale.Customer != nil {
		recipient = sale.Customer.Name
	}
	delDate := time.Now()
	if req.DeliveryDate != nil {
		delDate = *req.DeliveryDate
	}

	delivery := models.SalesDelivery{
		CompanyID:    companyID,
		BranchID:     branchID,
		DeliveryNo:   delNo,
		TrackingNo:   req.TrackingNo,
		Courier:      courier,
		Sender:       sender,
		Recipient:    recipient,
		TotalOrder:   sale.TotalAmount,
		Status:       "DIKIRIM",
		DeliveryDate: delDate,
		Notes:        fmt.Sprintf("Pengiriman Faktur: %s. %s", sale.InvoiceNo, req.Notes),
		CreatedBy:    userID,
	}
	if err := tx.Create(&delivery).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat surat jalan pengiriman", err.Error())
		return
	}

	targetWhID := uuid.Nil
	if sale.WarehouseID != uuid.Nil {
		targetWhID = sale.WarehouseID
	} else {
		var defaultWh models.Warehouse
		if errWh := tx.Where("branch_id = ?", branchID).First(&defaultWh).Error; errWh == nil {
			targetWhID = defaultWh.ID
		} else if errWhAny := tx.First(&defaultWh).Error; errWhAny == nil {
			targetWhID = defaultWh.ID
		}
	}

	// Persiapan obat: memeriksa batch dan expired date. STOK BERKURANG KETIKA BARANG BENAR-BENAR DIKIRIM!
	var totalCOGS float64
	for _, it := range sale.Items {
		itemBatch := it.BatchNumber
		itemExp := it.ExpiredDate
		for _, reqIt := range req.Items {
			if reqIt.ProductID == it.ProductID {
				if reqIt.BatchNumber != "" {
					itemBatch = reqIt.BatchNumber
				}
				if reqIt.ExpiredDate != nil {
					itemExp = reqIt.ExpiredDate
				}
				break
			}
		}

		var balance models.StockBalance
		errBal := tx.Where("warehouse_id = ? AND product_id = ?", targetWhID, it.ProductID).First(&balance).Error

		costPrice := 0.0
		if errBal == nil && balance.AvgCost > 0 {
			costPrice = balance.AvgCost
		} else if it.Product != nil && it.Product.PurchasePrice > 0 {
			costPrice = it.Product.PurchasePrice
		}

		totalCOGS += costPrice * it.Qty

		// Deduct stock (Barang fisik benar-benar keluar saat dikirim)
		mutBal, errMut := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  targetWhID,
			ProductID:    it.ProductID,
			DocType:      "SALES_DELIVERY",
			DocNo:        delNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     costPrice,
			BatchNumber:  itemBatch,
			ExpiredDate:  itemExp,
			Notes:        fmt.Sprintf("Pengiriman Surat Jalan: %s (Faktur: %s)", delNo, sale.InvoiceNo),
			CreatedBy:    userID,
		})
		if errMut != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Gagal mutasi stok keluar obat: "+errMut.Error(), nil)
			return
		}

		if mutBal != nil {
			if itemBatch == "" {
				itemBatch = mutBal.BatchNumber
			}
			if itemExp == nil {
				itemExp = mutBal.ExpiredDate
			}
		}

		// Update Sale Item
		tx.Model(&models.SaleItem{}).Where("id = ?", it.ID).Updates(map[string]interface{}{
			"batch_number": itemBatch,
			"expired_date": itemExp,
			"cost_price":   costPrice,
		})

		// Update SO Item if linked
		if sale.SalesOrderID != nil {
			tx.Model(&models.SalesOrderItem{}).Where("sales_order_id = ? AND product_id = ?", *sale.SalesOrderID, it.ProductID).Updates(map[string]interface{}{
				"batch_number":  itemBatch,
				"expired_date":  itemExp,
				"delivered_qty": it.Qty,
			})
		}
	}

	now := time.Now()
	// Update Sale status
	sale.Status = "DIKIRIM"
	sale.DeliveryOrderNo = delNo
	sale.WarehouseShippedAt = &now
	sale.WarehouseShippedBy = &userID
	if req.Notes != "" {
		sale.WarehouseNotes = req.Notes
	}

	// Audit Log Verifikasi Gudang
	tx.Create(&models.AuditLog{
		CompanyID:    companyID,
		UserID:       userID,
		Category:     "TRANSAKSI",
		Action:       "VERIFIKASI GUDANG",
		Entity:       "PENJUALAN",
		EntityID:     sale.ID.String(),
		DocNo:        sale.InvoiceNo,
		Description:  fmt.Sprintf("Pemeriksaan Fisik Obat & Penyiapan Barang Faktur %s oleh Gudang", sale.InvoiceNo),
		Status:       "Sukses",
		IPAddress:    c.ClientIP(),
		ComputerName: "ISB-SEWA11-S-NB",
		NewValues:    fmt.Sprintf("Gudang menyelesaikan penyiapan fisik obat Faktur %s dengan Surat Jalan %s.", sale.InvoiceNo, delNo),
		CreatedAt:    now,
	})

	if err := tx.Save(&sale).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status pengiriman penjualan", err.Error())
		return
	}

	// Update linked SO status
	if sale.SalesOrderID != nil {
		tx.Model(&models.SalesOrder{}).Where("id = ?", *sale.SalesOrderID).Updates(map[string]interface{}{
			"status":               "DIKIRIM",
			"process_status":       "Dalam Pengiriman (Surat Jalan: " + delNo + ")",
			"delivery_order_no":    delNo,
			"delivery_tracking_no": req.TrackingNo,
			"delivery_courier":     courier,
			"delivery_date":        &delDate,
			"warehouse_shipped_at": &now,
			"warehouse_shipped_by": &userID,
		})
	}

	// Akuntansi: Transaksi Penjualan, HPP, Persediaan, Piutang, PPN Otomatis Terbit Saat Barang Dikirim
	effectivePaid := sale.PaidAmount
	remainingAmount := math.Max(0, sale.TotalAmount-effectivePaid)
	netSalesAmount := sale.TotalAmount - sale.TaxAmount

	var journalEntries []services.JournalEntryParam

	// 1. Debit HPP & Kredit Persediaan Obat
	if totalCOGS > 0 {
		journalEntries = append(journalEntries,
			services.JournalEntryParam{AccountCode: "5-1000", Debit: totalCOGS, Credit: 0, Description: fmt.Sprintf("HPP Pengiriman Faktur %s (SJ: %s)", sale.InvoiceNo, delNo)},
			services.JournalEntryParam{AccountCode: "1-1300", Debit: 0, Credit: totalCOGS, Description: fmt.Sprintf("Pengurangan Persediaan Obat Faktur %s (SJ: %s)", sale.InvoiceNo, delNo)},
		)
	}

	// 2. Debit Uang Muka Penjualan / DP jika ada
	if effectivePaid > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1200", // Uang Muka Penjualan / DP
			Debit:       effectivePaid,
			Credit:      0,
			Description: fmt.Sprintf("Pemotongan DP Faktur %s (SJ: %s)", sale.InvoiceNo, delNo),
		})
	}

	// Resolve accounts from setting
	saleDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "sales_price_discount", "sales_discount", "4-1200", "POTONGAN PENJUALAN", "REVENUE", "SALES", "DEBIT")
	saleIncomeAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_income", "4-1000", "Pendapatan Penjualan Obat", "REVENUE", "SALES", "CREDIT")
	saleReceivableAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_credit_receivable", "1-1200", "Piutang Usaha", "ASSET", "RECEIVABLE", "DEBIT")
	saleTaxAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_tax", "2-4110", "Utang PPN Keluaran", "LIABILITY", "TAX_PAYABLE", "CREDIT")

	var itemDiscounts float64
	for _, it := range sale.Items {
		itemDiscounts += it.Discount
	}
	totalDiscount := itemDiscounts + sale.Discount

	// 3. Debit Piutang Usaha jika ada sisa tagihan
	if remainingAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: saleReceivableAcc, // Piutang Usaha
			Debit:       remainingAmount,
			Credit:      0,
			Description: fmt.Sprintf("Piutang Pengiriman Faktur %s (SJ: %s)", sale.InvoiceNo, delNo),
		})
	}

	// 3b. Debit Akun Penampung Potongan Penjualan (POTONGAN PENJUALAN) jika ada diskon
	if totalDiscount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: saleDiscAcc,
			Debit:       totalDiscount,
			Credit:      0,
			Description: fmt.Sprintf("Potongan Penjualan Faktur %s (SJ: %s)", sale.InvoiceNo, delNo),
		})
	}

	// 4. Kredit Pendapatan Penjualan (sebelum diskon)
	grossSalesAmount := netSalesAmount + totalDiscount
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: saleIncomeAcc, // Pendapatan Penjualan
		Debit:       0,
		Credit:      grossSalesAmount,
		Description: fmt.Sprintf("Pendapatan Penjualan Faktur %s (SJ: %s)", sale.InvoiceNo, delNo),
	})

	// 5. Kredit PPN Keluaran jika ada pajak
	if sale.TaxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: saleTaxAcc, // Utang PPN Keluaran
			Debit:       0,
			Credit:      sale.TaxAmount,
			Description: fmt.Sprintf("PPN Keluaran Faktur %s (SJ: %s)", sale.InvoiceNo, delNo),
		})
	}

	_, errJ := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        delDate,
		RefType:     "SALES_DELIVERY",
		RefNo:       delNo,
		Description: fmt.Sprintf("Jurnal Pengiriman Faktur %s (Surat Jalan: %s)", sale.InvoiceNo, delNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if errJ != nil {
		log.Printf("[ShipSale] Warning posting journal: %v", errJ)
	}

	tx.Commit()
	utils.SendSuccess(c, "Barang penjualan berhasil dikirim dengan Surat Jalan "+delNo+". Stok obat telah dikeluarkan dan jurnal akuntansi telah dibukukan.", gin.H{
		"sale":     sale,
		"delivery": delivery,
	})
}

// 1.4 KONVERSI PESANAN PENJUALAN KE FAKTUR PENJUALAN (Generate Sales Invoice + FEFO + Sinkron Akuntansi)
func (h *SalesHandler) ConvertSalesOrderToInvoice(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	// If already invoiced, return existing invoice
	if so.SaleInvoiceID != nil && *so.SaleInvoiceID != uuid.Nil {
		var existingSale models.Sale
		if errSale := database.DB.Where("id = ?", *so.SaleInvoiceID).First(&existingSale).Error; errSale == nil {
			utils.SendSuccess(c, "Pesanan Penjualan ini sudah memiliki Faktur Penjualan", existingSale)
			return
		}
	}

	tx := database.DB.Begin()

	// Generate Sales Invoice Number
	invNo, err := services.GenerateDocNumber(tx, companyID, "SI")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor faktur penjualan", err.Error())
		return
	}

	targetWhID := uuid.Nil
	if so.WarehouseID != nil && *so.WarehouseID != uuid.Nil {
		targetWhID = *so.WarehouseID
	} else {
		var defaultWh models.Warehouse
		if errWh := tx.Where("branch_id = ?", branchID).First(&defaultWh).Error; errWh == nil {
			targetWhID = defaultWh.ID
		} else if errWhAny := tx.First(&defaultWh).Error; errWhAny == nil {
			targetWhID = defaultWh.ID
		}
	}

	// Payment calculation (Applying DP from SO)
	effectivePaid := so.PaidAmount
	remainingAmount := math.Max(0, so.TotalAmount-effectivePaid)
	paymentStatus := "UNPAID"
	if remainingAmount <= 0 {
		paymentStatus = "PAID"
	} else if effectivePaid > 0 {
		paymentStatus = "PARTIAL"
	}

	sale := models.Sale{
		CompanyID:          companyID,
		BranchID:           branchID,
		WarehouseID:        targetWhID,
		CustomerID:         so.CustomerID,
		SalesOrderID:       &so.ID,
		SalesRepID:         so.SalesRepID,
		InvoiceNo:          invNo,
		Date:               time.Now(),
		DueDate:            time.Now().AddDate(0, 0, 14),
		Type:               "BACKOFFICE",
		Status:             "POSTED",
		PaymentStatus:      paymentStatus,
		Subtotal:           so.Subtotal,
		TaxPercent:         so.TaxPercent,
		TaxAmount:          so.TaxAmount,
		Discount:           so.Discount,
		ShippingFee:        so.ShippingFee,
		TotalAmount:        so.TotalAmount,
		PaidAmount:         effectivePaid,
		ChangeAmount:       0,
		RemainingAmount:    remainingAmount,
		Notes:              fmt.Sprintf("Faktur Penjualan dari Pesanan: %s. %s", so.OrderNo, so.Notes),
		CustomerSPNumber: func() string {
			if so.CustomerSPNumber != "" {
				return so.CustomerSPNumber
			}
			cleanNo := strings.TrimPrefix(invNo, "INV/")
			cleanNo = strings.TrimPrefix(cleanNo, "POS/")
			cleanNo = strings.TrimPrefix(cleanNo, "SO/")
			return fmt.Sprintf("SP/%s", cleanNo)
		}(),
		CustomerSPDate: func() *time.Time {
			if so.CustomerSPDate != nil {
				return so.CustomerSPDate
			}
			nowDate := time.Now()
			return &nowDate
		}(),
		CustomerSPType: func() string {
			if so.CustomerSPType != "" {
				return so.CustomerSPType
			}
			return "REGULER"
		}(),
		PBFOriginInvoiceNo: so.PBFOriginInvoiceNo,
		DeliveryOrderNo:    so.DeliveryOrderNo,
		CreatedBy:          userID,
	}

	if err := tx.Create(&sale).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat faktur penjualan", err.Error())
		return
	}

	// Process Items, stock deduction with FEFO, and COGS
	var totalCOGS float64
	for _, it := range so.Items {
		var balance models.StockBalance
		errBal := tx.Where("warehouse_id = ? AND product_id = ?", targetWhID, it.ProductID).First(&balance).Error

		costPrice := 0.0
		if errBal == nil && balance.AvgCost > 0 {
			costPrice = balance.AvgCost
		} else if it.Product != nil && it.Product.PurchasePrice > 0 {
			costPrice = it.Product.PurchasePrice
		}

		totalCOGS += costPrice * it.Qty

		// Deduct stock using FEFO (First Expired, First Out)
		mutBal, errMut := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  targetWhID,
			ProductID:    it.ProductID,
			DocType:      "SALE_INVOICE",
			DocNo:        sale.InvoiceNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     costPrice,
			Notes:        fmt.Sprintf("Penjualan Faktur: %s (dari SO: %s)", sale.InvoiceNo, so.OrderNo),
			CreatedBy:    userID,
		})
		if errMut != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Gagal mutasi stok FEFO: "+errMut.Error(), nil)
			return
		}

		batchNo := ""
		var expDate *time.Time
		if mutBal != nil {
			batchNo = mutBal.BatchNumber
			expDate = mutBal.ExpiredDate
		}

		saleItem := models.SaleItem{
			SaleID:      sale.ID,
			ProductID:   it.ProductID,
			UnitID:      it.UnitID,
			Qty:         it.Qty,
			UnitPrice:   it.UnitPrice,
			CostPrice:   costPrice,
			Discount:    it.Discount,
			TotalAmount: it.TotalAmount,
			BatchNumber: batchNo,
			ExpiredDate: expDate,
		}
		tx.Create(&saleItem)
	}

	// If DP was paid on Sales Order, create a SalePayment record
	if effectivePaid > 0 {
		sp := models.SalePayment{
			SaleID:      sale.ID,
			Method:      "DP_SO",
			Amount:      effectivePaid,
			ReferenceNo: so.OrderNo,
		}
		tx.Create(&sp)
	}

	// Automated Double-entry Accounting Journal
	var journalEntries []services.JournalEntryParam

	// 1. Debit: If DP was used, clear Uang Muka Penjualan / DP (2-1200)
	if effectivePaid > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1200", // Uang Muka Penjualan / DP
			Debit:       effectivePaid,
			Credit:      0,
			Description: fmt.Sprintf("Pemotongan DP SO %s untuk Faktur %s", so.OrderNo, sale.InvoiceNo),
		})
	}

	// Resolve accounts from setting
	salesDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "sales_price_discount", "sales_discount", "4-1200", "POTONGAN PENJUALAN", "REVENUE", "SALES", "DEBIT")
	salesIncomeAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_income", "4-1000", "Pendapatan Penjualan Obat", "REVENUE", "SALES", "CREDIT")
	receivableAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_credit_receivable", "1-1200", "Piutang Usaha", "ASSET", "RECEIVABLE", "DEBIT")
	taxAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_tax", "2-4110", "Utang PPN Keluaran", "LIABILITY", "TAX_PAYABLE", "CREDIT")

	var itemDiscounts float64
	for _, it := range sale.Items {
		itemDiscounts += it.Discount
	}
	totalDiscount := itemDiscounts + sale.Discount

	// 2. Debit: Remaining Piutang Usaha
	if remainingAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: receivableAcc, // Piutang Usaha
			Debit:       remainingAmount,
			Credit:      0,
			Description: fmt.Sprintf("Piutang Penjualan Faktur %s (SO: %s)", sale.InvoiceNo, so.OrderNo),
		})
	}

	// 2b. Debit: Akun Penampung Potongan Penjualan (POTONGAN PENJUALAN) jika ada diskon
	if totalDiscount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: salesDiscAcc,
			Debit:       totalDiscount,
			Credit:      0,
			Description: fmt.Sprintf("Potongan Penjualan Faktur %s", sale.InvoiceNo),
		})
	}

	// 3. Kredit: Pendapatan Penjualan (sebelum diskon)
	grossSales := (sale.TotalAmount - sale.TaxAmount) + totalDiscount
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: salesIncomeAcc, // Pendapatan Penjualan
		Debit:       0,
		Credit:      grossSales,
		Description: fmt.Sprintf("Pendapatan Penjualan Faktur %s", sale.InvoiceNo),
	})

	// 4. Kredit: PPN Keluaran
	if sale.TaxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: taxAcc, // Utang PPN Keluaran
			Debit:       0,
			Credit:      sale.TaxAmount,
			Description: fmt.Sprintf("PPN Keluaran Faktur %s", sale.InvoiceNo),
		})
	}

	// 5. Debit HPP & Kredit Persediaan (FEFO)
	if totalCOGS > 0 {
		journalEntries = append(journalEntries,
			services.JournalEntryParam{
				AccountCode: "5-1000", // Beban Pokok Penjualan
				Debit:       totalCOGS,
				Credit:      0,
				Description: fmt.Sprintf("HPP Penjualan Faktur %s", sale.InvoiceNo),
			},
			services.JournalEntryParam{
				AccountCode: "1-1300", // Persediaan Obat
				Debit:       0,
				Credit:      totalCOGS,
				Description: fmt.Sprintf("Pengurangan Persediaan Obat Faktur %s", sale.InvoiceNo),
			},
		)
	}

	_, errJ := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "SALE",
		RefNo:       sale.InvoiceNo,
		Description: fmt.Sprintf("Jurnal Faktur Penjualan %s (dari SO %s)", sale.InvoiceNo, so.OrderNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if errJ != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal transaksi penjualan: "+errJ.Error(), nil)
		return
	}

	// Update SO status to SELESAI and link Invoice ID
	so.Status = "SELESAI"
	so.ProcessStatus = "Selesai (Faktur Diterbitkan)"
	so.SaleInvoiceID = &sale.ID
	if err := tx.Save(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status SO ke SELESAI", err.Error())
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Faktur Penjualan berhasil dibuat dan stok dikeluarkan sesuai aturan FEFO", sale)
}

func (h *SalesHandler) DeleteSalesOrder(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak memiliki wewenang untuk menghapus pesanan penjualan.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	var so models.SalesOrder
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).First(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	tx.Where("sales_order_id = ?", so.ID).Delete(&models.SalesOrderItem{})
	if err := tx.Delete(&so).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus SO", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Pesanan penjualan berhasil dihapus", nil)
}

// ==========================================
// 2. SALES INVOICES & POS CASHIER
// ==========================================

func (h *SalesHandler) GetSales(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	saleType := c.Query("type")

	query := database.DB.Where("sales.company_id = ?", companyID)

	// Filter sumber jika diminta (semua, direct, so)
	if source := c.Query("source"); source == "direct" {
		query = query.Where("sales.sales_order_id IS NULL")
	} else if source == "so" {
		query = query.Where("sales.sales_order_id IS NOT NULL")
	}

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN customers ON customers.id = sales.customer_id").
			Where("sales.invoice_no ILIKE ? OR customers.name ILIKE ? OR customers.code ILIKE ? OR sales.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("sales.warehouse_id = ?", warehouseID)
	}

	if customerID := c.Query("customer_id"); customerID != "" && customerID != "all" {
		query = query.Where("sales.customer_id = ?", customerID)
	}

	if hasDebt := c.Query("has_debt"); hasDebt == "true" {
		query = query.Where("sales.remaining_amount > 0")
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("sales.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("sales.date <= ?", endDate)
	}

	if saleType != "" && saleType != "Semua" {
		query = query.Where("sales.type = ?", saleType)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "invoice_no", "code", "kode":
		query = query.Order("sales.invoice_no " + sortDir)
	case "pelanggan", "customer", "name", "nama":
		query = query.Joins("LEFT JOIN customers ON customers.id = sales.customer_id").Order("customers.name " + sortDir)
	case "total":
		query = query.Order("sales.total_amount " + sortDir)
	case "created_at", "waktu_input", "terbaru":
		query = query.Order("sales.created_at " + sortDir)
	default:
		query = query.Order("sales.created_at " + sortDir + ", sales.date " + sortDir)
	}

	var sales []models.Sale
	if err := query.Preload("Customer").
		Preload("Warehouse").
		Preload("OriginPurchase.Supplier").
		Preload("SalesRep").
		Preload("SalesOrder").
		Preload("AdminApprover").
		Preload("WarehouseShipper").
		Preload("User").
		Preload("User.Roles").
		Preload("Modifier").
		Preload("Modifier.Roles").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Payments").
		Find(&sales).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil daftar faktur penjualan", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar faktur penjualan & transaksi kasir", sales)
}

func (h *SalesHandler) GetSale(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var sale models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("OriginPurchase.Supplier").
		Preload("SalesRep").
		Preload("SalesOrder").
		Preload("AdminApprover").
		Preload("WarehouseShipper").
		Preload("User").
		Preload("User.Roles").
		Preload("Modifier").
		Preload("Modifier.Roles").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Payments").
		First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail faktur penjualan", sale)
}

// PrintSaleInvoice marks the invoice as printed (ONLY ALLOWED ONCE per regulation)
func (h *SalesHandler) PrintSaleInvoice(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var sale models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("SalesRep").
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Payments").
		First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	// Cek apakah sudah pernah dicetak sebelumnya (hanya boleh 1 kali)
	if sale.IsPrinted || sale.PrintCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Faktur penjualan ini sudah pernah dicetak sebelumnya! Berdasarkan regulasi CDOB / Farmasi, cetak faktur asli hanya diperbolehkan 1 kali.",
			"data": gin.H{
				"is_printed":  sale.IsPrinted,
				"print_count": sale.PrintCount,
				"printed_at":  sale.PrintedAt,
				"invoice_no":  sale.InvoiceNo,
			},
		})
		return
	}

	// Update status cetak
	now := time.Now()
	sale.IsPrinted = true
	sale.PrintCount = 1
	sale.PrintedAt = &now
	sale.PrintedBy = &userID

	if err := database.DB.Model(&models.Sale{}).Where("id = ?", sale.ID).Updates(map[string]interface{}{
		"is_printed":  true,
		"print_count": 1,
		"printed_at":  &now,
		"printed_by":  userID,
	}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status cetak faktur", err.Error())
		return
	}

	utils.SendSuccess(c, "Faktur berhasil ditandai telah dicetak", sale)
}

// GetSalePrintData returns formatted printable dot-matrix data matching PBF standard
func (h *SalesHandler) GetSalePrintData(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var sale models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("SalesRep").
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Payments").
		First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	// Company info matching reference dot-matrix photo
	companyInfo := gin.H{
		"name":        "PT. BERKAT JAYA PHARMA",
		"address":     "JL. KARYA BARU NO. 43 PTK",
		"pbf_license": "IZIN PBF: 91201151705760001",
		"phone":       "HP: 085345445718",
		"npwp":        "NPWP: 83.957.105.7-701.000",
		"cdob_cert":   "Sertifikat CDOB: CDOB2352/R/4-59333/01/2025",
		"pharmacist": gin.H{
			"name": "APT. RAIF UMBARA, S.FARM",
			"sipa": "SIPA: 500.16/11151/SIPA/125270016/DPMTSP/SP/2025",
		},
		"bank_accounts": []string{
			"Rekening Bank MANDIRI PT. BERKAT JAYA PHARMA no.rek 146-00-1236866-3",
			"Rekening Bank BRI PT. BERKAT JAYA PHARMA no.rek 0071-01-002042-56-2",
			"Rekening Bank BCA PT. BERKAT JAYA PHARMA no.rek 6465337900",
		},
	}

	utils.SendSuccess(c, "Data cetak faktur", gin.H{
		"sale":    sale,
		"company": companyInfo,
	})
}

type CheckoutPayment struct {
	Method      string     `json:"method" binding:"required"`
	BankID      *uuid.UUID `json:"bank_id"`
	Amount      float64    `json:"amount" binding:"required"`
	ReferenceNo string     `json:"reference_no"`
}

type CheckoutItem struct {
	ProductID uuid.UUID `json:"product_id" binding:"required"`
	UnitID    uuid.UUID `json:"unit_id" binding:"required"`
	Qty       float64   `json:"qty" binding:"required"`
	UnitPrice float64   `json:"unit_price" binding:"required"`
	Discount  float64   `json:"discount"`
}

type CheckoutRequest struct {
	ID           *uuid.UUID        `json:"id"`
	WarehouseID  uuid.UUID         `json:"warehouse_id" binding:"required"`
	CustomerID   *uuid.UUID        `json:"customer_id"`
	SalesOrderID *uuid.UUID        `json:"sales_order_id"`
	SalesRepID   *uuid.UUID        `json:"sales_rep_id"`
	Type         string            `json:"type"` // POS, BACKOFFICE, MARKETPLACE
	TaxPercent   float64           `json:"tax_percent"`
	Discount     float64           `json:"discount"`
	ShippingFee  float64           `json:"shipping_fee"`
	Notes        string            `json:"notes"`
	CustomerSPNumber   string      `json:"customer_sp_number"`
	CustomerSPDate     *time.Time  `json:"customer_sp_date"`
	CustomerSPType     string      `json:"customer_sp_type"`
	PBFOriginInvoiceNo string      `json:"pbf_origin_invoice_no"`
	OriginPurchaseID   *uuid.UUID  `json:"origin_purchase_id"`
	TaxInvoiceNo       string      `json:"tax_invoice_no"`
	DeliveryOrderNo    string      `json:"delivery_order_no"`
	DueDate            *time.Time  `json:"due_date"`
	InvoiceDate        *time.Time  `json:"invoice_date"`
	CashAccountID      *uuid.UUID  `json:"cash_account_id"`
	PaidAmount         float64     `json:"paid_amount"`
	TenderMethod       string      `json:"tender_method"`
	ComputerName       string      `json:"computer_name"`
	Items        []CheckoutItem    `json:"items" binding:"required"`
	Payments     []CheckoutPayment `json:"payments"`
}

func (h *SalesHandler) CreateSale(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak dapat membuat transaksi penjualan langsung. Proses ini dilakukan oleh Admin / Kasir.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data transaksi penjualan / kasir tidak valid", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Barang penjualan tidak boleh kosong", nil)
		return
	}

	tx := database.DB.Begin()

	invNo, err := services.GenerateDocNumber(tx, companyID, "SI")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor faktur penjualan", err.Error())
		return
	}

	var subtotal float64
	for _, it := range req.Items {
		subtotal += (it.Qty * it.UnitPrice) - it.Discount
	}

	taxAmount := (subtotal - req.Discount) * (req.TaxPercent / 100)
	totalAmount := subtotal - req.Discount + taxAmount + req.ShippingFee

	var totalPaid float64
	for _, p := range req.Payments {
		totalPaid += p.Amount
	}
	if totalPaid == 0 && req.PaidAmount > 0 {
		totalPaid = req.PaidAmount
		method := "CASH"
		if req.TenderMethod != "" {
			method = req.TenderMethod
		}
		req.Payments = append(req.Payments, CheckoutPayment{
			Method:      method,
			Amount:      req.PaidAmount,
			ReferenceNo: "TUNAI",
		})
	}

	saleType := "POS"
	if req.Type != "" {
		saleType = req.Type
	}

	// Validasi Regulasi Farmasi: Kasir Retail POS hanya boleh menjual Obat Bebas, Bebas Terbatas, Alkes, dan Lainnya
	// Obat Keras, Narkotika, Psikotropika, Prekursor, OOT, dan Khusus RS dilarang dijual bebas di Kasir
	if saleType == "POS" {
		for _, it := range req.Items {
			var p models.Product
			if err := tx.Select("id, name, drug_classification, is_sold_in_pharmacy, distribution_channel").First(&p, it.ProductID).Error; err == nil {
				cls := strings.ToUpper(p.DrugClassification)
				if cls == "OBAT_KERAS" || cls == "NARKOTIKA" || cls == "PSIKOTROPIKA" || cls == "PREKURSOR" || cls == "OOT" || cls == "OBAT_KHUSUS_RS" || !p.IsSoldInPharmacy || p.DistributionChannel == "PBF_ONLY" {
					tx.Rollback()
					utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Obat '%s' tergolong %s (Wajib Resep Dokter) dan TIDAK BOLEH dijual bebas di kasir retail. Harap arahkan ke loket Penerimaan Resep / Penjualan Reguler Apotek.", p.Name, p.DrugClassification), nil)
					return
				}
			}
		}
	}

	var changeAmount, remainingAmount float64
	paymentStatus := "UNPAID"

	if totalPaid >= totalAmount {
		paymentStatus = "PAID"
		changeAmount = totalPaid - totalAmount
		remainingAmount = 0
	} else if totalPaid > 0 {
		paymentStatus = "PARTIAL"
		changeAmount = 0
		remainingAmount = totalAmount - totalPaid
	} else {
		paymentStatus = "UNPAID"
		changeAmount = 0
		remainingAmount = totalAmount
	}

	saleDate := time.Now()
	if req.InvoiceDate != nil {
		saleDate = *req.InvoiceDate
	}
	saleDueDate := time.Now().AddDate(0, 0, 14)
	if req.DueDate != nil {
		saleDueDate = *req.DueDate
	}

	spNumber := req.CustomerSPNumber
	if spNumber == "" {
		if spNo, err := services.GenerateDocNumber(tx, companyID, "SP"); err == nil && spNo != "" {
			spNumber = spNo
		} else {
			cleanNo := strings.TrimPrefix(invNo, "INV/")
			cleanNo = strings.TrimPrefix(cleanNo, "POS/")
			cleanNo = strings.TrimPrefix(cleanNo, "SO/")
			spNumber = fmt.Sprintf("SP/%s", cleanNo)
		}
	}
	spDate := req.CustomerSPDate
	if spDate == nil {
		nowSpDate := time.Now()
		spDate = &nowSpDate
	}
	spType := req.CustomerSPType
	if spType == "" {
		spType = "REGULER"
	}

	var custID uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != uuid.Nil {
		custID = *req.CustomerID
	} else {
		// Kasir retail / POS: jika pelanggan dikosongi, otomatis gunakan Pelanggan Umum / Cash default
		var defCust models.Customer
		if err := tx.Where("company_id = ? AND (code = '01' OR code = 'PL0015' OR LOWER(name) LIKE '%cash%' OR LOWER(name) LIKE '%umum%')", companyID).First(&defCust).Error; err == nil && defCust.ID != uuid.Nil {
			custID = defCust.ID
		} else {
			defCust = models.Customer{
				CompanyID:    companyID,
				Code:         "PL0015",
				Name:         "CASH / UMUM",
				PharmacyType: "UMUM",
			}
			tx.Create(&defCust)
			custID = defCust.ID
		}
	}

	sale := models.Sale{
		CompanyID:       companyID,
		BranchID:        branchID,
		WarehouseID:     req.WarehouseID,
		CustomerID:      custID,
		SalesOrderID:    req.SalesOrderID,
		SalesRepID:      req.SalesRepID,
		InvoiceNo:       invNo,
		Date:            saleDate,
		DueDate:         saleDueDate,
		Type:            saleType,
		Status:          "POSTED",
		PaymentStatus:   paymentStatus,
		Subtotal:        subtotal,
		TaxPercent:      req.TaxPercent,
		TaxAmount:       taxAmount,
		Discount:        req.Discount,
		ShippingFee:     req.ShippingFee,
		TotalAmount:     totalAmount,
		PaidAmount:      totalPaid - changeAmount,
		ChangeAmount:    changeAmount,
		RemainingAmount: remainingAmount,
		Notes:           req.Notes,
		CustomerSPNumber:   spNumber,
		CustomerSPDate:     spDate,
		CustomerSPType:     spType,
		PBFOriginInvoiceNo: req.PBFOriginInvoiceNo,
		OriginPurchaseID:   req.OriginPurchaseID,
		TaxInvoiceNo:       req.TaxInvoiceNo,
		DeliveryOrderNo:    req.DeliveryOrderNo,
		ComputerName:       getComputerName(c, req.ComputerName),
		CreatedBy:          userID,
	}

	if req.ID != nil && *req.ID != uuid.Nil {
		sale.ID = *req.ID
	}

	if err := tx.Create(&sale).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan penjualan", err.Error())
		return
	}

	// Process Items, stock deduction, and calculate total COGS
	var totalCOGS float64
	for _, it := range req.Items {
		var balance models.StockBalance
		err := tx.Where("warehouse_id = ? AND product_id = ?", req.WarehouseID, it.ProductID).
			First(&balance).Error

		costPrice := 0.0
		if err == nil {
			costPrice = balance.AvgCost
		} else {
			var prod models.Product
			if errProd := tx.First(&prod, it.ProductID).Error; errProd == nil {
				costPrice = prod.PurchasePrice
			}
		}

		totalCOGS += costPrice * it.Qty

		// Deduct stock using FEFO (First Expired, First Out)
		mutBal, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "SALE_INVOICE",
			DocNo:        sale.InvoiceNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     costPrice,
			Notes:        fmt.Sprintf("Penjualan Faktur Kasir: %s", sale.InvoiceNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}

		batchNo := ""
		var expDate *time.Time
		if mutBal != nil {
			batchNo = mutBal.BatchNumber
			expDate = mutBal.ExpiredDate
		}

		saleItem := models.SaleItem{
			SaleID:      sale.ID,
			ProductID:   it.ProductID,
			UnitID:      it.UnitID,
			Qty:         it.Qty,
			UnitPrice:   it.UnitPrice,
			CostPrice:   costPrice,
			Discount:    it.Discount,
			TotalAmount: (it.Qty * it.UnitPrice) - it.Discount,
			BatchNumber: batchNo,
			ExpiredDate: expDate,
		}
		if err := tx.Create(&saleItem).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan item penjualan", err.Error())
			return
		}
	}

	// Record split payments
	for _, pay := range req.Payments {
		sp := models.SalePayment{
			SaleID:      sale.ID,
			Method:      pay.Method,
			BankID:      pay.BankID,
			Amount:      pay.Amount,
			ReferenceNo: pay.ReferenceNo,
		}
		tx.Create(&sp)
	}

	// Resolve Cash / Bank Account Code
	cashAccountCode := "1-1110" // Default Kas Kecil / Kasir
	if req.CashAccountID != nil {
		var customAcc models.Account
		if err := tx.First(&customAcc, *req.CashAccountID).Error; err == nil && customAcc.Code != "" {
			cashAccountCode = customAcc.Code
		}
	} else if len(req.Payments) > 0 {
		firstPay := req.Payments[0]
		if firstPay.Method == "TRANSFER" || firstPay.Method == "BANK" || firstPay.BankID != nil {
			cashAccountCode = "1-1120" // Bank BCA
		} else if firstPay.Method == "CASH" && saleType != "POS" {
			cashAccountCode = "1-1121" // Kas Besar untuk transaksi B2B/PBF
		}
	}

	// Resolve accounts from setting
	salesDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "sales_price_discount", "sales_discount", "4-1200", "POTONGAN PENJUALAN", "REVENUE", "SALES", "DEBIT")
	salesIncomeAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_income", "4-1000", "Pendapatan Penjualan Obat", "REVENUE", "SALES", "CREDIT")
	receivableAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_credit_receivable", "1-1200", "Piutang Usaha", "ASSET", "RECEIVABLE", "DEBIT")
	taxAcc := services.ResolveSettingAccountCode(tx, companyID, "sales_tax", "2-4110", "Utang PPN Keluaran", "LIABILITY", "TAX_PAYABLE", "CREDIT")

	var itemDiscounts float64
	for _, it := range req.Items {
		itemDiscounts += it.Discount
	}
	totalDiscount := itemDiscounts + req.Discount

	// Double-entry journal entries
	var journalEntries []services.JournalEntryParam
	effectivePaid := totalPaid - changeAmount
	if effectivePaid > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashAccountCode,
			Debit:       effectivePaid,
			Credit:      0,
			Description: fmt.Sprintf("Penerimaan Kas/Bank Faktur %s", sale.InvoiceNo),
		})
	}

	if remainingAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: receivableAcc, // Piutang Usaha
			Debit:       remainingAmount,
			Credit:      0,
			Description: fmt.Sprintf("Piutang Penjualan Faktur %s", sale.InvoiceNo),
		})
	}

	// Akun Penampung Potongan Penjualan (POTONGAN PENJUALAN) di DEBIT
	if totalDiscount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: salesDiscAcc,
			Debit:       totalDiscount,
			Credit:      0,
			Description: fmt.Sprintf("Potongan Penjualan Faktur %s", sale.InvoiceNo),
		})
	}

	// Gross Sales di KREDIT (sebelum potongan)
	grossSalesAmount := (totalAmount - taxAmount) + totalDiscount
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: salesIncomeAcc, // Pendapatan Penjualan
		Debit:       0,
		Credit:      grossSalesAmount,
		Description: fmt.Sprintf("Pendapatan Penjualan Faktur %s", sale.InvoiceNo),
	})

	if taxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: taxAcc, // Utang PPN Keluaran
			Debit:       0,
			Credit:      taxAmount,
			Description: fmt.Sprintf("PPN Keluaran Faktur %s", sale.InvoiceNo),
		})
	}

	if totalCOGS > 0 {
		journalEntries = append(journalEntries,
			services.JournalEntryParam{AccountCode: "5-1000", Debit: totalCOGS, Credit: 0, Description: fmt.Sprintf("HPP Faktur %s", sale.InvoiceNo)},
			services.JournalEntryParam{AccountCode: "1-1300", Debit: 0, Credit: totalCOGS, Description: fmt.Sprintf("Pengurangan Persediaan Faktur %s", sale.InvoiceNo)},
		)
	}

	_, err = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "SALE",
		RefNo:       sale.InvoiceNo,
		Description: fmt.Sprintf("Jurnal Penjualan Faktur %s", sale.InvoiceNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal transaksi penjualan: "+err.Error(), nil)
		return
	}

	if effectivePaid > 0 {
		syncSaleCashTransaction(tx, &sale, companyID, branchID, userID, cashAccountCode, effectivePaid)
	}

	tx.Commit()
	utils.SendCreated(c, "Transaksi kasir / penjualan berhasil disimpan dan diposting", sale)
}

func (h *SalesHandler) UpdateSale(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak dapat mengubah faktur penjualan. Proses ini dilakukan oleh Admin.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var sale models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	var req struct {
		Notes              string     `json:"notes"`
		CustomerSPNumber   string     `json:"customer_sp_number"`
		CustomerSPDate     *time.Time `json:"customer_sp_date"`
		CustomerSPType     string     `json:"customer_sp_type"`
		PBFOriginInvoiceNo string     `json:"pbf_origin_invoice_no"`
		OriginPurchaseID   *uuid.UUID `json:"origin_purchase_id"`
		TaxInvoiceNo       string     `json:"tax_invoice_no"`
		DeliveryOrderNo    string     `json:"delivery_order_no"`
		DueDate            *time.Time `json:"due_date"`
		ComputerName       string     `json:"computer_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data update tidak valid", err.Error())
		return
	}

	updates := map[string]interface{}{}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}
	if req.CustomerSPNumber != "" {
		updates["customer_sp_number"] = req.CustomerSPNumber
	}
	if req.CustomerSPDate != nil {
		updates["customer_sp_date"] = req.CustomerSPDate
	}
	if req.CustomerSPType != "" {
		updates["customer_sp_type"] = req.CustomerSPType
	}
	if req.PBFOriginInvoiceNo != "" {
		updates["pbf_origin_invoice_no"] = req.PBFOriginInvoiceNo
	}
	if req.OriginPurchaseID != nil {
		updates["origin_purchase_id"] = req.OriginPurchaseID
	}
	if req.TaxInvoiceNo != "" {
		updates["tax_invoice_no"] = req.TaxInvoiceNo
	}
	if req.DeliveryOrderNo != "" {
		updates["delivery_order_no"] = req.DeliveryOrderNo
	}
	if req.DueDate != nil {
		updates["due_date"] = req.DueDate
	}

	userID := c.MustGet("user_id").(uuid.UUID)
	updates["updated_by"] = userID
	updates["computer_name"] = getComputerName(c, req.ComputerName)

	if len(updates) > 0 {
		database.DB.Model(&sale).Updates(updates)
	}

	utils.SendSuccess(c, "Faktur penjualan berhasil diperbarui", sale)
}

func (h *SalesHandler) DeleteSale(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak dapat menghapus faktur penjualan.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	var sale models.Sale
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&sale).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	// Revert stock for all items
	for _, it := range sale.Items {
		_, _ = services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  sale.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "SALE_VOID",
			DocNo:        sale.InvoiceNo,
			MovementType: "IN",
			Qty:          it.Qty,
			UnitCost:     it.CostPrice,
			Notes:        fmt.Sprintf("Pembatalan Penjualan: %s", sale.InvoiceNo),
			CreatedBy:    userID,
		})
	}

	tx.Where("sale_id = ?", sale.ID).Delete(&models.SaleItem{})
	tx.Where("sale_id = ?", sale.ID).Delete(&models.SalePayment{})
	if err := tx.Delete(&sale).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus faktur penjualan", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Faktur penjualan berhasil dibatalkan dan dihapus", nil)
}

// ==========================================
// 3. SALES RETURNS (MODE 1 & MODE 2)
// ==========================================

func (h *SalesHandler) GetSalesReturns(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	query := database.DB.Where("sales_returns.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN customers ON customers.id = sales_returns.customer_id").
			Where("sales_returns.return_no ILIKE ? OR customers.name ILIKE ? OR customers.code ILIKE ? OR sales_returns.reason ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("sales_returns.warehouse_id = ?", warehouseID)
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("sales_returns.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("sales_returns.date <= ?", endDate)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "return_no":
		query = query.Order("sales_returns.return_no " + sortDir)
	case "pelanggan", "customer":
		query = query.Joins("LEFT JOIN customers ON customers.id = sales_returns.customer_id").Order("customers.name " + sortDir)
	case "total":
		query = query.Order("sales_returns.total_amount " + sortDir)
	default:
		query = query.Order("sales_returns.date " + sortDir)
	}

	var returns []models.SalesReturn
	if err := query.Preload("Customer").
		Preload("Warehouse").
		Preload("SalesRep").
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		Find(&returns).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data retur penjualan", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar retur penjualan", returns)
}

func (h *SalesHandler) GetSalesReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var ret models.SalesReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("SalesRep").
		Preload("Sale").
		Preload("User").
		Preload("WarehouseVerifier").
		Preload("AdminApprover").
		Preload("Finalizer").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("StatusLogs.User").
		First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", err.Error())
		return
	}

	utils.SendSuccess(c, "Detail retur penjualan", ret)
}

func (h *SalesHandler) CreateSalesReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		ReturnMode   string     `json:"return_mode"` // MODE_1 or MODE_2
		SaleID       *uuid.UUID `json:"sale_id"`
		WarehouseID  uuid.UUID  `json:"warehouse_id" binding:"required"`
		CustomerID   uuid.UUID  `json:"customer_id" binding:"required"`
		SalesRepID   *uuid.UUID `json:"sales_rep_id"`
		TaxType      string     `json:"tax_type"` // NON, INCLUDE, EXCLUDE
		TaxPercent   float64    `json:"tax_percent"`
		OtherCost    float64    `json:"other_cost"`
		Discount     float64    `json:"discount"`
		Reason       string     `json:"reason"`
		ComputerName string     `json:"computer_name"`
		Status       string     `json:"status"` // DRAFT or POSTED
		Items        []struct {
			ProductID         uuid.UUID  `json:"product_id" binding:"required"`
			UnitID            uuid.UUID  `json:"unit_id" binding:"required"`
			OriginalInvoiceNo string     `json:"original_invoice_no"`
			Brand             string     `json:"brand"`
			SoldQty           float64    `json:"sold_qty"`
			SoldUnit          string     `json:"sold_unit"`
			Qty               float64    `json:"qty" binding:"required"`
			UnitPrice         float64    `json:"unit_price" binding:"required"`
			DiscountPercent   float64    `json:"discount_percent"`
			BatchNumber       string     `json:"batch_number"`
			ExpiredDate       *time.Time `json:"expired_date"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data retur penjualan tidak lengkap", err.Error())
		return
	}

	tx := database.DB.Begin()

	retNo, err := services.GenerateDocNumber(tx, companyID, "RJ")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor retur penjualan", err.Error())
		return
	}

	var subtotal float64
	for _, it := range req.Items {
		itemSub := (it.Qty * it.UnitPrice)
		disc := itemSub * (it.DiscountPercent / 100)
		subtotal += (itemSub - disc)
	}

	taxAmount := (subtotal - req.Discount) * (req.TaxPercent / 100)
	totalAmount := subtotal - req.Discount + taxAmount + req.OtherCost

	mode := "MODE_1"
	if req.ReturnMode == "MODE_2" {
		mode = "MODE_2"
	}

	computer := req.ComputerName
	if computer == "" {
		computer = "KOMPUTER-01"
	}

	initialStatus := "DRAFT"
	if req.Status == "POSTED" {
		initialStatus = "POSTED"
	} else if req.Status != "" {
		initialStatus = req.Status
	}

	salesReturn := models.SalesReturn{
		CompanyID:    companyID,
		BranchID:     branchID,
		WarehouseID:  req.WarehouseID,
		CustomerID:   req.CustomerID,
		SalesRepID:   req.SalesRepID,
		SaleID:       req.SaleID,
		ReturnNo:     retNo,
		Date:         time.Now(),
		ReturnMode:   mode,
		TaxType:      req.TaxType,
		TaxPercent:   req.TaxPercent,
		OtherCost:    req.OtherCost,
		Discount:     req.Discount,
		ComputerName: computer,
		Status:       initialStatus,
		TotalAmount:  totalAmount,
		Reason:       req.Reason,
		CreatedBy:    userID,
	}

	if err := tx.Create(&salesReturn).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat dokumen retur penjualan", err.Error())
		return
	}

	var totalRestockCost float64
	for _, it := range req.Items {
		itemSub := (it.Qty * it.UnitPrice)
		disc := itemSub * (it.DiscountPercent / 100)
		lineTotal := itemSub - disc

		retItem := models.SalesReturnItem{
			SalesReturnID:     salesReturn.ID,
			ProductID:         it.ProductID,
			UnitID:            it.UnitID,
			OriginalInvoiceNo: it.OriginalInvoiceNo,
			Brand:             it.Brand,
			SoldQty:           it.SoldQty,
			SoldUnit:          it.SoldUnit,
			Qty:               it.Qty,
			UnitPrice:         it.UnitPrice,
			DiscountPercent:   it.DiscountPercent,
			TotalAmount:       lineTotal,
			BatchNumber:       it.BatchNumber,
			ExpiredDate:       it.ExpiredDate,
			Condition:         "BAIK",
			AcceptedQty:       it.Qty,
			RejectedQty:       0,
		}
		if err := tx.Create(&retItem).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan item retur penjualan", err.Error())
			return
		}

		if initialStatus == "POSTED" {
			// Restock to warehouse immediately for backward-compatibility POSTED
			var prod models.Product
			costPrice := it.UnitPrice
			if errProd := tx.First(&prod, it.ProductID).Error; errProd == nil {
				costPrice = prod.PurchasePrice
			}
			totalRestockCost += costPrice * it.Qty

			_, _ = services.MutateStock(tx, services.StockMutationParams{
				CompanyID:    companyID,
				BranchID:     branchID,
				WarehouseID:  req.WarehouseID,
				ProductID:    it.ProductID,
				DocType:      "SALES_RETURN",
				DocNo:        salesReturn.ReturnNo,
				MovementType: "IN",
				Qty:          it.Qty, // Restock
				UnitCost:     costPrice,
				BatchNumber:  it.BatchNumber,
				ExpiredDate:  it.ExpiredDate,
				Notes:        fmt.Sprintf("Retur Penjualan (%s) - %s", salesReturn.ReturnNo, req.Reason),
				CreatedBy:    userID,
			})
		}
	}

	if err := tx.Create(&models.SalesReturnStatusLog{
		SalesReturnID: salesReturn.ID,
		Status:        initialStatus,
		Action:        "PENGAJUAN_RETUR",
		Notes:         fmt.Sprintf("Pengajuan retur penjualan %s berhasil dibuat (%s)", salesReturn.ReturnNo, mode),
		UserID:        userID,
	}).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mencatat riwayat alur retur", err.Error())
		return
	}

	if initialStatus == "POSTED" {
		salesReturn.IsStockRestocked = true
		now := time.Now()
		salesReturn.RestockedAt = &now
		salesReturn.RestockedBy = &userID
		salesReturn.SettlementType = "KAS_PENGEMBALIAN"
		salesReturn.RefundAmount = totalAmount
		salesReturn.FinalizedAt = &now
		salesReturn.FinalizedBy = &userID
		tx.Save(&salesReturn)

		// Double-entry journal for sales return
		var journalEntries []services.JournalEntryParam
		// Debit: Retur & Pengurangan Penjualan (4-1000)
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "4-1000",
			Debit:       totalAmount,
			Credit:      0,
			Description: fmt.Sprintf("Retur Penjualan %s", salesReturn.ReturnNo),
		})
		// Credit: Kas Kasir (1-1110)
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "1-1110",
			Debit:       0,
			Credit:      totalAmount,
			Description: fmt.Sprintf("Pengembalian Dana Retur %s", salesReturn.ReturnNo),
		})

		if totalRestockCost > 0 {
			journalEntries = append(journalEntries,
				services.JournalEntryParam{AccountCode: "1-1300", Debit: totalRestockCost, Credit: 0, Description: fmt.Sprintf("Pengembalian Persediaan Retur %s", salesReturn.ReturnNo)},
				services.JournalEntryParam{AccountCode: "5-1000", Debit: 0, Credit: totalRestockCost, Description: fmt.Sprintf("Pengurangan HPP Retur %s", salesReturn.ReturnNo)},
			)
		}

		_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        time.Now(),
			RefType:     "SALES_RETURN",
			RefNo:       salesReturn.ReturnNo,
			Description: fmt.Sprintf("Jurnal Retur Penjualan %s", salesReturn.ReturnNo),
			CreatedBy:   userID,
			Entries:     journalEntries,
		})
	}

	tx.Commit()
	database.DB.Preload("Customer").Preload("Warehouse").Preload("Items.Product").Preload("Items.Unit").Preload("StatusLogs.User").First(&salesReturn, salesReturn.ID)
	utils.SendCreated(c, "Retur penjualan berhasil disimpan", salesReturn)
}

// 1. Verifikasi Fisik oleh Petugas Gudang
func (h *SalesHandler) VerifyWarehouseSalesReturn(c *gin.Context) {
	if !isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Verifikasi fisik obat retur penjualan HANYA DAPAT DILAKUKAN OLEH PETUGAS GUDANG.", nil)
		return
	}
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var req struct {
		Notes string `json:"notes"`
		Items []struct {
			ID          uuid.UUID  `json:"id"`
			Condition   string     `json:"condition"`
			BatchNumber string     `json:"batch_number"`
			ExpiredDate *time.Time `json:"expired_date"`
			AcceptedQty float64    `json:"accepted_qty"`
			RejectedQty float64    `json:"rejected_qty"`
		} `json:"items"`
	}
	_ = c.ShouldBindJSON(&req)

	var ret models.SalesReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	now := time.Now()
	ret.Status = "VERIFIKASI_GUDANG"
	ret.WarehouseVerifiedAt = &now
	ret.WarehouseVerifiedBy = &userID
	ret.WarehouseNotes = req.Notes

	for _, reqIt := range req.Items {
		cond := "BAIK"
		if reqIt.Condition == "RUSAK" {
			cond = "RUSAK"
		}
		tx.Model(&models.SalesReturnItem{}).
			Where("id = ? AND sales_return_id = ?", reqIt.ID, ret.ID).
			Updates(map[string]interface{}{
				"condition":    cond,
				"batch_number": reqIt.BatchNumber,
				"expired_date": reqIt.ExpiredDate,
				"accepted_qty": reqIt.AcceptedQty,
				"rejected_qty": reqIt.RejectedQty,
			})
	}

	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan verifikasi gudang", err.Error())
		return
	}

	tx.Create(&models.SalesReturnStatusLog{
		SalesReturnID: ret.ID,
		Status:        "VERIFIKASI_GUDANG",
		Action:        "VERIFIKASI_GUDANG",
		Notes:         fmt.Sprintf("Pemeriksaan fisik barang oleh Petugas Gudang: %s", req.Notes),
		UserID:        userID,
	})

	tx.Commit()
	database.DB.Preload("Customer").Preload("Warehouse").Preload("WarehouseVerifier").Preload("Items.Product").Preload("Items.Unit").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Verifikasi fisik obat berhasil disimpan oleh Petugas Gudang", ret)
}

// 2. Persetujuan oleh Admin / Apoteker
func (h *SalesHandler) AdminApproveSalesReturn(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Persetujuan retur penjualan HANYA DAPAT DILAKUKAN OLEH ADMIN / APOTEKER.", nil)
		return
	}
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	_ = c.ShouldBindJSON(&req)

	var ret models.SalesReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	now := time.Now()
	ret.Status = "DISETUJUI_ADMIN"
	ret.AdminApprovedAt = &now
	ret.AdminApprovedBy = &userID
	ret.AdminNotes = req.Notes

	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyetujui retur penjualan", err.Error())
		return
	}

	tx.Create(&models.SalesReturnStatusLog{
		SalesReturnID: ret.ID,
		Status:        "DISETUJUI_ADMIN",
		Action:        "PERSETUJUAN_ADMIN",
		Notes:         fmt.Sprintf("Persetujuan oleh Admin / Apoteker: %s", req.Notes),
		UserID:        userID,
	})

	tx.Commit()
	database.DB.Preload("Customer").Preload("Warehouse").Preload("AdminApprover").Preload("Items.Product").Preload("Items.Unit").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Retur penjualan berhasil disetujui Admin", ret)
}

// 3. Penolakan Retur oleh Admin
func (h *SalesHandler) AdminRejectSalesReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Alasan penolakan wajib diisi", nil)
		return
	}

	var ret models.SalesReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	ret.Status = "DITOLAK"
	ret.RejectReason = req.Reason

	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menolak retur penjualan", err.Error())
		return
	}

	tx.Create(&models.SalesReturnStatusLog{
		SalesReturnID: ret.ID,
		Status:        "DITOLAK",
		Action:        "PENOLAKAN_RETUR",
		Notes:         fmt.Sprintf("Penolakan retur penjualan: %s", req.Reason),
		UserID:        userID,
	})

	tx.Commit()
	utils.SendSuccess(c, "Retur penjualan berhasil ditolak", ret)
}

// 4. Penerimaan Fisik Barang & Restock Gudang (HANYA Petugas Gudang)
func (h *SalesHandler) RestockSalesReturn(c *gin.Context) {
	if !isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Penerimaan barang fisik dan restock gudang HANYA DAPAT DILAKUKAN OLEH PETUGAS GUDANG.", nil)
		return
	}
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var ret models.SalesReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", err.Error())
		return
	}

	if ret.Status != "DISETUJUI_ADMIN" {
		utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Barang hanya dapat direstock jika status sudah DISETUJUI_ADMIN (Status saat ini: %s)", ret.Status), nil)
		return
	}

	if ret.IsStockRestocked {
		utils.SendError(c, http.StatusBadRequest, "Stok retur ini sudah pernah dimasukkan ke gudang sebelumnya", nil)
		return
	}

	tx := database.DB.Begin()
	now := time.Now()

	for _, it := range ret.Items {
		qtyToRestock := it.Qty
		if it.AcceptedQty > 0 {
			qtyToRestock = it.AcceptedQty
		}
		if it.Condition == "RUSAK" {
			qtyToRestock = 0 // Barang rusak masuk karantina
		}

		if qtyToRestock > 0 {
			var prod models.Product
			costPrice := it.UnitPrice
			if errProd := tx.First(&prod, it.ProductID).Error; errProd == nil {
				costPrice = prod.PurchasePrice
			}

			_, _ = services.MutateStock(tx, services.StockMutationParams{
				CompanyID:    companyID,
				BranchID:     branchID,
				WarehouseID:  ret.WarehouseID,
				ProductID:    it.ProductID,
				DocType:      "SALES_RETURN",
				DocNo:        ret.ReturnNo,
				MovementType: "IN",
				Qty:          qtyToRestock,
				UnitCost:     costPrice,
				BatchNumber:  it.BatchNumber,
				ExpiredDate:  it.ExpiredDate,
				Notes:        fmt.Sprintf("Restock Retur Penjualan (%s) - Kondisi: %s", ret.ReturnNo, it.Condition),
				CreatedBy:    userID,
			})
		}
	}

	ret.IsStockRestocked = true
	ret.RestockedAt = &now
	ret.RestockedBy = &userID
	ret.Status = "BARANG_DITERIMA"

	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memproses restock retur", err.Error())
		return
	}

	tx.Create(&models.SalesReturnStatusLog{
		SalesReturnID: ret.ID,
		Status:        "BARANG_DITERIMA",
		Action:        "RESTOCK_GUDANG",
		Notes:         "Barang retur fisik diterima di gudang & stok obat layak jual telah ditambahkan kembali.",
		UserID:        userID,
	})

	tx.Commit()
	database.DB.Preload("Customer").Preload("Warehouse").Preload("Items.Product").Preload("Items.Unit").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Barang retur berhasil diterima dan stok obat telah diperbarui", ret)
}

// 5. Finalisasi Retur Penjualan & Penyelesaian Keuangan (Akuntansi)
func (h *SalesHandler) FinalizeSalesReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var req struct {
		SettlementType string     `json:"settlement_type" binding:"required"` // POTONG_PIUTANG, KREDIT_PELANGGAN, KAS_PENGEMBALIAN
		CashAccountID  *uuid.UUID `json:"cash_account_id"`
		Notes          string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Pilih metode penyelesaian keuangan (Potong Piutang, Deposit Kredit Pelanggan, atau Kas Refund)", err.Error())
		return
	}

	var ret models.SalesReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").Preload("Customer").Preload("Sale").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", err.Error())
		return
	}

	if ret.Status == "SELESAI" {
		utils.SendError(c, http.StatusBadRequest, "Retur penjualan ini sudah difinalisasi sebelumnya", nil)
		return
	}

	tx := database.DB.Begin()
	now := time.Now()

	var debtDeduction float64
	var creditCustomer float64
	var cashRefund float64
	totalVal := ret.TotalAmount

	if req.SettlementType == "POTONG_PIUTANG" {
		if ret.SaleID != nil && *ret.SaleID != uuid.Nil {
			var sale models.Sale
			if err := tx.Where("id = ?", *ret.SaleID).First(&sale).Error; err == nil {
				if sale.RemainingAmount > 0 {
					ded := math.Min(sale.RemainingAmount, totalVal)
					debtDeduction = ded
					sale.RemainingAmount -= ded
					if sale.RemainingAmount <= 0 {
						sale.PaymentStatus = "PAID"
					}
					tx.Save(&sale)
					if totalVal > ded {
						creditCustomer = totalVal - ded
					}
				} else {
					creditCustomer = totalVal
				}
			} else {
				creditCustomer = totalVal
			}
		} else {
			creditCustomer = totalVal
		}
	} else if req.SettlementType == "KREDIT_PELANGGAN" {
		creditCustomer = totalVal
	} else if req.SettlementType == "KAS_PENGEMBALIAN" {
		cashRefund = totalVal
	}

	// Update customer deposit if any
	if creditCustomer > 0 && ret.CustomerID != uuid.Nil {
		var cust models.Customer
		if err := tx.Where("id = ?", ret.CustomerID).First(&cust).Error; err == nil {
			cust.CreditBalance += creditCustomer
			tx.Save(&cust)
		}
	}

	// JURNAL AKUNTANSI OTOMATIS
	var journalEntries []services.JournalEntryParam
	// Debit: Retur Penjualan (4-1000)
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: "4-1000",
		Debit:       totalVal,
		Credit:      0,
		Description: fmt.Sprintf("Retur Penjualan %s (%s)", ret.ReturnNo, req.SettlementType),
	})

	if debtDeduction > 0 {
		// Kredit: Piutang Usaha (1-1200)
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "1-1200",
			Debit:       0,
			Credit:      debtDeduction,
			Description: fmt.Sprintf("Potong Piutang Penjualan %s", ret.ReturnNo),
		})
	}

	if creditCustomer > 0 {
		// Kredit: Saldo Deposit / Kredit Pelanggan (2-1200)
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1200",
			Debit:       0,
			Credit:      creditCustomer,
			Description: fmt.Sprintf("Kredit Deposit Pelanggan %s", ret.ReturnNo),
		})
	}

	if cashRefund > 0 {
		cashCode := "1-1110"
		var acc models.Account
		if req.CashAccountID != nil && *req.CashAccountID != uuid.Nil {
			if err := tx.Where("id = ?", *req.CashAccountID).First(&acc).Error; err == nil && acc.Code != "" {
				cashCode = acc.Code
			}
		}
		if acc.ID == uuid.Nil {
			tx.Where("company_id = ? AND code = ?", companyID, cashCode).First(&acc)
		}
		if acc.ID != uuid.Nil {
			realBal := services.GetAccountRealBalance(tx, acc.ID)
			if realBal < cashRefund {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Pengembalian dana retur ditolak: Saldo kas/bank %s (%s) tidak mencukupi untuk refund sebesar Rp %.2f. Saldo saat ini hanya Rp %.2f. Sesuai standar akuntansi, saldo kas tidak boleh negatif/minus.", acc.Name, acc.Code, cashRefund, realBal), nil)
				return
			}
		}
		// Kredit: Kas / Bank
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashCode,
			Debit:       0,
			Credit:      cashRefund,
			Description: fmt.Sprintf("Pengembalian Kas Refund Retur %s", ret.ReturnNo),
		})
	}

	// Restock Cost Journal: Debit Persediaan (1-1300), Kredit HPP (5-1000)
	var totalCost float64
	for _, it := range ret.Items {
		if it.Condition != "RUSAK" {
			var prod models.Product
			cost := it.UnitPrice
			if errP := tx.First(&prod, it.ProductID).Error; errP == nil {
				cost = prod.PurchasePrice
			}
			qty := it.Qty
			if it.AcceptedQty > 0 {
				qty = it.AcceptedQty
			}
			totalCost += cost * qty
		}
	}

	if totalCost > 0 {
		journalEntries = append(journalEntries,
			services.JournalEntryParam{AccountCode: "1-1300", Debit: totalCost, Credit: 0, Description: fmt.Sprintf("Nilai Persediaan Retur Penjualan %s", ret.ReturnNo)},
			services.JournalEntryParam{AccountCode: "5-1000", Debit: 0, Credit: totalCost, Description: fmt.Sprintf("Koreksi HPP Retur Penjualan %s", ret.ReturnNo)},
		)
	}

	_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "SALES_RETURN",
		RefNo:       ret.ReturnNo,
		Description: fmt.Sprintf("Jurnal Finalisasi Retur Penjualan %s", ret.ReturnNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})

	ret.Status = "SELESAI"
	ret.SettlementType = req.SettlementType
	ret.CashAccountID = req.CashAccountID
	ret.DebtDeductionAmount = debtDeduction
	ret.CreditBalanceAmount = creditCustomer
	ret.RefundAmount = cashRefund
	ret.FinalizedAt = &now
	ret.FinalizedBy = &userID

	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memfinalisasi retur penjualan", err.Error())
		return
	}

	tx.Create(&models.SalesReturnStatusLog{
		SalesReturnID: ret.ID,
		Status:        "SELESAI",
		Action:        "FINALISASI_RETUR",
		Notes:         fmt.Sprintf("Finalisasi retur penjualan selesai. Metode: %s. Jurnal akuntansi telah dibukukan.", req.SettlementType),
		UserID:        userID,
	})

	tx.Commit()
	database.DB.Preload("Customer").Preload("Warehouse").Preload("Finalizer").Preload("Items.Product").Preload("Items.Unit").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Retur penjualan berhasil difinalisasi. Jurnal akuntansi dan penyesuaian keuangan telah dicatat.", ret)
}

func (h *SalesHandler) DeleteSalesReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	var ret models.SalesReturn
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Retur penjualan tidak ditemukan", nil)
		return
	}

	// Revert stock deductions
	for _, it := range ret.Items {
		_, _ = services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  ret.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "SALES_RETURN_VOID",
			DocNo:        ret.ReturnNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     it.UnitPrice,
			Notes:        fmt.Sprintf("Pembatalan Retur Penjualan: %s", ret.ReturnNo),
			CreatedBy:    userID,
		})
	}

	tx.Where("sales_return_id = ?", ret.ID).Delete(&models.SalesReturnItem{})
	if err := tx.Delete(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus retur penjualan", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Retur penjualan berhasil dihapus", nil)
}

// ==========================================
// 4. SALES PRICE HISTORY
// ==========================================

func (h *SalesHandler) GetSalesPriceHistory(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Table("sale_items").
		Select("sales.invoice_no, sales.date as transaction_date, customers.name as customer_name, products.sku as product_code, products.name as product_name, sale_items.qty, units.name as unit_name, sale_items.unit_price, sale_items.discount, sales.tax_percent").
		Joins("JOIN sales ON sales.id = sale_items.sale_id").
		Joins("JOIN products ON products.id = sale_items.product_id").
		Joins("LEFT JOIN customers ON customers.id = sales.customer_id").
		Joins("LEFT JOIN units ON units.id = sale_items.unit_id").
		Where("sales.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Where("products.name ILIKE ? OR products.sku ILIKE ? OR customers.name ILIKE ? OR sales.invoice_no ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if customerID := c.Query("customer_id"); customerID != "" && customerID != "all" {
		query = query.Where("sales.customer_id = ?", customerID)
	}
	if productID := c.Query("product_id"); productID != "" {
		query = query.Where("sale_items.product_id = ?", productID)
	}
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("sales.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("sales.date <= ?", endDate)
	}

	var results []struct {
		InvoiceNo       string    `json:"invoice_no"`
		TransactionDate time.Time `json:"transaction_date"`
		CustomerName    string    `json:"customer_name"`
		ProductCode     string    `json:"product_code"`
		ProductName     string    `json:"product_name"`
		Qty             float64   `json:"qty"`
		UnitName        string    `json:"unit_name"`
		UnitPrice       float64   `json:"unit_price"`
		Discount        float64   `json:"discount"`
		TaxPercent      float64   `json:"tax_percent"`
	}

	if err := query.Order("sales.date DESC").Limit(200).Scan(&results).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil histori harga jual", err.Error())
		return
	}

	utils.SendSuccess(c, "Histori harga jual", results)
}

// ==========================================
// 5. CUSTOMER PAYMENTS & BG / CEK STATUS
// ==========================================

func (h *SalesHandler) GetCustomerPayments(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	query := database.DB.Where("customer_payments.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN customers ON customers.id = customer_payments.customer_id").
			Where("customer_payments.payment_no ILIKE ? OR customers.name ILIKE ? OR customers.code ILIKE ? OR customer_payments.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("customer_payments.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("customer_payments.date <= ?", endDate)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "payment_no":
		query = query.Order("customer_payments.payment_no " + sortDir)
	case "pelanggan", "customer":
		query = query.Joins("LEFT JOIN customers ON customers.id = customer_payments.customer_id").Order("customers.name " + sortDir)
	case "total":
		query = query.Order("customer_payments.total_amount " + sortDir)
	default:
		query = query.Order("customer_payments.date " + sortDir)
	}

	var payments []models.CustomerPayment
	if err := query.Preload("Customer").
		Preload("Bank").
		Preload("User").
		Preload("Details.Sale").
		Preload("Details.SalesOrder").
		Find(&payments).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil daftar pembayaran piutang", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar pembayaran piutang", payments)
}

func (h *SalesHandler) CreateCustomerPayment(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Petugas gudang tidak memiliki wewenang untuk mencatat pembayaran piutang pelanggan. Proses ini dilakukan oleh Admin / Keuangan.", nil)
		return
	}

	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		CustomerID    uuid.UUID  `json:"customer_id" binding:"required"`
		AccountID     *uuid.UUID `json:"account_id"`
		BankID        *uuid.UUID `json:"bank_id"`
		PaymentMethod string     `json:"payment_method" binding:"required"`
		BGCheckNo     string     `json:"bg_check_no"`
		Notes         string     `json:"notes"`
		Allocations   []struct {
			SourceType   string     `json:"source_type"` // "SALE" or "SALES_ORDER"
			SaleID       *uuid.UUID `json:"sale_id"`
			SalesOrderID *uuid.UUID `json:"sales_order_id"`
			AmountPaid   float64    `json:"amount_paid"`
			Discount     float64    `json:"discount"`
		} `json:"allocations"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembayaran piutang tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	payNo, err := services.GenerateDocNumber(tx, companyID, "PAY_IN")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor penerimaan", err.Error())
		return
	}

	var totalAmount float64
	var totalDiscount float64
	for _, a := range req.Allocations {
		totalAmount += a.AmountPaid
		totalDiscount += a.Discount
	}

	payment := models.CustomerPayment{
		CompanyID:     companyID,
		BranchID:      branchID,
		CustomerID:    req.CustomerID,
		PaymentNo:     payNo,
		Date:          time.Now(),
		BankID:        req.BankID,
		AccountID:     req.AccountID,
		PaymentMethod: req.PaymentMethod,
		BGCheckNo:     req.BGCheckNo,
		TotalAmount:   totalAmount,
		TotalDiscount: totalDiscount,
		Notes:         req.Notes,
		CreatedBy:     userID,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pelunasan piutang", err.Error())
		return
	}

	for _, a := range req.Allocations {
		totalDeduction := a.AmountPaid + a.Discount
		if (a.SalesOrderID != nil && *a.SalesOrderID != uuid.Nil) || a.SourceType == "SALES_ORDER" {
			targetSOID := a.SalesOrderID
			if targetSOID == nil && a.SaleID != nil {
				targetSOID = a.SaleID
			}
			var so models.SalesOrder
			if err := tx.First(&so, targetSOID).Error; err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, "Pesanan penjualan tidak ditemukan", nil)
				return
			}

			so.PaidAmount += a.AmountPaid
			so.RemainingAmount -= totalDeduction
			if so.RemainingAmount <= 0 {
				so.PaymentStatus = "PAID"
				so.RemainingAmount = 0
			} else {
				so.PaymentStatus = "PARTIAL"
			}
			tx.Save(&so)

			detail := models.CustomerPaymentDetail{
				CustomerPaymentID: payment.ID,
				SalesOrderID:      targetSOID,
				AmountPaid:        a.AmountPaid,
				Discount:          a.Discount,
			}
			tx.Create(&detail)
		} else {
			if a.SaleID == nil || *a.SaleID == uuid.Nil {
				continue
			}
			var s models.Sale
			if err := tx.First(&s, *a.SaleID).Error; err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, "Faktur penjualan tidak ditemukan", nil)
				return
			}

			s.PaidAmount += a.AmountPaid
			s.RemainingAmount -= totalDeduction
			if s.RemainingAmount <= 0 {
				s.PaymentStatus = "PAID"
				s.RemainingAmount = 0
			} else {
				s.PaymentStatus = "PARTIAL"
			}
			tx.Save(&s)

			detail := models.CustomerPaymentDetail{
				CustomerPaymentID: payment.ID,
				SaleID:            a.SaleID,
				AmountPaid:        a.AmountPaid,
				Discount:          a.Discount,
			}
			tx.Create(&detail)
		}
	}

	debitAccount := "1-1110"
	var kasAcc models.Account
	if req.AccountID != nil {
		if errAcc := tx.First(&kasAcc, *req.AccountID).Error; errAcc == nil && kasAcc.Code != "" {
			debitAccount = kasAcc.Code
		}
	} else if req.BankID != nil {
		var bank models.Bank
		if errBank := tx.First(&bank, *req.BankID).Error; errBank == nil && bank.AccountID != nil {
			if errAcc := tx.First(&kasAcc, *bank.AccountID).Error; errAcc == nil && kasAcc.Code != "" {
				debitAccount = kasAcc.Code
			}
		}
	} else if req.PaymentMethod != "CASH" && req.PaymentMethod != "TUNAI" {
		debitAccount = "1-1120"
	}

	totalReceivableSettled := totalAmount + totalDiscount
	entries := []services.JournalEntryParam{
		{AccountCode: debitAccount, Debit: totalAmount, Credit: 0, Description: "Penerimaan Kas/Bank dari Pelanggan"},
	}
	if totalDiscount > 0 {
		salesDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "ar_discount", "sales_discount", "4-1400", "KERINGANAN PIUTANG", "REVENUE", "SALES", "DEBIT")
		entries = append(entries, services.JournalEntryParam{
			AccountCode: salesDiscAcc,
			Debit:       totalDiscount,
			Credit:      0,
			Description: fmt.Sprintf("Keringanan Piutang Penjualan (%s)", payment.PaymentNo),
		})
	}
	entries = append(entries, services.JournalEntryParam{
		AccountCode: "1-1210",
		Debit:       0,
		Credit:      totalReceivableSettled,
		Description: "Pelunasan Piutang Usaha",
	})

	_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "PAYMENT_IN",
		RefNo:       payment.PaymentNo,
		Description: fmt.Sprintf("Penerimaan Pelunasan Piutang (%s)", payment.PaymentNo),
		CreatedBy:   userID,
		Entries:     entries,
	})

	if kasAcc.ID != uuid.Nil {
		trxNo, _ := services.GenerateDocNumber(tx, companyID, "BKM")
		var cust models.Customer
		custName := "Pelanggan"
		if errCust := tx.First(&cust, payment.CustomerID).Error; errCust == nil && cust.Name != "" {
			custName = cust.Name
		}
		var piutangAcc models.Account
		_ = tx.Where("company_id = ? AND code = '1-1210'", companyID).First(&piutangAcc).Error

		cashTrx := models.CashTransaction{
			CompanyID:      companyID,
			BranchID:       branchID,
			TrxNo:          trxNo,
			Date:           payment.Date,
			Type:           "IN",
			AccountID:      kasAcc.ID,
			Amount:         payment.TotalAmount,
			PayeeRecipient: custName,
			Description:    fmt.Sprintf("Penerimaan Pelunasan Piutang %s (%s)", payment.PaymentNo, custName),
			CreatedBy:      userID,
		}
		if piutangAcc.ID != uuid.Nil {
			cashTrx.OppositeAccID = &piutangAcc.ID
		}
		tx.Create(&cashTrx)
	}

	tx.Commit()
	utils.SendCreated(c, "Pelunasan piutang pelanggan berhasil diproses", payment)
}

func (h *SalesHandler) DeleteCustomerPayment(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	var payment models.CustomerPayment
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Details").First(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Pembayaran piutang tidak ditemukan", nil)
		return
	}

	// Revert sale / sales order balances
	for _, d := range payment.Details {
		totalDeduction := d.AmountPaid + d.Discount
		if d.SalesOrderID != nil {
			var so models.SalesOrder
			if err := tx.First(&so, *d.SalesOrderID).Error; err == nil {
				so.PaidAmount -= d.AmountPaid
				so.RemainingAmount += totalDeduction
				if so.RemainingAmount >= so.TotalAmount || so.PaidAmount <= 0 {
					so.PaymentStatus = "TEMPO"
					so.RemainingAmount = so.TotalAmount
				} else {
					so.PaymentStatus = "PARTIAL"
				}
				tx.Save(&so)
			}
		} else if d.SaleID != nil {
			var s models.Sale
			if err := tx.First(&s, *d.SaleID).Error; err == nil {
				s.PaidAmount -= d.AmountPaid
				s.RemainingAmount += totalDeduction
				if s.RemainingAmount >= s.TotalAmount || s.PaidAmount <= 0 {
					s.PaymentStatus = "UNPAID"
					s.RemainingAmount = s.TotalAmount
				} else {
					s.PaymentStatus = "PARTIAL"
				}
				tx.Save(&s)
			}
		}
	}

	tx.Where("customer_payment_id = ?", payment.ID).Delete(&models.CustomerPaymentDetail{})
	if err := tx.Delete(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pembayaran piutang", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Pembayaran piutang berhasil dihapus", nil)
}

func (h *SalesHandler) GetCustomerBGChecks(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	customerID := c.Query("customer_id")
	bgNo := c.Query("bg_no")
	showAll := c.Query("show_all") == "true"

	query := database.DB.Where("company_id = ?", companyID)
	if !showAll {
		query = query.Where("payment_method ILIKE ? OR bg_check_no != ''", "%BG%")
	}
	if customerID != "" && customerID != "all" {
		query = query.Where("customer_id = ?", customerID)
	}
	if bgNo != "" {
		query = query.Where("bg_check_no ILIKE ? OR payment_no ILIKE ?", "%"+bgNo+"%", "%"+bgNo+"%")
	}

	var payments []models.CustomerPayment
	if err := query.Preload("Customer").
		Preload("Bank").
		Order("date DESC").Find(&payments).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data status lunas BG/Cek", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar status lunas BG/Cek piutang", payments)
}

func (h *SalesHandler) UpdateCustomerBGCheckStatus(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var req struct {
		IsCleared   bool       `json:"is_cleared"`
		ClearedDate *time.Time `json:"cleared_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data status tidak valid", err.Error())
		return
	}

	var payment models.CustomerPayment
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&payment).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pembayaran tidak ditemukan", nil)
		return
	}

	payment.IsCleared = req.IsCleared
	if req.ClearedDate != nil {
		payment.ClearedDate = req.ClearedDate
	} else if req.IsCleared {
		now := time.Now()
		payment.ClearedDate = &now
	} else {
		payment.ClearedDate = nil
	}

	if err := database.DB.Save(&payment).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status lunas", err.Error())
		return
	}

	utils.SendSuccess(c, "Status lunas BG/Cek berhasil diperbarui", payment)
}

// ==========================================
// 6. SALES COMMISSIONS
// ==========================================

func (h *SalesHandler) GetSalesCommissions(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	query := database.DB.Where("sales_commission_payments.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN sales_representatives ON sales_representatives.id = sales_commission_payments.sales_rep_id").
			Where("sales_commission_payments.payment_no ILIKE ? OR sales_representatives.name ILIKE ? OR sales_representatives.code ILIKE ? OR sales_commission_payments.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("sales_commission_payments.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("sales_commission_payments.date <= ?", endDate)
	}

	var commissions []models.SalesCommissionPayment
	if err := query.Preload("SalesRep").
		Preload("User").
		Order("sales_commission_payments.date DESC").Find(&commissions).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil daftar komisi sales", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar pembayaran komisi sales", commissions)
}

func (h *SalesHandler) CreateSalesCommission(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		SalesRepID    uuid.UUID `json:"sales_rep_id" binding:"required"`
		PaymentMethod string    `json:"payment_method"`
		TotalAmount   float64   `json:"total_amount" binding:"required"`
		Notes         string    `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data komisi tidak lengkap", err.Error())
		return
	}

	tx := database.DB.Begin()
	payNo, err := services.GenerateDocNumber(tx, companyID, "KOM")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor komisi", err.Error())
		return
	}

	comm := models.SalesCommissionPayment{
		CompanyID:     companyID,
		BranchID:      branchID,
		SalesRepID:    req.SalesRepID,
		PaymentNo:     payNo,
		Date:          time.Now(),
		PaymentMethod: req.PaymentMethod,
		TotalAmount:   req.TotalAmount,
		Notes:         req.Notes,
		CreatedBy:     userID,
	}
	if comm.PaymentMethod == "" {
		comm.PaymentMethod = "KAS"
	}

	if err := tx.Create(&comm).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan komisi sales", err.Error())
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Pembayaran komisi sales berhasil disimpan", comm)
}

func (h *SalesHandler) DeleteSalesCommission(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Delete(&models.SalesCommissionPayment{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus komisi sales", err.Error())
		return
	}

	utils.SendSuccess(c, "Komisi sales berhasil dihapus", nil)
}

func (h *SalesHandler) GetSalesCommissionBGChecks(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	salesRepID := c.Query("sales_rep_id")
	bgNo := c.Query("bg_no")
	showAll := c.Query("show_all") == "true"

	query := database.DB.Where("company_id = ?", companyID)
	if !showAll {
		query = query.Where("payment_method ILIKE ? OR bg_check_no != ''", "%BG%")
	}
	if salesRepID != "" && salesRepID != "all" {
		query = query.Where("sales_rep_id = ?", salesRepID)
	}
	if bgNo != "" {
		query = query.Where("bg_check_no ILIKE ? OR payment_no ILIKE ?", "%"+bgNo+"%", "%"+bgNo+"%")
	}

	var commissions []models.SalesCommissionPayment
	if err := query.Preload("SalesRep").
		Order("date DESC").Find(&commissions).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data status lunas BG/Cek komisi sales", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar status lunas BG/Cek komisi sales", commissions)
}

func (h *SalesHandler) UpdateSalesCommissionBGCheckStatus(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var req struct {
		IsCleared   bool       `json:"is_cleared"`
		ClearedDate *time.Time `json:"cleared_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data status tidak valid", err.Error())
		return
	}

	var comm models.SalesCommissionPayment
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&comm).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Komisi sales tidak ditemukan", nil)
		return
	}

	comm.IsCleared = req.IsCleared
	if req.ClearedDate != nil {
		comm.ClearedDate = req.ClearedDate
	} else if req.IsCleared {
		now := time.Now()
		comm.ClearedDate = &now
	} else {
		comm.ClearedDate = nil
	}

	if err := database.DB.Save(&comm).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui status lunas komisi", err.Error())
		return
	}

	utils.SendSuccess(c, "Status lunas BG/Cek komisi sales berhasil diperbarui", comm)
}

// ==========================================
// 7. SALES DELIVERIES
// ==========================================

func (h *SalesHandler) GetDeliveries(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Where("delivery_no ILIKE ? OR recipient ILIKE ? OR tracking_no ILIKE ? OR courier ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if trackingNo := c.Query("tracking_no"); trackingNo != "" {
		query = query.Where("tracking_no ILIKE ?", "%"+trackingNo+"%")
	}
	if courier := c.Query("courier"); courier != "" && courier != "all" {
		query = query.Where("courier ILIKE ?", "%"+courier+"%")
	}
	if status := c.Query("status"); status != "" && status != "Semua" {
		query = query.Where("status = ?", status)
	}

	var deliveries []models.SalesDelivery
	if err := query.Preload("User").Order("delivery_date DESC").Find(&deliveries).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data pengiriman", err.Error())
		return
	}

	utils.SendSuccess(c, "Data pengiriman penjualan", deliveries)
}

func (h *SalesHandler) CreateDelivery(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		TrackingNo string  `json:"tracking_no"`
		Courier    string  `json:"courier"`
		Sender     string  `json:"sender"`
		Recipient  string  `json:"recipient" binding:"required"`
		TotalOrder float64 `json:"total_order"`
		Status     string  `json:"status"`
		Notes      string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pengiriman tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()
	delNo, err := services.GenerateDocNumber(tx, companyID, "SJ")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor surat jalan", err.Error())
		return
	}

	status := "DIKIRIM"
	if req.Status != "" {
		status = req.Status
	}
	courier := "JNE"
	if req.Courier != "" {
		courier = req.Courier
	}
	sender := "APOTEK BERKAT PURNAMA [UTAMA]"
	if req.Sender != "" {
		sender = req.Sender
	}

	del := models.SalesDelivery{
		CompanyID:    companyID,
		BranchID:     branchID,
		DeliveryNo:   delNo,
		TrackingNo:   req.TrackingNo,
		Courier:      courier,
		Sender:       sender,
		Recipient:    req.Recipient,
		TotalOrder:   req.TotalOrder,
		Status:       status,
		DeliveryDate: time.Now(),
		Notes:        req.Notes,
		CreatedBy:    userID,
	}

	if err := tx.Create(&del).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan pengiriman", err.Error())
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Data pengiriman berhasil dibuat", del)
}

func (h *SalesHandler) UpdateDelivery(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var del models.SalesDelivery
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&del).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pengiriman tidak ditemukan", nil)
		return
	}

	var req struct {
		TrackingNo string `json:"tracking_no"`
		Status     string `json:"status"`
		Courier    string `json:"courier"`
		Notes      string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.TrackingNo != "" {
		del.TrackingNo = req.TrackingNo
	}
	if req.Status != "" {
		del.Status = req.Status
	}
	if req.Courier != "" {
		del.Courier = req.Courier
	}
	if req.Notes != "" {
		del.Notes = req.Notes
	}

	if err := database.DB.Save(&del).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui pengiriman", err.Error())
		return
	}

	utils.SendSuccess(c, "Pengiriman berhasil diperbarui", del)
}

// ==========================================
// 8. CUSTOMER POINTS & POINT REPAIR
// ==========================================

func (h *SalesHandler) GetCustomerPoints(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	customerIDStr := c.Query("customer_id")

	type PointTransaction struct {
		TransactionNo   string    `json:"transaction_no"`
		TransactionType string    `json:"transaction_type"`
		Date            time.Time `json:"date"`
		TotalAmount     float64   `json:"total_amount"`
		PointAmount     float64   `json:"point_amount"`
		Notes           string    `json:"notes"`
	}

	var pointTx []PointTransaction
	totalPointsEarned := 0.0

	if customerIDStr != "" && customerIDStr != "all" {
		custID, err := uuid.Parse(customerIDStr)
		if err == nil {
			var sales []models.Sale
			database.DB.Where("company_id = ? AND customer_id = ?", companyID, custID).
				Order("date ASC").Find(&sales)

			for _, s := range sales {
				// E.g., Rp 100.000 spent = 1 point
				pts := float64(int(s.TotalAmount / 100000))
				totalPointsEarned += pts

				pointTx = append(pointTx, PointTransaction{
					TransactionNo:   s.InvoiceNo,
					TransactionType: "JL",
					Date:            s.Date,
					TotalAmount:     s.TotalAmount,
					PointAmount:     pts,
					Notes:           "Penjualan Faktur: " + s.InvoiceNo,
				})
			}
		}
	}

	utils.SendSuccess(c, "Data point penjualan pelanggan", gin.H{
		"total_points_earned": totalPointsEarned,
		"transactions":        pointTx,
	})
}

func (h *SalesHandler) ProcessCustomerPointsFix(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	var req struct {
		CustomerID *uuid.UUID `json:"customer_id"`
		ProcessAll bool       `json:"process_all"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data perbaikan point tidak valid", err.Error())
		return
	}

	query := database.DB.Where("company_id = ?", companyID)
	if !req.ProcessAll && req.CustomerID != nil {
		query = query.Where("id = ?", *req.CustomerID)
	}

	var customers []models.Customer
	query.Find(&customers)

	processedCount := len(customers)
	utils.SendSuccess(c, fmt.Sprintf("Berhasil melakukan perbaikan point untuk %d pelanggan", processedCount), gin.H{
		"processed_count": processedCount,
	})
}

func syncSaleCashTransaction(tx *gorm.DB, sale *models.Sale, companyID, branchID, userID uuid.UUID, cashCode string, effectivePaid float64) {
	var existingCashTrx models.CashTransaction
	descPattern := "%" + sale.InvoiceNo + "%"
	err := tx.Where("company_id = ? AND type = 'IN' AND description LIKE ?", companyID, descPattern).First(&existingCashTrx).Error

	if effectivePaid <= 0 {
		if err == nil {
			tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
			tx.Delete(&existingCashTrx)
		}
		return
	}

	if cashCode == "" {
		cashCode = "1-1110"
	}

	var kasAcc models.Account
	if errKas := tx.Where("company_id = ? AND code = ?", companyID, cashCode).First(&kasAcc).Error; errKas != nil {
		if errK2 := tx.Where("company_id = ? AND code = '1-1110'", companyID).First(&kasAcc).Error; errK2 != nil {
			tx.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", companyID).First(&kasAcc)
		}
	}

	var revenueAcc models.Account
	_ = tx.Where("company_id = ? AND code = '4-1000'", companyID).First(&revenueAcc).Error

	var customer models.Customer
	customerName := "Pelanggan Umum"
	if sale.CustomerID != uuid.Nil {
		if errCust := tx.First(&customer, sale.CustomerID).Error; errCust == nil && customer.Name != "" {
			customerName = customer.Name
		}
	}

	desc := fmt.Sprintf("Penerimaan Kas/Bank Penjualan Faktur %s (%s)", sale.InvoiceNo, customerName)

	if err == nil {
		existingCashTrx.Amount = effectivePaid
		existingCashTrx.Date = sale.Date
		existingCashTrx.AccountID = kasAcc.ID
		if revenueAcc.ID != uuid.Nil {
			existingCashTrx.OppositeAccID = &revenueAcc.ID
		}
		existingCashTrx.PayeeRecipient = customerName
		existingCashTrx.Description = desc
		tx.Save(&existingCashTrx)
	} else {
		trxNo, _ := services.GenerateDocNumber(tx, companyID, "BKM")
		cashTrx := models.CashTransaction{
			CompanyID:      companyID,
			BranchID:       branchID,
			TrxNo:          trxNo,
			Date:           sale.Date,
			Type:           "IN",
			AccountID:      kasAcc.ID,
			Amount:         effectivePaid,
			PayeeRecipient: customerName,
			Description:    desc,
			CreatedBy:      userID,
		}
		if revenueAcc.ID != uuid.Nil {
			cashTrx.OppositeAccID = &revenueAcc.ID
		}
		tx.Create(&cashTrx)
	}
}

// GetSalesOrderPrintData returns formatted printable dot-matrix data matching PBF standard for Sales Orders
func (h *SalesHandler) GetSalesOrderPrintData(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").
		Preload("Warehouse").
		Preload("SalesRep").
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	companyInfo := gin.H{
		"name":        "PT. BERKAT JAYA PHARMA",
		"address":     "JL. KARYA BARU NO. 43 PTK",
		"pbf_license": "IZIN PBF: 91201151705760001",
		"phone":       "HP: 085345445718",
		"npwp":        "NPWP: 83.957.105.7-701.000",
		"cdob_cert":   "Sertifikat CDOB: CDOB2352/R/4-59333/01/2025",
		"pharmacist": gin.H{
			"name": "APT. RAIF UMBARA, S.FARM",
			"sipa": "SIPA: 500.16/11151/SIPA/125270016/DPMTSP/SP/2025",
		},
		"bank_accounts": []string{
			"Rekening Bank MANDIRI PT. BERKAT JAYA PHARMA no.rek 146-00-1236866-3",
			"Rekening Bank BRI PT. BERKAT JAYA PHARMA no.rek 0071-01-002042-56-2",
			"Rekening Bank BCA PT. BERKAT JAYA PHARMA no.rek 6465337900",
		},
	}

	saleEquivalent := gin.H{
		"id":               so.ID,
		"invoice_no":       so.OrderNo,
		"order_no":         so.OrderNo,
		"date":             so.Date,
		"due_date":         so.ExpectedDate,
		"status":           so.Status,
		"payment_status":   so.PaymentStatus,
		"customer":         so.Customer,
		"warehouse":        so.Warehouse,
		"sales_rep":        so.SalesRep,
		"user":             so.User,
		"items":            so.Items,
		"subtotal":         so.Subtotal,
		"discount":         so.Discount,
		"tax_amount":       so.TaxAmount,
		"total_amount":     so.TotalAmount,
		"paid_amount":      so.PaidAmount,
		"remaining_amount": so.RemainingAmount,
		"is_printed":       so.IsPrinted,
		"print_count":      so.PrintCount,
		"printed_at":       so.PrintedAt,
	}

	utils.SendSuccess(c, "Data cetak faktur pesanan penjualan", gin.H{
		"sales_order": so,
		"sale":        saleEquivalent,
		"company":     companyInfo,
	})
}

// PrintSalesOrder marks the sales order as printed (ONLY ALLOWED ONCE per PBF regulation)
func (h *SalesHandler) PrintSalesOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	if so.IsPrinted || so.PrintCount > 0 {
		utils.SendError(c, http.StatusForbidden, "Faktur Pesanan Penjualan sudah pernah dicetak fisik sebelumnya (Regulasi PBF: 1 kali cetak)", nil)
		return
	}

	now := time.Now()
	so.IsPrinted = true
	so.PrintCount++
	so.PrintedAt = &now
	so.PrintedBy = &userID

	if err := database.DB.Save(&so).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate status cetak pesanan penjualan", err.Error())
		return
	}

	utils.SendSuccess(c, "Pesanan penjualan berhasil ditandai telah dicetak", gin.H{
		"is_printed":  so.IsPrinted,
		"print_count": so.PrintCount,
		"printed_at":  so.PrintedAt,
	})
}

// GetSalesOrderPaymentHistory returns full payment timeline for Sales Order
func (h *SalesHandler) GetSalesOrderPaymentHistory(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var so models.SalesOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").Preload("Warehouse").Preload("SalesRep").Preload("User").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Penjualan tidak ditemukan", err.Error())
		return
	}

	type PaymentHistoryItem struct {
		ID            string    `json:"id"`
		Date          time.Time `json:"date"`
		TrxNo         string    `json:"trx_no"`
		Category      string    `json:"category"`
		PaymentMethod string    `json:"payment_method"`
		AccountName   string    `json:"account_name"`
		Amount        float64   `json:"amount"`
		Notes         string    `json:"notes"`
		CreatedBy     string    `json:"created_by"`
	}

	var history []PaymentHistoryItem

	// 1. Initial Cash Transaction for SO
	var cashTrx models.CashTransaction
	descPattern := "%" + so.OrderNo + "%"
	if err := database.DB.Preload("Account").Preload("User").
		Where("company_id = ? AND type = 'IN' AND (trx_no = ? OR description LIKE ?)", companyID, so.OrderNo, descPattern).
		First(&cashTrx).Error; err == nil {
		accName := "KAS BESAR"
		if cashTrx.Account != nil && cashTrx.Account.Name != "" {
			accName = fmt.Sprintf("%s (%s)", cashTrx.Account.Name, cashTrx.Account.Code)
		}
		userName := "Petugas"
		if cashTrx.User != nil && cashTrx.User.FullName != "" {
			userName = cashTrx.User.FullName
		}
		cat := "Pembayaran DP / Kas"
		if so.PaymentStatus == "PAID" {
			cat = "Pembayaran Tunai Lunas"
		} else if so.PaymentStatus == "DP" {
			cat = "Uang Muka (DP)"
		} else if so.PaymentStatus == "PARTIAL" {
			cat = "Pembayaran Sebagian"
		}
		history = append(history, PaymentHistoryItem{
			ID:            cashTrx.ID.String(),
			Date:          cashTrx.Date,
			TrxNo:         cashTrx.TrxNo,
			Category:      cat,
			PaymentMethod: "TUNAI",
			AccountName:   accName,
			Amount:        cashTrx.Amount,
			Notes:         cashTrx.Description,
			CreatedBy:     userName,
		})
	} else if so.PaidAmount > 0 || so.DPAmount > 0 {
		amt := so.PaidAmount
		if amt == 0 {
			amt = so.DPAmount
		}
		creator := "Petugas"
		if so.User != nil && so.User.FullName != "" {
			creator = so.User.FullName
		}
		history = append(history, PaymentHistoryItem{
			ID:            so.ID.String() + "-initial",
			Date:          so.Date,
			TrxNo:         so.OrderNo,
			Category:      "Uang Muka (DP)",
			PaymentMethod: "TUNAI",
			AccountName:   "KAS BESAR (1-1121)",
			Amount:        amt,
			Notes:         "Penerimaan pembayaran awal Pesanan Penjualan",
			CreatedBy:     creator,
		})
	}

	// 2. Subsequent payments via Bayar Piutang (CustomerPayment)
	var details []models.CustomerPaymentDetail
	database.DB.Where("sales_order_id = ?", so.ID).
		Preload("SalesOrder").
		Find(&details)

	for _, d := range details {
		var cp models.CustomerPayment
		if errCP := database.DB.Preload("Bank").Preload("User").Where("id = ?", d.CustomerPaymentID).First(&cp).Error; errCP == nil {
			accName := "Kas Tunai"
			if cp.Bank != nil && cp.Bank.Name != "" {
				accName = fmt.Sprintf("%s - %s", cp.Bank.Name, cp.Bank.AccountNumber)
			}
			userName := "Petugas"
			if cp.User != nil && cp.User.FullName != "" {
				userName = cp.User.FullName
			}
			history = append(history, PaymentHistoryItem{
				ID:            d.ID.String(),
				Date:          cp.Date,
				TrxNo:         cp.PaymentNo,
				Category:      "Bayar Piutang",
				PaymentMethod: cp.PaymentMethod,
				AccountName:   accName,
				Amount:        d.AmountPaid,
				Notes:         cp.Notes,
				CreatedBy:     userName,
			})
		}
	}

	utils.SendSuccess(c, "Riwayat Pembayaran SO", gin.H{
		"order":   so,
		"history": history,
	})
}

// GetSalePaymentHistory returns full payment timeline for Sales Invoice
func (h *SalesHandler) GetSalePaymentHistory(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var s models.Sale
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Customer").Preload("Warehouse").Preload("SalesRep").Preload("User").
		First(&s).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur Penjualan tidak ditemukan", err.Error())
		return
	}

	type PaymentHistoryItem struct {
		ID            string    `json:"id"`
		Date          time.Time `json:"date"`
		TrxNo         string    `json:"trx_no"`
		Category      string    `json:"category"`
		PaymentMethod string    `json:"payment_method"`
		AccountName   string    `json:"account_name"`
		Amount        float64   `json:"amount"`
		Notes         string    `json:"notes"`
		CreatedBy     string    `json:"created_by"`
	}

	var history []PaymentHistoryItem

	// 1. Initial Cash Transaction for Sale
	var cashTrx models.CashTransaction
	descPattern := "%" + s.InvoiceNo + "%"
	if err := database.DB.Preload("Account").Preload("User").
		Where("company_id = ? AND type = 'IN' AND (trx_no = ? OR description LIKE ?)", companyID, s.InvoiceNo, descPattern).
		First(&cashTrx).Error; err == nil {
		accName := "KAS KECIL"
		if cashTrx.Account != nil && cashTrx.Account.Name != "" {
			accName = fmt.Sprintf("%s (%s)", cashTrx.Account.Name, cashTrx.Account.Code)
		}
		userName := "Petugas"
		if cashTrx.User != nil && cashTrx.User.FullName != "" {
			userName = cashTrx.User.FullName
		}
		cat := "Pembayaran Tunai Penjualan"
		if s.PaymentStatus == "PAID" {
			cat = "Pembayaran Tunai Lunas"
		} else if s.PaymentStatus == "PARTIAL" {
			cat = "Pembayaran DP / Sebagian"
		}
		history = append(history, PaymentHistoryItem{
			ID:            cashTrx.ID.String(),
			Date:          cashTrx.Date,
			TrxNo:         cashTrx.TrxNo,
			Category:      cat,
			PaymentMethod: "TUNAI",
			AccountName:   accName,
			Amount:        cashTrx.Amount,
			Notes:         cashTrx.Description,
			CreatedBy:     userName,
		})
	} else if s.PaidAmount > 0 {
		creator := "Petugas"
		if s.User != nil && s.User.FullName != "" {
			creator = s.User.FullName
		}
		history = append(history, PaymentHistoryItem{
			ID:            s.ID.String() + "-initial",
			Date:          s.Date,
			TrxNo:         s.InvoiceNo,
			Category:      "Pembayaran Awal Penjualan",
			PaymentMethod: "TUNAI",
			AccountName:   "KAS KECIL (1-1110)",
			Amount:        s.PaidAmount,
			Notes:         "Pembayaran awal Faktur Penjualan",
			CreatedBy:     creator,
		})
	}

	// 2. Subsequent payments via Bayar Piutang (CustomerPayment)
	var details []models.CustomerPaymentDetail
	database.DB.Where("sale_id = ?", s.ID).
		Preload("Sale").
		Find(&details)

	for _, d := range details {
		var cp models.CustomerPayment
		if errCP := database.DB.Preload("Bank").Preload("User").Where("id = ?", d.CustomerPaymentID).First(&cp).Error; errCP == nil {
			accName := "Kas Tunai"
			if cp.Bank != nil && cp.Bank.Name != "" {
				accName = fmt.Sprintf("%s - %s", cp.Bank.Name, cp.Bank.AccountNumber)
			}
			userName := "Petugas"
			if cp.User != nil && cp.User.FullName != "" {
				userName = cp.User.FullName
			}
			history = append(history, PaymentHistoryItem{
				ID:            d.ID.String(),
				Date:          cp.Date,
				TrxNo:         cp.PaymentNo,
				Category:      "Bayar Piutang",
				PaymentMethod: cp.PaymentMethod,
				AccountName:   accName,
				Amount:        d.AmountPaid,
				Notes:         cp.Notes,
				CreatedBy:     userName,
			})
		}
	}

	utils.SendSuccess(c, "Riwayat Pembayaran Penjualan", gin.H{
		"sale":    s,
		"history": history,
	})
}
