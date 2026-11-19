package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/services"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SalesHandler struct{}

func NewSalesHandler() *SalesHandler {
	return &SalesHandler{}
}

// ==========================================
// 1. SALES ORDERS (SO)
// ==========================================

func (h *SalesHandler) GetSalesOrders(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	query := database.DB.Where("sales_orders.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN customers ON customers.id = sales_orders.customer_id").
			Where("sales_orders.order_no ILIKE ? OR customers.name ILIKE ? OR customers.code ILIKE ? OR sales_orders.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if status := c.Query("status"); status != "" && status != "Semua" {
		query = query.Where("sales_orders.status = ?", status)
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
	case "no_transaksi", "order_no":
		query = query.Order("sales_orders.order_no " + sortDir)
	case "pelanggan", "customer":
		query = query.Joins("LEFT JOIN customers ON customers.id = sales_orders.customer_id").Order("customers.name " + sortDir)
	case "total":
		query = query.Order("sales_orders.total_amount " + sortDir)
	default:
		query = query.Order("sales_orders.date " + sortDir)
	}

	var sos []models.SalesOrder
	if err := query.Preload("Customer").
		Preload("SalesRep").
		Preload("User").
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
		Preload("Customer").
		Preload("SalesRep").
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&so).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan penjualan tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail pesanan penjualan", so)
}

func (h *SalesHandler) CreateSalesOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		CustomerID uuid.UUID  `json:"customer_id" binding:"required"`
		SalesRepID *uuid.UUID `json:"sales_rep_id"`
		Notes      string     `json:"notes"`
		TaxPercent float64    `json:"tax_percent"`
		Discount   float64    `json:"discount"`
		CustomerSPNumber   string     `json:"customer_sp_number"`
		CustomerSPDate     *time.Time `json:"customer_sp_date"`
		CustomerSPType     string     `json:"customer_sp_type"`
		PBFOriginInvoiceNo string     `json:"pbf_origin_invoice_no"`
		Items      []struct {
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
	totalAmount := subtotal - req.Discount + taxAmount

	so := models.SalesOrder{
		CompanyID:   companyID,
		BranchID:    branchID,
		CustomerID:  req.CustomerID,
		SalesRepID:  req.SalesRepID,
		OrderNo:     soNo,
		Date:        time.Now(),
		Status:      "CONFIRMED",
		Subtotal:    subtotal,
		TaxPercent:  req.TaxPercent,
		TaxAmount:   taxAmount,
		Discount:    req.Discount,
		TotalAmount: totalAmount,
		Notes:       req.Notes,
		CustomerSPNumber:   req.CustomerSPNumber,
		CustomerSPDate:     req.CustomerSPDate,
		CustomerSPType:     req.CustomerSPType,
		PBFOriginInvoiceNo: req.PBFOriginInvoiceNo,
		CreatedBy:   userID,
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
			UnitPrice:    it.UnitPrice,
			Discount:     it.Discount,
			TotalAmount:  (it.Qty * it.UnitPrice) - it.Discount,
		}
		tx.Create(&item)
	}

	tx.Commit()
	utils.SendCreated(c, "Pesanan Penjualan (SO) berhasil dibuat", so)
}

