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
	"gorm.io/gorm"
)

type PurchaseHandler struct{}

func NewPurchaseHandler() *PurchaseHandler {
	return &PurchaseHandler{}
}

// ==========================================
// 1. PESANAN PEMBELIAN (PURCHASE ORDERS)
// ==========================================

func (h *PurchaseHandler) GetPurchaseOrders(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("purchase_orders.company_id = ?", companyID)

	// Filter Kata Kunci (search order_no, supplier name, notes)
	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_orders.supplier_id").
			Where("purchase_orders.order_no ILIKE ? OR suppliers.name ILIKE ? OR suppliers.code ILIKE ? OR purchase_orders.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filter Dept / Gudang
	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("purchase_orders.warehouse_id = ?", warehouseID)
	}

	// Filter Tanggal Dari & Sampai
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("purchase_orders.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("purchase_orders.date <= ?", endDate)
	}

	// Filter Status Proses
	if procStatus := c.Query("process_status"); procStatus != "" && procStatus != "Semua" && procStatus != "all" {
		query = query.Where("purchase_orders.process_status = ?", procStatus)
	}

	// Filter Status Pesanan
	if status := c.Query("status"); status != "" && status != "Semua" && status != "all" {
		query = query.Where("purchase_orders.status = ?", status)
	}

	// Sorting
	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "order_no":
		query = query.Order("purchase_orders.order_no " + sortDir)
	case "supplier":
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_orders.supplier_id").Order("suppliers.name " + sortDir)
	case "total":
		query = query.Order("purchase_orders.total_amount " + sortDir)
	default:
		query = query.Order("purchase_orders.date " + sortDir)
	}

	var pos []models.PurchaseOrder
	if err := query.Preload("Supplier").
		Preload("Warehouse").
		Preload("User").
		Preload("Modifier").
		Preload("Items.Product").
		Preload("Items.Unit").
		Find(&pos).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data pesanan pembelian", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar pesanan pembelian (PO)", pos)
}

func (h *PurchaseHandler) GetPurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Supplier").
		Preload("Warehouse").
		Preload("User").
		Preload("Modifier").
		Preload("Items.Product").
		Preload("Items.Product.Brand").
		Preload("Items.Product.Category").
		Preload("Items.Product.BaseUnit").
		Preload("Items.Unit").
		First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	utils.SendSuccess(c, "Detail pesanan pembelian", po)
}

func (h *PurchaseHandler) CreatePurchaseOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		WarehouseID  *uuid.UUID `json:"warehouse_id"`
		SupplierID   uuid.UUID  `json:"supplier_id" binding:"required"`
		ExpectedDate *time.Time `json:"expected_date"`
		Notes        string     `json:"notes"`
		TaxPercent   float64    `json:"tax_percent"`
		Discount     float64    `json:"discount"`
		ShippingFee  float64    `json:"shipping_fee"`
		SPType       string     `json:"sp_type"`
		SPNumber     string     `json:"sp_number"`
		APJName      string     `json:"apj_name"`
		APJSIPANo    string     `json:"apj_sipa_no"`
		Items        []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			UnitID    uuid.UUID `json:"unit_id" binding:"required"`
			Qty       float64   `json:"qty" binding:"required"`
			UnitPrice float64   `json:"unit_price" binding:"required"`
			Discount  float64   `json:"discount"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data PO tidak lengkap", err.Error())
		return
	}

	tx := database.DB.Begin()

	poNo, err := services.GenerateDocNumber(tx, companyID, "PO")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor PO", err.Error())
		return
	}

	var subtotal float64
	var totalOrderedQty float64
	for _, it := range req.Items {
		lineTotal := (it.Qty * it.UnitPrice) - it.Discount
		subtotal += lineTotal
		totalOrderedQty += it.Qty
	}

	taxAmount := (subtotal - req.Discount) * (req.TaxPercent / 100)
	totalAmount := subtotal - req.Discount + taxAmount + req.ShippingFee

	po := models.PurchaseOrder{
		CompanyID:        companyID,
		BranchID:         branchID,
		WarehouseID:      req.WarehouseID,
		SupplierID:       req.SupplierID,
		OrderNo:          poNo,
		Date:             time.Now(),
		ExpectedDate:     req.ExpectedDate,
		Status:           "PENDING",
		ProcessStatus:    "Belum Proses",
		Subtotal:         subtotal,
		TaxPercent:       req.TaxPercent,
		TaxAmount:        taxAmount,
		Discount:         req.Discount,
		ShippingFee:      req.ShippingFee,
		TotalAmount:      totalAmount,
		TotalOrderedQty:  totalOrderedQty,
		TotalReceivedQty: 0,
		Notes:            req.Notes,
		SPType:           req.SPType,
		SPNumber:         req.SPNumber,
		APJName:          req.APJName,
		APJSIPANo:        req.APJSIPANo,
		CreatedBy:        userID,
	}

	if err := tx.Create(&po).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat PO", err.Error())
		return
	}

	for _, it := range req.Items {
		lineTotal := (it.Qty * it.UnitPrice) - it.Discount
		unitID := it.UnitID
		if unitID == uuid.Nil {
			var prod models.Product
			if err := tx.Select("base_unit_id").First(&prod, it.ProductID).Error; err == nil && prod.BaseUnitID != nil {
				unitID = *prod.BaseUnitID
			} else {
				var fallbackUnit models.Unit
				if err := tx.Where("company_id = ?", companyID).First(&fallbackUnit).Error; err == nil {
					unitID = fallbackUnit.ID
				}
			}
		}
		item := models.PurchaseOrderItem{
			PurchaseOrderID: po.ID,
			ProductID:       it.ProductID,
			UnitID:          unitID,
			Qty:             it.Qty,
			UnitPrice:       it.UnitPrice,
			Discount:        it.Discount,
			TotalAmount:     lineTotal,
		}
		tx.Create(&item)
	}

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Items.Product").Preload("Items.Unit").First(&po, po.ID)
	utils.SendCreated(c, "Pesanan Pembelian (PO) berhasil dibuat", po)
}

func (h *PurchaseHandler) UpdatePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	var req struct {
		WarehouseID   *uuid.UUID `json:"warehouse_id"`
		SupplierID    uuid.UUID  `json:"supplier_id"`
		ExpectedDate  *time.Time `json:"expected_date"`
		Notes         string     `json:"notes"`
		TaxPercent    float64    `json:"tax_percent"`
		Discount      float64    `json:"discount"`
		ShippingFee   float64    `json:"shipping_fee"`
		Status        string     `json:"status"`
		ProcessStatus string     `json:"process_status"`
		SPType        string     `json:"sp_type"`
		SPNumber      string     `json:"sp_number"`
		APJName       string     `json:"apj_name"`
		APJSIPANo     string     `json:"apj_sipa_no"`
		Items         []struct {
			ProductID uuid.UUID `json:"product_id"`
			UnitID    uuid.UUID `json:"unit_id"`
			Qty       float64   `json:"qty"`
			UnitPrice float64   `json:"unit_price"`
			Discount  float64   `json:"discount"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data PO tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	if req.SupplierID != uuid.Nil {
		po.SupplierID = req.SupplierID
	}
	if req.WarehouseID != nil {
		po.WarehouseID = req.WarehouseID
	}
	if req.ExpectedDate != nil {
		po.ExpectedDate = req.ExpectedDate
	}
	if req.Notes != "" {
		po.Notes = req.Notes
	}
	if req.Status != "" {
		po.Status = req.Status
	}
	if req.ProcessStatus != "" {
		po.ProcessStatus = req.ProcessStatus
	}
	if req.SPType != "" {
		po.SPType = req.SPType
	}
	po.SPNumber = req.SPNumber
	po.APJName = req.APJName
	po.APJSIPANo = req.APJSIPANo
	po.TaxPercent = req.TaxPercent
	po.Discount = req.Discount
	po.ShippingFee = req.ShippingFee
	po.UpdatedBy = &userID

	if len(req.Items) > 0 {
		tx.Where("purchase_order_id = ?", po.ID).Delete(&models.PurchaseOrderItem{})
		var subtotal float64
		var totalQty float64
		for _, it := range req.Items {
			lineTotal := (it.Qty * it.UnitPrice) - it.Discount
			subtotal += lineTotal
			totalQty += it.Qty
			unitID := it.UnitID
			if unitID == uuid.Nil {
				var prod models.Product
				if err := tx.Select("base_unit_id").First(&prod, it.ProductID).Error; err == nil && prod.BaseUnitID != nil {
					unitID = *prod.BaseUnitID
				} else {
					var fallbackUnit models.Unit
					if err := tx.Where("company_id = ?", companyID).First(&fallbackUnit).Error; err == nil {
						unitID = fallbackUnit.ID
					}
				}
			}
			item := models.PurchaseOrderItem{
				PurchaseOrderID: po.ID,
				ProductID:       it.ProductID,
				UnitID:          unitID,
				Qty:             it.Qty,
				UnitPrice:       it.UnitPrice,
				Discount:        it.Discount,
				TotalAmount:     lineTotal,
			}
			tx.Create(&item)
		}
		po.Subtotal = subtotal
		po.TotalOrderedQty = totalQty
		po.TaxAmount = (subtotal - po.Discount) * (po.TaxPercent / 100)
		po.TotalAmount = subtotal - po.Discount + po.TaxAmount + po.ShippingFee
	}

	if err := tx.Save(&po).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate PO", err.Error())
		return
	}
	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Modifier").Preload("Items.Product").Preload("Items.Unit").First(&po, po.ID)
	utils.SendSuccess(c, "Pesanan Pembelian berhasil diubah", po)
}

