package handlers

import (
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
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

func getComputerName(c *gin.Context, fallback ...string) string {
	if c != nil {
		if val := c.GetHeader("X-Computer-Name"); val != "" && val != "WEB-CLIENT" {
			return val
		}
	}
	for _, f := range fallback {
		if f != "" && f != "WEB-CLIENT" && f != "SERVER" {
			return f
		}
	}
	if host, err := os.Hostname(); err == nil && host != "" {
		return host
	}
	return "ISB-SEWA11-S-NB"
}

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

	// Filter Kata Kunci (search order_no, supplier name, notes, including multi-supplier on items)
	if search := c.Query("search"); search != "" {
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_orders.supplier_id").
			Where("purchase_orders.order_no ILIKE ? OR suppliers.name ILIKE ? OR suppliers.code ILIKE ? OR purchase_orders.notes ILIKE ? OR EXISTS (SELECT 1 FROM purchase_order_items poi JOIN suppliers s2 ON s2.id = poi.supplier_id WHERE poi.purchase_order_id = purchase_orders.id AND (s2.name ILIKE ? OR s2.code ILIKE ?))",
				"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filter Dept / Gudang
	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		query = query.Where("purchase_orders.warehouse_id = ?", warehouseID)
	}

	// Filter Supplier
	if supplierID := c.Query("supplier_id"); supplierID != "" && supplierID != "all" {
		query = query.Where("purchase_orders.supplier_id = ? OR EXISTS (SELECT 1 FROM purchase_order_items poi WHERE poi.purchase_order_id = purchase_orders.id AND poi.supplier_id = ?)", supplierID, supplierID)
	}

	// Filter Has Debt (Hutang Belum Lunas)
	if hasDebt := c.Query("has_debt"); hasDebt == "true" {
		query = query.Where("purchase_orders.remaining_amount > 0")
	}

	// Filter Tanggal Dari & Sampai
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("purchase_orders.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("purchase_orders.date <= ?", endDate)
	}

	// Filter Status Proses
	procStatus := c.Query("process_status")
	if procStatus != "" && procStatus != "Semua" && procStatus != "all" {
		query = query.Where("purchase_orders.process_status = ?", procStatus)
	}

	// Filter Status Pesanan
	status := c.Query("status")
	if status != "" && status != "Semua" && status != "all" {
		query = query.Where("purchase_orders.status = ?", status)
	}

	// Sesuai aturan: ketika pesanan pembelian sudah terpenuhi semua, maka tidak perlu muncul di list lagi
	// kecuali jika user secara spesifik memilih filter status 'COMPLETED' atau process_status 'Selesai'
	isExplicitCompleted := (status != "" && (status == "COMPLETED" || status == "Selesai")) ||
		(procStatus != "" && (procStatus == "COMPLETED" || procStatus == "Selesai")) ||
		c.Query("show_completed") == "true"

	if !isExplicitCompleted {
		query = query.Where("purchase_orders.status != 'COMPLETED' AND purchase_orders.process_status != 'Selesai'")
	}

	// Sorting
	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "order_no", "code", "kode":
		query = query.Order("purchase_orders.order_no " + sortDir)
	case "supplier", "name", "nama":
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_orders.supplier_id").Order("suppliers.name " + sortDir)
	case "total":
		query = query.Order("purchase_orders.total_amount " + sortDir)
	case "created_at", "waktu_input", "terbaru":
		query = query.Order("purchase_orders.created_at " + sortDir)
	default:
		query = query.Order("purchase_orders.created_at " + sortDir + ", purchase_orders.date " + sortDir)
	}

	var pos []models.PurchaseOrder
	if err := query.Preload("Supplier").
		Preload("Warehouse").
		Preload("User").
		Preload("User.Roles").
		Preload("Modifier").
		Preload("Modifier.Roles").
		Preload("Verifier").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Items.Supplier").
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
		Preload("Verifier").
		Preload("Items.Product").
		Preload("Items.Product.Brand").
		Preload("Items.Product.Category").
		Preload("Items.Product.BaseUnit").
		Preload("Items.Unit").
		Preload("Items.Supplier").
		First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	utils.SendSuccess(c, "Detail pesanan pembelian", po)
}

func updateProductMasterCost(tx *gorm.DB, productID uuid.UUID, unitID uuid.UUID, unitPrice float64) {
	if unitPrice <= 0 || productID == uuid.Nil {
		return
	}
	var prod models.Product
	if err := tx.Where("id = ?", productID).First(&prod).Error; err != nil {
		return
	}
	unitCost := unitPrice
	if prod.BaseUnitID != nil && unitID != uuid.Nil && unitID != *prod.BaseUnitID {
		var conv models.UnitConversion
		if errConv := tx.Where("product_id = ? AND from_unit_id = ? AND to_unit_id = ?", prod.ID, unitID, *prod.BaseUnitID).First(&conv).Error; errConv == nil && conv.Multiplier > 0 {
			unitCost = unitPrice / conv.Multiplier
		}
	}
	prod.PurchasePrice = unitCost
	if !prod.LockPriceOnSale && prod.MarkupPercent != 0 {
		prod.SellingPrice = math.Round(unitCost*(1.0+prod.MarkupPercent/100.0)*100) / 100
	}
	tx.Save(&prod)

	// Update multi-unit conversion costs and prices keeping each unit's proc% fixed
	var conversions []models.UnitConversion
	if err := tx.Where("product_id = ?", prod.ID).Find(&conversions).Error; err == nil {
		for _, conv := range conversions {
			if conv.Multiplier > 0 {
				conv.PurchasePrice = math.Round(unitCost*conv.Multiplier*100) / 100
				if !prod.LockPriceOnSale && conv.MarkupPercent != 0 {
					conv.SellingPrice = math.Round(conv.PurchasePrice*(1.0+conv.MarkupPercent/100.0)*100) / 100
				}
				tx.Save(&conv)
			}
		}
	}

	// Update product_prices keeping each tier's proc% fixed
	if !prod.LockPriceOnSale {
		var prices []models.ProductPrice
		if err := tx.Where("product_id = ?", prod.ID).Find(&prices).Error; err == nil {
			convMap := make(map[uuid.UUID]float64)
			for _, conv := range conversions {
				if conv.Multiplier > 0 {
					convMap[conv.FromUnitID] = conv.Multiplier
				}
			}
			for _, pp := range prices {
				if pp.MarkupPercent != 0 {
					mult := 1.0
					if prod.BaseUnitID != nil && pp.UnitID != *prod.BaseUnitID {
						if m, ok := convMap[pp.UnitID]; ok && m > 0 {
							mult = m
						}
					}
					costForUnit := unitCost * mult
					pp.Price = math.Round(costForUnit*(1.0+pp.MarkupPercent/100.0)*100) / 100
					tx.Save(&pp)
				}
			}
		}
	}
}