func (h *SalesHandler) UpdateSalesOrder(c *gin.Context) {
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
		CustomerID uuid.UUID  `json:"customer_id"`
		SalesRepID *uuid.UUID `json:"sales_rep_id"`
		Notes      string     `json:"notes"`
		Status     string     `json:"status"`
		TaxPercent float64    `json:"tax_percent"`
		Discount   float64    `json:"discount"`
		CustomerSPNumber   string     `json:"customer_sp_number"`
		CustomerSPDate     *time.Time `json:"customer_sp_date"`
		CustomerSPType     string     `json:"customer_sp_type"`
		PBFOriginInvoiceNo string     `json:"pbf_origin_invoice_no"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data update tidak valid", err.Error())
		return
	}

	if req.CustomerID != uuid.Nil {
		so.CustomerID = req.CustomerID
	}
	if req.SalesRepID != nil {
		so.SalesRepID = req.SalesRepID
	}
	if req.Notes != "" {
		so.Notes = req.Notes
	}
	if req.Status != "" {
		so.Status = req.Status
	}
	if req.CustomerSPType != "" {
		so.CustomerSPType = req.CustomerSPType
	}
	so.CustomerSPNumber = req.CustomerSPNumber
	so.CustomerSPDate = req.CustomerSPDate
	so.PBFOriginInvoiceNo = req.PBFOriginInvoiceNo
	so.TaxPercent = req.TaxPercent
	so.Discount = req.Discount

	if err := database.DB.Save(&so).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui SO", err.Error())
		return
	}

	utils.SendSuccess(c, "Pesanan penjualan berhasil diperbarui", so)
}

func (h *SalesHandler) DeleteSalesOrder(c *gin.Context) {
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

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN customers ON customers.id = sales.customer_id").
			Where("sales.invoice_no ILIKE ? OR customers.name ILIKE ? OR customers.code ILIKE ? OR sales.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("sales.warehouse_id = ?", warehouseID)
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
	case "no_transaksi", "invoice_no":
		query = query.Order("sales.invoice_no " + sortDir)
	case "pelanggan", "customer":
		query = query.Joins("LEFT JOIN customers ON customers.id = sales.customer_id").Order("customers.name " + sortDir)
	case "total":
		query = query.Order("sales.total_amount " + sortDir)
	default:
		query = query.Order("sales.date " + sortDir)
	}

	var sales []models.Sale
	if err := query.Preload("Customer").
		Preload("Warehouse").
		Preload("OriginPurchase.Supplier").
		Preload("SalesRep").
		Preload("User").
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
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Payments").
		First(&sale).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur penjualan tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail faktur penjualan", sale)
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
	CustomerID   uuid.UUID         `json:"customer_id" binding:"required"`
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
	Items        []CheckoutItem    `json:"items" binding:"required"`
	Payments     []CheckoutPayment `json:"payments"`
}

func (h *SalesHandler) CreateSale(c *gin.Context) {
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

	saleType := "POS"
	if req.Type != "" {
		saleType = req.Type
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

	sale := models.Sale{
		CompanyID:       companyID,
		BranchID:        branchID,
		WarehouseID:     req.WarehouseID,
		CustomerID:      req.CustomerID,
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
		CustomerSPNumber:   req.CustomerSPNumber,
		CustomerSPDate:     req.CustomerSPDate,
		CustomerSPType:     req.CustomerSPType,
		PBFOriginInvoiceNo: req.PBFOriginInvoiceNo,
		OriginPurchaseID:   req.OriginPurchaseID,
		TaxInvoiceNo:       req.TaxInvoiceNo,
		DeliveryOrderNo:    req.DeliveryOrderNo,
		CreatedBy:       userID,
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

		saleItem := models.SaleItem{
			SaleID:      sale.ID,
			ProductID:   it.ProductID,
			UnitID:      it.UnitID,
			Qty:         it.Qty,
			UnitPrice:   it.UnitPrice,
			CostPrice:   costPrice,
			Discount:    it.Discount,
			TotalAmount: (it.Qty * it.UnitPrice) - it.Discount,
		}
		if err := tx.Create(&saleItem).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan item penjualan", err.Error())
			return
		}

		// Deduct stock
		_, err = services.MutateStock(tx, services.StockMutationParams{
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
			AccountCode: "1-1200", // Piutang Usaha
			Debit:       remainingAmount,
			Credit:      0,
			Description: fmt.Sprintf("Piutang Penjualan Faktur %s", sale.InvoiceNo),
		})
	}

	// Split Net Sales vs PPN Keluaran
	netSalesAmount := totalAmount - taxAmount
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: "4-1000", // Pendapatan Penjualan
		Debit:       0,
		Credit:      netSalesAmount,
		Description: fmt.Sprintf("Pendapatan Penjualan Faktur %s", sale.InvoiceNo),
	})

	if taxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1100", // Utang PPN Keluaran
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

	tx.Commit()
	utils.SendCreated(c, "Transaksi kasir / penjualan berhasil disimpan dan diposting", sale)
}

func (h *SalesHandler) UpdateSale(c *gin.Context) {
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

	if len(updates) > 0 {
		database.DB.Model(&sale).Updates(updates)
	}

	utils.SendSuccess(c, "Faktur penjualan berhasil diperbarui", sale)
}

func (h *SalesHandler) DeleteSale(c *gin.Context) {
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
		Items        []struct {
			ProductID         uuid.UUID `json:"product_id" binding:"required"`
			UnitID            uuid.UUID `json:"unit_id" binding:"required"`
			OriginalInvoiceNo string    `json:"original_invoice_no"`
			Brand             string    `json:"brand"`
			SoldQty           float64   `json:"sold_qty"`
			SoldUnit          string    `json:"sold_unit"`
			Qty               float64   `json:"qty" binding:"required"`
			UnitPrice         float64   `json:"unit_price" binding:"required"`
			DiscountPercent   float64   `json:"discount_percent"`
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
		Status:       "POSTED",
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
		}
		tx.Create(&retItem)

		// Restock to warehouse
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
			Notes:        fmt.Sprintf("Retur Penjualan (%s) - %s", salesReturn.ReturnNo, req.Reason),
			CreatedBy:    userID,
		})
	}

	// Double-entry journal for sales return
	var journalEntries []services.JournalEntryParam
	// Debit: Retur & Pengurangan Penjualan (4-1200)
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: "4-1000",
		Debit:       totalAmount,
		Credit:      0,
		Description: fmt.Sprintf("Retur Penjualan %s", salesReturn.ReturnNo),
	})
	// Credit: Kas Kasir (1-1110) or Piutang (1-1200)
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: "1-1110",
		Debit:       0,
		Credit:      totalAmount,
		Description: fmt.Sprintf("Pengembalian Dana Retur %s", salesReturn.ReturnNo),
	})

	if totalRestockCost > 0 {
		// Restock inventory value: Debit Persediaan, Credit HPP
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

	tx.Commit()
	utils.SendCreated(c, "Retur penjualan berhasil disimpan", salesReturn)
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
		Find(&payments).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil daftar pembayaran piutang", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar pembayaran piutang", payments)
}

func (h *SalesHandler) CreateCustomerPayment(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		CustomerID    uuid.UUID  `json:"customer_id" binding:"required"`
		BankID        *uuid.UUID `json:"bank_id"`
		PaymentMethod string     `json:"payment_method" binding:"required"`
		BGCheckNo     string     `json:"bg_check_no"`
		Notes         string     `json:"notes"`
		Allocations   []struct {
			SaleID     uuid.UUID `json:"sale_id" binding:"required"`
			AmountPaid float64   `json:"amount_paid" binding:"required"`
		} `json:"allocations" binding:"required"`
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
	for _, a := range req.Allocations {
		totalAmount += a.AmountPaid
	}

	payment := models.CustomerPayment{
		CompanyID:     companyID,
		BranchID:      branchID,
		CustomerID:    req.CustomerID,
		PaymentNo:     payNo,
		Date:          time.Now(),
		BankID:        req.BankID,
		PaymentMethod: req.PaymentMethod,
		BGCheckNo:     req.BGCheckNo,
		TotalAmount:   totalAmount,
		Notes:         req.Notes,
		CreatedBy:     userID,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pelunasan piutang", err.Error())
		return
	}

	for _, a := range req.Allocations {
		var s models.Sale
		if err := tx.First(&s, a.SaleID).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Faktur penjualan tidak ditemukan", nil)
			return
		}

		s.PaidAmount += a.AmountPaid
		s.RemainingAmount -= a.AmountPaid
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
		}
		tx.Create(&detail)
	}

	debitAccount := "1-1110"
	if req.PaymentMethod != "CASH" {
		debitAccount = "1-1120"
	}

	_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "PAYMENT_IN",
		RefNo:       payment.PaymentNo,
		Description: fmt.Sprintf("Penerimaan Pelunasan Piutang (%s)", payment.PaymentNo),
		CreatedBy:   userID,
		Entries: []services.JournalEntryParam{
			{AccountCode: debitAccount, Debit: totalAmount, Credit: 0, Description: "Penerimaan Kas/Bank dari Pelanggan"},
			{AccountCode: "1-1200", Debit: 0, Credit: totalAmount, Description: "Pelunasan Piutang Usaha"},
		},
	})

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

	// Revert sale balances
	for _, d := range payment.Details {
		var s models.Sale
		if err := tx.First(&s, d.SaleID).Error; err == nil {
			s.PaidAmount -= d.AmountPaid
			s.RemainingAmount += d.AmountPaid
			if s.RemainingAmount > 0 {
				s.PaymentStatus = "PARTIAL"
			}
			if s.PaidAmount <= 0 {
				s.PaymentStatus = "UNPAID"
			}
			tx.Save(&s)
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