func (h *PurchaseHandler) DeletePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	tx.Where("purchase_order_id = ?", po.ID).Delete(&models.PurchaseOrderItem{})
	if err := tx.Delete(&po).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus PO", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Pesanan Pembelian berhasil dihapus", nil)
}

// ==========================================
// 2. PEMBELIAN / FAKTUR PEMBELIAN
// ==========================================

func (h *PurchaseHandler) GetPurchases(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("purchases.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchases.supplier_id").
			Where("purchases.invoice_no ILIKE ? OR suppliers.name ILIKE ? OR suppliers.code ILIKE ? OR purchases.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("purchases.warehouse_id = ?", warehouseID)
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("purchases.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("purchases.date <= ?", endDate)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "invoice_no":
		query = query.Order("purchases.invoice_no " + sortDir)
	case "supplier":
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchases.supplier_id").Order("suppliers.name " + sortDir)
	case "total":
		query = query.Order("purchases.total_amount " + sortDir)
	default:
		query = query.Order("purchases.date " + sortDir)
	}

	var purchases []models.Purchase
	if err := query.Preload("Supplier").
		Preload("Warehouse").
		Preload("User").
		Preload("Modifier").
		Preload("Items.Product").
		Preload("Items.Unit").
		Find(&purchases).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data pembelian", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar faktur pembelian", purchases)
}