func (h *PurchaseHandler) CreatePurchaseOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		ID           *uuid.UUID `json:"id"`
		WarehouseID  *uuid.UUID `json:"warehouse_id"`
		SupplierID   uuid.UUID  `json:"supplier_id" binding:"required"`
		ExpectedDate   *time.Time `json:"expected_date"`
		DeliveryMethod string     `json:"delivery_method"`
		Notes          string     `json:"notes"`
		TaxPercent   float64    `json:"tax_percent"`
		Discount     float64    `json:"discount"`
		ShippingFee  float64    `json:"shipping_fee"`
		SPType       string     `json:"sp_type"`
		SPNumber     string     `json:"sp_number"`
		APJName      string     `json:"apj_name"`
		APJSIPANo    string     `json:"apj_sipa_no"`
		DPAmount        float64    `json:"dp_amount"`
		PaidAmount      float64    `json:"paid_amount"`
		RemainingAmount float64    `json:"remaining_amount"`
		PaymentStatus   string     `json:"payment_status"`
		CashAccountID   *uuid.UUID `json:"cash_account_id"`
		PbfDocumentURL   string     `json:"pbf_document_url"`
		ComputerName     string     `json:"computer_name"`
		UpdateMasterCost bool       `json:"update_master_cost"`
		Items        []struct {
			SupplierID *uuid.UUID `json:"supplier_id"`
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

	dpAmount := req.DPAmount
	paidAmount := req.PaidAmount
	if paidAmount == 0 && dpAmount > 0 {
		paidAmount = dpAmount
	}
	remaining := totalAmount - paidAmount
	if remaining < 0 {
		remaining = 0
	}
	paymentStatus := req.PaymentStatus
	if paymentStatus == "" {
		if paidAmount >= totalAmount && totalAmount > 0 {
			paymentStatus = "PAID"
		} else if dpAmount > 0 {
			paymentStatus = "DP"
		} else if paidAmount > 0 {
			paymentStatus = "PARTIAL"
		} else {
			paymentStatus = "UNPAID"
		}
	}

	spNumber := req.SPNumber
	if spNumber == "" {
		if spNo, err := services.GenerateDocNumber(tx, companyID, "SP"); err == nil && spNo != "" {
			spNumber = spNo
		} else {
			spNumber = fmt.Sprintf("SP/%s", strings.TrimPrefix(poNo, "PO/"))
		}
	}
	apjName := req.APJName
	if apjName == "" {
		apjName = "apt. Raif Umbara, S. Farm."
	}
	apjSipaNo := req.APJSIPANo
	if apjSipaNo == "" {
		apjSipaNo = "503/16/1151/SIPA/125270016/DPMPTSP/2025"
	}

	deliveryMethod := "DIKIRIM"
	if strings.ToUpper(req.DeliveryMethod) == "DIAMBIL" {
		deliveryMethod = "DIAMBIL"
	}

	po := models.PurchaseOrder{
		CompanyID:        companyID,
		BranchID:         branchID,
		WarehouseID:      req.WarehouseID,
		SupplierID:       req.SupplierID,
		OrderNo:          poNo,
		Date:             time.Now(),
		ExpectedDate:     req.ExpectedDate,
		DeliveryMethod:   deliveryMethod,
		Status:           "PENDING",
		ProcessStatus:    "Belum Proses",
		PaymentStatus:    paymentStatus,
		DPAmount:         dpAmount,
		PaidAmount:       paidAmount,
		RemainingAmount:  remaining,
		CashAccountID:    req.CashAccountID,
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
		SPNumber:         spNumber,
		APJName:          apjName,
		APJSIPANo:        apjSipaNo,
		PbfDocumentURL:   req.PbfDocumentURL,
		ComputerName:     getComputerName(c, req.ComputerName),
		CreatedBy:        userID,
	}

	if req.ID != nil && *req.ID != uuid.Nil {
		po.ID = *req.ID
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
		itemSupplierID := it.SupplierID
		if itemSupplierID == nil || *itemSupplierID == uuid.Nil {
			itemSupplierID = &po.SupplierID
		}
		item := models.PurchaseOrderItem{
			PurchaseOrderID: po.ID,
			SupplierID:      itemSupplierID,
			ProductID:       it.ProductID,
			UnitID:          unitID,
			Qty:             it.Qty,
			ReceivedQty:     0,
			UnitPrice:       it.UnitPrice,
			Discount:        it.Discount,
			TotalAmount:     lineTotal,
		}
		tx.Create(&item)
		if req.UpdateMasterCost {
			updateProductMasterCost(tx, it.ProductID, unitID, it.UnitPrice)
		}
	}

	if err := syncPurchaseOrderAccountingAndCash(tx, &po, companyID, branchID, userID, req.CashAccountID); err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mencatat akuntansi pesanan pembelian: "+err.Error(), nil)
		return
	}

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Items.Product").Preload("Items.Unit").Preload("Items.Supplier").First(&po, po.ID)
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

	if po.Status == "COMPLETED" || po.ProcessStatus == "Selesai" {
		utils.SendError(c, http.StatusBadRequest, "Pesanan Pembelian sudah selesai. Transaksi yang sudah selesai tidak dapat diedit.", nil)
		return
	}

	var req struct {
		WarehouseID   *uuid.UUID `json:"warehouse_id"`
		SupplierID    uuid.UUID  `json:"supplier_id"`
		ExpectedDate   *time.Time `json:"expected_date"`
		DeliveryMethod string     `json:"delivery_method"`
		Notes          string     `json:"notes"`
		TaxPercent    float64    `json:"tax_percent"`
		Discount      float64    `json:"discount"`
		ShippingFee   float64    `json:"shipping_fee"`
		Status        string     `json:"status"`
		ProcessStatus string     `json:"process_status"`
		SPType        string     `json:"sp_type"`
		SPNumber      string     `json:"sp_number"`
		APJName       string     `json:"apj_name"`
		APJSIPANo     string     `json:"apj_sipa_no"`
		DPAmount        *float64   `json:"dp_amount"`
		PaidAmount      *float64   `json:"paid_amount"`
		RemainingAmount *float64   `json:"remaining_amount"`
		PaymentStatus   string     `json:"payment_status"`
		CashAccountID   *uuid.UUID `json:"cash_account_id"`
		PbfDocumentURL   string     `json:"pbf_document_url"`
		ComputerName     string     `json:"computer_name"`
		UpdateMasterCost bool       `json:"update_master_cost"`
		Items         []struct {
			ID          *uuid.UUID `json:"id"`
			SupplierID  *uuid.UUID `json:"supplier_id"`
			ProductID   uuid.UUID  `json:"product_id"`
			UnitID      uuid.UUID  `json:"unit_id"`
			Qty         float64    `json:"qty"`
			UnitPrice   float64    `json:"unit_price"`
			Discount    float64    `json:"discount"`
			IsFulfilled *bool      `json:"is_fulfilled"`
			PurchaseID  *uuid.UUID `json:"purchase_id"`
			FulfilledAt *time.Time `json:"fulfilled_at"`
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
	if strings.ToUpper(req.DeliveryMethod) == "DIAMBIL" || strings.ToUpper(req.DeliveryMethod) == "DIKIRIM" {
		po.DeliveryMethod = strings.ToUpper(req.DeliveryMethod)
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
	if req.SPNumber != "" {
		po.SPNumber = req.SPNumber
	} else if po.SPNumber == "" {
		po.SPNumber = fmt.Sprintf("SP/%s", strings.TrimPrefix(po.OrderNo, "PO/"))
	}
	if req.APJName != "" {
		po.APJName = req.APJName
	} else if po.APJName == "" {
		po.APJName = "apt. Raif Umbara, S. Farm."
	}
	if req.APJSIPANo != "" {
		po.APJSIPANo = req.APJSIPANo
	} else if po.APJSIPANo == "" {
		po.APJSIPANo = "503/16/1151/SIPA/125270016/DPMPTSP/2025"
	}
	if req.PbfDocumentURL != "" {
		po.PbfDocumentURL = req.PbfDocumentURL
	}
	po.TaxPercent = req.TaxPercent
	po.Discount = req.Discount
	po.ShippingFee = req.ShippingFee
	po.UpdatedBy = &userID
	po.ComputerName = getComputerName(c, req.ComputerName)

	if req.DPAmount != nil {
		po.DPAmount = *req.DPAmount
	}
	if req.PaidAmount != nil {
		po.PaidAmount = *req.PaidAmount
	} else if po.DPAmount > 0 && po.PaidAmount == 0 {
		po.PaidAmount = po.DPAmount
	}
	if req.CashAccountID != nil {
		po.CashAccountID = req.CashAccountID
	}

	if len(req.Items) > 0 {
		var existingItems []models.PurchaseOrderItem
		tx.Where("purchase_order_id = ?", po.ID).Find(&existingItems)
		existingMap := make(map[string]models.PurchaseOrderItem)
		for _, eIt := range existingItems {
			sIDStr := ""
			if eIt.SupplierID != nil {
				sIDStr = eIt.SupplierID.String()
			}
			key := fmt.Sprintf("%s_%s", eIt.ProductID.String(), sIDStr)
			existingMap[key] = eIt
			existingMap[eIt.ID.String()] = eIt
		}

		tx.Unscoped().Where("purchase_order_id = ?", po.ID).Delete(&models.PurchaseOrderItem{})
		var subtotal float64
		var totalQty float64
		var totalReceived float64
		usedIDs := make(map[uuid.UUID]bool)
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
			itemSupplierID := it.SupplierID
			if itemSupplierID == nil || *itemSupplierID == uuid.Nil {
				itemSupplierID = &po.SupplierID
			}

			var itemReceived float64
			tx.Table("purchase_items").
				Joins("JOIN purchases ON purchase_items.purchase_id = purchases.id").
				Where("purchases.purchase_order_id = ? AND purchase_items.product_id = ? AND purchases.is_verified = true AND purchases.status != 'CANCELLED'", po.ID, it.ProductID).
				Select("COALESCE(SUM(purchase_items.qty), 0)").
				Scan(&itemReceived)

			sIDStr := ""
			if itemSupplierID != nil {
				sIDStr = itemSupplierID.String()
			}
			key := fmt.Sprintf("%s_%s", it.ProductID.String(), sIDStr)
			isFulfilled := false
			var purchaseID *uuid.UUID
			var fulfilledAt *time.Time

			// 1. Coba cari dari existing berdasarkan ID
			if it.ID != nil && *it.ID != uuid.Nil {
				if eIt, ok := existingMap[it.ID.String()]; ok {
					if eIt.IsFulfilled {
						isFulfilled = true
						purchaseID = eIt.PurchaseID
						fulfilledAt = eIt.FulfilledAt
						if itemReceived == 0 {
							itemReceived = it.Qty
						}
					}
				}
			}
			// 2. Coba cari dari existing berdasarkan product & supplier key
			if !isFulfilled {
				if eIt, ok := existingMap[key]; ok {
					if eIt.IsFulfilled {
						isFulfilled = true
						purchaseID = eIt.PurchaseID
						fulfilledAt = eIt.FulfilledAt
						if itemReceived == 0 {
							itemReceived = it.Qty
						}
					}
				}
			}
			// 3. Cek flag eksplisit dari request
			if it.IsFulfilled != nil && *it.IsFulfilled {
				isFulfilled = true
				if itemReceived == 0 {
					itemReceived = it.Qty
				}
				if it.PurchaseID != nil {
					purchaseID = it.PurchaseID
				}
				if it.FulfilledAt != nil {
					fulfilledAt = it.FulfilledAt
				}
			}

			totalReceived += itemReceived

			item := models.PurchaseOrderItem{
				PurchaseOrderID: po.ID,
				SupplierID:      itemSupplierID,
				ProductID:       it.ProductID,
				UnitID:          unitID,
				Qty:             it.Qty,
				ReceivedQty:     itemReceived,
				UnitPrice:       it.UnitPrice,
				Discount:        it.Discount,
				TotalAmount:     lineTotal,
				IsFulfilled:     isFulfilled,
				PurchaseID:      purchaseID,
				FulfilledAt:     fulfilledAt,
			}
			if it.ID != nil && *it.ID != uuid.Nil && !usedIDs[*it.ID] {
				item.ID = *it.ID
				usedIDs[*it.ID] = true
			} else {
				item.ID = uuid.New()
				usedIDs[item.ID] = true
			}
			tx.Create(&item)
			if req.UpdateMasterCost {
				updateProductMasterCost(tx, it.ProductID, unitID, it.UnitPrice)
			}
		}
		po.Subtotal = subtotal
		po.TotalOrderedQty = totalQty
		po.TotalReceivedQty = totalReceived
		po.TaxAmount = (subtotal - po.Discount) * (po.TaxPercent / 100)
		po.TotalAmount = subtotal - po.Discount + po.TaxAmount + po.ShippingFee

		// Cek sisa item yang belum terpenuhi di database
		var unfulfilledCount int64
		tx.Model(&models.PurchaseOrderItem{}).
			Where("purchase_order_id = ? AND is_fulfilled = false", po.ID).
			Count(&unfulfilledCount)

		if unfulfilledCount == 0 && len(req.Items) > 0 {
			po.ProcessStatus = "Selesai"
			po.Status = "COMPLETED"
		} else if totalReceived > 0 || unfulfilledCount < int64(len(req.Items)) {
			po.ProcessStatus = "Proses Sebagian"
			po.Status = "PARTIAL"
		}
	}

	po.RemainingAmount = po.TotalAmount - po.PaidAmount
	if po.RemainingAmount < 0 {
		po.RemainingAmount = 0
	}
	if req.PaymentStatus != "" {
		po.PaymentStatus = req.PaymentStatus
	} else {
		if po.PaidAmount >= po.TotalAmount && po.TotalAmount > 0 {
			po.PaymentStatus = "PAID"
		} else if po.DPAmount > 0 {
			po.PaymentStatus = "DP"
		} else if po.PaidAmount > 0 {
			po.PaymentStatus = "PARTIAL"
		} else {
			po.PaymentStatus = "UNPAID"
		}
	}

	if err := tx.Save(&po).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate PO", err.Error())
		return
	}

	if err := syncPurchaseOrderAccountingAndCash(tx, &po, companyID, po.BranchID, userID, req.CashAccountID); err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mencatat akuntansi pesanan pembelian: "+err.Error(), nil)
		return
	}

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Modifier").Preload("Items.Product").Preload("Items.Unit").Preload("Items.Supplier").First(&po, po.ID)
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

	if po.Status == "COMPLETED" || po.ProcessStatus == "Selesai" {
		utils.SendError(c, http.StatusBadRequest, "Pesanan Pembelian sudah selesai. Transaksi yang sudah selesai tidak dapat dihapus.", nil)
		return
	}

	tx := database.DB.Begin()
	deleteExistingJournal(tx, companyID, "PURCHASE_ORDER", po.OrderNo)
	var oldTrxs []models.CashTransaction
	descPattern := "%" + po.OrderNo + "%"
	if err := tx.Unscoped().Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, po.OrderNo, descPattern).Find(&oldTrxs).Error; err == nil {
		for _, ot := range oldTrxs {
			tx.Unscoped().Where("transaction_id = ?", ot.ID).Delete(&models.CashTransactionItem{})
			tx.Unscoped().Delete(&ot)
		}
	}
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

	if supplierID := c.Query("supplier_id"); supplierID != "" && supplierID != "all" {
		query = query.Where("purchases.supplier_id = ?", supplierID)
	}

	if hasDebt := c.Query("has_debt"); hasDebt == "true" {
		query = query.Where("purchases.remaining_amount > 0")
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("purchases.date >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		if len(endDate) == 10 {
			query = query.Where("purchases.date <= ?", endDate+" 23:59:59")
		} else {
			query = query.Where("purchases.date <= ?", endDate)
		}
	}

	if isVerified := c.Query("is_verified"); isVerified != "" && isVerified != "all" {
		if isVerified == "true" {
			query = query.Where("(purchases.is_verified = true OR purchases.verification_status IN ('APPROVED', 'SELESAI'))")
		} else if isVerified == "false" {
			query = query.Where("purchases.is_verified = false AND (purchases.verification_status IS NULL OR purchases.verification_status NOT IN ('APPROVED', 'SELESAI'))")
		}
	}

	if verificationStatus := c.Query("verification_status"); verificationStatus != "" && verificationStatus != "all" {
		if verificationStatus == "APPROVED" || verificationStatus == "SELESAI" {
			query = query.Where("purchases.verification_status IN ('APPROVED', 'SELESAI')")
		} else {
			query = query.Where("purchases.verification_status = ?", verificationStatus)
		}
	}

	if status := c.Query("status"); status != "" && status != "all" {
		query = query.Where("purchases.status = ?", status)
	}

	if paymentStatus := c.Query("payment_status"); paymentStatus != "" && paymentStatus != "all" {
		switch strings.ToUpper(paymentStatus) {
		case "UNPAID", "BELUM LUNAS":
			query = query.Where("purchases.payment_status IN ('UNPAID', 'PARTIAL') OR purchases.remaining_amount > 0")
		case "PAID", "LUNAS":
			query = query.Where("purchases.payment_status = 'PAID' AND purchases.remaining_amount <= 0")
		case "PARTIAL", "SEBAGIAN":
			query = query.Where("purchases.payment_status = 'PARTIAL' AND purchases.remaining_amount > 0")
		default:
			query = query.Where("purchases.payment_status = ?", strings.ToUpper(paymentStatus))
		}
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	switch strings.ToLower(sortBy) {
	case "no_transaksi", "invoice_no", "code", "kode":
		query = query.Order("purchases.invoice_no " + sortDir)
	case "supplier", "name", "nama":
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchases.supplier_id").Order("suppliers.name " + sortDir)
	case "total":
		query = query.Order("purchases.total_amount " + sortDir)
	case "created_at", "waktu_input", "terbaru":
		query = query.Order("purchases.created_at " + sortDir)
	default:
		query = query.Order("purchases.created_at " + sortDir + ", purchases.date " + sortDir)
	}

	var purchases []models.Purchase
	if err := query.Preload("Supplier").
		Preload("Warehouse").
		Preload("User").
		Preload("User.Roles").
		Preload("Modifier").
		Preload("Modifier.Roles").
		Preload("Verifier").
		Preload("WarehouseVerifier").
		Preload("AdminApprover").
		Preload("PurchaseOrder").
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
		ID              *uuid.UUID `json:"id"`
		WarehouseID     uuid.UUID  `json:"warehouse_id" binding:"required"`
		SupplierID      uuid.UUID  `json:"supplier_id" binding:"required"`
		PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
		DueDate         time.Time  `json:"due_date"`
		DeliveryMethod  string     `json:"delivery_method"`
		Notes           string     `json:"notes"`
		TaxPercent      float64    `json:"tax_percent"`
		Discount        float64    `json:"discount"`
		ShippingFee     float64    `json:"shipping_fee"`
		DPAmount        float64    `json:"dp_amount"`
		PaidAmount      float64    `json:"paid_amount"`
		CashAccountID   *uuid.UUID `json:"cash_account_id"`
		ComputerName    string     `json:"computer_name"`
		PBFInvoiceNo       string  `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string  `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string  `json:"tax_invoice_no"`
		IsVerified         *bool   `json:"is_verified"`
		UpdateMasterCost   bool    `json:"update_master_cost"`
		Items           []struct {
			ProductID   uuid.UUID   `json:"product_id" binding:"required"`
			UnitID      uuid.UUID   `json:"unit_id"`
			Qty         float64     `json:"qty" binding:"required"`
			UnitPrice   float64     `json:"unit_price" binding:"required"`
			Discount    float64     `json:"discount"`
			BatchNumber string      `json:"batch_number"`
			ExpiredDate interface{} `json:"expired_date"`
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
	if totalAmount < 0 {
		totalAmount = 0
	}
	remaining := totalAmount - req.PaidAmount
	if remaining < 0 {
		remaining = 0
	}

	// Validasi Saldo Kas/Bank untuk Pembayaran Tunai Pembelian
	if req.PaidAmount > 0 {
		var cashAcc models.Account
		if req.CashAccountID != nil && *req.CashAccountID != uuid.Nil {
			tx.Where("id = ? AND company_id = ?", *req.CashAccountID, companyID).First(&cashAcc)
		}
		if cashAcc.ID == uuid.Nil {
			tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&cashAcc)
			if cashAcc.ID == uuid.Nil {
				tx.Where("company_id = ? AND code = '1-1110'", companyID).First(&cashAcc)
			}
		}
		if cashAcc.ID != uuid.Nil {
			realBal := services.GetAccountRealBalance(tx, cashAcc.ID)
			if realBal < req.PaidAmount {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Pembelian ditolak: Saldo akun kas/bank %s (%s) tidak mencukupi untuk pembayaran tunai sebesar Rp %.2f. Saldo saat ini hanya Rp %.2f. Sesuai standar akuntansi, saldo kas tidak boleh negatif/minus.", cashAcc.Name, cashAcc.Code, req.PaidAmount, realBal), nil)
				return
			}
		}
	}

	paymentStatus := "UNPAID"
	if (req.PaidAmount >= totalAmount && totalAmount > 0) || (totalAmount == 0 && req.Discount > 0) {
		paymentStatus = "PAID"
		remaining = 0
	} else if req.PaidAmount > 0 {
		paymentStatus = "PARTIAL"
	}

	dueDate := req.DueDate
	if dueDate.IsZero() {
		dueDate = time.Now().AddDate(0, 0, 30) // default 30 hari
	}

	computer := getComputerName(c, req.ComputerName)

	deliveryMethod := "DIKIRIM"
	if strings.ToUpper(req.DeliveryMethod) == "DIAMBIL" {
		deliveryMethod = "DIAMBIL"
	} else if req.DeliveryMethod == "" && req.PurchaseOrderID != nil {
		var linkedPO models.PurchaseOrder
		if errPO := tx.Select("delivery_method").First(&linkedPO, *req.PurchaseOrderID).Error; errPO == nil && linkedPO.DeliveryMethod != "" {
			deliveryMethod = linkedPO.DeliveryMethod
		}
	}

	// ERP Farmasi CDOB Alur Pembelian:
	// Faktur pembelian baru SELALU berstatus DRAFT & MENUNGGU_PENERIMAAN.
	// Stok obat, hutang, dan jurnal akuntansi HANYA terbentuk setelah verifikasi Petugas Gudang (Fisik) & Admin (Approval).
	purchase := models.Purchase{
		CompanyID:          companyID,
		BranchID:           branchID,
		WarehouseID:        req.WarehouseID,
		SupplierID:         req.SupplierID,
		PurchaseOrderID:    req.PurchaseOrderID,
		InvoiceNo:          invNo,
		Date:               time.Now(),
		DueDate:            dueDate,
		DeliveryMethod:     deliveryMethod,
		Status:             "DRAFT",
		VerificationStatus: "MENUNGGU_PENERIMAAN",
		PaymentStatus:      paymentStatus,
		Subtotal:           subtotal,
		TaxPercent:         req.TaxPercent,
		TaxAmount:          taxAmount,
		Discount:           req.Discount,
		ShippingFee:        req.ShippingFee,
		TotalAmount:        totalAmount,
		DPAmount:           req.DPAmount,
		PaidAmount:         req.PaidAmount,
		RemainingAmount:    remaining,
		CashAccountID:      req.CashAccountID,
		Notes:              req.Notes,
		PBFInvoiceNo:       req.PBFInvoiceNo,
		PBFDeliveryOrderNo: req.PBFDeliveryOrderNo,
		TaxInvoiceNo:       req.TaxInvoiceNo,
		ComputerName:       computer,
		IsVerified:         false,
		VerifiedAt:         nil,
		VerifiedBy:         nil,
		CreatedBy:          userID,
	}

	if req.ID != nil && *req.ID != uuid.Nil {
		purchase.ID = *req.ID
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
			BatchNumber: it.BatchNumber,
			ExpiredDate: parseFlexibleDate(it.ExpiredDate),
		}
		tx.Create(&item)
		if req.UpdateMasterCost {
			updateProductMasterCost(tx, it.ProductID, unitID, it.UnitPrice)
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan transaksi pembelian: "+err.Error(), nil)
		return
	}

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Verifier").Preload("PurchaseOrder").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendCreated(c, "Faktur pembelian berhasil dicatat. Status: Menunggu Penerimaan Fisik Gudang.", purchase)
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
		Preload("Verifier").
		Preload("WarehouseVerifier").
		Preload("AdminApprover").
		Preload("PurchaseOrder").
		Preload("PurchaseOrder.Supplier").
		Preload("PurchaseOrder.Items").
		Preload("PurchaseOrder.Items.Product").
		Preload("Items.Product").
		Preload("Items.Product.Brand").
		Preload("Items.Product.BaseUnit").
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

	if purchase.IsVerified || purchase.VerificationStatus == "APPROVED" || purchase.VerificationStatus == "SELESAI" || purchase.Status == "POSTED" {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian sudah diverifikasi & disetujui Admin. Transaksi yang sudah selesai tidak boleh diedit.", nil)
		return
	}

	var req struct {
		WarehouseID     uuid.UUID  `json:"warehouse_id"`
		SupplierID      uuid.UUID  `json:"supplier_id"`
		PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
		DueDate         time.Time  `json:"due_date"`
		DeliveryMethod  string     `json:"delivery_method"`
		Notes           string     `json:"notes"`
		TaxPercent      float64    `json:"tax_percent"`
		Discount        float64    `json:"discount"`
		ShippingFee     float64    `json:"shipping_fee"`
		DPAmount        float64    `json:"dp_amount"`
		PaidAmount      float64    `json:"paid_amount"`
		CashAccountID   *uuid.UUID `json:"cash_account_id"`
		PBFInvoiceNo       string  `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string  `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string  `json:"tax_invoice_no"`
		IsVerified         *bool   `json:"is_verified"`
		UpdateMasterCost   bool    `json:"update_master_cost"`
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
	if strings.ToUpper(req.DeliveryMethod) == "DIAMBIL" || strings.ToUpper(req.DeliveryMethod) == "DIKIRIM" {
		purchase.DeliveryMethod = strings.ToUpper(req.DeliveryMethod)
	}
	purchase.Notes = req.Notes
	purchase.PBFInvoiceNo = req.PBFInvoiceNo
	purchase.PBFDeliveryOrderNo = req.PBFDeliveryOrderNo
	purchase.TaxInvoiceNo = req.TaxInvoiceNo
	purchase.TaxPercent = req.TaxPercent
	purchase.Discount = req.Discount
	purchase.ShippingFee = req.ShippingFee
	purchase.DPAmount = req.DPAmount
	purchase.PaidAmount = req.PaidAmount
	if req.CashAccountID != nil {
		purchase.CashAccountID = req.CashAccountID
	}
	purchase.UpdatedBy = &userID

	wasVerified := purchase.IsVerified || purchase.VerificationStatus == "APPROVED"
	if purchase.VerificationStatus == "APPROVED" {
		purchase.IsVerified = true
		purchase.Status = "POSTED"
	} else if req.IsVerified != nil {
		if *req.IsVerified && !wasVerified {
			purchase.IsVerified = true
			now := time.Now()
			purchase.VerifiedAt = &now
			purchase.VerifiedBy = &userID
			purchase.Status = "POSTED"
		} else if !*req.IsVerified {
			purchase.IsVerified = false
			purchase.Status = "DRAFT"
			purchase.VerifiedAt = nil
			purchase.VerifiedBy = nil
		}
	}

	var oldItems []models.PurchaseItem
	if wasVerified {
		tx.Where("purchase_id = ?", purchase.ID).Find(&oldItems)
	}

	if len(req.Items) > 0 {
		if wasVerified {
			for _, oldIt := range oldItems {
				_, _ = services.MutateStock(tx, services.StockMutationParams{
					CompanyID:    companyID,
					BranchID:     purchase.BranchID,
					WarehouseID:  purchase.WarehouseID,
					ProductID:    oldIt.ProductID,
					DocType:      "PURCHASE_CANCEL",
					DocNo:        purchase.InvoiceNo,
					MovementType: "OUT",
					Qty:          oldIt.Qty,
					UnitCost:     oldIt.UnitPrice,
					Notes:        fmt.Sprintf("Update Pembelian Batal Lama: %s", purchase.InvoiceNo),
					CreatedBy:    userID,
				})
			}
		}

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
			if req.UpdateMasterCost {
				updateProductMasterCost(tx, it.ProductID, unitID, it.UnitPrice)
			}

			// Only mutate stock IN if purchase is verified
			if purchase.IsVerified {
				_, err := services.MutateStock(tx, services.StockMutationParams{
					CompanyID:    companyID,
					BranchID:     purchase.BranchID,
					WarehouseID:  purchase.WarehouseID,
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
	if (purchase.PaidAmount >= purchase.TotalAmount && purchase.TotalAmount > 0) || (purchase.TotalAmount == 0 && purchase.Discount > 0) {
		purchase.PaymentStatus = "PAID"
		purchase.RemainingAmount = 0
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

	// Double Entry Journal & Cash Handling based on IsVerified
	if purchase.IsVerified {
		if purchase.PurchaseOrderID != nil {
			_ = updatePOReceivedStatus(tx, *purchase.PurchaseOrderID)
		}

		// Update Double Entry Journal
		var existingJournal models.Journal
		if err := tx.Where("company_id = ? AND ref_type = 'PURCHASE' AND ref_no = ?", companyID, purchase.InvoiceNo).First(&existingJournal).Error; err == nil {
			tx.Where("journal_id = ?", existingJournal.ID).Delete(&models.JournalEntry{})
			tx.Delete(&existingJournal)
		}

		// Resolve accounts from setting
		purchDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "purch_price_discount", "purch_discount", "5-1100", "POTONGAN PEMBELIAN", "EXPENSE", "COGS", "CREDIT")
		inventoryAcc := services.ResolveSettingAccountCode(tx, companyID, "item_inventory", "1-1300", "Persediaan Obat & Barang Dagang", "ASSET", "INVENTORY", "DEBIT")
		taxAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_tax", "1-1400", "Pajak Masukan", "ASSET", "OTHER_ASSET", "DEBIT")
		payableAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_payable", "2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT")

		var itemDiscounts float64
		var grossItems float64
		for _, it := range purchase.Items {
			grossItems += (it.Qty * it.UnitPrice)
			itemDiscounts += it.Discount
		}
		totalDiscount := itemDiscounts + purchase.Discount

		var journalEntries []services.JournalEntryParam

		// 1. Debit Persediaan Barang (Gross sebelum potongan)
		grossInventory := grossItems
		if grossInventory <= 0 {
			grossInventory = purchase.Subtotal + totalDiscount
		}
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: inventoryAcc,
			Debit:       grossInventory,
			Credit:      0,
			Description: fmt.Sprintf("Persediaan Pembelian Faktur %s", purchase.InvoiceNo),
		})

		// 2. Debit Pajak Masukan jika ada
		if purchase.TaxAmount > 0 {
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: taxAcc,
				Debit:       purchase.TaxAmount,
				Credit:      0,
				Description: fmt.Sprintf("PPN Masukan Faktur %s", purchase.InvoiceNo),
			})
		}

		// 3. Debit Biaya Pengiriman jika ada
		if purchase.ShippingFee > 0 {
			shippingAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_other_cost", "5-3000", "Biaya Angkut Pembelian", "EXPENSE", "OPERATING_EXPENSE", "DEBIT")
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: shippingAcc,
				Debit:       purchase.ShippingFee,
				Credit:      0,
				Description: fmt.Sprintf("Ongkos Kirim Faktur %s", purchase.InvoiceNo),
			})
		}

		// 4. Kredit Akun Penampung Potongan Pembelian ("POTONGAN PEMBELIAN")
		if totalDiscount > 0 {
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: purchDiscAcc,
				Debit:       0,
				Credit:      totalDiscount,
				Description: fmt.Sprintf("Potongan Pembelian Faktur %s", purchase.InvoiceNo),
			})
		}

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
				AccountCode: payableAcc, // Hutang Usaha
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
	} else {
		// If DRAFT, remove any journal or cash transaction if previously posted
		var existingJournal models.Journal
		if err := tx.Where("company_id = ? AND ref_type = 'PURCHASE' AND ref_no = ?", companyID, purchase.InvoiceNo).First(&existingJournal).Error; err == nil {
			tx.Where("journal_id = ?", existingJournal.ID).Delete(&models.JournalEntry{})
			tx.Delete(&existingJournal)
		}
		var existingCashTrx models.CashTransaction
		descPattern := "%" + purchase.InvoiceNo + "%"
		if err := tx.Where("company_id = ? AND type = 'OUT' AND description LIKE ?", companyID, descPattern).First(&existingCashTrx).Error; err == nil {
			tx.Where("transaction_id = ?", existingCashTrx.ID).Delete(&models.CashTransactionItem{})
			tx.Delete(&existingCashTrx)
		}
		if purchase.PurchaseOrderID != nil {
			_ = updatePOReceivedStatus(tx, *purchase.PurchaseOrderID)
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui transaksi pembelian: "+err.Error(), nil)
		return
	}

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

	if purchase.IsVerified || purchase.VerificationStatus == "APPROVED" || purchase.VerificationStatus == "SELESAI" || purchase.Status == "POSTED" {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian sudah diverifikasi & disetujui Admin. Transaksi yang sudah selesai tidak dapat dihapus.", nil)
		return
	}

	tx := database.DB.Begin()

	// Rollback stock only if purchase was verified
	if purchase.IsVerified {
		var items []models.PurchaseItem
		tx.Where("purchase_id = ?", purchase.ID).Find(&items)
		for _, it := range items {
			_, _ = services.MutateStock(tx, services.StockMutationParams{
				CompanyID:    companyID,
				BranchID:     purchase.BranchID,
				WarehouseID:  purchase.WarehouseID,
				ProductID:    it.ProductID,
				DocType:      "PURCHASE_CANCEL",
				DocNo:        purchase.InvoiceNo,
				MovementType: "OUT",
				Qty:          it.Qty,
				UnitCost:     it.UnitPrice,
				Notes:        fmt.Sprintf("Pembatalan Faktur: %s", purchase.InvoiceNo),
				CreatedBy:    purchase.CreatedBy,
			})
		}
	}

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

	poID := purchase.PurchaseOrderID

	if err := tx.Delete(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus faktur pembelian", err.Error())
		return
	}

	if poID != nil {
		_ = updatePOReceivedStatus(tx, *poID)
	}

	tx.Commit()

	utils.SendSuccess(c, "Faktur pembelian berhasil dihapus", nil)
}