func (h *PurchaseHandler) CreatePurchase(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		WarehouseID     uuid.UUID  `json:"warehouse_id" binding:"required"`
		SupplierID      uuid.UUID  `json:"supplier_id" binding:"required"`
		PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
		DueDate         time.Time  `json:"due_date"`
		Notes           string     `json:"notes"`
		TaxPercent      float64    `json:"tax_percent"`
		Discount        float64    `json:"discount"`
		ShippingFee     float64    `json:"shipping_fee"`
		PaidAmount      float64    `json:"paid_amount"`
		CashAccountID   *uuid.UUID `json:"cash_account_id"`
		ComputerName    string     `json:"computer_name"`
		PBFInvoiceNo       string  `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string  `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string  `json:"tax_invoice_no"`
		Items           []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			UnitID    uuid.UUID `json:"unit_id"`
			Qty       float64   `json:"qty" binding:"required"`
			UnitPrice float64   `json:"unit_price" binding:"required"`
			Discount  float64   `json:"discount"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembelian tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	invNo, err := services.GenerateDocNumber(tx, companyID, "PI")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor faktur pembelian", err.Error())
		return
	}

	var subtotal float64
	for _, it := range req.Items {
		subtotal += (it.Qty * it.UnitPrice) - it.Discount
	}

	taxAmount := (subtotal - req.Discount) * (req.TaxPercent / 100)
	totalAmount := subtotal - req.Discount + taxAmount + req.ShippingFee
	remaining := totalAmount - req.PaidAmount

	paymentStatus := "UNPAID"
	if req.PaidAmount >= totalAmount {
		paymentStatus = "PAID"
	} else if req.PaidAmount > 0 {
		paymentStatus = "PARTIAL"
	}

	dueDate := req.DueDate
	if dueDate.IsZero() {
		dueDate = time.Now().AddDate(0, 0, 30) // default 30 hari
	}

	computer := req.ComputerName
	if computer == "" {
		computer = "WEB-CLIENT"
	}

	purchase := models.Purchase{
		CompanyID:       companyID,
		BranchID:        branchID,
		WarehouseID:     req.WarehouseID,
		SupplierID:      req.SupplierID,
		PurchaseOrderID: req.PurchaseOrderID,
		InvoiceNo:       invNo,
		Date:            time.Now(),
		DueDate:         dueDate,
		Status:          "POSTED",
		PaymentStatus:   paymentStatus,
		Subtotal:        subtotal,
		TaxPercent:      req.TaxPercent,
		TaxAmount:       taxAmount,
		Discount:        req.Discount,
		ShippingFee:     req.ShippingFee,
		TotalAmount:     totalAmount,
		PaidAmount:      req.PaidAmount,
		RemainingAmount: remaining,
		Notes:           req.Notes,
		PBFInvoiceNo:       req.PBFInvoiceNo,
		PBFDeliveryOrderNo: req.PBFDeliveryOrderNo,
		TaxInvoiceNo:       req.TaxInvoiceNo,
		ComputerName:    computer,
		CreatedBy:       userID,
	}

	if err := tx.Create(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan pembelian", err.Error())
		return
	}

	for _, it := range req.Items {
		lineTotal := (it.Qty * it.UnitPrice) - it.Discount
		unitID := it.UnitID
		if unitID == uuid.Nil {
			var prod models.Product
			if err := tx.Select("base_unit_id").First(&prod, it.ProductID).Error; err == nil && prod.BaseUnitID != nil {
				unitID = *prod.BaseUnitID
			} else {
				var fallbackUnit models.Unit
				if err := tx.Where("company_id = ?", companyID).First(&fallbackUnit).Error; err == nil {
					unitID = fallbackUnit.ID
				}
			}
		}

		item := models.PurchaseItem{
			PurchaseID:  purchase.ID,
			ProductID:   it.ProductID,
			UnitID:      unitID,
			Qty:         it.Qty,
			UnitPrice:   it.UnitPrice,
			Discount:    it.Discount,
			TotalAmount: lineTotal,
		}
		tx.Create(&item)

		// Confirmed purchases increase stock & record movement
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "PURCHASE",
			DocNo:        purchase.InvoiceNo,
			MovementType: "IN",
			Qty:          it.Qty,
			UnitCost:     it.UnitPrice,
			Notes:        fmt.Sprintf("Pembelian dari Faktur: %s", purchase.InvoiceNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}
	}

	// Update Purchase Order status if linked
	if req.PurchaseOrderID != nil {
		var po models.PurchaseOrder
		if err := tx.First(&po, *req.PurchaseOrderID).Error; err == nil {
			po.ProcessStatus = "Selesai"
			po.Status = "COMPLETED"
			tx.Save(&po)
		}
	}

	// Accounting Double-entry journal posting:
	var journalEntries []services.JournalEntryParam
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: "1-1300",
		Debit:       totalAmount,
		Credit:      0,
		Description: fmt.Sprintf("Persediaan Pembelian Faktur %s", purchase.InvoiceNo),
	})

	// Resolve cash account code (default to 1-1121 KAS BESAR, matching apotek primary till)
	cashAccountCode := "1-1121"
	if req.CashAccountID != nil {
		var customAcc models.Account
		if err := tx.First(&customAcc, *req.CashAccountID).Error; err == nil && customAcc.Code != "" {
			cashAccountCode = customAcc.Code
		}
	} else {
		var checkAcc models.Account
		if err := tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&checkAcc).Error; err != nil {
			cashAccountCode = "1-1110"
		}
	}

	if req.PaidAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashAccountCode,
			Debit:       0,
			Credit:      req.PaidAmount,
			Description: fmt.Sprintf("Pembayaran Tunai Faktur %s", purchase.InvoiceNo),
		})
	}

	if remaining > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1000", // Utang Usaha
			Debit:       0,
			Credit:      remaining,
			Description: fmt.Sprintf("Utang Usaha Faktur %s", purchase.InvoiceNo),
		})
	}

	_, err = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "PURCHASE",
		RefNo:       purchase.InvoiceNo,
		Description: fmt.Sprintf("Jurnal Pembelian Faktur %s", purchase.InvoiceNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal akuntansi: "+err.Error(), nil)
		return
	}

	if req.PaidAmount > 0 {
		syncPurchaseCashTransaction(tx, &purchase, companyID, branchID, userID, cashAccountCode)
	}

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendCreated(c, "Faktur pembelian berhasil diposting, stok bertambah dan jurnal dicatat", purchase)
}

func (h *PurchaseHandler) GetPurchase(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Supplier").
		Preload("Warehouse").
		Preload("User").
		Preload("Modifier").
		Preload("PurchaseOrder").
		Preload("Items.Product").
		Preload("Items.Unit").
		First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	utils.SendSuccess(c, "Detail faktur pembelian", purchase)
}

func (h *PurchaseHandler) UpdatePurchase(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	var req struct {
		WarehouseID     uuid.UUID  `json:"warehouse_id"`
		SupplierID      uuid.UUID  `json:"supplier_id"`
		PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
		DueDate         time.Time  `json:"due_date"`
		Notes           string     `json:"notes"`
		TaxPercent      float64    `json:"tax_percent"`
		Discount        float64    `json:"discount"`
		ShippingFee     float64    `json:"shipping_fee"`
		PaidAmount      float64    `json:"paid_amount"`
		CashAccountID   *uuid.UUID `json:"cash_account_id"`
		PBFInvoiceNo       string  `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string  `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string  `json:"tax_invoice_no"`
		Items           []struct {
			ProductID uuid.UUID `json:"product_id"`
			UnitID    uuid.UUID `json:"unit_id"`
			Qty       float64   `json:"qty"`
			UnitPrice float64   `json:"unit_price"`
			Discount  float64   `json:"discount"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembelian tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	if req.SupplierID != uuid.Nil {
		purchase.SupplierID = req.SupplierID
	}
	if req.WarehouseID != uuid.Nil {
		purchase.WarehouseID = req.WarehouseID
	}
	if req.PurchaseOrderID != nil {
		purchase.PurchaseOrderID = req.PurchaseOrderID
	}
	if !req.DueDate.IsZero() {
		purchase.DueDate = req.DueDate
	}
	purchase.Notes = req.Notes
	purchase.PBFInvoiceNo = req.PBFInvoiceNo
	purchase.PBFDeliveryOrderNo = req.PBFDeliveryOrderNo
	purchase.TaxInvoiceNo = req.TaxInvoiceNo
	purchase.TaxPercent = req.TaxPercent
	purchase.Discount = req.Discount
	purchase.ShippingFee = req.ShippingFee
	purchase.PaidAmount = req.PaidAmount
	purchase.UpdatedBy = &userID

	if len(req.Items) > 0 {
		tx.Where("purchase_id = ?", purchase.ID).Delete(&models.PurchaseItem{})
		var subtotal float64
		for _, it := range req.Items {
			lineTotal := (it.Qty * it.UnitPrice) - it.Discount
			subtotal += lineTotal

			unitID := it.UnitID
			if unitID == uuid.Nil {
				var prod models.Product
				if err := tx.Select("base_unit_id").First(&prod, it.ProductID).Error; err == nil && prod.BaseUnitID != nil {
					unitID = *prod.BaseUnitID
				} else {
					var fallbackUnit models.Unit
					if err := tx.Where("company_id = ?", companyID).First(&fallbackUnit).Error; err == nil {
						unitID = fallbackUnit.ID
					}
				}
			}

			item := models.PurchaseItem{
				PurchaseID:  purchase.ID,
				ProductID:   it.ProductID,
				UnitID:      unitID,
				Qty:         it.Qty,
				UnitPrice:   it.UnitPrice,
				Discount:    it.Discount,
				TotalAmount: lineTotal,
			}
			tx.Create(&item)
		}
		purchase.Subtotal = subtotal
		purchase.TaxAmount = (subtotal - purchase.Discount) * (purchase.TaxPercent / 100)
		purchase.TotalAmount = subtotal - purchase.Discount + purchase.TaxAmount + purchase.ShippingFee
	}

	remaining := purchase.TotalAmount - purchase.PaidAmount
	if remaining < 0 {
		remaining = 0
	}
	purchase.RemainingAmount = remaining
	if purchase.PaidAmount >= purchase.TotalAmount && purchase.TotalAmount > 0 {
		purchase.PaymentStatus = "PAID"
	} else if purchase.PaidAmount > 0 {
		purchase.PaymentStatus = "PARTIAL"
	} else {
		purchase.PaymentStatus = "UNPAID"
	}

	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate faktur pembelian", err.Error())
		return
	}

	// Update Double Entry Journal
	var existingJournal models.Journal
	if err := tx.Where("company_id = ? AND ref_type = 'PURCHASE' AND ref_no = ?", companyID, purchase.InvoiceNo).First(&existingJournal).Error; err == nil {
		tx.Where("journal_id = ?", existingJournal.ID).Delete(&models.JournalEntry{})
		tx.Delete(&existingJournal)
	}

	var journalEntries []services.JournalEntryParam
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: "1-1300",
		Debit:       purchase.TotalAmount,
		Credit:      0,
		Description: fmt.Sprintf("Persediaan Pembelian Faktur %s", purchase.InvoiceNo),
	})

	// Resolve cash account code (default to 1-1121 KAS BESAR)
	cashAccountCode := "1-1121"
	if req.CashAccountID != nil {
		var customAcc models.Account
		if err := tx.First(&customAcc, *req.CashAccountID).Error; err == nil && customAcc.Code != "" {
			cashAccountCode = customAcc.Code
		}
	} else {
		var checkAcc models.Account
		if err := tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&checkAcc).Error; err != nil {
			cashAccountCode = "1-1110"
		}
	}

	if purchase.PaidAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashAccountCode,
			Debit:       0,
			Credit:      purchase.PaidAmount,
			Description: fmt.Sprintf("Pembayaran Tunai Faktur %s", purchase.InvoiceNo),
		})
	}

	if remaining > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "2-1000",
			Debit:       0,
			Credit:      remaining,
			Description: fmt.Sprintf("Utang Usaha Faktur %s", purchase.InvoiceNo),
		})
	}

	_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    purchase.BranchID,
		Date:        purchase.Date,
		RefType:     "PURCHASE",
		RefNo:       purchase.InvoiceNo,
		Description: fmt.Sprintf("Jurnal Pembelian Faktur %s", purchase.InvoiceNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})

	syncPurchaseCashTransaction(tx, &purchase, companyID, purchase.BranchID, userID, cashAccountCode)

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Modifier").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendSuccess(c, "Faktur pembelian berhasil diubah", purchase)
}