func (h *PurchaseHandler) VerifyPurchase(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").
		First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	if purchase.IsVerified {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian sudah diverifikasi sebelumnya", nil)
		return
	}

	tx := database.DB.Begin()

	now := time.Now()
	purchase.IsVerified = true
	purchase.VerifiedAt = &now
	purchase.VerifiedBy = &userID
	purchase.Status = "POSTED"

	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate status verifikasi", err.Error())
		return
	}

	// Cek apakah pengaturan auto update harga jual dari margin aktif
	var autoUpdateSetting models.Setting
	autoUpdateActive := false
	var defaultMargin float64 = 0
	var roundNearest float64 = 0
	if errSetting := tx.Where("company_id = ? AND \"group\" = 'GENERAL' AND key = 'auto_update_selling_price_from_margin'", companyID).First(&autoUpdateSetting).Error; errSetting == nil {
		autoUpdateActive = (autoUpdateSetting.Value == "true")
	}
	if autoUpdateActive {
		var minProfitSetting models.Setting
		if errMin := tx.Where("company_id = ? AND \"group\" = 'GENERAL' AND key = 'min_profit_percent'", companyID).First(&minProfitSetting).Error; errMin == nil {
			defaultMargin, _ = strconv.ParseFloat(strings.TrimSpace(minProfitSetting.Value), 64)
		}
		var roundingSetting models.Setting
		if errRound := tx.Where("company_id = ? AND \"group\" = 'GENERAL' AND key = 'enable_rounding'", companyID).First(&roundingSetting).Error; errRound == nil && roundingSetting.Value == "true" {
			var fracSetting models.Setting
			if errFrac := tx.Where("company_id = ? AND \"group\" = 'GENERAL' AND key = 'custom_fraction_value'", companyID).First(&fracSetting).Error; errFrac == nil {
				roundNearest, _ = strconv.ParseFloat(strings.TrimSpace(fracSetting.Value), 64)
			}
			if roundNearest <= 0 {
				roundNearest = 100
			}
		}
	}

	// 1. Mutasi Stok IN ke Gudang & Update Harga Pokok / Harga Jual Obat
	for _, it := range purchase.Items {
		batchNo := it.BatchNumber
		if batchNo == "" {
			batchNo = "DEFAULT"
		}
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  purchase.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "PURCHASE",
			DocNo:        purchase.InvoiceNo,
			MovementType: "IN",
			Qty:          it.Qty,
			UnitCost:     it.UnitPrice,
			BatchNumber:  batchNo,
			ExpiredDate:  it.ExpiredDate,
			Notes:        fmt.Sprintf("Verifikasi Penerimaan Faktur: %s (Batch: %s)", purchase.InvoiceNo, batchNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Gagal memasukkan stok: "+err.Error(), nil)
			return
		}

		// Update harga pokok dan harga jual otomatis jika ada harga beli
		if it.UnitPrice > 0 {
			var prod models.Product
			if errProd := tx.Where("id = ?", it.ProductID).First(&prod).Error; errProd == nil {
				unitCost := it.UnitPrice
				if prod.BaseUnitID != nil && it.UnitID != *prod.BaseUnitID {
					var conv models.UnitConversion
					if errConv := tx.Where("product_id = ? AND from_unit_id = ? AND to_unit_id = ?", prod.ID, it.UnitID, *prod.BaseUnitID).First(&conv).Error; errConv == nil && conv.Multiplier > 0 {
						unitCost = it.UnitPrice / conv.Multiplier
					}
				}
				prod.PurchasePrice = unitCost
				if autoUpdateActive && !prod.LockPriceOnSale {
					effectiveMargin := prod.MarkupPercent
					if effectiveMargin <= 0 {
						effectiveMargin = defaultMargin
					}
					if effectiveMargin > 0 {
						prod.MarkupPercent = effectiveMargin
						prod.SellingPrice = math.Ceil(unitCost * (1.0 + effectiveMargin/100.0))
					}
				}
				tx.Save(&prod)
			}
		}
	}

	// 2. Update status & Qty Pesanan Pembelian jika terhubung
	if purchase.PurchaseOrderID != nil {
		if err := updatePOReceivedStatus(tx, *purchase.PurchaseOrderID); err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate status PO: "+err.Error(), nil)
			return
		}
	}

	// 3. Jurnal Akuntansi Double-Entry
	purchDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "purch_price_discount", "purch_discount", "5-1100", "POTONGAN PEMBELIAN", "EXPENSE", "COGS", "CREDIT")
	inventoryAcc := services.ResolveSettingAccountCode(tx, companyID, "item_inventory", "1-1300", "Persediaan Obat & Barang Dagang", "ASSET", "INVENTORY", "DEBIT")
	taxAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_tax", "1-1400", "Pajak Masukan", "ASSET", "OTHER_ASSET", "DEBIT")
	payableAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_payable", "2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT")

	var itemDiscounts float64
	var grossItems float64
	for _, it := range purchase.Items {
		grossItems += (it.Qty * it.UnitPrice)
		itemDiscounts += it.Discount
	}
	totalDiscount := itemDiscounts + purchase.Discount

	var journalEntries []services.JournalEntryParam

	// 1. Debit Persediaan (Gross sebelum potongan)
	grossInventory := grossItems
	if grossInventory <= 0 {
		grossInventory = purchase.Subtotal + totalDiscount
	}
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: inventoryAcc,
		Debit:       grossInventory,
		Credit:      0,
		Description: fmt.Sprintf("Persediaan Pembelian Faktur %s", purchase.InvoiceNo),
	})

	// 2. Debit Pajak Masukan jika ada
	if purchase.TaxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: taxAcc,
			Debit:       purchase.TaxAmount,
			Credit:      0,
			Description: fmt.Sprintf("PPN Masukan Faktur %s", purchase.InvoiceNo),
		})
	}

	// 3. Debit Biaya Pengiriman jika ada
	if purchase.ShippingFee > 0 {
		shippingAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_other_cost", "5-3000", "Biaya Angkut Pembelian", "EXPENSE", "OPERATING_EXPENSE", "DEBIT")
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: shippingAcc,
			Debit:       purchase.ShippingFee,
			Credit:      0,
			Description: fmt.Sprintf("Ongkos Kirim Faktur %s", purchase.InvoiceNo),
		})
	}

	// 4. Kredit Akun Penampung Potongan Pembelian ("POTONGAN PEMBELIAN")
	if totalDiscount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: purchDiscAcc,
			Debit:       0,
			Credit:      totalDiscount,
			Description: fmt.Sprintf("Potongan Pembelian Faktur %s", purchase.InvoiceNo),
		})
	}

	cashAccountCode := "1-1121"
	var checkAcc models.Account
	if err := tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&checkAcc).Error; err != nil {
		cashAccountCode = "1-1110"
	}

	if purchase.PaidAmount > 0 {
		var checkCashAcc models.Account
		if purchase.CashAccountID != nil {
			tx.First(&checkCashAcc, *purchase.CashAccountID)
		}
		if checkCashAcc.ID == uuid.Nil {
			tx.Where("company_id = ? AND code = ?", companyID, cashAccountCode).First(&checkCashAcc)
		}
		if checkCashAcc.ID != uuid.Nil {
			realBal := services.GetAccountRealBalance(tx, checkCashAcc.ID)
			if realBal < purchase.PaidAmount {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Persetujuan pembelian ditolak: Saldo kas/bank %s (%s) tidak mencukupi untuk pembayaran tunai sebesar Rp %.2f. Saldo saat ini hanya Rp %.2f. Sesuai standar akuntansi, saldo kas tidak boleh negatif/minus.", checkCashAcc.Name, checkCashAcc.Code, purchase.PaidAmount, realBal), nil)
				return
			}
		}

		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashAccountCode,
			Debit:       0,
			Credit:      purchase.PaidAmount,
			Description: fmt.Sprintf("Pembayaran Tunai Faktur %s", purchase.InvoiceNo),
		})
	}

	if purchase.RemainingAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: payableAcc,
			Debit:       0,
			Credit:      purchase.RemainingAmount,
			Description: fmt.Sprintf("Utang Usaha Faktur %s", purchase.InvoiceNo),
		})
	}

	_, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        purchase.Date,
		RefType:     "PURCHASE",
		RefNo:       purchase.InvoiceNo,
		Description: fmt.Sprintf("Jurnal Pembelian Faktur %s", purchase.InvoiceNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mencatat jurnal akuntansi: "+err.Error(), nil)
		return
	}

	if purchase.PaidAmount > 0 {
		syncPurchaseCashTransaction(tx, &purchase, companyID, branchID, userID, cashAccountCode)
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal verifikasi faktur pembelian: "+err.Error(), nil)
		return
	}

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("Verifier").Preload("PurchaseOrder").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendSuccess(c, "Faktur pembelian berhasil diverifikasi! Stok obat telah masuk gudang dan jurnal akuntansi telah dibukukan.", purchase)
}

func parseFlexibleDate(val interface{}) *time.Time {
	if val == nil {
		return nil
	}
	switch v := val.(type) {
	case time.Time:
		return &v
	case *time.Time:
		return v
	case string:
		str := strings.TrimSpace(v)
		if str == "" {
			return nil
		}
		formats := []string{
			time.RFC3339,
			"2006-01-02T15:04:05Z07:00",
			"2006-01-02T15:04:05",
			"2006-01-02",
			"02/01/2006",
			"02-01-2006",
		}
		for _, f := range formats {
			if t, err := time.Parse(f, str); err == nil {
				return &t
			}
		}
	}
	return nil
}

func (h *PurchaseHandler) ReceiveAndVerifyPO(c *gin.Context) {
	if !isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Penerimaan fisik barang di gudang hanya dapat dilakukan oleh Petugas Gudang.", nil)
		return
	}

	poIDStr := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", poIDStr, companyID).
		Preload("Items").
		First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	var req struct {
		PurchaseID         *uuid.UUID  `json:"purchase_id"`
		SupplierID         uuid.UUID   `json:"supplier_id" binding:"required"`
		WarehouseID        uuid.UUID   `json:"warehouse_id" binding:"required"`
		PBFInvoiceNo       string      `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string      `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string      `json:"tax_invoice_no"`
		DueDate            interface{} `json:"due_date"`
		PaidAmount         float64     `json:"paid_amount"`
		CashAccountID      *uuid.UUID  `json:"cash_account_id"`
		TaxPercent         *float64    `json:"tax_percent"`
		Notes              string      `json:"notes"`
		PbfDocumentURL     string      `json:"pbf_document_url"`
		Items              []struct {
			ProductID   uuid.UUID   `json:"product_id" binding:"required"`
			UnitID      uuid.UUID   `json:"unit_id"`
			Qty         float64     `json:"qty" binding:"required"`
			UnitPrice   float64     `json:"unit_price" binding:"required"`
			Discount    float64     `json:"discount"`
			BatchNumber string      `json:"batch_number"`
			ExpiredDate interface{} `json:"expired_date"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data penerimaan barang tidak valid", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Daftar barang yang diterima tidak boleh kosong", nil)
		return
	}

	tx := database.DB.Begin()

	var purchase models.Purchase
	isNew := true
	if req.PurchaseID != nil && *req.PurchaseID != uuid.Nil {
		if err := tx.Where("id = ? AND company_id = ?", *req.PurchaseID, companyID).First(&purchase).Error; err == nil {
			isNew = false
		}
	}
	if isNew {
		if err := tx.Where("company_id = ? AND purchase_order_id = ? AND verification_status IN ('MENUNGGU_PENERIMAAN', 'REJECTED')", companyID, po.ID).First(&purchase).Error; err == nil {
			isNew = false
		}
	}

	invNo := purchase.InvoiceNo
	if isNew || invNo == "" {
		newInv, errInv := services.GenerateDocNumber(tx, companyID, "PI")
		if errInv != nil {
			newInv = fmt.Sprintf("PI/%s", time.Now().Format("20060102150405"))
		}
		invNo = newInv
	}

	var subtotal float64
	for _, it := range req.Items {
		subtotal += (it.Qty * it.UnitPrice) - it.Discount
	}

	taxPercent := po.TaxPercent
	if req.TaxPercent != nil {
		taxPercent = *req.TaxPercent
	}
	taxAmount := subtotal * (taxPercent / 100)
	totalAmount := subtotal + taxAmount

	dueDate := time.Now().AddDate(0, 0, 30)
	if parsedDue := parseFlexibleDate(req.DueDate); parsedDue != nil {
		dueDate = *parsedDue
	}

	now := time.Now()
	purchase.CompanyID = companyID
	purchase.BranchID = branchID
	purchase.WarehouseID = req.WarehouseID
	purchase.SupplierID = req.SupplierID
	purchase.PurchaseOrderID = &po.ID
	purchase.InvoiceNo = invNo
	purchase.Date = now
	purchase.DueDate = dueDate
	purchase.Status = "DRAFT"
	purchase.VerificationStatus = "VERIFIKASI_GUDANG"
	purchase.IsVerified = false // Belum disetujui Admin, stok & hutang belum terbentuk!
	purchase.WarehouseVerifiedAt = &now
	purchase.WarehouseVerifiedBy = &userID
	purchase.WarehouseNotes = req.Notes
	purchase.Subtotal = subtotal
	purchase.TaxPercent = taxPercent
	purchase.TaxAmount = taxAmount
	purchase.TotalAmount = totalAmount
	purchase.PaidAmount = req.PaidAmount
	remaining := totalAmount - req.PaidAmount
	if remaining < 0 {
		remaining = 0
	}
	purchase.RemainingAmount = remaining
	if (req.PaidAmount >= totalAmount && totalAmount > 0) || (totalAmount == 0 && purchase.Discount > 0) {
		purchase.PaymentStatus = "PAID"
		purchase.RemainingAmount = 0
	} else if req.PaidAmount > 0 {
		purchase.PaymentStatus = "PARTIAL"
	} else {
		purchase.PaymentStatus = "UNPAID"
	}
	if req.Notes != "" {
		purchase.Notes = req.Notes
	} else if purchase.Notes == "" && po.Notes != "" {
		purchase.Notes = po.Notes
	}
	if req.PBFInvoiceNo != "" {
		purchase.PBFInvoiceNo = req.PBFInvoiceNo
	}
	if req.PBFDeliveryOrderNo != "" {
		purchase.PBFDeliveryOrderNo = req.PBFDeliveryOrderNo
	}
	if req.TaxInvoiceNo != "" {
		purchase.TaxInvoiceNo = req.TaxInvoiceNo
	}
	if req.PbfDocumentURL != "" {
		purchase.PbfDocumentURL = req.PbfDocumentURL
	}
	purchase.ComputerName = getComputerName(c)
	if isNew || purchase.CreatedBy == uuid.Nil {
		purchase.CreatedBy = po.CreatedBy
	}
	purchase.UpdatedBy = &userID

	if isNew {
		if err := tx.Create(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal membuat faktur penerimaan: "+err.Error(), nil)
			return
		}
	} else {
		tx.Where("purchase_id = ?", purchase.ID).Delete(&models.PurchaseItem{})
		if err := tx.Save(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui faktur penerimaan: "+err.Error(), nil)
			return
		}
	}

	if req.PbfDocumentURL != "" {
		_ = tx.Model(&po).Update("pbf_document_url", req.PbfDocumentURL)
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

		batchNo := strings.TrimSpace(it.BatchNumber)
		if batchNo == "" {
			batchNo = fmt.Sprintf("BATCH-%s", time.Now().Format("20060102"))
		}

		item := models.PurchaseItem{
			PurchaseID:  purchase.ID,
			ProductID:   it.ProductID,
			UnitID:      unitID,
			Qty:         it.Qty,
			UnitPrice:   it.UnitPrice,
			Discount:    it.Discount,
			TotalAmount: lineTotal,
			BatchNumber: batchNo,
			ExpiredDate: parseFlexibleDate(it.ExpiredDate),
		}
		tx.Create(&item)
	}

	// Update PO status
	po.ProcessStatus = "Verifikasi Gudang Selesai"
	tx.Save(&po)

	// Audit Log
	tx.Create(&models.AuditLog{
		CompanyID:    companyID,
		UserID:       userID,
		Category:     "TRANSAKSI",
		Action:       "VERIFIKASI GUDANG",
		Entity:       "PEMBELIAN",
		EntityID:     purchase.ID.String(),
		DocNo:        po.OrderNo,
		Description:  fmt.Sprintf("Pemeriksaan Fisik Barang PO %s oleh Gudang", po.OrderNo),
		Status:       "Sukses",
		IPAddress:    c.ClientIP(),
		ComputerName: "ISB-SEWA11-S-NB",
		NewValues:    fmt.Sprintf("Gudang selesai verifikasi fisik barang PO %s (Surat Jalan: %s, Faktur PBF: %s). Diteruskan ke Admin untuk persetujuan akhir.", po.OrderNo, req.PBFDeliveryOrderNo, req.PBFInvoiceNo),
		CreatedAt:    time.Now(),
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("WarehouseVerifier").Preload("PurchaseOrder").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendSuccess(c, "Barang berhasil diverifikasi oleh Gudang dan diteruskan ke Admin untuk persetujuan akhir!", purchase)
}

func (h *PurchaseHandler) ReceivePurchaseInvoice(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	if !isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Penerimaan fisik barang di gudang hanya dapat dilakukan oleh Petugas Gudang.", nil)
		return
	}

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").
		Preload("Supplier").
		Preload("Warehouse").
		First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	if purchase.IsVerified || purchase.VerificationStatus == "APPROVED" {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian sudah diverifikasi dan disetujui sebelumnya", nil)
		return
	}

	var req struct {
		WarehouseID        *uuid.UUID  `json:"warehouse_id"`
		PBFInvoiceNo       string      `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string      `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string      `json:"tax_invoice_no"`
		DueDate            interface{} `json:"due_date"`
		Notes              string      `json:"notes"`
		PbfDocumentURL     string      `json:"pbf_document_url"`
		Items              []struct {
			ProductID   uuid.UUID   `json:"product_id" binding:"required"`
			UnitID      uuid.UUID   `json:"unit_id"`
			Qty         float64     `json:"qty" binding:"required"`
			UnitPrice   float64     `json:"unit_price"`
			Discount    float64     `json:"discount"`
			BatchNumber string      `json:"batch_number"`
			ExpiredDate interface{} `json:"expired_date"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data penerimaan barang tidak valid", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Daftar barang yang diterima tidak boleh kosong", nil)
		return
	}

	tx := database.DB.Begin()

	now := time.Now()
	if req.WarehouseID != nil && *req.WarehouseID != uuid.Nil {
		purchase.WarehouseID = *req.WarehouseID
	}
	if req.PBFInvoiceNo != "" {
		purchase.PBFInvoiceNo = req.PBFInvoiceNo
	}
	if req.PBFDeliveryOrderNo != "" {
		purchase.PBFDeliveryOrderNo = req.PBFDeliveryOrderNo
	}
	if req.TaxInvoiceNo != "" {
		purchase.TaxInvoiceNo = req.TaxInvoiceNo
	}
	if req.PbfDocumentURL != "" {
		purchase.PbfDocumentURL = req.PbfDocumentURL
	}
	if parsedDue := parseFlexibleDate(req.DueDate); parsedDue != nil {
		purchase.DueDate = *parsedDue
	}
	purchase.WarehouseNotes = req.Notes
	purchase.WarehouseVerifiedAt = &now
	purchase.WarehouseVerifiedBy = &userID
	purchase.VerificationStatus = "VERIFIKASI_GUDANG"
	purchase.IsVerified = false // Belum disetujui Admin, stok & hutang belum terbentuk!
	purchase.Status = "DRAFT"
	purchase.UpdatedBy = &userID
	purchase.ComputerName = getComputerName(c)

	// Map existing unit_price & discount from purchase items if not sent or 0
	existingPriceMap := make(map[uuid.UUID]float64)
	existingDiscountMap := make(map[uuid.UUID]float64)
	for _, oldIt := range purchase.Items {
		existingPriceMap[oldIt.ProductID] = oldIt.UnitPrice
		existingDiscountMap[oldIt.ProductID] = oldIt.Discount
	}

	tx.Exec("DELETE FROM purchase_items WHERE purchase_id = ?", purchase.ID)
	purchase.Items = nil

	var subtotal float64
	for _, it := range req.Items {
		unitPrice := it.UnitPrice
		if unitPrice == 0 {
			unitPrice = existingPriceMap[it.ProductID]
		}
		discount := it.Discount
		if discount == 0 {
			discount = existingDiscountMap[it.ProductID]
		}
		lineTotal := (it.Qty * unitPrice) - discount
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

		batchNo := strings.TrimSpace(it.BatchNumber)
		if batchNo == "" {
			batchNo = fmt.Sprintf("BATCH-%s", time.Now().Format("20060102"))
		}

		item := models.PurchaseItem{
			PurchaseID:  purchase.ID,
			ProductID:   it.ProductID,
			UnitID:      unitID,
			Qty:         it.Qty,
			UnitPrice:   unitPrice,
			Discount:    discount,
			TotalAmount: lineTotal,
			BatchNumber: batchNo,
			ExpiredDate: parseFlexibleDate(it.ExpiredDate),
		}
		tx.Create(&item)
	}

	purchase.Subtotal = subtotal
	purchase.TaxAmount = (subtotal - purchase.Discount) * (purchase.TaxPercent / 100)
	purchase.TotalAmount = subtotal - purchase.Discount + purchase.TaxAmount + purchase.ShippingFee
	remaining := purchase.TotalAmount - purchase.PaidAmount
	if remaining < 0 {
		remaining = 0
	}
	purchase.RemainingAmount = remaining

	if err := tx.Omit("Items").Save(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui faktur pembelian: "+err.Error(), nil)
		return
	}

	// Audit Log
	tx.Create(&models.AuditLog{
		CompanyID:    companyID,
		UserID:       userID,
		Category:     "TRANSAKSI",
		Action:       "VERIFIKASI GUDANG",
		Entity:       "PEMBELIAN",
		EntityID:     purchase.ID.String(),
		DocNo:        purchase.InvoiceNo,
		Description:  fmt.Sprintf("Pemeriksaan Fisik Barang Faktur %s oleh Gudang", purchase.InvoiceNo),
		Status:       "Sukses",
		IPAddress:    c.ClientIP(),
		ComputerName: "ISB-SEWA11-S-NB",
		NewValues:    fmt.Sprintf("Gudang selesai verifikasi fisik barang Faktur %s (Surat Jalan: %s, Faktur PBF: %s). Diteruskan ke Admin untuk persetujuan akhir.", purchase.InvoiceNo, req.PBFDeliveryOrderNo, req.PBFInvoiceNo),
		CreatedAt:    time.Now(),
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("WarehouseVerifier").Preload("PurchaseOrder").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendSuccess(c, "Barang berhasil diverifikasi oleh Gudang dan diteruskan ke Admin untuk persetujuan akhir!", purchase)
}

func (h *PurchaseHandler) AdminApprovePurchase(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Verifikasi faktur dan persetujuan pembelian hanya dapat dilakukan oleh Admin, bukan Petugas Gudang.", nil)
		return
	}

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").
		Preload("Supplier").
		Preload("Warehouse").
		First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	if purchase.IsVerified || purchase.VerificationStatus == "APPROVED" {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian sudah disetujui sebelumnya", nil)
		return
	}

	if purchase.VerificationStatus != "VERIFIKASI_GUDANG" {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian belum dapat diverifikasi Admin: Fisik barang, nomor batch, dan ED harus diterima dan diverifikasi oleh Petugas Gudang terlebih dahulu.", nil)
		return
	}

	type ItemApprovalInput struct {
		ID          uuid.UUID   `json:"id"`
		ProductID   uuid.UUID   `json:"product_id"`
		BatchNumber string      `json:"batch_number"`
		ExpiredDate interface{} `json:"expired_date"`
	}

	var req struct {
		PBFInvoiceNo       string              `json:"pbf_invoice_no"`
		PBFDeliveryOrderNo string              `json:"pbf_delivery_order_no"`
		TaxInvoiceNo       string              `json:"tax_invoice_no"`
		WarehouseID        *uuid.UUID          `json:"warehouse_id"`
		DueDate            interface{}         `json:"due_date"`
		PbfDocumentURL     string              `json:"pbf_document_url"`
		Notes              string              `json:"notes"`
		Items              []ItemApprovalInput `json:"items"`
	}
	_ = c.ShouldBindJSON(&req)

	// Validasi duplikasi dokumen PBF, Surat Jalan, & Faktur Pajak terhadap transaksi lain di database
	pbfInv := strings.TrimSpace(req.PBFInvoiceNo)
	if pbfInv != "" {
		var dup models.Purchase
		if err := database.DB.Select("id, invoice_no").Where("company_id = ? AND id != ? AND LOWER(pbf_invoice_no) = LOWER(?)", companyID, purchase.ID, pbfInv).First(&dup).Error; err == nil {
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("No. Faktur PBF / Supplier \"%s\" sudah ada di database (Faktur %s). Gunakan nomor yang berbeda.", pbfInv, dup.InvoiceNo), nil)
			return
		}
	}
	pbfSJ := strings.TrimSpace(req.PBFDeliveryOrderNo)
	if pbfSJ != "" {
		var dup models.Purchase
		if err := database.DB.Select("id, invoice_no").Where("company_id = ? AND id != ? AND LOWER(pbf_delivery_order_no) = LOWER(?)", companyID, purchase.ID, pbfSJ).First(&dup).Error; err == nil {
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("No. Surat Jalan / DO Kurir \"%s\" sudah ada di database (Faktur %s). Gunakan nomor yang berbeda.", pbfSJ, dup.InvoiceNo), nil)
			return
		}
	}
	taxInv := strings.TrimSpace(req.TaxInvoiceNo)
	if taxInv != "" {
		var dup models.Purchase
		if err := database.DB.Select("id, invoice_no").Where("company_id = ? AND id != ? AND LOWER(tax_invoice_no) = LOWER(?)", companyID, purchase.ID, taxInv).First(&dup).Error; err == nil {
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("No. Faktur Pajak \"%s\" sudah ada di database (Faktur %s). Gunakan nomor yang berbeda.", taxInv, dup.InvoiceNo), nil)
			return
		}
	}

	tx := database.DB.Begin()

	// Reload fresh purchase items in transaction
	purchase.Items = nil
	if err := tx.Where("purchase_id = ?", purchase.ID).Find(&purchase.Items).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil rincian faktur pembelian", err.Error())
		return
	}

	// Update Purchase Items with Admin verified Batch Number and Expired Date
	if len(req.Items) > 0 {
		reqItemMap := make(map[uuid.UUID]ItemApprovalInput)
		for _, ri := range req.Items {
			if ri.ID != uuid.Nil {
				reqItemMap[ri.ID] = ri
			} else if ri.ProductID != uuid.Nil {
				reqItemMap[ri.ProductID] = ri
			}
		}

		for idx := range purchase.Items {
			it := &purchase.Items[idx]
			matched, exists := reqItemMap[it.ID]
			if !exists {
				matched, exists = reqItemMap[it.ProductID]
			}
			if exists {
				if matched.BatchNumber != "" {
					it.BatchNumber = matched.BatchNumber
				}
				if matched.ExpiredDate != nil {
					if expStr, ok := matched.ExpiredDate.(string); ok && expStr != "" {
						if parsedExp, err := time.Parse("2006-01-02", expStr); err == nil {
							it.ExpiredDate = &parsedExp
						} else if parsedExp, err := time.Parse(time.RFC3339, expStr); err == nil {
							it.ExpiredDate = &parsedExp
						}
					}
				}
				tx.Save(it)
			}
		}
	}

	now := time.Now()
	purchase.IsVerified = true
	purchase.VerificationStatus = "APPROVED"
	purchase.Status = "POSTED"
	purchase.AdminApprovedAt = &now
	purchase.AdminApprovedBy = &userID
	purchase.UpdatedBy = &userID
	purchase.ComputerName = getComputerName(c)
	if req.Notes != "" {
		purchase.AdminNotes = req.Notes
	}
	if req.PBFInvoiceNo != "" {
		purchase.PBFInvoiceNo = req.PBFInvoiceNo
	}
	if req.PBFDeliveryOrderNo != "" {
		purchase.PBFDeliveryOrderNo = req.PBFDeliveryOrderNo
	}
	if req.TaxInvoiceNo != "" {
		purchase.TaxInvoiceNo = req.TaxInvoiceNo
	}
	if req.WarehouseID != nil && *req.WarehouseID != uuid.Nil {
		purchase.WarehouseID = *req.WarehouseID
	}
	if req.PbfDocumentURL != "" {
		purchase.PbfDocumentURL = req.PbfDocumentURL
	}
	if req.DueDate != nil {
		if dStr, ok := req.DueDate.(string); ok && dStr != "" {
			if parsedD, err := time.Parse("2006-01-02", dStr); err == nil {
				purchase.DueDate = parsedD
			} else if parsedD, err := time.Parse(time.RFC3339, dStr); err == nil {
				purchase.DueDate = parsedD
			}
		}
	}

	remaining := purchase.TotalAmount - purchase.PaidAmount
	if remaining < 0 {
		remaining = 0
	}
	purchase.RemainingAmount = remaining
	if (purchase.PaidAmount >= purchase.TotalAmount && purchase.TotalAmount > 0) || (purchase.TotalAmount == 0 && purchase.Discount > 0) {
		purchase.PaymentStatus = "PAID"
		purchase.RemainingAmount = 0
	} else if purchase.PaidAmount > 0 {
		purchase.PaymentStatus = "PARTIAL"
	} else {
		purchase.PaymentStatus = "UNPAID"
	}

	if err := tx.Omit("Items").Save(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui faktur pembelian: "+err.Error(), nil)
		return
	}

	// Cek apakah pengaturan auto update harga jual dari margin aktif
	var autoUpdateSetting models.Setting
	autoUpdateActive := false
	var defaultMargin float64 = 0
	if errSetting := tx.Where("company_id = ? AND \"group\" = 'GENERAL' AND key = 'auto_update_selling_price_from_margin'", companyID).First(&autoUpdateSetting).Error; errSetting == nil {
		autoUpdateActive = (autoUpdateSetting.Value == "true")
	}
	if autoUpdateActive {
		var minProfitSetting models.Setting
		if errMin := tx.Where("company_id = ? AND \"group\" = 'GENERAL' AND key = 'min_profit_percent'", companyID).First(&minProfitSetting).Error; errMin == nil {
			defaultMargin, _ = strconv.ParseFloat(strings.TrimSpace(minProfitSetting.Value), 64)
		}
	}

	// 1. Mutasi Stok Masuk ke Gudang dengan Batch & Expired Date
	for _, it := range purchase.Items {
		batchNo := it.BatchNumber
		if batchNo == "" {
			batchNo = "DEFAULT"
		}
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  purchase.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "PURCHASE",
			DocNo:        purchase.InvoiceNo,
			MovementType: "IN",
			Qty:          it.Qty,
			UnitCost:     it.UnitPrice,
			BatchNumber:  batchNo,
			ExpiredDate:  it.ExpiredDate,
			Notes:        fmt.Sprintf("Penerimaan Faktur Disetujui Admin: %s (Batch: %s)", purchase.InvoiceNo, batchNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Gagal memasukkan stok: "+err.Error(), nil)
			return
		}

		var prod models.Product
		if errProd := tx.Where("id = ?", it.ProductID).First(&prod).Error; errProd == nil {
			unitCost := it.UnitPrice
			if prod.BaseUnitID != nil && it.UnitID != *prod.BaseUnitID {
				var conv models.UnitConversion
				if errConv := tx.Where("product_id = ? AND from_unit_id = ? AND to_unit_id = ?", prod.ID, it.UnitID, *prod.BaseUnitID).First(&conv).Error; errConv == nil && conv.Multiplier > 0 {
					unitCost = it.UnitPrice / conv.Multiplier
				}
			}
			if unitCost > 0 {
				prod.PurchasePrice = unitCost
				if autoUpdateActive && !prod.LockPriceOnSale {
					effectiveMargin := prod.MarkupPercent
					if effectiveMargin <= 0 {
						effectiveMargin = defaultMargin
					}
					if effectiveMargin > 0 {
						prod.MarkupPercent = effectiveMargin
						prod.SellingPrice = math.Ceil(unitCost * (1.0 + effectiveMargin/100.0))
					}
				}
			}
			if it.BatchNumber != "" {
				prod.BatchNumber = it.BatchNumber
			}
			if it.ExpiredDate != nil {
				prod.ExpiredDate = it.ExpiredDate
			}
			tx.Save(&prod)
		}
	}

	// 2. Update status PO jika terhubung
	if purchase.PurchaseOrderID != nil {
		if err := updatePOReceivedStatus(tx, *purchase.PurchaseOrderID); err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate status PO: "+err.Error(), nil)
			return
		}
	}

	// 3. Double-entry Journal & Pembentukan Hutang
	purchDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "purch_price_discount", "purch_discount", "5-1100", "POTONGAN PEMBELIAN", "EXPENSE", "COGS", "CREDIT")
	inventoryAcc := services.ResolveSettingAccountCode(tx, companyID, "item_inventory", "1-1300", "Persediaan Obat & Barang Dagang", "ASSET", "INVENTORY", "DEBIT")
	taxAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_tax", "1-1400", "Pajak Masukan", "ASSET", "OTHER_ASSET", "DEBIT")
	payableAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_payable", "2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT")

	var itemDiscounts float64
	var grossItems float64
	for _, it := range purchase.Items {
		grossItems += (it.Qty * it.UnitPrice)
		itemDiscounts += it.Discount
	}
	totalDiscount := itemDiscounts + purchase.Discount

	var journalEntries []services.JournalEntryParam

	// 1. Debit Persediaan (Gross sebelum potongan)
	grossInventory := grossItems
	if grossInventory <= 0 {
		grossInventory = purchase.Subtotal + totalDiscount
	}
	journalEntries = append(journalEntries, services.JournalEntryParam{
		AccountCode: inventoryAcc,
		Debit:       grossInventory,
		Credit:      0,
		Description: fmt.Sprintf("Persediaan Faktur Pembelian %s", purchase.InvoiceNo),
	})

	// 2. Debit Pajak Masukan jika ada
	if purchase.TaxAmount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: taxAcc,
			Debit:       purchase.TaxAmount,
			Credit:      0,
			Description: fmt.Sprintf("PPN Masukan Faktur %s", purchase.InvoiceNo),
		})
	}

	// 3. Debit Biaya Pengiriman jika ada
	if purchase.ShippingFee > 0 {
		shippingAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_other_cost", "5-3000", "Biaya Angkut Pembelian", "EXPENSE", "OPERATING_EXPENSE", "DEBIT")
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: shippingAcc,
			Debit:       purchase.ShippingFee,
			Credit:      0,
			Description: fmt.Sprintf("Ongkos Kirim Faktur %s", purchase.InvoiceNo),
		})
	}

	// 4. Kredit Akun Penampung Potongan Pembelian ("POTONGAN PEMBELIAN")
	if totalDiscount > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: purchDiscAcc,
			Debit:       0,
			Credit:      totalDiscount,
			Description: fmt.Sprintf("Potongan Pembelian Faktur %s", purchase.InvoiceNo),
		})
	}

	cashAccountCode := "1-1121"
	if purchase.CashAccountID != nil {
		var customAcc models.Account
		if errAcc := tx.First(&customAcc, *purchase.CashAccountID).Error; errAcc == nil && customAcc.Code != "" {
			cashAccountCode = customAcc.Code
		}
	} else {
		var checkAcc models.Account
		if errAcc := tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&checkAcc).Error; errAcc != nil {
			cashAccountCode = "1-1110"
		}
	}

	if purchase.PaidAmount > 0 {
		var checkCashAcc models.Account
		if purchase.CashAccountID != nil {
			tx.First(&checkCashAcc, *purchase.CashAccountID)
		}
		if checkCashAcc.ID == uuid.Nil {
			tx.Where("company_id = ? AND code = ?", companyID, cashAccountCode).First(&checkCashAcc)
		}
		if checkCashAcc.ID != uuid.Nil {
			realBal := services.GetAccountRealBalance(tx, checkCashAcc.ID)
			if realBal < purchase.PaidAmount {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Persetujuan pembelian ditolak: Saldo kas/bank %s (%s) tidak mencukupi untuk pembayaran tunai sebesar Rp %.2f. Saldo saat ini hanya Rp %.2f. Sesuai standar akuntansi, saldo kas tidak boleh negatif/minus.", checkCashAcc.Name, checkCashAcc.Code, purchase.PaidAmount, realBal), nil)
				return
			}
		}

		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashAccountCode,
			Debit:       0,
			Credit:      purchase.PaidAmount,
			Description: fmt.Sprintf("Pembayaran Tunai Faktur %s", purchase.InvoiceNo),
		})
	}

	// Hutang hanya terbentuk jika masih ada sisa tagihan (remaining > 0)
	if remaining > 0 {
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: payableAcc,
			Debit:       0,
			Credit:      remaining,
			Description: fmt.Sprintf("Utang Usaha Faktur %s", purchase.InvoiceNo),
		})
	}

	_, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        now,
		RefType:     "PURCHASE",
		RefNo:       purchase.InvoiceNo,
		Description: fmt.Sprintf("Jurnal Pembelian Disetujui Admin Faktur %s", purchase.InvoiceNo),
		CreatedBy:   userID,
		Entries:     journalEntries,
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal akuntansi: "+err.Error(), nil)
		return
	}

	if purchase.PaidAmount > 0 {
		syncPurchaseCashTransaction(tx, &purchase, companyID, branchID, userID, cashAccountCode)
	}

	// Audit Log
	tx.Create(&models.AuditLog{
		CompanyID:    companyID,
		UserID:       userID,
		Category:     "TRANSAKSI",
		Action:       "APPROVAL",
		Entity:       "PEMBELIAN",
		EntityID:     purchase.ID.String(),
		DocNo:        purchase.InvoiceNo,
		Description:  fmt.Sprintf("Verifikasi Berkas & Persetujuan Admin Pembelian %s", purchase.InvoiceNo),
		Status:       "Sukses",
		IPAddress:    c.ClientIP(),
		ComputerName: "ISB-SEWA11-S-NB",
		NewValues:    fmt.Sprintf("Admin menyetujui pembelian %s: Stok obat masuk ke gudang dan hutang Rp%.2f terbentuk.", purchase.InvoiceNo, remaining),
		CreatedAt:    time.Now(),
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("WarehouseVerifier").Preload("AdminApprover").Preload("PurchaseOrder").Preload("Items.Product").Preload("Items.Unit").First(&purchase, purchase.ID)
	utils.SendSuccess(c, "Pembelian berhasil disetujui Admin! Stok obat telah masuk gudang dan hutang supplier telah dibukukan.", purchase)
}

func (h *PurchaseHandler) AdminRejectPurchase(c *gin.Context) {
	if isUserGudang(c) {
		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Penolakan pembelian hanya dapat dilakukan oleh Admin, bukan Petugas Gudang.", nil)
		return
	}

	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var purchase models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&purchase).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur pembelian tidak ditemukan", err.Error())
		return
	}

	if purchase.IsVerified || purchase.VerificationStatus == "APPROVED" {
		utils.SendError(c, http.StatusBadRequest, "Faktur pembelian yang sudah disetujui tidak dapat ditolak", nil)
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Alasan penolakan harus diisi", err.Error())
		return
	}

	tx := database.DB.Begin()

	now := time.Now()
	purchase.VerificationStatus = "REJECTED"
	purchase.RejectReason = req.Reason
	purchase.AdminApprovedAt = &now
	purchase.AdminApprovedBy = &userID
	purchase.UpdatedBy = &userID
	purchase.ComputerName = getComputerName(c)

	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate penolakan: "+err.Error(), nil)
		return
	}

	// Audit Log
	tx.Create(&models.AuditLog{
		CompanyID: companyID,
		UserID:    userID,
		Action:    "ADMIN_REJECTED",
		Entity:    "PURCHASE",
		EntityID:  purchase.ID.String(),
		NewValues: fmt.Sprintf("Admin menolak verifikasi pembelian %s. Alasan: %s", purchase.InvoiceNo, req.Reason),
		CreatedAt: time.Now(),
	})

	tx.Commit()

	utils.SendSuccess(c, "Verifikasi pembelian ditolak dan dikembalikan ke Gudang untuk revisi.", purchase)
}