func (h *PurchaseHandler) DeletePurchase(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	tx.Where("purchase_id = ?", purchase.ID).Delete(&models.PurchaseItem{})

	// Delete double entry journal
	var existingJournal models.Journal
	if err := tx.Where("company_id = ? AND ref_type = 'PURCHASE' AND ref_no = ?", companyID, purchase.InvoiceNo).First(&existingJournal).Error; err == nil {
		tx.Where("journal_id = ?", existingJournal.ID).Delete(&models.JournalEntry{})
		tx.Delete(&existingJournal)
	}

	// Delete cash transaction
	var existingCashTrx models.CashTransaction
	descPattern := "%" + purchase.InvoiceNo + "%"
	if err := tx.Where("company_id = ? AND type = 'OUT' AND description LIKE ?", companyID, descPattern).First(&existingCashTrx).Error; err == nil {
		tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
		tx.Delete(&existingCashTrx)
	}

	if err := tx.Delete(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus faktur pembelian", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Faktur pembelian berhasil dihapus", nil)
}

// ==========================================
// 3. RETUR PEMBELIAN (MODE 1 & MODE 2)
// ==========================================

func (h *PurchaseHandler) GetPurchaseReturns(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("purchase_returns.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_returns.supplier_id").
			Where("purchase_returns.return_no ILIKE ? OR suppliers.name ILIKE ? OR suppliers.code ILIKE ? OR purchase_returns.reason ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("purchase_returns.warehouse_id = ?", warehouseID)
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("purchase_returns.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("purchase_returns.date <= ?", endDate)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "return_no":
		query = query.Order("purchase_returns.return_no " + sortDir)
	case "supplier":
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_returns.supplier_id").Order("suppliers.name " + sortDir)
	case "total":
		query = query.Order("purchase_returns.total_amount " + sortDir)
	default:
		query = query.Order("purchase_returns.date " + sortDir)
	}

	var returns []models.PurchaseReturn
	if err := query.Preload("Supplier").
		Preload("Warehouse").
		Preload("Purchase").
		Preload("User").
		Preload("Modifier").
		Preload("Items.Product").
		Preload("Items.Unit").
		Find(&returns).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data retur pembelian", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar retur pembelian", returns)
}

func (h *PurchaseHandler) CreatePurchaseReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		ReturnMode   string     `json:"return_mode"` // MODE_1 or MODE_2
		PurchaseID   *uuid.UUID `json:"purchase_id"`
		WarehouseID  uuid.UUID  `json:"warehouse_id" binding:"required"`
		SupplierID   uuid.UUID  `json:"supplier_id" binding:"required"`
		TaxType      string     `json:"tax_type"` // NON, INCLUDE, EXCLUDE
		TaxPercent   float64    `json:"tax_percent"`
		OtherCost    float64    `json:"other_cost"`
		Reason       string     `json:"reason"`
		ComputerName string     `json:"computer_name"`
		Items        []struct {
			ProductID         uuid.UUID `json:"product_id" binding:"required"`
			UnitID            uuid.UUID `json:"unit_id" binding:"required"`
			OriginalInvoiceNo string    `json:"original_invoice_no"`
			Brand             string    `json:"brand"`
			PurchasedQty      float64   `json:"purchased_qty"`
			PurchasedUnit     string    `json:"purchased_unit"`
			Qty               float64   `json:"qty" binding:"required"`
			UnitPrice         float64   `json:"unit_price" binding:"required"`
			DiscountPercent   float64   `json:"discount_percent"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data retur pembelian tidak lengkap", err.Error())
		return
	}

	tx := database.DB.Begin()

	retNo, err := services.GenerateDocNumber(tx, companyID, "RB")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor retur pembelian", err.Error())
		return
	}

	mode := req.ReturnMode
	if mode == "" {
		if req.PurchaseID != nil {
			mode = "MODE_1"
		} else {
			mode = "MODE_2"
		}
	}

	var subtotal float64
	for _, it := range req.Items {
		lineDiscount := (it.Qty * it.UnitPrice) * (it.DiscountPercent / 100)
		lineTotal := (it.Qty * it.UnitPrice) - lineDiscount
		subtotal += lineTotal
	}

	taxAmount := subtotal * (req.TaxPercent / 100)
	totalAmount := subtotal + taxAmount + req.OtherCost

	computer := req.ComputerName
	if computer == "" {
		computer = "WEB-CLIENT"
	}

	ret := models.PurchaseReturn{
		CompanyID:    companyID,
		BranchID:     branchID,
		WarehouseID:  req.WarehouseID,
		SupplierID:   req.SupplierID,
		PurchaseID:   req.PurchaseID,
		ReturnNo:     retNo,
		ReturnMode:   mode,
		Date:         time.Now(),
		TaxType:      req.TaxType,
		Subtotal:     subtotal,
		TaxPercent:   req.TaxPercent,
		TaxAmount:    taxAmount,
		OtherCost:    req.OtherCost,
		TotalAmount:  totalAmount,
		Status:       "POSTED",
		Reason:       req.Reason,
		ComputerName: computer,
		CreatedBy:    userID,
	}

	if err := tx.Create(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan retur pembelian", err.Error())
		return
	}

	for _, it := range req.Items {
		lineDiscount := (it.Qty * it.UnitPrice) * (it.DiscountPercent / 100)
		lineTotal := (it.Qty * it.UnitPrice) - lineDiscount

		item := models.PurchaseReturnItem{
			PurchaseReturnID:  ret.ID,
			ProductID:         it.ProductID,
			UnitID:            it.UnitID,
			OriginalInvoiceNo: it.OriginalInvoiceNo,
			Brand:             it.Brand,
			PurchasedQty:      it.PurchasedQty,
			PurchasedUnit:     it.PurchasedUnit,
			Qty:               it.Qty,
			UnitPrice:         it.UnitPrice,
			DiscountPercent:   it.DiscountPercent,
			TotalAmount:       lineTotal,
		}
		tx.Create(&item)

		// Confirmed purchase returns decrease stock & record movement
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "PURCHASE_RETURN",
			DocNo:        ret.ReturnNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     it.UnitPrice,
			Notes:        fmt.Sprintf("Retur Pembelian: %s (%s)", ret.ReturnNo, mode),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}
	}

	// Double-entry accounting:
	// Debit: Utang Usaha (2-1000) = totalAmount
	// Kredit: Persediaan Obat (1-1300) = totalAmount
	_, err = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "PURCHASE_RETURN",
		RefNo:       ret.ReturnNo,
		Description: fmt.Sprintf("Jurnal Retur Pembelian %s (%s)", ret.ReturnNo, mode),
		CreatedBy:   userID,
		Entries: []services.JournalEntryParam{
			{AccountCode: "2-1000", Debit: totalAmount, Credit: 0, Description: "Pengurangan Utang Usaha via Retur"},
			{AccountCode: "1-1300", Debit: 0, Credit: totalAmount, Description: "Pengurangan Persediaan via Retur"},
		},
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal retur pembelian: "+err.Error(), nil)
		return
	}

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Items.Product").Preload("Items.Unit").First(&ret, ret.ID)
	utils.SendCreated(c, "Retur pembelian berhasil diposting", ret)
}

func (h *PurchaseHandler) DeletePurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	tx.Where("purchase_return_id = ?", ret.ID).Delete(&models.PurchaseReturnItem{})
	if err := tx.Delete(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus retur pembelian", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Retur pembelian berhasil dihapus", nil)
}

// ==========================================
// 4. HISTORY HARGA BELI
// ==========================================

type PriceHistoryRow struct {
	SupplierCode string    `json:"supplier_code"`
	SupplierName string    `json:"supplier_name"`
	InvoiceNo    string    `json:"invoice_no"`
	Date         time.Time `json:"date"`
	ItemCode     string    `json:"item_code"`
	ItemName     string    `json:"item_name"`
	Qty          float64   `json:"qty"`
	UnitName     string    `json:"unit_name"`
	UnitPrice    float64   `json:"unit_price"`
	Discount     float64   `json:"discount"`
	TaxAmount    float64   `json:"tax_amount"`
}

func (h *PurchaseHandler) GetPriceHistory(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Table("purchase_items").
		Select(`
			suppliers.code as supplier_code,
			suppliers.name as supplier_name,
			purchases.invoice_no,
			purchases.date,
			products.code as item_code,
			products.name as item_name,
			purchase_items.qty,
			units.name as unit_name,
			purchase_items.unit_price,
			purchase_items.discount,
			(purchase_items.total_amount * purchases.tax_percent / 100) as tax_amount
		`).
		Joins("JOIN purchases ON purchases.id = purchase_items.purchase_id").
		Joins("JOIN suppliers ON suppliers.id = purchases.supplier_id").
		Joins("JOIN products ON products.id = purchase_items.product_id").
		Joins("JOIN units ON units.id = purchase_items.unit_id").
		Where("purchases.company_id = ?", companyID)

	// Filter Supplier
	if supplierID := c.Query("supplier_id"); supplierID != "" && supplierID != "all" {
		query = query.Where("purchases.supplier_id = ?", supplierID)
	}

	// Filter Product ID
	if productID := c.Query("product_id"); productID != "" {
		query = query.Where("purchase_items.product_id = ?", productID)
	}

	// Filter Item Dari - Sampai
	if itemFrom := c.Query("item_from"); itemFrom != "" {
		query = query.Where("products.code >= ?", itemFrom)
	}
	if itemTo := c.Query("item_to"); itemTo != "" {
		query = query.Where("products.code <= ?", itemTo)
	}

	// Filter Tanggal Dari - Sampai
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("purchases.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("purchases.date <= ?", endDate)
	}

	// Order clauses
	sort1 := c.DefaultQuery("sort1", "Supplier")
	sort2 := c.DefaultQuery("sort2", "Tanggal")
	sort3 := c.DefaultQuery("sort3", "Kode Item")

	resolveSortField := func(field string) string {
		switch strings.ToLower(field) {
		case "supplier":
			return "suppliers.name ASC"
		case "tanggal":
			return "purchases.date DESC"
		case "kode item":
			return "products.code ASC"
		case "no transaksi":
			return "purchases.invoice_no ASC"
		default:
			return "purchases.date DESC"
		}
	}

	query = query.Order(fmt.Sprintf("%s, %s, %s", resolveSortField(sort1), resolveSortField(sort2), resolveSortField(sort3)))

	var rows []PriceHistoryRow
	if err := query.Scan(&rows).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data history harga beli", err.Error())
		return
	}

	utils.SendSuccess(c, "History Harga Beli", rows)
}

// ==========================================
// 5. BAYAR HUTANG / SUPPLIER PAYMENTS
// ==========================================

func (h *PurchaseHandler) GetSupplierPayments(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("supplier_payments.company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = supplier_payments.supplier_id").
			Where("supplier_payments.payment_no ILIKE ? OR suppliers.name ILIKE ? OR suppliers.code ILIKE ? OR supplier_payments.notes ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("supplier_payments.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("supplier_payments.date <= ?", endDate)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "payment_no":
		query = query.Order("supplier_payments.payment_no " + sortDir)
	case "supplier":
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = supplier_payments.supplier_id").Order("suppliers.name " + sortDir)
	case "total":
		query = query.Order("supplier_payments.total_amount " + sortDir)
	default:
		query = query.Order("supplier_payments.date " + sortDir)
	}

	var payments []models.SupplierPayment
	if err := query.Preload("Supplier").
		Preload("Bank").
		Preload("User").
		Preload("Modifier").
		Preload("Details.Purchase").
		Find(&payments).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data pembayaran utang", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar Pembayaran Utang", payments)
}

func (h *PurchaseHandler) CreateSupplierPayment(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		SupplierID    uuid.UUID  `json:"supplier_id" binding:"required"`
		BankID        *uuid.UUID `json:"bank_id"`
		PaymentMethod string     `json:"payment_method" binding:"required"` // TUNAI, TRANSFER, CEK_BG, etc.
		CheckNo       string     `json:"check_no"`                          // Nomor Cek/BG
		Notes         string     `json:"notes"`
		Allocations   []struct {
			PurchaseID uuid.UUID `json:"purchase_id" binding:"required"`
			AmountPaid float64   `json:"amount_paid" binding:"required"`
		} `json:"allocations" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembayaran utang tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	payNo, err := services.GenerateDocNumber(tx, companyID, "PAY_OUT")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor pembayaran", err.Error())
		return
	}

	var totalAmount float64
	for _, a := range req.Allocations {
		totalAmount += a.AmountPaid
	}

	checkStatus := "LUNAS"
	isCleared := true
	var clearedDate *time.Time
	now := time.Now()
	clearedDate = &now

	if req.PaymentMethod == "CEK_BG" || req.CheckNo != "" {
		checkStatus = "BELUM_LUNAS"
		isCleared = false
		clearedDate = nil
	}

	payment := models.SupplierPayment{
		CompanyID:        companyID,
		BranchID:         branchID,
		SupplierID:       req.SupplierID,
		PaymentNo:        payNo,
		Date:             time.Now(),
		BankID:           req.BankID,
		PaymentMethod:    req.PaymentMethod,
		CheckNo:          req.CheckNo,
		CheckStatus:      checkStatus,
		IsCheckCleared:   isCleared,
		CheckClearedDate: clearedDate,
		TotalAmount:      totalAmount,
		Notes:            req.Notes,
		ComputerName:     "WEB-CLIENT",
		CreatedBy:        userID,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pembayaran", err.Error())
		return
	}

	for _, a := range req.Allocations {
		var p models.Purchase
		if err := tx.First(&p, a.PurchaseID).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Faktur pembelian tidak ditemukan", nil)
			return
		}

		p.PaidAmount += a.AmountPaid
		p.RemainingAmount -= a.AmountPaid
		if p.RemainingAmount <= 0 {
			p.PaymentStatus = "PAID"
			p.RemainingAmount = 0
		} else {
			p.PaymentStatus = "PARTIAL"
		}
		tx.Save(&p)

		detail := models.SupplierPaymentDetail{
			SupplierPaymentID: payment.ID,
			PurchaseID:        a.PurchaseID,
			AmountPaid:        a.AmountPaid,
		}
		tx.Create(&detail)
	}

	// Journal: Debit Utang Usaha (2-1000), Credit Kas/Bank (1-1120 or 1-1110)
	creditAccount := "1-1110"
	if req.PaymentMethod != "TUNAI" && req.PaymentMethod != "CASH" {
		creditAccount = "1-1120" // Bank BCA
	}

	_, err = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "PAYMENT_OUT",
		RefNo:       payment.PaymentNo,
		Description: fmt.Sprintf("Pembayaran Utang ke Pemasok (%s)", payment.PaymentNo),
		CreatedBy:   userID,
		Entries: []services.JournalEntryParam{
			{AccountCode: "2-1000", Debit: totalAmount, Credit: 0, Description: "Pelunasan Utang Usaha"},
			{AccountCode: creditAccount, Debit: 0, Credit: totalAmount, Description: "Kas/Bank Pengeluaran"},
		},
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal pembayaran: "+err.Error(), nil)
		return
	}

	syncSupplierPaymentCashTransaction(tx, &payment, companyID, branchID, userID, req.PaymentMethod, totalAmount)

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Bank").Preload("User").Preload("Details.Purchase").First(&payment, payment.ID)
	utils.SendCreated(c, "Pembayaran utang berhasil dicatat", payment)
}