func (h *PurchaseHandler) FulfillPurchaseOrderItems(c *gin.Context) {
	poIDStr := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		ItemIDs []uuid.UUID `json:"item_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || len(req.ItemIDs) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Daftar item yang dipilih untuk dipenuhi tidak boleh kosong", nil)
		return
	}

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", poIDStr, companyID).
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("Items.Supplier").
		Preload("Supplier").
		Preload("Warehouse").
		First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	selectedIDMap := make(map[uuid.UUID]bool)
	for _, id := range req.ItemIDs {
		selectedIDMap[id] = true
	}

	var itemsToFulfill []models.PurchaseOrderItem
	for _, it := range po.Items {
		if selectedIDMap[it.ID] && !it.IsFulfilled {
			itemsToFulfill = append(itemsToFulfill, it)
		}
	}

	if len(itemsToFulfill) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Semua item yang dipilih sudah pernah dipindahkan ke Pembelian sebelumnya", nil)
		return
	}

	tx := database.DB.Begin()

	// Group items by supplier_id
	supplierItemMap := make(map[uuid.UUID][]models.PurchaseOrderItem)
	for _, it := range itemsToFulfill {
		supID := po.SupplierID
		if it.SupplierID != nil && *it.SupplierID != uuid.Nil {
			supID = *it.SupplierID
		}
		supplierItemMap[supID] = append(supplierItemMap[supID], it)
	}

	whID := uuid.Nil
	if po.WarehouseID != nil && *po.WarehouseID != uuid.Nil {
		whID = *po.WarehouseID
	} else {
		var defWh models.Warehouse
		if errWh := tx.Where("branch_id = ?", branchID).First(&defWh).Error; errWh == nil {
			whID = defWh.ID
		}
	}

	now := time.Now()
	var createdPurchases []models.Purchase

	for supID, supItems := range supplierItemMap {
		var sup models.Supplier
		supName := "Supplier"
		if err := tx.Where("id = ?", supID).First(&sup).Error; err == nil && sup.Name != "" {
			supName = sup.Name
		}

		invNo, errInv := services.GenerateDocNumber(tx, companyID, "PI")
		if errInv != nil || invNo == "" {
			invNo = fmt.Sprintf("PI/%s%d", now.Format("20060102150405"), time.Now().UnixNano()%10000)
		}

		dueDate := now.AddDate(0, 0, 30)
		if po.ExpectedDate != nil && !po.ExpectedDate.IsZero() {
			dueDate = *po.ExpectedDate
		}

		var subtotal float64
		for _, it := range supItems {
			subtotal += (it.Qty * it.UnitPrice) - it.Discount
		}

		discount := po.Discount
		shippingFee := po.ShippingFee
		notes := po.Notes
		if notes == "" {
			notes = fmt.Sprintf("Dipindahkan dari PO %s (Supplier: %s)", po.OrderNo, supName)
		}
		afterDiscount := subtotal - discount
		if afterDiscount < 0 {
			afterDiscount = 0
		}
		taxAmount := afterDiscount * (po.TaxPercent / 100)
		totalAmount := afterDiscount + taxAmount + shippingFee
		paidAmount := po.PaidAmount
		if paidAmount == 0 && po.DPAmount > 0 {
			paidAmount = po.DPAmount
		}
		remaining := totalAmount - paidAmount
		if remaining < 0 {
			remaining = 0
		}

		purchase := models.Purchase{
			CompanyID:          companyID,
			BranchID:           branchID,
			WarehouseID:        whID,
			SupplierID:         supID,
			PurchaseOrderID:    &po.ID,
			InvoiceNo:          invNo,
			Date:               now,
			DueDate:            dueDate,
			Status:             "DRAFT",
			VerificationStatus: "MENUNGGU_PENERIMAAN",
			Subtotal:           subtotal,
			TaxPercent:         po.TaxPercent,
			TaxAmount:          taxAmount,
			Discount:           discount,
			ShippingFee:        shippingFee,
			TotalAmount:        totalAmount,
			DPAmount:           po.DPAmount,
			PaidAmount:         paidAmount,
			RemainingAmount:    remaining,
			PaymentStatus:      po.PaymentStatus,
			Notes:              notes,
			ComputerName:       getComputerName(c),
			CreatedBy:          po.CreatedBy,
		}

		if err := tx.Create(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal membuat faktur pembelian: "+err.Error(), nil)
			return
		}

		for _, it := range supItems {
			lineTotal := (it.Qty * it.UnitPrice) - it.Discount
			pItem := models.PurchaseItem{
				PurchaseID:  purchase.ID,
				ProductID:   it.ProductID,
				UnitID:      it.UnitID,
				Qty:         it.Qty,
				UnitPrice:   it.UnitPrice,
				Discount:    it.Discount,
				TotalAmount: lineTotal,
			}
			if err := tx.Create(&pItem).Error; err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusInternalServerError, "Gagal membuat item pembelian: "+err.Error(), nil)
				return
			}

			// Mark item as fulfilled in PO
			if err := tx.Model(&models.PurchaseOrderItem{}).
				Where("id = ?", it.ID).
				Updates(map[string]interface{}{
					"is_fulfilled": true,
					"fulfilled_at": now,
					"purchase_id":  purchase.ID,
					"received_qty": it.Qty,
				}).Error; err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate item PO: "+err.Error(), nil)
				return
			}
		}

		createdPurchases = append(createdPurchases, purchase)
	}

	// Check unfulfilled items remaining in PO
	var unfulfilledCount int64
	tx.Model(&models.PurchaseOrderItem{}).
		Where("purchase_order_id = ? AND is_fulfilled = false", po.ID).
		Count(&unfulfilledCount)

	var totalReceived float64
	tx.Model(&models.PurchaseOrderItem{}).
		Where("purchase_order_id = ?", po.ID).
		Select("COALESCE(SUM(received_qty), 0)").
		Scan(&totalReceived)

	po.TotalReceivedQty = totalReceived
	if unfulfilledCount == 0 {
		po.Status = "COMPLETED"
		po.ProcessStatus = "Selesai"
	} else {
		po.Status = "PARTIAL"
		po.ProcessStatus = "Proses Sebagian"
	}

	if err := tx.Save(&po).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate PO: "+err.Error(), nil)
		return
	}

	tx.Create(&models.AuditLog{
		CompanyID: companyID,
		UserID:    userID,
		Action:    "FULFILL_PO_ITEMS",
		Entity:    "PURCHASE_ORDER",
		EntityID:  po.ID.String(),
		NewValues: fmt.Sprintf("Memindahkan %d item dari PO %s ke %d faktur pembelian baru", len(itemsToFulfill), po.OrderNo, len(createdPurchases)),
		CreatedAt: now,
	})

	tx.Commit()

	utils.SendSuccess(c, fmt.Sprintf("%d item berhasil dipindahkan ke menu Pembelian!", len(itemsToFulfill)), gin.H{
		"purchases":       createdPurchases,
		"fulfilled_count": len(itemsToFulfill),
		"remaining_items": unfulfilledCount,
		"po_status":       po.Status,
		"process_status":  po.ProcessStatus,
	})
}

func (h *PurchaseHandler) SendPOToSupplier(c *gin.Context) {
	poIDStr := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", poIDStr, companyID).
		Preload("Items.Product").
		Preload("Supplier").
		First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	tx := database.DB.Begin()

	po.Status = "SENT"
	po.ProcessStatus = "Dikirim ke Supplier"
	if err := tx.Save(&po).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate status PO: "+err.Error(), nil)
		return
	}

	// Buat atau pastikan draft Faktur Pembelian (MENUNGGU_PENERIMAAN) ada di menu Pembelian
	var existingPurchase models.Purchase
	if err := tx.Where("company_id = ? AND purchase_order_id = ?", companyID, po.ID).First(&existingPurchase).Error; err != nil {
		invNo, errInv := services.GenerateDocNumber(tx, companyID, "PI")
		if errInv != nil {
			invNo = fmt.Sprintf("PI/%s", time.Now().Format("20060102150405"))
		}

		dueDate := time.Now().AddDate(0, 0, 30)
		if po.ExpectedDate != nil && !po.ExpectedDate.IsZero() {
			dueDate = *po.ExpectedDate
		}

		whID := uuid.Nil
		if po.WarehouseID != nil && *po.WarehouseID != uuid.Nil {
			whID = *po.WarehouseID
		} else {
			var defWh models.Warehouse
			if errWh := tx.Where("branch_id = ?", branchID).First(&defWh).Error; errWh == nil {
				whID = defWh.ID
			}
		}

		purchase := models.Purchase{
			CompanyID:          companyID,
			BranchID:           branchID,
			WarehouseID:        whID,
			SupplierID:         po.SupplierID,
			PurchaseOrderID:    &po.ID,
			InvoiceNo:          invNo,
			Date:               time.Now(),
			DueDate:            dueDate,
			Status:             "DRAFT",
			PaymentStatus:      "UNPAID",
			VerificationStatus: "MENUNGGU_PENERIMAAN",
			IsVerified:         false,
			Subtotal:           po.Subtotal,
			TaxPercent:         po.TaxPercent,
			TaxAmount:          po.TaxAmount,
			Discount:           po.Discount,
			ShippingFee:        po.ShippingFee,
			TotalAmount:        po.TotalAmount,
			PaidAmount:         po.PaidAmount,
			RemainingAmount:    po.TotalAmount - po.PaidAmount,
			Notes: func() string {
				if po.Notes != "" {
					return po.Notes
				}
				return fmt.Sprintf("PO Dikirim ke Supplier: %s", po.OrderNo)
			}(),
			ComputerName:       getComputerName(c),
			CreatedBy:          po.CreatedBy,
		}

		if err := tx.Create(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal memindahkan PO ke menu Pembelian: "+err.Error(), nil)
			return
		}

		for _, it := range po.Items {
			tx.Create(&models.PurchaseItem{
				PurchaseID:  purchase.ID,
				ProductID:   it.ProductID,
				UnitID:      it.UnitID,
				Qty:         it.Qty,
				UnitPrice:   it.UnitPrice,
				Discount:    it.Discount,
				TotalAmount: it.TotalAmount,
			})
		}
	}

	// Audit Log
	suppName := ""
	if po.Supplier != nil {
		suppName = po.Supplier.Name
	}
	tx.Create(&models.AuditLog{
		CompanyID: companyID,
		UserID:    userID,
		Action:    "PO_SENT",
		Entity:    "PURCHASE_ORDER",
		EntityID:  po.ID.String(),
		NewValues: fmt.Sprintf("PO %s dikirim ke supplier %s untuk konfirmasi ketersediaan & jadwal kirim", po.OrderNo, suppName),
		CreatedAt: time.Now(),
	})

	tx.Commit()

	utils.SendSuccess(c, "PO berhasil dikirim ke supplier dan dipindahkan ke proses Pembelian (menunggu penerimaan barang)", po)
}

func (h *PurchaseHandler) ReallocateRemainingPO(c *gin.Context) {
	poIDStr := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var origPO models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", poIDStr, companyID).
		Preload("Items.Product").
		Preload("Supplier").
		First(&origPO).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	var req struct {
		NewSupplierID uuid.UUID `json:"new_supplier_id" binding:"required"`
		Notes         string    `json:"notes"`
		Items         []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			UnitID    uuid.UUID `json:"unit_id"`
			Qty       float64   `json:"qty" binding:"required"`
			UnitPrice float64   `json:"unit_price"`
			Discount  float64   `json:"discount"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pengalihan tidak valid", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Daftar barang pengalihan tidak boleh kosong", nil)
		return
	}

	tx := database.DB.Begin()

	newPONo, err := services.GenerateDocNumber(tx, companyID, "PO")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor PO baru", err.Error())
		return
	}

	var subtotal float64
	var totalQty float64
	for _, it := range req.Items {
		totalQty += it.Qty
		subtotal += (it.Qty * it.UnitPrice) - it.Discount
	}

	taxAmount := subtotal * (origPO.TaxPercent / 100)
	totalAmount := subtotal + taxAmount

	newPO := models.PurchaseOrder{
		CompanyID:        companyID,
		BranchID:         branchID,
		WarehouseID:      origPO.WarehouseID,
		SupplierID:       req.NewSupplierID,
		OrderNo:          newPONo,
		Date:             time.Now(),
		Status:           "PENDING",
		ProcessStatus:    "Belum Proses",
		PaymentStatus:    "UNPAID",
		Subtotal:         subtotal,
		TaxPercent:       origPO.TaxPercent,
		TaxAmount:        taxAmount,
		TotalAmount:      totalAmount,
		TotalOrderedQty:  totalQty,
		TotalReceivedQty: 0,
		Notes:            fmt.Sprintf("Pengalihan sisa kebutuhan dari PO %s: %s", origPO.OrderNo, req.Notes),
		SPType:           origPO.SPType,
		SPNumber:         fmt.Sprintf("SP/%s", strings.TrimPrefix(newPONo, "PO/")),
		APJName:          origPO.APJName,
		APJSIPANo:        origPO.APJSIPANo,
		CreatedBy:        userID,
	}

	if err := tx.Create(&newPO).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat PO pengalihan baru: "+err.Error(), nil)
		return
	}

	for _, it := range req.Items {
		tx.Create(&models.PurchaseOrderItem{
			PurchaseOrderID: newPO.ID,
			SupplierID:      &req.NewSupplierID,
			ProductID:       it.ProductID,
			UnitID:          it.UnitID,
			Qty:             it.Qty,
			UnitPrice:       it.UnitPrice,
			Discount:        it.Discount,
			TotalAmount:     (it.Qty * it.UnitPrice) - it.Discount,
		})

		for _, oit := range origPO.Items {
			if oit.ProductID == it.ProductID {
				tx.Model(&models.PurchaseOrderItem{}).Where("id = ?", oit.ID).
					Update("cancelled_qty", gorm.Expr("cancelled_qty + ?", it.Qty))
			}
		}
	}

	origPO.ProcessStatus = "Selesai (Dialihkan Sebagian)"
	tx.Save(&origPO)

	// Audit Log
	tx.Create(&models.AuditLog{
		CompanyID: companyID,
		UserID:    userID,
		Action:    "PO_REALLOCATED",
		Entity:    "PURCHASE_ORDER",
		EntityID:  origPO.ID.String(),
		NewValues: fmt.Sprintf("Sisa kebutuhan PO %s dialihkan ke PO baru %s untuk supplier baru", origPO.OrderNo, newPO.OrderNo),
		CreatedAt: time.Now(),
	})

	tx.Commit()

	utils.SendSuccess(c, fmt.Sprintf("Sisa kebutuhan berhasil dialihkan ke PO baru (%s)", newPO.OrderNo), newPO)
}

func (h *PurchaseHandler) CancelRemainingPO(c *gin.Context) {
	poIDStr := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var origPO models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", poIDStr, companyID).
		Preload("Items").
		First(&origPO).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Alasan pembatalan harus diisi", err.Error())
		return
	}

	tx := database.DB.Begin()

	for _, it := range origPO.Items {
		sisa := it.Qty - it.ReceivedQty - it.CancelledQty
		if sisa > 0 {
			tx.Model(&models.PurchaseOrderItem{}).Where("id = ?", it.ID).
				Update("cancelled_qty", it.CancelledQty+sisa)
		}
	}

	if origPO.TotalReceivedQty > 0 {
		origPO.ProcessStatus = "Batal Sebagian"
		origPO.Status = "PARTIAL"
	} else {
		origPO.ProcessStatus = "Dibatalkan"
		origPO.Status = "CANCELLED"
	}
	origPO.Notes = fmt.Sprintf("%s [Batal Sisa: %s]", origPO.Notes, req.Reason)
	tx.Save(&origPO)

	// Audit Log
	tx.Create(&models.AuditLog{
		CompanyID: companyID,
		UserID:    userID,
		Action:    "PO_CANCELLED_REMAINING",
		Entity:    "PURCHASE_ORDER",
		EntityID:  origPO.ID.String(),
		NewValues: fmt.Sprintf("Sisa pesanan PO %s dibatalkan. Alasan: %s", origPO.OrderNo, req.Reason),
		CreatedAt: time.Now(),
	})

	tx.Commit()

	utils.SendSuccess(c, "Sisa pesanan PO berhasil dibatalkan tanpa menghapus item yang sudah terpenuhi", origPO)
}

func updatePOReceivedStatus(tx *gorm.DB, poID uuid.UUID) error {
	var po models.PurchaseOrder
	if err := tx.Preload("Items").First(&po, poID).Error; err != nil {
		return err
	}

	var totalReceived float64
	for i := range po.Items {
		var itemReceived float64
		tx.Table("purchase_items").
			Joins("JOIN purchases ON purchase_items.purchase_id = purchases.id").
			Where("purchases.purchase_order_id = ? AND purchase_items.product_id = ? AND purchases.is_verified = true AND purchases.status != 'CANCELLED' AND purchase_items.deleted_at IS NULL AND purchases.deleted_at IS NULL", po.ID, po.Items[i].ProductID).
			Select("COALESCE(SUM(purchase_items.qty), 0)").
			Scan(&itemReceived)

		po.Items[i].ReceivedQty = itemReceived
		tx.Model(&models.PurchaseOrderItem{}).Where("id = ?", po.Items[i].ID).Update("received_qty", itemReceived)
		totalReceived += itemReceived
	}

	po.TotalReceivedQty = totalReceived
	if totalReceived >= po.TotalOrderedQty && po.TotalOrderedQty > 0 {
		po.ProcessStatus = "Selesai"
		po.Status = "COMPLETED"
	} else if totalReceived > 0 {
		po.ProcessStatus = "Proses Sebagian"
		po.Status = "PARTIAL"
	} else {
		po.ProcessStatus = "Belum Proses"
		po.Status = "PENDING"
	}
	return tx.Save(&po).Error
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

	if supplierID := c.Query("supplier_id"); supplierID != "" {
		query = query.Where("purchase_returns.supplier_id = ?", supplierID)
	}

	if status := c.Query("status"); status != "" && status != "all" {
		query = query.Where("purchase_returns.status = ?", status)
	}

	if settlementStatus := c.Query("settlement_status"); settlementStatus != "" {
		if settlementStatus == "PENDING" {
			query = query.Where("(purchase_returns.settlement_status = 'PENDING' OR purchase_returns.settlement_status = '' OR purchase_returns.settlement_status IS NULL)")
		} else {
			query = query.Where("purchase_returns.settlement_status = ?", settlementStatus)
		}
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
		Preload("WarehouseVerifier").
		Preload("AdminApprover").
		Preload("Shipper").
		Preload("CashAccount").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("StatusLogs.User").
		Find(&returns).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data retur pembelian", err.Error())
		return
	}

	utils.SendSuccess(c, "Daftar retur pembelian", returns)
}

func (h *PurchaseHandler) GetPurchaseReturnByID(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Supplier").
		Preload("Warehouse").
		Preload("Purchase.Items.Product").
		Preload("Purchase.Items.Unit").
		Preload("User").
		Preload("Modifier").
		Preload("WarehouseVerifier").
		Preload("AdminApprover").
		Preload("Shipper").
		Preload("CashAccount").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("StatusLogs.User").
		First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Data retur pembelian tidak ditemukan", err.Error())
		return
	}

	utils.SendSuccess(c, "Detail retur pembelian", ret)
}

func (h *PurchaseHandler) CreatePurchaseReturn(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	type ReturnItemReq struct {
		ProductID         uuid.UUID  `json:"product_id" binding:"required"`
		UnitID            uuid.UUID  `json:"unit_id"`
		OriginalInvoiceNo string     `json:"original_invoice_no"`
		Brand             string     `json:"brand"`
		PurchasedQty      float64    `json:"purchased_qty"`
		PurchasedUnit     string     `json:"purchased_unit"`
		Qty               float64    `json:"qty" binding:"required"`
		UnitPrice         float64    `json:"unit_price" binding:"required"`
		DiscountPercent   float64    `json:"discount_percent"`
		BatchNumber       string     `json:"batch_number"`
		ExpiredDate       *time.Time `json:"expired_date"`
		ItemCondition     string     `json:"item_condition"`
		Reason            string     `json:"reason"`
	}

	var req struct {
		ReturnMode     string          `json:"return_mode"` // MODE_1 or MODE_2
		DeliveryMethod string          `json:"delivery_method"` // DIAMBIL or DIKIRIM
		PurchaseID     *uuid.UUID      `json:"purchase_id"`
		WarehouseID  uuid.UUID       `json:"warehouse_id" binding:"required"`
		SupplierID   uuid.UUID       `json:"supplier_id" binding:"required"`
		TaxType      string          `json:"tax_type"` // NON, INCLUDE, EXCLUDE
		TaxPercent   float64         `json:"tax_percent"`
		OtherCost    float64         `json:"other_cost"`
		Reason       string          `json:"reason"`
		ComputerName string          `json:"computer_name"`
		Items        []ReturnItemReq `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data retur pembelian tidak lengkap: "+err.Error(), err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Minimal harus ada 1 item yang diretur", nil)
		return
	}

	tx := database.DB.Begin()

	// 1. Validasi Mode 1: Berdasarkan Transaksi Pembelian
	if req.PurchaseID != nil && *req.PurchaseID != uuid.Nil {
		var purchase models.Purchase
		if err := tx.Where("id = ? AND company_id = ?", req.PurchaseID, companyID).
			Preload("Items").First(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Faktur pembelian asal tidak ditemukan", nil)
			return
		}

		if !purchase.IsVerified && purchase.Status != "POSTED" && purchase.Status != "APPROVED" {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Retur pembelian hanya dapat diajukan untuk faktur pembelian yang sudah diverifikasi fisik dan disetujui (POSTED).", nil)
			return
		}

		// Validasi jumlah retur tidak melebihi jumlah pembelian dikurangi yang sudah diretur
		for _, it := range req.Items {
			if it.Qty <= 0 {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, "Jumlah retur harus lebih besar dari 0", nil)
				return
			}

			// Cari item pada faktur pembelian asal
			var origItem *models.PurchaseItem
			for _, pi := range purchase.Items {
				if pi.ProductID == it.ProductID {
					origItem = &pi
					break
				}
			}
			if origItem == nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Item %s tidak ditemukan pada faktur pembelian asal", it.ProductID), nil)
				return
			}

			// Hitung total retur sebelumnya yang belum dibatalkan/ditolak
			var priorReturned float64
			tx.Model(&models.PurchaseReturnItem{}).
				Joins("JOIN purchase_returns ON purchase_returns.id = purchase_return_items.purchase_return_id").
				Where("purchase_returns.company_id = ? AND purchase_returns.purchase_id = ? AND purchase_return_items.product_id = ? AND purchase_returns.status NOT IN ('CANCELLED', 'DITOLAK')",
					companyID, purchase.ID, it.ProductID).
				Select("COALESCE(SUM(purchase_return_items.qty), 0)").
				Scan(&priorReturned)

			sisaBisaRetur := origItem.Qty - priorReturned
			if it.Qty > sisaBisaRetur {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Jumlah retur item melebihi batas retur. Beli: %.2f, Sudah diretur: %.2f, Sisa maksimal: %.2f, Diajukan: %.2f", origItem.Qty, priorReturned, sisaBisaRetur, it.Qty), nil)
				return
			}
		}
	}

	// 2. Validasi Stok Tersedia di Gudang (Tidak boleh meretur barang tanpa stok cukup)
	for _, it := range req.Items {
		var stockBal models.StockBalance
		if err := tx.Where("warehouse_id = ? AND product_id = ?", req.WarehouseID, it.ProductID).First(&stockBal).Error; err != nil || stockBal.Qty < it.Qty {
			tx.Rollback()
			availableQty := stockBal.Qty
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Stok fisik item di gudang tidak mencukupi untuk diretur (Tersedia: %.2f, Diajukan: %.2f)", availableQty, it.Qty), nil)
			return
		}

		// Jika batch dipilih, cek ketersediaan batch
		if it.BatchNumber != "" {
			var batch models.ProductBatch
			if err := tx.Where("warehouse_id = ? AND product_id = ? AND batch_number = ?", req.WarehouseID, it.ProductID, it.BatchNumber).First(&batch).Error; err == nil {
				if batch.CurrentQty < it.Qty {
					tx.Rollback()
					utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Stok bets %s tidak mencukupi (Tersedia: %.2f, Diajukan: %.2f)", it.BatchNumber, batch.CurrentQty, it.Qty), nil)
					return
				}
			}
		}
	}

	retNo, err := services.GenerateDocNumber(tx, companyID, "RB")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor retur pembelian", err.Error())
		return
	}

	mode := req.ReturnMode
	if mode == "" {
		if req.PurchaseID != nil && *req.PurchaseID != uuid.Nil {
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

	computer := getComputerName(c, req.ComputerName)

	deliveryMethod := req.DeliveryMethod
	if deliveryMethod != "DIKIRIM" {
		deliveryMethod = "DIAMBIL"
	}

	ret := models.PurchaseReturn{
		CompanyID:           companyID,
		BranchID:            branchID,
		WarehouseID:         req.WarehouseID,
		SupplierID:          req.SupplierID,
		PurchaseID:          req.PurchaseID,
		ReturnNo:            retNo,
		ReturnMode:          mode,
		DeliveryMethod:      deliveryMethod,
		Date:                time.Now(),
		TaxType:             req.TaxType,
		Subtotal:            subtotal,
		TaxPercent:          req.TaxPercent,
		TaxAmount:           taxAmount,
		OtherCost:           req.OtherCost,
		TotalAmount:         totalAmount,
		AcceptedTotalAmount: totalAmount, // Default sama dengan total amount
		Status:              "DRAFT",      // Alur Verifikasi: Dimulai dari status DRAFT
		Reason:              req.Reason,
		ComputerName:        computer,
		CreatedBy:           userID,
	}

	if err := tx.Create(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan draft retur pembelian", err.Error())
		return
	}

	for _, it := range req.Items {
		lineDiscount := (it.Qty * it.UnitPrice) * (it.DiscountPercent / 100)
		lineTotal := (it.Qty * it.UnitPrice) - lineDiscount

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

		item := models.PurchaseReturnItem{
			PurchaseReturnID:  ret.ID,
			ProductID:         it.ProductID,
			UnitID:            unitID,
			OriginalInvoiceNo: it.OriginalInvoiceNo,
			Brand:             it.Brand,
			PurchasedQty:      it.PurchasedQty,
			PurchasedUnit:     it.PurchasedUnit,
			Qty:               it.Qty,
			UnitPrice:         it.UnitPrice,
			DiscountPercent:   it.DiscountPercent,
			TotalAmount:       lineTotal,
			BatchNumber:       it.BatchNumber,
			ExpiredDate:       it.ExpiredDate,
			ItemCondition:     it.ItemCondition,
			Reason:            it.Reason,
			AcceptedQty:       it.Qty, // Default sebelum konfirmasi PBF
			RejectedQty:       0,
		}
		if err := tx.Create(&item).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan rincian item retur", err.Error())
			return
		}
	}

	// Catat riwayat status log
	statusLog := models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "DRAFT",
		Action:           "BUAT_DRAFT",
		Notes:            "Draft retur pembelian dibuat oleh pengguna.",
		UserID:           userID,
		CreatedAt:        time.Now(),
	}
	tx.Create(&statusLog)

	tx.Commit()

	database.DB.Preload("Supplier").
		Preload("Warehouse").
		Preload("Purchase").
		Preload("User").
		Preload("Items.Product").
		Preload("Items.Unit").
		Preload("StatusLogs.User").
		First(&ret, ret.ID)

	utils.SendCreated(c, "Draft retur pembelian berhasil dibuat", ret)
}

// 2. Verifikasi Fisik Gudang
func (h *PurchaseHandler) WarehouseVerifyPurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		Notes string `json:"notes"`
		Items []struct {
			ID            uuid.UUID  `json:"id"`
			BatchNumber   string     `json:"batch_number"`
			ExpiredDate   *time.Time `json:"expired_date"`
			ItemCondition string     `json:"item_condition"`
			Notes         string     `json:"notes"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data verifikasi gudang tidak valid", err.Error())
		return
	}

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status != "DRAFT" && ret.Status != "VERIFIKASI_GUDANG" {
		utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Status retur (%s) tidak dapat diverifikasi gudang.", ret.Status), nil)
		return
	}

	tx := database.DB.Begin()

	// Update data item yang diverifikasi gudang
	for _, itReq := range req.Items {
		updates := map[string]interface{}{}
		if itReq.BatchNumber != "" {
			updates["batch_number"] = itReq.BatchNumber
		}
		if itReq.ExpiredDate != nil {
			updates["expired_date"] = itReq.ExpiredDate
		}
		if itReq.ItemCondition != "" {
			updates["item_condition"] = itReq.ItemCondition
		}
		if itReq.Notes != "" {
			updates["reason"] = itReq.Notes
		}
		if len(updates) > 0 {
			tx.Model(&models.PurchaseReturnItem{}).Where("id = ? AND purchase_return_id = ?", itReq.ID, ret.ID).Updates(updates)
		}
	}

	now := time.Now()
	ret.Status = "VERIFIKASI_GUDANG"
	ret.WarehouseVerifiedAt = &now
	ret.WarehouseVerifiedBy = &userID
	ret.WarehouseNotes = req.Notes
	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan verifikasi gudang", err.Error())
		return
	}

	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "VERIFIKASI_GUDANG",
		Action:           "VERIFIKASI_GUDANG",
		Notes:            "Pemeriksaan fisik barang oleh tim gudang selesai. " + req.Notes,
		UserID:           userID,
		CreatedAt:        now,
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("User").Preload("WarehouseVerifier").Preload("Items.Product").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Verifikasi fisik gudang berhasil disimpan", ret)
}