func (h *PurchaseHandler) DeleteSupplierPayment(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var payment models.SupplierPayment
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&payment).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pembayaran utang tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()
	// Revert purchase allocations
	var details []models.SupplierPaymentDetail
	tx.Where("supplier_payment_id = ?", payment.ID).Find(&details)
	for _, d := range details {
		var p models.Purchase
		if err := tx.First(&p, d.PurchaseID).Error; err == nil {
			p.PaidAmount -= d.AmountPaid
			p.RemainingAmount += d.AmountPaid
			if p.PaidAmount <= 0 {
				p.PaymentStatus = "UNPAID"
			} else {
				p.PaymentStatus = "PARTIAL"
			}
			tx.Save(&p)
		}
	}

	tx.Where("supplier_payment_id = ?", payment.ID).Delete(&models.SupplierPaymentDetail{})

	// Delete double entry journal
	var existingJournal models.Journal
	if err := tx.Where("company_id = ? AND ref_type = 'PAYMENT_OUT' AND ref_no = ?", companyID, payment.PaymentNo).First(&existingJournal).Error; err == nil {
		tx.Where("journal_id = ?", existingJournal.ID).Delete(&models.JournalEntry{})
		tx.Delete(&existingJournal)
	}

	// Delete cash transaction
	var existingCashTrx models.CashTransaction
	descPattern := "%" + payment.PaymentNo + "%"
	if err := tx.Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, payment.PaymentNo, descPattern).First(&existingCashTrx).Error; err == nil {
		tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
		tx.Delete(&existingCashTrx)
	}

	if err := tx.Delete(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pembayaran utang", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Pembayaran utang berhasil dihapus", nil)
}