// 3. Persetujuan Admin (Sekaligus input dokumen pengiriman jika DIKIRIM, dan langsung SELESAI)
func (h *PurchaseHandler) AdminApprovePurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		Notes              string `json:"notes"`
		ShippingCourier    string `json:"shipping_courier"`
		ShippingTrackingNo string `json:"shipping_tracking_no"`
		ShippingNotes      string `json:"shipping_notes"`
	}
	_ = c.ShouldBindJSON(&req)

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status != "VERIFIKASI_GUDANG" && ret.Status != "DRAFT" {
		utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Status retur (%s) tidak dapat disetujui admin.", ret.Status), nil)
		return
	}

	if ret.DeliveryMethod == "DIKIRIM" && strings.TrimSpace(req.ShippingTrackingNo) == "" {
		utils.SendError(c, http.StatusBadRequest, "Untuk retur yang dikirim ke supplier, No. Resi / Surat Jalan Pengiriman wajib diisi.", nil)
		return
	}

	tx := database.DB.Begin()

	// Potong stok fisik keluar dari gudang saat Admin menyetujui retur
	if !ret.IsStockDeducted {
		for _, it := range ret.Items {
			_, err := services.MutateStock(tx, services.StockMutationParams{
				CompanyID:    companyID,
				BranchID:     branchID,
				WarehouseID:  ret.WarehouseID,
				ProductID:    it.ProductID,
				DocType:      "PURCHASE_RETURN",
				DocNo:        ret.ReturnNo,
				MovementType: "OUT",
				Qty:          it.Qty,
				UnitCost:     it.UnitPrice,
				BatchNumber:  it.BatchNumber,
				ExpiredDate:  it.ExpiredDate,
				Notes:        fmt.Sprintf("Retur Pembelian (%s): %s", ret.DeliveryMethod, ret.ReturnNo),
				CreatedBy:    userID,
			})
			if err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Gagal memotong stok retur: %s", err.Error()), nil)
				return
			}
		}
		ret.IsStockDeducted = true
	}

	now := time.Now()
	ret.Status = "SELESAI"
	if ret.SettlementStatus == "" {
		ret.SettlementStatus = "PENDING"
	}
	ret.AdminApprovedAt = &now
	ret.AdminApprovedBy = &userID
	ret.AdminNotes = req.Notes

	// Buat jurnal awal retur: Debit Piutang/Klaim Retur Supplier (1-1210), Kredit Persediaan (1-1300) & PPN Masukan (1-1410)
	if ret.TotalAmount > 0 && !ret.IsJournalCreated {
		creditSupplierAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_supplier", "1-1210", "Piutang / Kredit Retur Supplier", "ASSET", "RECEIVABLE", "DEBIT")
		inventoryAcc := services.ResolveSettingAccountCode(tx, companyID, "item_inventory", "1-1300", "Persediaan Obat & Barang Dagang", "ASSET", "INVENTORY", "DEBIT")

		var netInventory float64
		var taxCredit float64
		if ret.TaxPercent > 0 {
			taxCredit = (ret.TotalAmount / (100 + ret.TaxPercent)) * ret.TaxPercent
			if ret.TaxType == "EXCLUDE" {
				taxCredit = (ret.TotalAmount - ret.OtherCost) * (ret.TaxPercent / (100 + ret.TaxPercent))
			}
			taxCredit = math.Round(taxCredit*100) / 100
			netInventory = math.Round((ret.TotalAmount-taxCredit)*100) / 100
		} else {
			netInventory = math.Round(ret.TotalAmount*100) / 100
		}

		journalEntries := []services.JournalEntryParam{
			{
				AccountCode: creditSupplierAcc,
				Debit:       ret.TotalAmount,
				Credit:      0,
				Description: fmt.Sprintf("Klaim / Piutang Retur Supplier %s", ret.ReturnNo),
			},
			{
				AccountCode: inventoryAcc,
				Debit:       0,
				Credit:      netInventory,
				Description: fmt.Sprintf("Pengurangan Persediaan Barang Retur %s", ret.ReturnNo),
			},
		}
		if taxCredit > 0 {
			taxAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_tax", "1-1410", "PPN MASUKAN", "ASSET", "TAX", "DEBIT")
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: taxAcc,
				Debit:       0,
				Credit:      taxCredit,
				Description: fmt.Sprintf("Koreksi PPN Masukan Retur %s", ret.ReturnNo),
			})
		}

		if _, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        now,
			RefType:     "PURCHASE_RETURN",
			RefNo:       ret.ReturnNo,
			Description: fmt.Sprintf("Jurnal Persetujuan Retur Pembelian %s", ret.ReturnNo),
			CreatedBy:   userID,
			Entries:     journalEntries,
		}); err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal retur: "+err.Error(), nil)
			return
		}
		ret.IsJournalCreated = true
	}

	logNotes := "Retur pembelian disetujui oleh Admin (Diambil oleh Supplier) dan status langsung SELESAI."
	if ret.DeliveryMethod == "DIKIRIM" {
		ret.ShippedAt = &now
		ret.ShippedBy = &userID
		ret.ShippingCourier = req.ShippingCourier
		ret.ShippingTrackingNo = req.ShippingTrackingNo
		ret.ShippingNotes = req.ShippingNotes
		logNotes = fmt.Sprintf("Retur pembelian disetujui Admin & dokumen pengiriman dicatat (Kurir: %s, No. Resi/SJ: %s). Status SELESAI.", req.ShippingCourier, req.ShippingTrackingNo)
	}

	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyetujui retur", err.Error())
		return
	}

	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "SELESAI",
		Action:           "PERSETUJUAN_ADMIN",
		Notes:            logNotes + " " + req.Notes,
		UserID:           userID,
		CreatedAt:        now,
	})

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Warehouse").Preload("AdminApprover").Preload("Shipper").Preload("Items.Product").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Retur pembelian berhasil disetujui Admin dan selesai", ret)
}

// Tolak Retur (Admin / Gudang)
func (h *PurchaseHandler) RejectPurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Alasan penolakan wajib diisi", nil)
		return
	}

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status == "DALAM_PENGIRIMAN" || ret.Status == "SELESAI" {
		utils.SendError(c, http.StatusBadRequest, "Retur yang sudah dikirim atau selesai tidak dapat ditolak", nil)
		return
	}

	tx := database.DB.Begin()
	now := time.Now()
	ret.Status = "DITOLAK"
	ret.RejectReason = req.Reason
	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menolak retur", err.Error())
		return
	}

	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "DITOLAK",
		Action:           "PENOLAKAN_RETUR",
		Notes:            "Pengajuan retur ditolak: " + req.Reason,
		UserID:           userID,
		CreatedAt:        now,
	})

	tx.Commit()
	utils.SendSuccess(c, "Retur pembelian berhasil ditolak", ret)
}

// 4. Dalam Pengiriman (Stok dipotong saat barang dikirim ke PBF)
func (h *PurchaseHandler) ShipPurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		ShippingCourier    string `json:"shipping_courier"`
		ShippingTrackingNo string `json:"shipping_tracking_no"`
		ShippingNotes      string `json:"shipping_notes"`
	}
	_ = c.ShouldBindJSON(&req)

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status != "DISETUJUI_ADMIN" {
		utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Barang hanya dapat dikirim jika status sudah DISETUJUI_ADMIN (Status saat ini: %s)", ret.Status), nil)
		return
	}

	if ret.IsStockDeducted {
		utils.SendError(c, http.StatusBadRequest, "Stok retur ini sudah pernah dipotong sebelumnya", nil)
		return
	}

	tx := database.DB.Begin()

	// INTEGRASI STOK: Keluarkan barang dari stok fisik & catat mutasi keluar
	for _, it := range ret.Items {
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  ret.WarehouseID,
			ProductID:    it.ProductID,
			DocType:      "PURCHASE_RETURN",
			DocNo:        ret.ReturnNo,
			MovementType: "OUT",
			Qty:          it.Qty,
			UnitCost:     it.UnitPrice,
			BatchNumber:  it.BatchNumber,
			ExpiredDate:  it.ExpiredDate,
			Notes:        fmt.Sprintf("Pengiriman Retur Pembelian: %s ke PBF", ret.ReturnNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Gagal memotong stok retur: %s", err.Error()), nil)
			return
		}
	}

	now := time.Now()
	ret.Status = "DALAM_PENGIRIMAN"
	ret.IsStockDeducted = true
	ret.ShippedAt = &now
	ret.ShippedBy = &userID
	ret.ShippingCourier = req.ShippingCourier
	ret.ShippingTrackingNo = req.ShippingTrackingNo
	ret.ShippingNotes = req.ShippingNotes
	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan status pengiriman", err.Error())
		return
	}

	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "DALAM_PENGIRIMAN",
		Action:           "PENGIRIMAN_PBF",
		Notes:            fmt.Sprintf("Barang dikeluarkan dari stok gudang dan dikirim ke PBF. Kurir: %s, Resi/DO: %s", req.ShippingCourier, req.ShippingTrackingNo),
		UserID:           userID,
		CreatedAt:        now,
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("Shipper").Preload("Items.Product").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Barang retur berhasil dikirim dan stok fisik telah dikeluarkan", ret)
}

// 5. Konfirmasi Penerimaan PBF
func (h *PurchaseHandler) PbfConfirmPurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	type ItemConfirmReq struct {
		ID          uuid.UUID `json:"id"`
		AcceptedQty float64   `json:"accepted_qty"`
		RejectedQty float64   `json:"rejected_qty"`
		Notes       string    `json:"notes"`
	}

	var req struct {
		PbfReturnDocNo string           `json:"pbf_return_doc_no"`
		PbfNotes       string           `json:"pbf_notes"`
		Items          []ItemConfirmReq `json:"items" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data konfirmasi PBF tidak lengkap", err.Error())
		return
	}

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status != "DALAM_PENGIRIMAN" && ret.Status != "MENUNGGU_KONFIRMASI_PBF" {
		utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Status retur (%s) belum dalam tahap konfirmasi PBF", ret.Status), nil)
		return
	}

	tx := database.DB.Begin()

	var acceptedSubtotal float64
	var rejectedSubtotal float64

	for _, itReq := range req.Items {
		var item models.PurchaseReturnItem
		if err := tx.Where("id = ? AND purchase_return_id = ?", itReq.ID, ret.ID).First(&item).Error; err != nil {
			continue
		}

		if itReq.AcceptedQty+itReq.RejectedQty != item.Qty {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Total diterima (%.2f) dan ditolak (%.2f) harus sama dengan qty yang dikirim (%.2f)", itReq.AcceptedQty, itReq.RejectedQty, item.Qty), nil)
			return
		}

		item.AcceptedQty = itReq.AcceptedQty
		item.RejectedQty = itReq.RejectedQty
		if itReq.Notes != "" {
			item.Reason = itReq.Notes
		}
		tx.Save(&item)

		lineDisc := (item.AcceptedQty * item.UnitPrice) * (item.DiscountPercent / 100)
		acceptedSubtotal += (item.AcceptedQty * item.UnitPrice) - lineDisc

		lineDiscRej := (item.RejectedQty * item.UnitPrice) * (item.DiscountPercent / 100)
		rejectedSubtotal += (item.RejectedQty * item.UnitPrice) - lineDiscRej
	}

	acceptedTax := acceptedSubtotal * (ret.TaxPercent / 100)
	acceptedTotal := acceptedSubtotal + acceptedTax + ret.OtherCost

	rejectedTax := rejectedSubtotal * (ret.TaxPercent / 100)
	rejectedTotal := rejectedSubtotal + rejectedTax

	now := time.Now()
	ret.Status = "MENUNGGU_KONFIRMASI_PBF"
	ret.PbfConfirmedAt = &now
	ret.PbfConfirmedBy = &userID
	ret.PbfReturnDocNo = req.PbfReturnDocNo
	ret.PbfNotes = req.PbfNotes
	ret.AcceptedTotalAmount = acceptedTotal
	ret.RejectedTotalAmount = rejectedTotal
	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan konfirmasi PBF", err.Error())
		return
	}

	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "MENUNGGU_KONFIRMASI_PBF",
		Action:           "KONFIRMASI_PBF",
		Notes:            fmt.Sprintf("Konfirmasi PBF dicatat. No Dokumen PBF: %s. Nilai Diterima: Rp %.2f, Ditolak: Rp %.2f", req.PbfReturnDocNo, acceptedTotal, rejectedTotal),
		UserID:           userID,
		CreatedAt:        now,
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("Items.Product").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Konfirmasi PBF berhasil dicatat", ret)
}

// 6. Finalisasi Retur (Kembalikan stok ditolak jika ada, sesuaikan hutang/kas/kredit supplier, dan bentuk jurnal)
func (h *PurchaseHandler) FinalizePurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		SettlementType string     `json:"settlement_type" binding:"required"` // POTONG_HUTANG, KREDIT_SUPPLIER, KEMBALI_DANA_KAS
		CashAccountID  *uuid.UUID `json:"cash_account_id"`
		Notes          string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Pilih metode penyelesaian retur (Potong Hutang, Kredit Supplier, atau Kas/Bank)", err.Error())
		return
	}

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Items").Preload("Supplier").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status == "SELESAI" {
		utils.SendError(c, http.StatusBadRequest, "Retur pembelian ini sudah difinalisasi sebelumnya", nil)
		return
	}

	if ret.Status != "MENUNGGU_KONFIRMASI_PBF" && ret.Status != "DALAM_PENGIRIMAN" {
		utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Retur hanya dapat difinalisasi setelah konfirmasi PBF (Status saat ini: %s)", ret.Status), nil)
		return
	}

	tx := database.DB.Begin()

	// A. MEKANISME PENGEMBALIAN BARANG YANG DITOLAK PBF KE STOK GUDANG
	if !ret.IsStockRestored {
		for _, it := range ret.Items {
			if it.RejectedQty > 0 {
				_, err := services.MutateStock(tx, services.StockMutationParams{
					CompanyID:    companyID,
					BranchID:     branchID,
					WarehouseID:  ret.WarehouseID,
					ProductID:    it.ProductID,
					DocType:      "PURCHASE_RETURN_REJECT",
					DocNo:        ret.ReturnNo,
					MovementType: "IN",
					Qty:          it.RejectedQty,
					UnitCost:     it.UnitPrice,
					BatchNumber:  it.BatchNumber,
					ExpiredDate:  it.ExpiredDate,
					Notes:        fmt.Sprintf("Barang retur ditolak PBF dikembalikan ke gudang (%s)", ret.ReturnNo),
					CreatedBy:    userID,
				})
				if err != nil {
					tx.Rollback()
					utils.SendError(c, http.StatusInternalServerError, "Gagal mengembalikan stok barang yang ditolak PBF: "+err.Error(), nil)
					return
				}
			}
		}
		ret.IsStockRestored = true
	}

	acceptedTotal := ret.AcceptedTotalAmount
	if acceptedTotal <= 0 && ret.TotalAmount > 0 && ret.AcceptedTotalAmount == 0 && ret.RejectedTotalAmount == 0 {
		// Fallback jika konfirmasi PBF menerima 100%
		acceptedTotal = ret.TotalAmount
		ret.AcceptedTotalAmount = acceptedTotal
	}

	var debtDeduction float64
	var creditSupplier float64
	var cashRefund float64

	// B. INTEGRASI HUTANG & PEMBAYARAN SUPPLIER
	isCashRefund := req.SettlementType == "KAS_PENGEMBALIAN" || req.SettlementType == "KEMBALI_DANA_KAS" || req.SettlementType == "KAS" || req.SettlementType == "CASH"
	isCreditSupplier := req.SettlementType == "KREDIT_SUPPLIER"

	if acceptedTotal > 0 {
		if isCashRefund {
			// Pengguna secara eksplisit memilih Pengembalian Kas / Bank
			cashRefund = acceptedTotal
		} else if isCreditSupplier {
			// Pengguna secara eksplisit memilih Kredit Supplier / Saldo Deposit
			creditSupplier = acceptedTotal
			var sup models.Supplier
			if err := tx.Where("id = ?", ret.SupplierID).First(&sup).Error; err == nil {
				sup.CreditBalance += acceptedTotal
				tx.Save(&sup)
			}
		} else {
			// Default / POTONG_HUTANG
			if ret.PurchaseID != nil && *ret.PurchaseID != uuid.Nil {
				var purchase models.Purchase
				if err := tx.Where("id = ? AND company_id = ?", ret.PurchaseID, companyID).First(&purchase).Error; err == nil {
					// Cek status pembayaran faktur
					if purchase.RemainingAmount > 0 {
						// 1. Pembelian belum dibayar atau dibayar sebagian: Kurangi sisa hutang
						if acceptedTotal <= purchase.RemainingAmount {
							debtDeduction = acceptedTotal
							purchase.RemainingAmount = math.Round((purchase.RemainingAmount-acceptedTotal)*100) / 100
							if purchase.RemainingAmount == 0 {
								purchase.PaymentStatus = "PAID"
							} else {
								purchase.PaymentStatus = "PARTIAL"
							}
						} else {
							// Nilai retur melebihi sisa hutang: Sisa hutang lunas, kelebihannya menjadi kredit supplier
							debtDeduction = purchase.RemainingAmount
							excess := math.Round((acceptedTotal-purchase.RemainingAmount)*100) / 100
							purchase.RemainingAmount = 0
							purchase.PaymentStatus = "PAID"
							creditSupplier = excess

							var sup models.Supplier
							if err := tx.Where("id = ?", ret.SupplierID).First(&sup).Error; err == nil {
								sup.CreditBalance = math.Round((sup.CreditBalance+excess)*100) / 100
								tx.Save(&sup)
							}
						}
						tx.Save(&purchase)
					} else {
						// 2. Pembelian sudah lunas: Catat kredit supplier
						creditSupplier = acceptedTotal
						var sup models.Supplier
						if err := tx.Where("id = ?", ret.SupplierID).First(&sup).Error; err == nil {
							sup.CreditBalance = math.Round((sup.CreditBalance+acceptedTotal)*100) / 100
							tx.Save(&sup)
						}
					}
				}
			} else {
				// Mode 2 (Item Langsung tanpa no faktur asal):
				creditSupplier = acceptedTotal
				var sup models.Supplier
				if err := tx.Where("id = ?", ret.SupplierID).First(&sup).Error; err == nil {
					sup.CreditBalance = math.Round((sup.CreditBalance+acceptedTotal)*100) / 100
					tx.Save(&sup)
				}
			}
		}
	}

	ret.DebtDeductionAmount = debtDeduction
	ret.CreditBalanceAmount = creditSupplier
	ret.RefundAmount = cashRefund
	ret.SettlementType = req.SettlementType
	ret.CashAccountID = req.CashAccountID

	// C. INTEGRASI AKUNTANSI: JURNAL OTOMATIS SEIMBANG
	if acceptedTotal > 0 && !ret.IsJournalCreated {
		payableAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_payable", "2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT")
		inventoryAcc := services.ResolveSettingAccountCode(tx, companyID, "item_inventory", "1-1300", "Persediaan Obat & Barang Dagang", "ASSET", "INVENTORY", "DEBIT")
		var journalEntries []services.JournalEntryParam

		// 1. Baris Debit:
		if debtDeduction > 0 {
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: payableAcc, // Hutang Usaha
				Debit:       debtDeduction,
				Credit:      0,
				Description: fmt.Sprintf("Pengurangan Hutang Usaha Retur %s", ret.ReturnNo),
			})
		}
		if creditSupplier > 0 {
			creditSupplierAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_supplier", "1-1210", "Piutang / Kredit Retur Supplier", "ASSET", "RECEIVABLE", "DEBIT")
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: creditSupplierAcc, // Piutang / Kredit Supplier (Non-Header 1-1210)
				Debit:       creditSupplier,
				Credit:      0,
				Description: fmt.Sprintf("Kredit/Klaim Retur Supplier %s", ret.ReturnNo),
			})
		}
		if cashRefund > 0 {
			cashAccountCode := "1-1110" // Default non-header Kas Kecil
			var cashAcc models.Account
			if req.CashAccountID != nil && *req.CashAccountID != uuid.Nil {
				if err := tx.Where("id = ?", req.CashAccountID).First(&cashAcc).Error; err == nil && cashAcc.Code != "" {
					cashAccountCode = cashAcc.Code
				}
			} else {
				_ = tx.Where("company_id = ? AND is_header = false AND code LIKE '1-11%'", companyID).Order("code ASC").First(&cashAcc).Error
				if cashAcc.Code != "" {
					cashAccountCode = cashAcc.Code
				}
			}
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: cashAccountCode,
				Debit:       cashRefund,
				Credit:      0,
				Description: fmt.Sprintf("Penerimaan Pengembalian Dana Kas/Bank Retur %s", ret.ReturnNo),
			})

			// Catat transaksi kas masuk (CashTransaction)
			if cashAcc.ID != uuid.Nil {
				supplierName := "Supplier PBF"
				if ret.Supplier != nil && ret.Supplier.Name != "" {
					supplierName = ret.Supplier.Name
				}
				docNo := services.GenerateCashTransactionNumber(tx, companyID, "KASI", time.Now())
				var persediaanAcc models.Account
				_ = tx.Where("company_id = ? AND code = '1-1300'", companyID).First(&persediaanAcc).Error

				cashTrx := models.CashTransaction{
					CompanyID:      companyID,
					BranchID:       branchID,
					TrxNo:          docNo,
					Date:           time.Now(),
					Type:           "IN",
					AccountID:      cashAcc.ID,
					Amount:         cashRefund,
					PayeeRecipient: supplierName,
					Description:    fmt.Sprintf("Penerimaan Pengembalian Dana Kas/Bank Retur Pembelian %s (%s)", ret.ReturnNo, supplierName),
					CreatedBy:      userID,
				}
				if persediaanAcc.ID != uuid.Nil {
					cashTrx.OppositeAccID = &persediaanAcc.ID
				}
				_ = tx.Create(&cashTrx).Error
			}
		}

		// 2. Baris Kredit:
		// Hitung proporsi PPN vs Net Inventory
		var netInventory float64
		var taxCredit float64

		if ret.TaxPercent > 0 {
			taxCredit = (acceptedTotal / (100 + ret.TaxPercent)) * ret.TaxPercent
			if ret.TaxType == "EXCLUDE" {
				taxCredit = (acceptedTotal - ret.OtherCost) * (ret.TaxPercent / (100 + ret.TaxPercent))
			}
			taxCredit = math.Round(taxCredit*100) / 100
			netInventory = math.Round((acceptedTotal-taxCredit)*100) / 100
		} else {
			netInventory = math.Round(acceptedTotal*100) / 100
		}

		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: inventoryAcc, // Persediaan Obat & Barang Dagang
			Debit:       0,
			Credit:      netInventory,
			Description: fmt.Sprintf("Pengurangan Persediaan Barang Retur %s", ret.ReturnNo),
		})

		if taxCredit > 0 {
			taxAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_tax", "1-1410", "PPN MASUKAN", "ASSET", "TAX", "DEBIT")
			journalEntries = append(journalEntries, services.JournalEntryParam{
				AccountCode: taxAcc, // PPN Masukan (Koreksi Faktur Pajak Masukan)
				Debit:       0,
				Credit:      taxCredit,
				Description: fmt.Sprintf("Koreksi PPN Masukan Retur %s", ret.ReturnNo),
			})
		}

		// Validasi dan post jurnal jika memenuhi syarat
		if len(journalEntries) >= 2 {
			_, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
				CompanyID:   companyID,
				BranchID:    branchID,
				Date:        time.Now(),
				RefType:     "PURCHASE_RETURN",
				RefNo:       ret.ReturnNo,
				Description: fmt.Sprintf("Jurnal Finalisasi Retur Pembelian %s (%s)", ret.ReturnNo, req.SettlementType),
				CreatedBy:   userID,
				Entries:     journalEntries,
			})
			if err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal finalisasi retur: "+err.Error(), nil)
				return
			}
			ret.IsJournalCreated = true
		}
	}

	ret.Status = "SELESAI"
	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal memfinalisasi retur pembelian", err.Error())
		return
	}

	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "SELESAI",
		Action:           "FINALISASI_SELESAI",
		Notes:            fmt.Sprintf("Retur difinalisasi. Metode: %s. Nilai disetujui: Rp %.2f. Hutang & Akuntansi tersinkronisasi.", req.SettlementType, acceptedTotal),
		UserID:           userID,
		CreatedAt:        time.Now(),
	})

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Warehouse").Preload("CashAccount").Preload("Items.Product").Preload("StatusLogs.User").First(&ret, ret.ID)
	utils.SendSuccess(c, "Retur pembelian berhasil difinalisasi", ret)
}

// SettlePurchaseReturn menyelesaikan keuangan retur pembelian dari menu Bayar Hutang (Potong Hutang Usaha atau Pengembalian Dana Kas/Bank)
func (h *PurchaseHandler) SettlePurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		SettlementType string     `json:"settlement_type" binding:"required"` // POTONG_HUTANG | KEMBALI_DANA_KAS
		PurchaseID     *uuid.UUID `json:"purchase_id"`
		CashAccountID  *uuid.UUID `json:"cash_account_id"`
		Notes          string     `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data penyelesaian retur tidak lengkap", err.Error())
		return
	}

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Supplier").First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", nil)
		return
	}

	if ret.Status != "SELESAI" {
		utils.SendError(c, http.StatusBadRequest, "Hanya retur dengan status SELESAI yang dapat diselesaikan keuangannya.", nil)
		return
	}
	if ret.SettlementStatus == "SETTLED" {
		utils.SendError(c, http.StatusBadRequest, "Keuangan retur ini sudah diselesaikan sebelumnya.", nil)
		return
	}

	tx := database.DB.Begin()
	now := time.Now()
	amount := math.Round(ret.TotalAmount*100) / 100
	creditSupplierAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_supplier", "1-1210", "Piutang / Kredit Retur Supplier", "ASSET", "RECEIVABLE", "DEBIT")

	var journalEntries []services.JournalEntryParam
	var logNote string

	switch req.SettlementType {
	case "POTONG_HUTANG":
		if req.PurchaseID == nil || *req.PurchaseID == uuid.Nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Pilih faktur hutang yang akan dipotong.", nil)
			return
		}
		var purchase models.Purchase
		if err := tx.Where("id = ? AND company_id = ? AND supplier_id = ?", req.PurchaseID, companyID, ret.SupplierID).First(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusNotFound, "Faktur hutang tidak ditemukan untuk supplier ini.", nil)
			return
		}
		if purchase.RemainingAmount+0.001 < amount {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Sisa hutang faktur %s (Rp %.0f) lebih kecil dari nilai retur (Rp %.0f). Pilih hutang yang lebih besar atau sama dengan nilai retur.", purchase.InvoiceNo, purchase.RemainingAmount, amount), nil)
			return
		}

		purchase.RemainingAmount = math.Round((purchase.RemainingAmount-amount)*100) / 100
		if purchase.RemainingAmount <= 0.01 {
			purchase.RemainingAmount = 0
			purchase.PaymentStatus = "PAID"
		} else {
			purchase.PaymentStatus = "PARTIAL"
		}
		if err := tx.Save(&purchase).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui sisa hutang faktur", err.Error())
			return
		}

		payableAcc := services.ResolveSettingAccountCode(tx, companyID, "purch_credit_payable", "2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT")
		journalEntries = []services.JournalEntryParam{
			{
				AccountCode: payableAcc,
				Debit:       amount,
				Credit:      0,
				Description: fmt.Sprintf("Potong Hutang %s dari Retur %s", purchase.InvoiceNo, ret.ReturnNo),
			},
			{
				AccountCode: creditSupplierAcc,
				Debit:       0,
				Credit:      amount,
				Description: fmt.Sprintf("Penyelesaian Klaim Retur %s ke Hutang %s", ret.ReturnNo, purchase.InvoiceNo),
			},
		}

		ret.SettlementType = "POTONG_HUTANG"
		ret.SettledPurchaseID = &purchase.ID
		ret.DebtDeductionAmount = amount
		logNote = fmt.Sprintf("Retur %s memotong hutang faktur %s sebesar Rp %.0f. Sisa hutang faktur: Rp %.0f (%s).", ret.ReturnNo, purchase.InvoiceNo, amount, purchase.RemainingAmount, purchase.PaymentStatus)

	case "KEMBALI_DANA_KAS":
		if req.CashAccountID == nil || *req.CashAccountID == uuid.Nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Pilih akun Kas/Bank penerima pengembalian dana.", nil)
			return
		}
		var cashAcc models.Account
		if err := tx.Where("id = ? AND company_id = ?", req.CashAccountID, companyID).First(&cashAcc).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusNotFound, "Akun Kas/Bank tidak ditemukan.", nil)
			return
		}

		journalEntries = []services.JournalEntryParam{
			{
				AccountCode: cashAcc.Code,
				Debit:       amount,
				Credit:      0,
				Description: fmt.Sprintf("Pengembalian Dana Kas/Bank Retur %s", ret.ReturnNo),
			},
			{
				AccountCode: creditSupplierAcc,
				Debit:       0,
				Credit:      amount,
				Description: fmt.Sprintf("Penyelesaian Klaim Retur %s via Pengembalian Dana", ret.ReturnNo),
			},
		}

		supplierName := "Supplier PBF"
		if ret.Supplier != nil && ret.Supplier.Name != "" {
			supplierName = ret.Supplier.Name
		}
		var oppositeAcc models.Account
		_ = tx.Where("company_id = ? AND code = ?", companyID, creditSupplierAcc).First(&oppositeAcc).Error
		docNo := services.GenerateCashTransactionNumber(tx, companyID, "KASI", now)
		cashTrx := models.CashTransaction{
			CompanyID:      companyID,
			BranchID:       branchID,
			TrxNo:          docNo,
			Date:           now,
			Type:           "IN",
			AccountID:      cashAcc.ID,
			Amount:         amount,
			PayeeRecipient: supplierName,
			Description:    fmt.Sprintf("Pengembalian Dana Retur Pembelian %s (%s)", ret.ReturnNo, supplierName),
			CreatedBy:      userID,
		}
		if oppositeAcc.ID != uuid.Nil {
			cashTrx.OppositeAccID = &oppositeAcc.ID
		}
		if err := tx.Create(&cashTrx).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal mencatat kas masuk pengembalian retur", err.Error())
			return
		}

		ret.SettlementType = "KEMBALI_DANA_KAS"
		ret.CashAccountID = &cashAcc.ID
		ret.RefundAmount = amount
		logNote = fmt.Sprintf("Pengembalian dana retur %s sebesar Rp %.0f masuk ke akun %s (%s).", ret.ReturnNo, amount, cashAcc.Code, cashAcc.Name)

	default:
		tx.Rollback()
		utils.SendError(c, http.StatusBadRequest, "Metode penyelesaian tidak valid (gunakan POTONG_HUTANG atau KEMBALI_DANA_KAS).", nil)
		return
	}

	if amount > 0 {
		if _, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        now,
			RefType:     "PURCHASE_RETURN_SETTLEMENT",
			RefNo:       ret.ReturnNo,
			Description: fmt.Sprintf("Penyelesaian Keuangan Retur %s (%s)", ret.ReturnNo, req.SettlementType),
			CreatedBy:   userID,
			Entries:     journalEntries,
		}); err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal penyelesaian retur: "+err.Error(), nil)
			return
		}
	}

	ret.SettlementStatus = "SETTLED"
	ret.SettledAt = &now
	ret.SettledBy = &userID
	if err := tx.Save(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan status penyelesaian retur", err.Error())
		return
	}

	if strings.TrimSpace(req.Notes) != "" {
		logNote += " Catatan: " + strings.TrimSpace(req.Notes)
	}
	tx.Create(&models.PurchaseReturnStatusLog{
		PurchaseReturnID: ret.ID,
		Status:           "SELESAI",
		Action:           "PENYELESAIAN_KEUANGAN",
		Notes:            logNote,
		UserID:           userID,
		CreatedAt:        now,
	})

	tx.Commit()
	database.DB.Preload("Supplier").Preload("Warehouse").Preload("CashAccount").Preload("Purchase").First(&ret, ret.ID)
	utils.SendSuccess(c, "Penyelesaian keuangan retur pembelian berhasil diproses", ret)
}

func (h *PurchaseHandler) DeletePurchaseReturn(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var ret models.PurchaseReturn
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&ret).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Retur pembelian tidak ditemukan", err.Error())
		return
	}

	// Cegah hapus jika barang sudah dikirim atau retur sudah selesai
	if ret.Status == "DALAM_PENGIRIMAN" || ret.Status == "SELESAI" || ret.IsStockDeducted || ret.IsJournalCreated {
		utils.SendError(c, http.StatusBadRequest, "Retur yang sudah dikirim ke PBF atau sudah selesai tidak dapat dihapus demi integritas stok dan akuntansi", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("purchase_return_id = ?", ret.ID).Delete(&models.PurchaseReturnStatusLog{})
	tx.Where("purchase_return_id = ?", ret.ID).Delete(&models.PurchaseReturnItem{})
	if err := tx.Delete(&ret).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus retur pembelian", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Retur pembelian berhasil dihapus", nil)
}

// Helper Endpoint: Ambil item faktur pembelian yang dapat diretur (Mode 1)
func (h *PurchaseHandler) GetReturnablePurchaseItems(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	purchaseID := c.Query("purchase_id")
	invoiceNo := c.Query("invoice_no")
	supplierID := c.Query("supplier_id")
	warehouseID := c.Query("warehouse_id")
	search := strings.TrimSpace(c.Query("search"))

	query := database.DB.Where("purchases.company_id = ? AND purchases.status != 'CANCELLED'", companyID)
	if purchaseID != "" {
		query = query.Where("purchases.id = ?", purchaseID)
	}
	if invoiceNo != "" {
		query = query.Where("purchases.invoice_no ILIKE ?", "%"+invoiceNo+"%")
	}
	if supplierID != "" && supplierID != "all" {
		query = query.Where("purchases.supplier_id = ?", supplierID)
	}
	if warehouseID != "" && warehouseID != "all" {
		query = query.Where("purchases.warehouse_id = ?", warehouseID)
	}

	var purchases []models.Purchase
	if err := query.Order("purchases.date DESC").
		Preload("Items.Product.Brand").
		Preload("Items.Unit").
		Preload("Supplier").
		Preload("Warehouse").
		Find(&purchases).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengambil data faktur pembelian", err.Error())
		return
	}

	type ReturnableItemDTO struct {
		PurchaseID        uuid.UUID  `json:"purchase_id"`
		InvoiceNo         string     `json:"invoice_no"`
		SupplierID        uuid.UUID  `json:"supplier_id"`
		SupplierName      string     `json:"supplier_name"`
		WarehouseID       uuid.UUID  `json:"warehouse_id"`
		PurchaseItemID    uuid.UUID  `json:"purchase_item_id"`
		ProductID         uuid.UUID  `json:"product_id"`
		ProductCode       string     `json:"product_code"`
		ProductName       string     `json:"product_name"`
		Brand             string     `json:"brand"`
		UnitID            uuid.UUID  `json:"unit_id"`
		UnitName          string     `json:"unit_name"`
		PurchasedQty      float64    `json:"purchased_qty"`
		AlreadyReturnQty  float64    `json:"already_returned_qty"`
		RemainingQty      float64    `json:"remaining_qty"`
		CurrentStock      float64    `json:"current_stock"`
		UnitPrice         float64    `json:"unit_price"`
		Discount          float64    `json:"discount"`
		DiscountPercent   float64    `json:"discount_percent"`
		BatchNumber       string     `json:"batch_number"`
		ExpiredDate       *time.Time `json:"expired_date"`
	}

	results := make([]ReturnableItemDTO, 0)
	searchLower := strings.ToLower(search)

	for _, p := range purchases {
		suppName := "-"
		if p.Supplier != nil && p.Supplier.Name != "" {
			suppName = p.Supplier.Name
		}

		for _, it := range p.Items {
			prodCode := "-"
			prodName := "-"
			brandName := "-"
			if it.Product != nil {
				prodCode = it.Product.Code
				prodName = it.Product.Name
				if it.Product.Brand != nil && it.Product.Brand.Name != "" {
					brandName = it.Product.Brand.Name
				} else if it.Product.Rack != "" {
					brandName = it.Product.Rack
				}
			}

			if searchLower != "" {
				matched := strings.Contains(strings.ToLower(p.InvoiceNo), searchLower) ||
					strings.Contains(strings.ToLower(prodCode), searchLower) ||
					strings.Contains(strings.ToLower(prodName), searchLower) ||
					strings.Contains(strings.ToLower(it.BatchNumber), searchLower) ||
					strings.Contains(strings.ToLower(suppName), searchLower)
				if !matched {
					continue
				}
			}

			// Cek retur sebelumnya
			var priorRet float64
			database.DB.Model(&models.PurchaseReturnItem{}).
				Joins("JOIN purchase_returns ON purchase_returns.id = purchase_return_items.purchase_return_id").
				Where("purchase_returns.company_id = ? AND purchase_returns.purchase_id = ? AND purchase_return_items.product_id = ? AND purchase_returns.status NOT IN ('CANCELLED', 'DITOLAK')",
					companyID, p.ID, it.ProductID).
				Select("COALESCE(SUM(purchase_return_items.qty), 0)").
				Scan(&priorRet)

			remaining := it.Qty - priorRet
			if remaining <= 0 {
				continue // Semua barang dari item ini sudah pernah diretur
			}

			// Cek stok tersedia di gudang
			var stockBal models.StockBalance
			database.DB.Where("warehouse_id = ? AND product_id = ?", p.WarehouseID, it.ProductID).First(&stockBal)

			discPct := 0.0
			if it.Qty*it.UnitPrice > 0 {
				discPct = (it.Discount / (it.Qty * it.UnitPrice)) * 100
			}

			unitName := "PCS"
			if it.Unit != nil && it.Unit.Name != "" {
				unitName = it.Unit.Name
			}

			results = append(results, ReturnableItemDTO{
				PurchaseID:       p.ID,
				InvoiceNo:        p.InvoiceNo,
				SupplierID:       p.SupplierID,
				SupplierName:     suppName,
				WarehouseID:      p.WarehouseID,
				PurchaseItemID:   it.ID,
				ProductID:        it.ProductID,
				ProductCode:      prodCode,
				ProductName:      prodName,
				Brand:            brandName,
				UnitID:           it.UnitID,
				UnitName:         unitName,
				PurchasedQty:     it.Qty,
				AlreadyReturnQty: priorRet,
				RemainingQty:     remaining,
				CurrentStock:     stockBal.Qty,
				UnitPrice:        it.UnitPrice,
				Discount:         it.Discount,
				DiscountPercent:  discPct,
				BatchNumber:      it.BatchNumber,
				ExpiredDate:      it.ExpiredDate,
			})
		}
	}

	utils.SendSuccess(c, "Daftar item faktur pembelian yang dapat diretur", results)
}

// Helper Endpoint: Ambil bets produk yang tersedia di gudang (Mode 2)
func (h *PurchaseHandler) GetProductBatchesForReturn(c *gin.Context) {
	productID := c.Query("product_id")
	warehouseID := c.Query("warehouse_id")

	if productID == "" {
		utils.SendError(c, http.StatusBadRequest, "product_id wajib diisi", nil)
		return
	}

	query := database.DB.Where("product_id = ? AND current_qty > 0", productID)
	if warehouseID != "" && warehouseID != "all" {
		query = query.Where("warehouse_id = ?", warehouseID)
	}

	var batches []models.ProductBatch
	query.Order("expired_date ASC, created_at ASC").Find(&batches)

	if len(batches) == 0 {
		var p models.Product
		if database.DB.Unscoped().First(&p, "id = ?", productID).Error == nil {
			cleanCode := strings.TrimSuffix(p.Code, "-COPY")
			var relatedProd models.Product
			if database.DB.Unscoped().Where("(code = ? OR code = ?) AND id != ?", cleanCode, p.Code+"-COPY", p.ID).First(&relatedProd).Error == nil {
				q2 := database.DB.Where("product_id = ? AND current_qty > 0", relatedProd.ID)
				if warehouseID != "" && warehouseID != "all" {
					q2 = q2.Where("warehouse_id = ?", warehouseID)
				}
				q2.Order("expired_date ASC, created_at ASC").Find(&batches)
				if len(batches) > 0 {
					database.DB.Model(&models.ProductBatch{}).Where("product_id = ?", relatedProd.ID).Update("product_id", p.ID)
				}
			}
		}
	}

	utils.SendSuccess(c, "Daftar bets produk tersedia", batches)
}

// ==========================================
// 4. HISTORY HARGA BELI
// ==========================================