// ==========================================
// 6. STATUS LUNAS BG / CEK
// ==========================================

func (h *PurchaseHandler) GetBGChecks(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID).
		Where("payment_method = ? OR check_no != ''", "CEK_BG")

	if supplierID := c.Query("supplier_id"); supplierID != "" && supplierID != "all" {
		query = query.Where("supplier_id = ?", supplierID)
	}

	if checkNo := c.Query("check_no"); checkNo != "" {
		query = query.Where("check_no ILIKE ?", "%"+checkNo+"%")
	}

	// Unless "all" is requested, show only pending/unsettled by default
	if showAll := c.Query("all"); showAll != "true" && showAll != "1" {
		query = query.Where("is_check_cleared = ? OR check_status = ?", false, "BELUM_LUNAS")
	}

	var payments []models.SupplierPayment
	if err := query.Preload("Supplier").Preload("Bank").Order("date DESC").Find(&payments).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data BG/Cek", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar Status Lunas BG/Cek", payments)
}

func (h *PurchaseHandler) UpdateBGCheckStatus(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var payment models.SupplierPayment
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&payment).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Data BG/Cek pembayaran tidak ditemukan", err.Error())
		return
	}

	var req struct {
		CheckStatus      string     `json:"check_status" binding:"required"` // LUNAS, BELUM_LUNAS, BATAL
		IsCheckCleared   bool       `json:"is_check_cleared"`
		CheckClearedDate *time.Time `json:"check_cleared_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data status tidak valid", err.Error())
		return
	}

	payment.CheckStatus = req.CheckStatus
	payment.IsCheckCleared = req.IsCheckCleared
	if req.CheckClearedDate != nil {
		payment.CheckClearedDate = req.CheckClearedDate
	} else if req.IsCheckCleared || req.CheckStatus == "LUNAS" {
		now := time.Now()
		payment.CheckClearedDate = &now
		payment.IsCheckCleared = true
	}
	payment.UpdatedBy = &userID

	if err := database.DB.Save(&payment).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate status BG/Cek", err.Error())
		return
	}

	database.DB.Preload("Supplier").Preload("Bank").First(&payment, payment.ID)
	utils.SendSuccess(c, "Status BG/Cek berhasil diperbarui", payment)
}

func syncPurchaseCashTransaction(tx *gorm.DB, purchase *models.Purchase, companyID, branchID, userID uuid.UUID, cashCode string) {
	var existingCashTrx models.CashTransaction
	descPattern := "%" + purchase.InvoiceNo + "%"
	err := tx.Where("company_id = ? AND type = 'OUT' AND description LIKE ?", companyID, descPattern).First(&existingCashTrx).Error

	if purchase.PaidAmount <= 0 {
		if err == nil {
			tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
			tx.Delete(&existingCashTrx)
		}
		return
	}

	if cashCode == "" {
		cashCode = "1-1121"
	}

	var kasAcc models.Account
	if errKas := tx.Where("company_id = ? AND code = ?", companyID, cashCode).First(&kasAcc).Error; errKas != nil {
		if errK2 := tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&kasAcc).Error; errK2 != nil {
			tx.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", companyID).First(&kasAcc)
		}
	}

	var persediaanAcc models.Account
	_ = tx.Where("company_id = ? AND code = '1-1300'", companyID).First(&persediaanAcc).Error

	var supplier models.Supplier
	supplierName := ""
	if errSupp := tx.First(&supplier, purchase.SupplierID).Error; errSupp == nil {
		supplierName = supplier.Name
	}

	desc := fmt.Sprintf("Pembayaran Tunai Pembelian Faktur %s (%s)", purchase.InvoiceNo, supplierName)

	if err == nil {
		existingCashTrx.Amount = purchase.PaidAmount
		existingCashTrx.Date = purchase.Date
		existingCashTrx.AccountID = kasAcc.ID
		if persediaanAcc.ID != uuid.Nil {
			existingCashTrx.OppositeAccID = &persediaanAcc.ID
		}
		existingCashTrx.PayeeRecipient = supplierName
		existingCashTrx.Description = desc
		tx.Save(&existingCashTrx)

		tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
		if persediaanAcc.ID != uuid.Nil {
			tx.Create(&models.CashTransactionItem{
				TransactionID: existingCashTrx.ID,
				AccountID:     persediaanAcc.ID,
				Amount:        purchase.PaidAmount,
				Notes:         desc,
			})
		}
	} else {
		var count int64
		tx.Model(&models.CashTransaction{}).Where("company_id = ? AND type = 'OUT'", companyID).Count(&count)
		mmyy := purchase.Date.Format("0106")
		docNo := fmt.Sprintf("%04d/KASO/UTAMA/%s", count+1, mmyy)

		newCashTrx := models.CashTransaction{
			CompanyID:      companyID,
			BranchID:       branchID,
			TrxNo:          docNo,
			Date:           purchase.Date,
			Type:           "OUT",
			AccountID:      kasAcc.ID,
			Amount:         purchase.PaidAmount,
			PayeeRecipient: supplierName,
			Description:    desc,
			CreatedBy:      userID,
		}
		if persediaanAcc.ID != uuid.Nil {
			newCashTrx.OppositeAccID = &persediaanAcc.ID
		}
		if errCreate := tx.Create(&newCashTrx).Error; errCreate == nil {
			if persediaanAcc.ID != uuid.Nil {
				tx.Create(&models.CashTransactionItem{
					TransactionID: newCashTrx.ID,
					AccountID:     persediaanAcc.ID,
					Amount:        purchase.PaidAmount,
					Notes:         desc,
				})
			}
		}
	}
}

func syncSupplierPaymentCashTransaction(tx *gorm.DB, payment *models.SupplierPayment, companyID, branchID, userID uuid.UUID, paymentMethod string, totalAmount float64) {
	var existingCashTrx models.CashTransaction
	descPattern := "%" + payment.PaymentNo + "%"
	err := tx.Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, payment.PaymentNo, descPattern).First(&existingCashTrx).Error

	if totalAmount <= 0 {
		if err == nil {
			tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
			tx.Delete(&existingCashTrx)
		}
		return
	}

	var kasAcc models.Account
	creditCode := "1-1110"
	if paymentMethod != "TUNAI" && paymentMethod != "CASH" {
		creditCode = "1-1131"
	}
	if errKas := tx.Where("company_id = ? AND code = ?", companyID, creditCode).First(&kasAcc).Error; errKas != nil {
		tx.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", companyID).First(&kasAcc)
	}

	var utangAcc models.Account
	_ = tx.Where("company_id = ? AND code = '2-1000'", companyID).First(&utangAcc).Error

	var supplier models.Supplier
	supplierName := ""
	if errSupp := tx.First(&supplier, payment.SupplierID).Error; errSupp == nil {
		supplierName = supplier.Name
	}

	desc := fmt.Sprintf("Pembayaran Utang Faktur ke %s (%s)", supplierName, payment.PaymentNo)

	if err == nil {
		existingCashTrx.Amount = totalAmount
		existingCashTrx.Date = payment.Date
		existingCashTrx.AccountID = kasAcc.ID
		if utangAcc.ID != uuid.Nil {
			existingCashTrx.OppositeAccID = &utangAcc.ID
		}
		existingCashTrx.PayeeRecipient = supplierName
		existingCashTrx.Description = desc
		tx.Save(&existingCashTrx)

		tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
		if utangAcc.ID != uuid.Nil {
			tx.Create(&models.CashTransactionItem{
				TransactionID: existingCashTrx.ID,
				AccountID:     utangAcc.ID,
				Amount:        totalAmount,
				Notes:         desc,
			})
		}
	} else {
		var count int64
		tx.Model(&models.CashTransaction{}).Where("company_id = ? AND type = 'OUT'", companyID).Count(&count)
		mmyy := payment.Date.Format("0106")
		docNo := fmt.Sprintf("%04d/KASO/UTAMA/%s", count+1, mmyy)

		newCashTrx := models.CashTransaction{
			CompanyID:      companyID,
			BranchID:       branchID,
			TrxNo:          docNo,
			Date:           payment.Date,
			Type:           "OUT",
			AccountID:      kasAcc.ID,
			Amount:         totalAmount,
			PayeeRecipient: supplierName,
			Description:    desc,
			CreatedBy:      userID,
		}
		if utangAcc.ID != uuid.Nil {
			newCashTrx.OppositeAccID = &utangAcc.ID
		}
		if errCreate := tx.Create(&newCashTrx).Error; errCreate == nil {
			if utangAcc.ID != uuid.Nil {
				tx.Create(&models.CashTransactionItem{
					TransactionID: newCashTrx.ID,
					AccountID:     utangAcc.ID,
					Amount:        totalAmount,
					Notes:         desc,
				})
			}
		}
	}
}