type PriceHistoryRow struct {
	SupplierCode    string    `json:"supplier_code"`
	SupplierName    string    `json:"supplier_name"`
	InvoiceNo       string    `json:"invoice_no"`
	Date            time.Time `json:"date"`
	ItemCode        string    `json:"item_code"`
	ItemName        string    `json:"item_name"`
	Qty             float64   `json:"qty"`
	UnitName        string    `json:"unit_name"`
	UnitPrice       float64   `json:"unit_price"`
	Discount        float64   `json:"discount"`
	DiscountPercent float64   `json:"discount_percent"`
	TotalAmount     float64   `json:"total_amount"`
	TaxAmount       float64   `json:"tax_amount"`
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
			CASE WHEN (purchase_items.qty * purchase_items.unit_price) > 0 
				THEN ROUND(((purchase_items.discount / (purchase_items.qty * purchase_items.unit_price)) * 100)::numeric, 2) 
				ELSE 0 END as discount_percent,
			purchase_items.total_amount,
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
		if len(endDate) == 10 {
			query = query.Where("purchases.date <= ?", endDate+" 23:59:59")
		} else {
			query = query.Where("purchases.date <= ?", endDate)
		}
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
		if len(endDate) == 10 {
			query = query.Where("supplier_payments.date <= ?", endDate+" 23:59:59")
		} else {
			query = query.Where("supplier_payments.date <= ?", endDate)
		}
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
		Preload("Details.PurchaseOrder").
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
		AccountID     *uuid.UUID `json:"account_id"`
		PaymentMethod string     `json:"payment_method" binding:"required"` // TUNAI, TRANSFER, CEK_BG, etc.
		CheckNo       string     `json:"check_no"`                          // Nomor Cek/BG
		Notes         string     `json:"notes"`
		Allocations   []struct {
			PurchaseID      *uuid.UUID `json:"purchase_id"`
			PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
			AmountPaid      float64    `json:"amount_paid"`
			Discount        float64    `json:"discount"`
		} `json:"allocations"`
		Items []struct {
			PurchaseID      *uuid.UUID `json:"purchase_id"`
			PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
			Amount          float64    `json:"amount"`
			Discount        float64    `json:"discount"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pembayaran utang tidak valid", err.Error())
		return
	}

	if len(req.Allocations) == 0 && len(req.Items) > 0 {
		for _, it := range req.Items {
			if it.Amount > 0 || it.Discount > 0 {
				req.Allocations = append(req.Allocations, struct {
					PurchaseID      *uuid.UUID `json:"purchase_id"`
					PurchaseOrderID *uuid.UUID `json:"purchase_order_id"`
					AmountPaid      float64    `json:"amount_paid"`
					Discount        float64    `json:"discount"`
				}{
					PurchaseID:      it.PurchaseID,
					PurchaseOrderID: it.PurchaseOrderID,
					AmountPaid:      it.Amount,
					Discount:        it.Discount,
				})
			}
		}
	}

	// Backfill discount from Items if allocations were passed without discount
	for i := range req.Allocations {
		if req.Allocations[i].Discount == 0 && len(req.Items) > i && req.Items[i].Discount > 0 {
			req.Allocations[i].Discount = req.Items[i].Discount
		}
	}

	if len(req.Allocations) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Pilih setidaknya satu faktur hutang yang akan dibayar", nil)
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
	var totalDiscount float64
	for _, a := range req.Allocations {
		totalAmount += a.AmountPaid
		totalDiscount += a.Discount
	}

	// Resolve Kas/Bank account
	var kasAcc models.Account
	creditAccount := ""

	// 1. If explicit AccountID provided
	if req.AccountID != nil && *req.AccountID != uuid.Nil {
		if errAcc := tx.Where("id = ? AND company_id = ?", *req.AccountID, companyID).First(&kasAcc).Error; errAcc == nil {
			creditAccount = kasAcc.Code
		}
	}

	// 2. If BankID provided and has linked AccountID
	if creditAccount == "" && req.BankID != nil && *req.BankID != uuid.Nil {
		var b models.Bank
		if errBank := tx.Where("id = ? AND company_id = ?", *req.BankID, companyID).First(&b).Error; errBank == nil && b.AccountID != nil && *b.AccountID != uuid.Nil {
			if errAcc := tx.Where("id = ? AND company_id = ?", *b.AccountID, companyID).First(&kasAcc).Error; errAcc == nil {
				creditAccount = kasAcc.Code
			}
		}
	}

	// 3. Fallback based on payment method if still unresolved
	if creditAccount == "" {
		fallbackCode := "1-1110"
		if req.PaymentMethod != "TUNAI" && req.PaymentMethod != "CASH" {
			fallbackCode = "1-1131" // Bank BCA
		}
		if errAcc := tx.Where("company_id = ? AND code = ?", companyID, fallbackCode).First(&kasAcc).Error; errAcc == nil {
			creditAccount = kasAcc.Code
		} else {
			_ = tx.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", companyID).Order("code ASC").First(&kasAcc).Error
			creditAccount = kasAcc.Code
		}
	}
	if creditAccount == "" {
		creditAccount = "1-1110"
	}

	// VALIDASI SALDO KAS/BANK: Tidak boleh melakukan pembayaran jika saldo kurang dari totalAmount
	if kasAcc.ID != uuid.Nil && totalAmount > 0 {
		realBal := services.GetAccountRealBalance(tx, kasAcc.ID)
		if realBal < totalAmount {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Pembayaran utang ditolak: Saldo kas/bank %s (%s) tidak mencukupi untuk pembayaran sebesar Rp %.2f. Saldo saat ini hanya Rp %.2f. Sesuai standar akuntansi, saldo kas tidak boleh negatif/minus.", kasAcc.Name, kasAcc.Code, totalAmount, realBal), nil)
			return
		}
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
		TotalDiscount:    totalDiscount,
		Notes:            req.Notes,
		ComputerName:     getComputerName(c),
		CreatedBy:        userID,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pembayaran", err.Error())
		return
	}

	for _, a := range req.Allocations {
		totalDeduction := a.AmountPaid + a.Discount
		// 1. If PO is specified
		if a.PurchaseOrderID != nil && *a.PurchaseOrderID != uuid.Nil {
			var po models.PurchaseOrder
			if err := tx.First(&po, *a.PurchaseOrderID).Error; err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, "Pesanan Pembelian (PO) tidak ditemukan", nil)
				return
			}
			po.PaidAmount += a.AmountPaid
			po.RemainingAmount -= totalDeduction
			if po.RemainingAmount <= 0 {
				po.PaymentStatus = "PAID"
				po.RemainingAmount = 0
			} else {
				po.PaymentStatus = "PARTIAL"
			}
			tx.Save(&po)

			detail := models.SupplierPaymentDetail{
				SupplierPaymentID: payment.ID,
				PurchaseOrderID:   a.PurchaseOrderID,
				AmountPaid:        a.AmountPaid,
				Discount:          a.Discount,
			}
			tx.Create(&detail)
			continue
		}

		// 2. If Purchase is specified
		if a.PurchaseID != nil && *a.PurchaseID != uuid.Nil {
			var p models.Purchase
			if err := tx.First(&p, *a.PurchaseID).Error; err == nil {
				p.PaidAmount += a.AmountPaid
				p.RemainingAmount -= totalDeduction
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
					Discount:          a.Discount,
				}
				tx.Create(&detail)
			} else {
				// Fallback: check if the id belongs to a PO
				var po models.PurchaseOrder
				if errPO := tx.First(&po, *a.PurchaseID).Error; errPO == nil {
					po.PaidAmount += a.AmountPaid
					po.RemainingAmount -= totalDeduction
					if po.RemainingAmount <= 0 {
						po.PaymentStatus = "PAID"
						po.RemainingAmount = 0
					} else {
						po.PaymentStatus = "PARTIAL"
					}
					tx.Save(&po)

					detail := models.SupplierPaymentDetail{
						SupplierPaymentID: payment.ID,
						PurchaseOrderID:   a.PurchaseID,
						AmountPaid:        a.AmountPaid,
						Discount:          a.Discount,
					}
					tx.Create(&detail)
				} else {
					tx.Rollback()
					utils.SendError(c, http.StatusBadRequest, "Faktur atau PO pembelian tidak ditemukan", nil)
					return
				}
			}
		}
	}

	if payment.BankID == nil && req.AccountID != nil && *req.AccountID != uuid.Nil {
		var b models.Bank
		if errB := tx.Where("company_id = ? AND account_id = ?", companyID, *req.AccountID).First(&b).Error; errB == nil {
			payment.BankID = &b.ID
			tx.Model(&payment).Update("bank_id", b.ID)
		}
	}

	totalDebtSettled := totalAmount + totalDiscount
	entries := []services.JournalEntryParam{
		{AccountCode: "2-1100", Debit: totalDebtSettled, Credit: 0, Description: "Pelunasan Utang Usaha"},
		{AccountCode: creditAccount, Debit: 0, Credit: totalAmount, Description: fmt.Sprintf("Pengeluaran Kas/Bank (%s - %s)", creditAccount, kasAcc.Name)},
	}
	if totalDiscount > 0 {
		purchDiscAcc := services.ResolveSettingAccountCodeWithFallback(tx, companyID, "ap_discount", "purch_discount", "5-2100", "KERINGANAN HUTANG", "EXPENSE", "COGS", "CREDIT")
		entries = append(entries, services.JournalEntryParam{
			AccountCode: purchDiscAcc,
			Debit:       0,
			Credit:      totalDiscount,
			Description: fmt.Sprintf("Keringanan Hutang Pembelian (%s)", payment.PaymentNo),
		})
	}

	_, err = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        time.Now(),
		RefType:     "PAYMENT_OUT",
		RefNo:       payment.PaymentNo,
		Description: fmt.Sprintf("Pembayaran Utang ke Pemasok (%s)", payment.PaymentNo),
		CreatedBy:   userID,
		Entries:     entries,
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal pembayaran: "+err.Error(), nil)
		return
	}

	syncSupplierPaymentCashTransaction(tx, &payment, companyID, branchID, userID, kasAcc, totalAmount)

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan pembayaran utang: "+err.Error(), nil)
		return
	}

	database.DB.Preload("Supplier").Preload("Bank").Preload("User").Preload("Details.Purchase").Preload("Details.PurchaseOrder").First(&payment, payment.ID)
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
	// Revert purchase & PO allocations
	var details []models.SupplierPaymentDetail
	tx.Where("supplier_payment_id = ?", payment.ID).Find(&details)
	for _, d := range details {
		totalDeduction := d.AmountPaid + d.Discount
		if d.PurchaseOrderID != nil && *d.PurchaseOrderID != uuid.Nil {
			var po models.PurchaseOrder
			if err := tx.First(&po, *d.PurchaseOrderID).Error; err == nil {
				po.PaidAmount -= d.AmountPaid
				po.RemainingAmount += totalDeduction
				if po.RemainingAmount >= po.TotalAmount || po.PaidAmount <= 0 {
					po.PaymentStatus = "UNPAID"
					po.RemainingAmount = po.TotalAmount
				} else {
					po.PaymentStatus = "PARTIAL"
				}
				tx.Save(&po)
			}
		} else if d.PurchaseID != nil && *d.PurchaseID != uuid.Nil {
			var p models.Purchase
			if err := tx.First(&p, *d.PurchaseID).Error; err == nil {
				p.PaidAmount -= d.AmountPaid
				p.RemainingAmount += totalDeduction
				if p.RemainingAmount >= p.TotalAmount || p.PaidAmount <= 0 {
					p.PaymentStatus = "UNPAID"
					p.RemainingAmount = p.TotalAmount
				} else {
					p.PaymentStatus = "PARTIAL"
				}
				tx.Save(&p)
			}
		}
	}

	tx.Where("supplier_payment_id = ?", payment.ID).Delete(&models.SupplierPaymentDetail{})

	// Delete double entry journal
	var existingJournal models.Journal
	if err := tx.Where("company_id = ? AND ref_type = 'PAYMENT_OUT' AND ref_no = ?", companyID, payment.PaymentNo).Preload("Entries").First(&existingJournal).Error; err == nil {
		for _, entry := range existingJournal.Entries {
			var acc models.Account
			if errAcc := tx.First(&acc, entry.AccountID).Error; errAcc == nil {
				if acc.NormalBalance == "DEBIT" {
					acc.Balance -= (entry.Debit - entry.Credit)
				} else {
					acc.Balance -= (entry.Credit - entry.Debit)
				}
				tx.Save(&acc)
			}
		}
		tx.Unscoped().Where("journal_id = ?", existingJournal.ID).Delete(&models.JournalEntry{})
		tx.Unscoped().Delete(&existingJournal)
		_ = services.SyncAllAccountBalances(tx, companyID)
	}

	// Delete cash transaction
	var oldTrxs []models.CashTransaction
	descPattern := "%" + payment.PaymentNo + "%"
	if err := tx.Unscoped().Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, payment.PaymentNo, descPattern).Find(&oldTrxs).Error; err == nil {
		for _, ot := range oldTrxs {
			tx.Unscoped().Where("transaction_id = ?", ot.ID).Delete(&models.CashTransactionItem{})
			tx.Unscoped().Delete(&ot)
		}
	}

	if err := tx.Delete(&payment).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pembayaran utang", err.Error())
		return
	}
	tx.Commit()

	utils.SendSuccess(c, "Pembayaran utang berhasil dihapus", nil)
}

func (h *PurchaseHandler) GetPurchaseOrderPaymentHistory(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var po models.PurchaseOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Supplier").Preload("Warehouse").Preload("User").
		First(&po).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan Pembelian tidak ditemukan", err.Error())
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

	// 1. Initial Cash Transaction for PO
	var cashTrx models.CashTransaction
	descPattern := "%" + po.OrderNo + "%"
	if err := database.DB.Preload("Account").Preload("User").
		Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, po.OrderNo, descPattern).
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
		if po.PaymentStatus == "PAID" {
			cat = "Pembayaran Tunai Lunas"
		} else if po.PaymentStatus == "DP" {
			cat = "Uang Muka (DP)"
		} else if po.PaymentStatus == "PARTIAL" {
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
	} else if po.PaidAmount > 0 || po.DPAmount > 0 {
		amt := po.PaidAmount
		if amt == 0 {
			amt = po.DPAmount
		}
		history = append(history, PaymentHistoryItem{
			ID:            po.ID.String() + "-initial",
			Date:          po.Date,
			TrxNo:         po.OrderNo,
			Category:      "Uang Muka (DP)",
			PaymentMethod: "TUNAI",
			AccountName:   "KAS BESAR (1-1121)",
			Amount:        amt,
			Notes:         "Pembayaran awal Pesanan Pembelian",
			CreatedBy:     po.User.FullName,
		})
	}

	// 2. Subsequent payments via Bayar Hutang (SupplierPayment)
	var details []models.SupplierPaymentDetail
	database.DB.Where("purchase_order_id = ?", po.ID).
		Preload("PurchaseOrder").
		Find(&details)

	for _, d := range details {
		var sp models.SupplierPayment
		if errSP := database.DB.Preload("Bank").Preload("User").Where("id = ?", d.SupplierPaymentID).First(&sp).Error; errSP == nil {
			accName := "Kas Tunai"
			if sp.Bank != nil && sp.Bank.Name != "" {
				accName = fmt.Sprintf("%s - %s", sp.Bank.Name, sp.Bank.AccountNumber)
			}
			userName := "Petugas"
			if sp.User != nil && sp.User.FullName != "" {
				userName = sp.User.FullName
			}
			history = append(history, PaymentHistoryItem{
				ID:            d.ID.String(),
				Date:          sp.Date,
				TrxNo:         sp.PaymentNo,
				Category:      "Bayar Hutang",
				PaymentMethod: sp.PaymentMethod,
				AccountName:   accName,
				Amount:        d.AmountPaid,
				Notes:         sp.Notes,
				CreatedBy:     userName,
			})
		}
	}

	utils.SendSuccess(c, "Riwayat Pembayaran PO", gin.H{
		"order":   po,
		"history": history,
	})
}

func (h *PurchaseHandler) GetPurchasePaymentHistory(c *gin.Context) {
	id := c.Param("id")
	companyID := c.MustGet("company_id").(uuid.UUID)

	var p models.Purchase
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Supplier").Preload("Warehouse").Preload("User").
		First(&p).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Faktur Pembelian tidak ditemukan", err.Error())
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

	// 1. Initial Cash Transaction for Purchase
	var cashTrx models.CashTransaction
	descPattern := "%" + p.InvoiceNo + "%"
	if err := database.DB.Preload("Account").Preload("User").
		Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, p.InvoiceNo, descPattern).
		First(&cashTrx).Error; err == nil {
		accName := "KAS BESAR"
		if cashTrx.Account != nil && cashTrx.Account.Name != "" {
			accName = fmt.Sprintf("%s (%s)", cashTrx.Account.Name, cashTrx.Account.Code)
		}
		userName := "Petugas"
		if cashTrx.User != nil && cashTrx.User.FullName != "" {
			userName = cashTrx.User.FullName
		}
		cat := "Pembayaran Pembelian"
		if p.PaymentStatus == "PAID" {
			cat = "Pembayaran Tunai Lunas"
		} else if p.PaymentStatus == "PARTIAL" {
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
	} else if p.PaidAmount > 0 {
		history = append(history, PaymentHistoryItem{
			ID:            p.ID.String() + "-initial",
			Date:          p.Date,
			TrxNo:         p.InvoiceNo,
			Category:      "Pembayaran Awal",
			PaymentMethod: "TUNAI",
			AccountName:   "KAS BESAR (1-1121)",
			Amount:        p.PaidAmount,
			Notes:         "Pembayaran awal faktur pembelian",
			CreatedBy:     p.User.FullName,
		})
	}

	// 2. Subsequent payments via Bayar Hutang (SupplierPayment)
	var details []models.SupplierPaymentDetail
	database.DB.Where("purchase_id = ?", p.ID).Find(&details)

	for _, d := range details {
		var sp models.SupplierPayment
		if errSP := database.DB.Preload("Bank").Preload("User").Where("id = ?", d.SupplierPaymentID).First(&sp).Error; errSP == nil {
			accName := "Kas Tunai"
			if sp.Bank != nil && sp.Bank.Name != "" {
				accName = fmt.Sprintf("%s - %s", sp.Bank.Name, sp.Bank.AccountNumber)
			}
			userName := "Petugas"
			if sp.User != nil && sp.User.FullName != "" {
				userName = sp.User.FullName
			}
			history = append(history, PaymentHistoryItem{
				ID:            d.ID.String(),
				Date:          sp.Date,
				TrxNo:         sp.PaymentNo,
				Category:      "Bayar Hutang",
				PaymentMethod: sp.PaymentMethod,
				AccountName:   accName,
				Amount:        d.AmountPaid,
				Notes:         sp.Notes,
				CreatedBy:     userName,
			})
		}
	}

	utils.SendSuccess(c, "Riwayat Pembayaran Faktur", gin.H{
		"purchase": p,
		"history":  history,
	})
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
		docNo := services.GenerateCashTransactionNumber(tx, companyID, "KASO", purchase.Date)

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

func syncSupplierPaymentCashTransaction(tx *gorm.DB, payment *models.SupplierPayment, companyID, branchID, userID uuid.UUID, kasAcc models.Account, totalAmount float64) {
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

	if kasAcc.ID == uuid.Nil {
		if errKas := tx.Where("company_id = ? AND code = '1-1110'", companyID).First(&kasAcc).Error; errKas != nil {
			tx.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", companyID).First(&kasAcc)
		}
	}

	var utangAcc models.Account
	_ = tx.Where("company_id = ? AND code = '2-1100'", companyID).First(&utangAcc).Error

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
		docNo := services.GenerateCashTransactionNumber(tx, companyID, "KASO", payment.Date)

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

func deleteExistingJournal(tx *gorm.DB, companyID uuid.UUID, refType, refNo string) {
	var existing models.Journal
	if err := tx.Preload("Entries").Where("company_id = ? AND ref_type = ? AND ref_no = ?", companyID, refType, refNo).First(&existing).Error; err == nil {
		for _, entry := range existing.Entries {
			var acc models.Account
			if errAcc := tx.First(&acc, entry.AccountID).Error; errAcc == nil {
				if acc.NormalBalance == "DEBIT" {
					acc.Balance -= (entry.Debit - entry.Credit)
				} else {
					acc.Balance -= (entry.Credit - entry.Debit)
				}
				tx.Save(&acc)
			}
		}
		tx.Unscoped().Where("journal_id = ?", existing.ID).Delete(&models.JournalEntry{})
		tx.Unscoped().Delete(&existing)
	}
}

func syncPurchaseOrderAccountingAndCash(tx *gorm.DB, po *models.PurchaseOrder, companyID, branchID, userID uuid.UUID, cashAccountID *uuid.UUID) error {
	// 1. Delete any existing journal for this PO first (with balance reversal)
	deleteExistingJournal(tx, companyID, "PURCHASE_ORDER", po.OrderNo)

	// 2. Resolve supplier name
	supplierName := "Multi-Supplier"
	if po.SupplierID != uuid.Nil {
		var supp models.Supplier
		if err := tx.First(&supp, po.SupplierID).Error; err == nil && supp.Name != "" {
			supplierName = supp.Name
		}
	}

	// 3. Resolve cash account code (default to 1-1121 KAS BESAR)
	cashAccountCode := "1-1121"
	if cashAccountID != nil && *cashAccountID != uuid.Nil {
		var customAcc models.Account
		if err := tx.First(&customAcc, *cashAccountID).Error; err == nil && customAcc.Code != "" {
			cashAccountCode = customAcc.Code
		}
	} else if po.CashAccountID != nil && *po.CashAccountID != uuid.Nil {
		var customAcc models.Account
		if err := tx.First(&customAcc, *po.CashAccountID).Error; err == nil && customAcc.Code != "" {
			cashAccountCode = customAcc.Code
		}
	} else {
		var checkAcc models.Account
		if err := tx.Where("company_id = ? AND code = '1-1121'", companyID).First(&checkAcc).Error; err != nil {
			cashAccountCode = "1-1110"
		}
	}

	// 4. Double Entry Journal: PO belum diterima TIDAK boleh menambah persediaan atau membentuk hutang usaha (2-1100).
	// Hanya jika ada uang muka / pembayaran DP (PaidAmount > 0), dicatat Uang Muka Pembelian vs Kas/Bank.
	if po.PaidAmount > 0 {
		var journalEntries []services.JournalEntryParam
		// Debit: Uang Muka Pembelian (1-1400)
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: "1-1400",
			Debit:       po.PaidAmount,
			Credit:      0,
			Description: fmt.Sprintf("Uang Muka Pesanan Pembelian PO %s (%s)", po.OrderNo, supplierName),
		})

		// Credit: Kas / Bank
		journalEntries = append(journalEntries, services.JournalEntryParam{
			AccountCode: cashAccountCode,
			Debit:       0,
			Credit:      po.PaidAmount,
			Description: fmt.Sprintf("Pembayaran Uang Muka / Kas PO %s (%s)", po.OrderNo, supplierName),
		})

		journalDate := po.Date
		if journalDate.IsZero() {
			journalDate = time.Now()
		}

		_, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        journalDate,
			RefType:     "PURCHASE_ORDER",
			RefNo:       po.OrderNo,
			Description: fmt.Sprintf("Jurnal Uang Muka PO %s (%s)", po.OrderNo, supplierName),
			CreatedBy:   userID,
			Entries:     journalEntries,
		})
		if err != nil {
			return err
		}
	}

	// 5. Cash Transaction (Kas Keluar) jika ada pembayaran tunai/DP
	if err := syncPurchaseOrderCashTransaction(tx, po, companyID, branchID, userID, cashAccountCode, supplierName); err != nil {
		return err
	}

	return nil
}

func syncPurchaseOrderCashTransaction(tx *gorm.DB, po *models.PurchaseOrder, companyID, branchID, userID uuid.UUID, cashCode, supplierName string) error {
	descPattern := "%" + po.OrderNo + "%"

	// Always hard clean any previous cash transactions for this PO to prevent unique key / sequence collisions
	var oldTrxs []models.CashTransaction
	if err := tx.Unscoped().Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", companyID, po.OrderNo, descPattern).Find(&oldTrxs).Error; err == nil {
		for _, ot := range oldTrxs {
			tx.Unscoped().Where("transaction_id = ?", ot.ID).Delete(&models.CashTransactionItem{})
			tx.Unscoped().Delete(&ot)
		}
	}

	if po.PaidAmount <= 0 {
		return nil
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

	desc := fmt.Sprintf("Pembayaran Kas/DP Pesanan Pembelian PO %s (%s)", po.OrderNo, supplierName)
	trxDate := po.Date
	if trxDate.IsZero() {
		trxDate = time.Now()
	}

	docNo := services.GenerateCashTransactionNumber(tx, companyID, "KASO", trxDate)
	newCashTrx := models.CashTransaction{
		CompanyID:      companyID,
		BranchID:       branchID,
		TrxNo:          docNo,
		Date:           trxDate,
		Type:           "OUT",
		AccountID:      kasAcc.ID,
		Amount:         po.PaidAmount,
		PayeeRecipient: supplierName,
		Description:    desc,
		CreatedBy:      userID,
	}
	if persediaanAcc.ID != uuid.Nil {
		newCashTrx.OppositeAccID = &persediaanAcc.ID
	}
	if errCreate := tx.Create(&newCashTrx).Error; errCreate != nil {
		return errCreate
	}

	if persediaanAcc.ID != uuid.Nil {
		if errItem := tx.Create(&models.CashTransactionItem{
			TransactionID: newCashTrx.ID,
			AccountID:     persediaanAcc.ID,
			Amount:        po.PaidAmount,
			Notes:         desc,
		}).Error; errItem != nil {
			return errItem
		}
	}

	return nil
}
