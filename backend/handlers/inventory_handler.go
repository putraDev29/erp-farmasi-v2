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

type InventoryHandler struct{}

func NewInventoryHandler() *InventoryHandler {
	return &InventoryHandler{}
}

// ==========================================
// 1. SALDO STOK & KARTU STOK
// ==========================================

func (h *InventoryHandler) GetStockBalances(c *gin.Context) {
	warehouseID := c.Query("warehouse_id")
	search := c.Query("search")
	lowStockOnly := c.Query("low_stock") == "true"

	query := database.DB.Model(&models.StockBalance{}).
		Preload("Product.Category").Preload("Product.BaseUnit").Preload("Warehouse")

	if warehouseID != "" && warehouseID != "all" {
		query = query.Where("warehouse_id = ?", warehouseID)
	}

	if search != "" {
		query = query.Joins("JOIN products ON products.id = stock_balances.product_id").
			Where("products.name ILIKE ? OR products.sku ILIKE ? OR products.barcode ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var balances []models.StockBalance
	query.Find(&balances)

	var filtered []models.StockBalance
	if lowStockOnly {
		for _, b := range balances {
			if b.Product != nil && b.AvailableQty <= b.Product.MinStock {
				filtered = append(filtered, b)
			}
		}
		balances = filtered
	}

	utils.SendSuccess(c, "Daftar saldo stok gudang", balances)
}

func (h *InventoryHandler) GetStockCard(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	productID := c.Query("product_id")
	warehouseID := c.Query("warehouse_id")

	if productID == "" {
		utils.SendError(c, http.StatusBadRequest, "Parameter product_id wajib diisi", nil)
		return
	}

	query := database.DB.Model(&models.StockMovement{}).
		Where("product_id = ?", productID).
		Preload("Product.BaseUnit").Preload("Warehouse").Preload("User")

	if warehouseID != "" && warehouseID != "all" {
		query = query.Where("warehouse_id = ?", warehouseID)
	}

	var movements []models.StockMovement
	query.Order("created_at ASC").Find(&movements)

	var purchaseDocNos []string
	var saleDocNos []string
	var soDocNos []string

	for _, m := range movements {
		if m.DocNo == "" {
			continue
		}
		if m.DocType == "PURCHASE" || strings.HasPrefix(m.DocNo, "PI/") {
			purchaseDocNos = append(purchaseDocNos, m.DocNo)
		} else if m.DocType == "SALE" || m.DocType == "SALE_INVOICE" || m.DocType == "SALE_VOID" || strings.HasPrefix(m.DocNo, "INV/") {
			saleDocNos = append(saleDocNos, m.DocNo)
		} else if m.DocType == "SALES_ORDER" || strings.HasPrefix(m.DocNo, "SO/") {
			soDocNos = append(soDocNos, m.DocNo)
		}
	}

	invoiceMap := make(map[string]uuid.UUID)
	if len(purchaseDocNos) > 0 {
		var purchases []models.Purchase
		database.DB.Select("id, invoice_no").Where("company_id = ? AND invoice_no IN ?", companyID, purchaseDocNos).Find(&purchases)
		for _, p := range purchases {
			invoiceMap[p.InvoiceNo] = p.ID
		}
	}

	saleMap := make(map[string]uuid.UUID)
	if len(saleDocNos) > 0 {
		var sales []models.Sale
		database.DB.Select("id, invoice_no").Where("company_id = ? AND invoice_no IN ?", companyID, saleDocNos).Find(&sales)
		for _, s := range sales {
			saleMap[s.InvoiceNo] = s.ID
		}
	}

	soMap := make(map[string]uuid.UUID)
	if len(soDocNos) > 0 {
		var sos []models.SalesOrder
		database.DB.Select("id, order_no").Where("company_id = ? AND order_no IN ?", companyID, soDocNos).Find(&sos)
		for _, so := range sos {
			soMap[so.OrderNo] = so.ID
		}
	}

	type StockMovementDetail struct {
		models.StockMovement
		PurchaseID   *uuid.UUID `json:"purchase_id,omitempty"`
		SaleID       *uuid.UUID `json:"sale_id,omitempty"`
		SalesOrderID *uuid.UUID `json:"sales_order_id,omitempty"`
		TargetURL    string     `json:"target_url,omitempty"`
	}

	result := make([]StockMovementDetail, len(movements))
	for i, m := range movements {
		result[i].StockMovement = m
		var targetURL string

		if pid, ok := invoiceMap[m.DocNo]; ok {
			result[i].PurchaseID = &pid
			targetURL = fmt.Sprintf("/purchasing/invoices/%s/edit", pid.String())
		} else if m.DocType == "PURCHASE" || strings.HasPrefix(m.DocNo, "PI/") {
			targetURL = fmt.Sprintf("/purchasing/invoices?search=%s", m.DocNo)
		} else if sid, ok := saleMap[m.DocNo]; ok {
			result[i].SaleID = &sid
			targetURL = fmt.Sprintf("/sales/invoices/%s/edit", sid.String())
		} else if m.DocType == "SALE" || m.DocType == "SALE_INVOICE" || m.DocType == "SALE_VOID" || strings.HasPrefix(m.DocNo, "INV/") {
			targetURL = fmt.Sprintf("/sales/invoices?search=%s", m.DocNo)
		} else if soid, ok := soMap[m.DocNo]; ok {
			result[i].SalesOrderID = &soid
			targetURL = fmt.Sprintf("/sales/orders/%s/edit", soid.String())
		} else if m.DocType == "SALES_ORDER" || strings.HasPrefix(m.DocNo, "SO/") {
			targetURL = fmt.Sprintf("/sales/orders?search=%s", m.DocNo)
		} else if strings.Contains(m.DocType, "PURCHASE_RETURN") || strings.HasPrefix(m.DocNo, "RB/") {
			targetURL = fmt.Sprintf("/purchasing/returns?keyword=%s", m.DocNo)
		} else if strings.Contains(m.DocType, "SALE_RETURN") || strings.HasPrefix(m.DocNo, "RS/") || strings.HasPrefix(m.DocNo, "RJ/") {
			targetURL = fmt.Sprintf("/sales/returns?keyword=%s", m.DocNo)
		} else if m.DocType == "SALES_DELIVERY" || strings.HasPrefix(m.DocNo, "SJ/") {
			targetURL = fmt.Sprintf("/sales/deliveries?search=%s", m.DocNo)
		} else if m.DocType == "OPENING" || strings.HasPrefix(m.DocNo, "OP-STK") {
			targetURL = "/inventory/initial-stock"
		} else if m.DocType == "TRANSFER_IN" || m.DocType == "TRANSFER_OUT" || strings.HasPrefix(m.DocNo, "TF/") {
			targetURL = fmt.Sprintf("/inventory/transfers?search=%s", m.DocNo)
		} else if m.DocType == "ITEM_IN" || strings.HasPrefix(m.DocNo, "IN/") {
			targetURL = fmt.Sprintf("/inventory/in?search=%s", m.DocNo)
		} else if m.DocType == "ITEM_OUT" || strings.HasPrefix(m.DocNo, "OUT/") {
			targetURL = fmt.Sprintf("/inventory/out?search=%s", m.DocNo)
		} else if m.DocType == "OPNAME" || strings.HasPrefix(m.DocNo, "OPN") || strings.HasPrefix(m.DocNo, "SO-STK") {
			targetURL = fmt.Sprintf("/inventory/opname?search=%s", m.DocNo)
		}

		result[i].TargetURL = targetURL
	}

	utils.SendSuccess(c, "Kartu stok produk", result)
}

// ==========================================
// 2. ITEM MASUK (INBOUND ITEM ENTRY)
// ==========================================

func (h *InventoryHandler) GetItemEntries(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("doc_no ILIKE ? OR notes ILIKE ?", like, like)
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		if wid, err := uuid.Parse(warehouseID); err == nil {
			query = query.Where("warehouse_id = ?", wid)
		}
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("date >= ?", startDate+" 00:00:00")
	}

	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("date <= ?", endDate+" 23:59:59")
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	orderClause := "date DESC"
	if sortBy == "No Transaksi" || sortBy == "doc_no" {
		orderClause = "doc_no " + sortDir
	} else if sortBy == "Tanggal" || sortBy == "date" {
		orderClause = "date " + sortDir
	}

	var entries []models.ItemEntry
	query.Preload("Warehouse").Preload("Items.Product").Order(orderClause).Find(&entries)

	utils.SendSuccess(c, "Daftar item masuk", entries)
}

func (h *InventoryHandler) GetItemEntryByID(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var entry models.ItemEntry
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Warehouse").Preload("Items.Product").First(&entry).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Item masuk tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail item masuk", entry)
}

func (h *InventoryHandler) CreateItemEntry(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		WarehouseID uuid.UUID `json:"warehouse_id" binding:"required"`
		AccountCode string    `json:"account_code"`
		Date        *string   `json:"date"`
		Notes       string    `json:"notes"`
		Items       []struct {
			ProductID   uuid.UUID  `json:"product_id" binding:"required"`
			ProductCode string     `json:"product_code"`
			ProductName string     `json:"product_name"`
			Brand       string     `json:"brand"`
			Qty         float64    `json:"qty" binding:"required"`
			UnitID      *uuid.UUID `json:"unit_id"`
			UnitName    string     `json:"unit_name"`
			UnitPrice   float64    `json:"unit_price"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data item masuk tidak valid", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Item barang masuk harus ada minimal 1", nil)
		return
	}

	tx := database.DB.Begin()

	docNo, err := services.GenerateDocNumber(tx, companyID, "IM")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor transaksi item masuk", err.Error())
		return
	}

	txnDate := time.Now()
	if req.Date != nil && *req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", *req.Date); err == nil {
			txnDate = parsed
		} else if parsed, err := time.Parse(time.RFC3339, *req.Date); err == nil {
			txnDate = parsed
		}
	}

	accCode := req.AccountCode
	if accCode == "" {
		accCode = "5-2201 - ITEM MASUK"
	}

	var totalItems float64
	var subTotal float64

	var entryItems []models.ItemEntryItem
	for _, it := range req.Items {
		itemTotal := it.Qty * it.UnitPrice
		totalItems += it.Qty
		subTotal += itemTotal

		entryItems = append(entryItems, models.ItemEntryItem{
			ProductID:   it.ProductID,
			ProductCode: it.ProductCode,
			ProductName: it.ProductName,
			Brand:       it.Brand,
			Qty:         it.Qty,
			UnitID:      it.UnitID,
			UnitName:    it.UnitName,
			UnitPrice:   it.UnitPrice,
			TotalPrice:  itemTotal,
		})
	}

	entry := models.ItemEntry{
		CompanyID:     companyID,
		BranchID:      branchID,
		WarehouseID:   req.WarehouseID,
		DocNo:         docNo,
		Date:          txnDate,
		AccountCode:   accCode,
		TotalItems:    totalItems,
		SubTotal:      subTotal,
		Notes:         req.Notes,
		ComputerName:  utils.GetComputerName(c),
		CreatedBy:     userID,
		CreatedByName: userName,
	}

	if err := tx.Create(&entry).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan transaksi item masuk", err.Error())
		return
	}

	for i := range entryItems {
		entryItems[i].ItemEntryID = entry.ID
		if err := tx.Create(&entryItems[i]).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan rincian item masuk", err.Error())
			return
		}

		// Mutate stock IN
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.WarehouseID,
			ProductID:    entryItems[i].ProductID,
			DocType:      "ITEM_IN",
			DocNo:        entry.DocNo,
			MovementType: "IN",
			Qty:          entryItems[i].Qty,
			UnitCost:     entryItems[i].UnitPrice,
			Notes:        fmt.Sprintf("Item Masuk: %s (%s)", entry.DocNo, entry.Notes),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}
	}

	// Double-entry accounting: Debit Persediaan (1-1300) vs Kredit Pendapatan Lain-lain / Penyesuaian (4-9000 or 5-2201)
	if subTotal > 0 {
		var entries []services.JournalEntryParam
		entries = append(entries, services.JournalEntryParam{
			AccountCode: "1-1300",
			Debit:       subTotal,
			Credit:      0,
			Description: fmt.Sprintf("Item Masuk Persediaan %s", entry.DocNo),
		})
		entries = append(entries, services.JournalEntryParam{
			AccountCode: "4-9000",
			Debit:       0,
			Credit:      subTotal,
			Description: fmt.Sprintf("Penyesuaian Masuk %s", entry.DocNo),
		})

		_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        txnDate,
			RefType:     "ITEM_IN",
			RefNo:       entry.DocNo,
			Description: fmt.Sprintf("Jurnal Item Masuk %s", entry.DocNo),
			CreatedBy:   userID,
			Entries:     entries,
		})
	}

	tx.Commit()
	utils.SendCreated(c, "Transaksi item masuk berhasil disimpan", entry)
}

func (h *InventoryHandler) UpdateItemEntry(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var entry models.ItemEntry
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&entry).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Item masuk tidak ditemukan", nil)
		return
	}

	var req struct {
		Notes       *string `json:"notes"`
		AccountCode *string `json:"account_code"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.Notes != nil {
		entry.Notes = *req.Notes
	}
	if req.AccountCode != nil {
		entry.AccountCode = *req.AccountCode
	}
	entry.UpdatedBy = &userID
	entry.UpdatedByName = userName

	if err := database.DB.Save(&entry).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate item masuk", err.Error())
		return
	}

	utils.SendSuccess(c, "Item masuk berhasil diperbarui", entry)
}

func (h *InventoryHandler) DeleteItemEntry(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("item_entry_id = ?", id).Delete(&models.ItemEntryItem{})
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.ItemEntry{}).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus item masuk", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Item masuk berhasil dihapus", nil)
}

// ==========================================
// 3. ITEM KELUAR (OUTBOUND ITEM EXIT)
// ==========================================

func (h *InventoryHandler) GetItemExits(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("doc_no ILIKE ? OR notes ILIKE ?", like, like)
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		if wid, err := uuid.Parse(warehouseID); err == nil {
			query = query.Where("warehouse_id = ?", wid)
		}
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("date >= ?", startDate+" 00:00:00")
	}

	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("date <= ?", endDate+" 23:59:59")
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	orderClause := "date DESC"
	if sortBy == "No Transaksi" || sortBy == "doc_no" {
		orderClause = "doc_no " + sortDir
	} else if sortBy == "Tanggal" || sortBy == "date" {
		orderClause = "date " + sortDir
	}

	var exits []models.ItemExit
	query.Preload("Warehouse").Preload("Items.Product").Order(orderClause).Find(&exits)

	utils.SendSuccess(c, "Daftar item keluar", exits)
}

func (h *InventoryHandler) GetItemExitByID(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var exit models.ItemExit
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("Warehouse").Preload("Items.Product").First(&exit).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Item keluar tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail item keluar", exit)
}

func (h *InventoryHandler) CreateItemExit(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		WarehouseID uuid.UUID `json:"warehouse_id" binding:"required"`
		AccountCode string    `json:"account_code"`
		Date        *string   `json:"date"`
		Notes       string    `json:"notes"`
		Items       []struct {
			ProductID   uuid.UUID  `json:"product_id" binding:"required"`
			ProductCode string     `json:"product_code"`
			ProductName string     `json:"product_name"`
			Brand       string     `json:"brand"`
			Qty         float64    `json:"qty" binding:"required"`
			UnitID      *uuid.UUID `json:"unit_id"`
			UnitName    string     `json:"unit_name"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data item keluar tidak valid", err.Error())
		return
	}

	if len(req.Items) == 0 {
		utils.SendError(c, http.StatusBadRequest, "Item barang keluar harus ada minimal 1", nil)
		return
	}

	tx := database.DB.Begin()

	docNo, err := services.GenerateDocNumber(tx, companyID, "IK")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor transaksi item keluar", err.Error())
		return
	}

	txnDate := time.Now()
	if req.Date != nil && *req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", *req.Date); err == nil {
			txnDate = parsed
		} else if parsed, err := time.Parse(time.RFC3339, *req.Date); err == nil {
			txnDate = parsed
		}
	}

	accCode := req.AccountCode
	if accCode == "" {
		accCode = "5-2202 - ITEM KELUAR"
	}

	var totalItems float64
	var exitItems []models.ItemExitItem
	for _, it := range req.Items {
		totalItems += it.Qty
		exitItems = append(exitItems, models.ItemExitItem{
			ProductID:   it.ProductID,
			ProductCode: it.ProductCode,
			ProductName: it.ProductName,
			Brand:       it.Brand,
			Qty:         it.Qty,
			UnitID:      it.UnitID,
			UnitName:    it.UnitName,
		})
	}

	exit := models.ItemExit{
		CompanyID:     companyID,
		BranchID:      branchID,
		WarehouseID:   req.WarehouseID,
		DocNo:         docNo,
		Date:          txnDate,
		AccountCode:   accCode,
		TotalItems:    totalItems,
		Notes:         req.Notes,
		ComputerName:  utils.GetComputerName(c),
		CreatedBy:     userID,
		CreatedByName: userName,
	}

	if err := tx.Create(&exit).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan transaksi item keluar", err.Error())
		return
	}

	var totalCost float64
	for i := range exitItems {
		exitItems[i].ItemExitID = exit.ID
		if err := tx.Create(&exitItems[i]).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan rincian item keluar", err.Error())
			return
		}

		// Check stock
		var bal models.StockBalance
		if err := tx.Where("warehouse_id = ? AND product_id = ?", req.WarehouseID, exitItems[i].ProductID).First(&bal).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Produk tidak ada dalam persediaan gudang ini", nil)
			return
		}

		if bal.AvailableQty < exitItems[i].Qty {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Stok tidak mencukupi untuk %s (Tersedia: %.2f)", exitItems[i].ProductName, bal.AvailableQty), nil)
			return
		}

		itemCost := exitItems[i].Qty * bal.AvgCost
		totalCost += itemCost

		// Mutate stock OUT
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.WarehouseID,
			ProductID:    exitItems[i].ProductID,
			DocType:      "ITEM_OUT",
			DocNo:        exit.DocNo,
			MovementType: "OUT",
			Qty:          exitItems[i].Qty,
			UnitCost:     bal.AvgCost,
			Notes:        fmt.Sprintf("Item Keluar: %s (%s)", exit.DocNo, exit.Notes),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}
	}

	// Double-entry accounting: Debit Beban Item Keluar (5-2202 or 6-4000) vs Kredit Persediaan (1-1300)
	if totalCost > 0 {
		var entries []services.JournalEntryParam
		entries = append(entries, services.JournalEntryParam{
			AccountCode: "6-4000",
			Debit:       totalCost,
			Credit:      0,
			Description: fmt.Sprintf("Beban Item Keluar %s", exit.DocNo),
		})
		entries = append(entries, services.JournalEntryParam{
			AccountCode: "1-1300",
			Debit:       0,
			Credit:      totalCost,
			Description: fmt.Sprintf("Pengurangan Persediaan Item Keluar %s", exit.DocNo),
		})

		_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        txnDate,
			RefType:     "ITEM_OUT",
			RefNo:       exit.DocNo,
			Description: fmt.Sprintf("Jurnal Item Keluar %s", exit.DocNo),
			CreatedBy:   userID,
			Entries:     entries,
		})
	}

	tx.Commit()
	utils.SendCreated(c, "Transaksi item keluar berhasil disimpan", exit)
}

func (h *InventoryHandler) UpdateItemExit(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var exit models.ItemExit
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&exit).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Item keluar tidak ditemukan", nil)
		return
	}

	var req struct {
		Notes       *string `json:"notes"`
		AccountCode *string `json:"account_code"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.Notes != nil {
		exit.Notes = *req.Notes
	}
	if req.AccountCode != nil {
		exit.AccountCode = *req.AccountCode
	}
	exit.UpdatedBy = &userID
	exit.UpdatedByName = userName

	if err := database.DB.Save(&exit).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate item keluar", err.Error())
		return
	}

	utils.SendSuccess(c, "Item keluar berhasil diperbarui", exit)
}

func (h *InventoryHandler) DeleteItemExit(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("item_exit_id = ?", id).Delete(&models.ItemExitItem{})
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.ItemExit{}).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus item keluar", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Item keluar berhasil dihapus", nil)
}

// ==========================================
// 4. PESANAN ITEM TRANSFER (TRANSFER ORDERS)
// ==========================================

func (h *InventoryHandler) GetTransferOrders(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("order_no ILIKE ? OR notes ILIKE ?", like, like)
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		if wid, err := uuid.Parse(warehouseID); err == nil {
			query = query.Where("from_warehouse_id = ? OR to_warehouse_id = ?", wid, wid)
		}
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("date >= ?", startDate+" 00:00:00")
	}

	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("date <= ?", endDate+" 23:59:59")
	}

	if status := c.Query("status"); status != "" && status != "Semua" {
		query = query.Where("status = ?", status)
	}

	if processStatus := c.Query("process_status"); processStatus != "" && processStatus != "Semua" {
		query = query.Where("process_status = ?", processStatus)
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	orderClause := "date DESC"
	if sortBy == "No Transaksi" || sortBy == "order_no" {
		orderClause = "order_no " + sortDir
	} else if sortBy == "Tanggal" || sortBy == "date" {
		orderClause = "date " + sortDir
	}

	var orders []models.ItemTransferOrder
	query.Preload("FromWarehouse").Preload("ToWarehouse").Preload("Items.Product").
		Order(orderClause).Find(&orders)

	utils.SendSuccess(c, "Daftar pesanan item transfer", orders)
}

func (h *InventoryHandler) GetTransferOrderByID(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var order models.ItemTransferOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("FromWarehouse").Preload("ToWarehouse").Preload("Items.Product").First(&order).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan transfer tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail pesanan transfer", order)
}

func (h *InventoryHandler) CreateTransferOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		FromWarehouseID uuid.UUID `json:"from_warehouse_id" binding:"required"`
		ToWarehouseID   uuid.UUID `json:"to_warehouse_id" binding:"required"`
		Date            *string   `json:"date"`
		DeliveryDate    *string   `json:"delivery_date"`
		Status          string    `json:"status"`
		Notes           string    `json:"notes"`
		Items           []struct {
			ProductID   uuid.UUID  `json:"product_id" binding:"required"`
			ProductCode string     `json:"product_code"`
			ProductName string     `json:"product_name"`
			Brand       string     `json:"brand"`
			Qty         float64    `json:"qty" binding:"required"`
			UnitID      *uuid.UUID `json:"unit_id"`
			UnitName    string     `json:"unit_name"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pesanan transfer tidak valid", err.Error())
		return
	}

	if req.FromWarehouseID == req.ToWarehouseID {
		utils.SendError(c, http.StatusBadRequest, "Gudang asal dan tujuan tidak boleh sama", nil)
		return
	}

	tx := database.DB.Begin()

	orderNo, err := services.GenerateDocNumber(tx, companyID, "PO-TR")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor pesanan transfer", err.Error())
		return
	}

	txnDate := time.Now()
	if req.Date != nil && *req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", *req.Date); err == nil {
			txnDate = parsed
		} else if parsed, err := time.Parse(time.RFC3339, *req.Date); err == nil {
			txnDate = parsed
		}
	}

	delivDate := txnDate
	if req.DeliveryDate != nil && *req.DeliveryDate != "" {
		if parsed, err := time.Parse("2006-01-02", *req.DeliveryDate); err == nil {
			delivDate = parsed
		} else if parsed, err := time.Parse(time.RFC3339, *req.DeliveryDate); err == nil {
			delivDate = parsed
		}
	}

	var totalQty float64
	var orderItems []models.ItemTransferOrderItem
	for _, it := range req.Items {
		totalQty += it.Qty
		orderItems = append(orderItems, models.ItemTransferOrderItem{
			ProductID:   it.ProductID,
			ProductCode: it.ProductCode,
			ProductName: it.ProductName,
			Brand:       it.Brand,
			Qty:         it.Qty,
			ReceivedQty: 0,
			UnitID:      it.UnitID,
			UnitName:    it.UnitName,
		})
	}

	st := req.Status
	if st == "" {
		st = "PENDING"
	}

	order := models.ItemTransferOrder{
		CompanyID:       companyID,
		BranchID:        branchID,
		OrderNo:         orderNo,
		Date:            txnDate,
		DeliveryDate:    delivDate,
		FromWarehouseID: req.FromWarehouseID,
		ToWarehouseID:   req.ToWarehouseID,
		TotalQty:        totalQty,
		ReceivedQty:     0,
		Status:          st,
		ProcessStatus:   "BELUM",
		Notes:           req.Notes,
		CreatedBy:       userID,
		CreatedByName:   userName,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pesanan transfer", err.Error())
		return
	}

	for i := range orderItems {
		orderItems[i].TransferOrderID = order.ID
		tx.Create(&orderItems[i])
	}

	tx.Commit()
	utils.SendCreated(c, "Pesanan transfer berhasil dibuat", order)
}

func (h *InventoryHandler) UpdateTransferOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var order models.ItemTransferOrder
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&order).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan transfer tidak ditemukan", nil)
		return
	}

	var req struct {
		Notes         *string `json:"notes"`
		Status        *string `json:"status"`
		ProcessStatus *string `json:"process_status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.Notes != nil {
		order.Notes = *req.Notes
	}
	if req.Status != nil {
		order.Status = *req.Status
	}
	if req.ProcessStatus != nil {
		order.ProcessStatus = *req.ProcessStatus
	}
	order.UpdatedBy = &userID
	order.UpdatedByName = userName

	if err := database.DB.Save(&order).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate pesanan transfer", err.Error())
		return
	}

	utils.SendSuccess(c, "Pesanan transfer berhasil diperbarui", order)
}

func (h *InventoryHandler) DeleteTransferOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("transfer_order_id = ?", id).Delete(&models.ItemTransferOrderItem{})
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.ItemTransferOrder{}).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pesanan transfer", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Pesanan transfer berhasil dihapus", nil)
}

// ==========================================
// 5. ITEM TRANSFER (PHYSICAL TRANSFER)
// ==========================================

func (h *InventoryHandler) GetTransfers(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("transfer_no ILIKE ? OR notes ILIKE ?", like, like)
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		if wid, err := uuid.Parse(warehouseID); err == nil {
			query = query.Where("from_warehouse_id = ? OR to_warehouse_id = ?", wid, wid)
		}
	}

	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("date >= ?", startDate+" 00:00:00")
	}

	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("date <= ?", endDate+" 23:59:59")
	}

	sortBy := c.DefaultQuery("sort_by", "date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	orderClause := "created_at " + sortDir
	if sortBy == "No Transaksi" || sortBy == "transfer_no" || sortBy == "code" {
		orderClause = "transfer_no " + sortDir
	} else if sortBy == "Tanggal" || sortBy == "date" {
		orderClause = "date " + sortDir
	} else if sortBy == "created_at" || sortBy == "waktu_input" {
		orderClause = "created_at " + sortDir
	}

	var transfers []models.WarehouseTransfer
	query.Preload("FromWarehouse").Preload("ToWarehouse").Preload("TransferOrder").Preload("Items.Product").
		Order(orderClause).Find(&transfers)

	utils.SendSuccess(c, "Daftar mutasi antar gudang", transfers)
}

func (h *InventoryHandler) GetTransferByID(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var transfer models.WarehouseTransfer
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).
		Preload("FromWarehouse").Preload("ToWarehouse").Preload("TransferOrder").Preload("Items.Product").First(&transfer).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Item transfer tidak ditemukan", nil)
		return
	}

	utils.SendSuccess(c, "Detail item transfer", transfer)
}

func (h *InventoryHandler) CreateTransfer(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		TransferOrderID *uuid.UUID `json:"transfer_order_id"`
		FromWarehouseID uuid.UUID  `json:"from_warehouse_id" binding:"required"`
		ToWarehouseID   uuid.UUID  `json:"to_warehouse_id" binding:"required"`
		Date            *string    `json:"date"`
		Notes           string     `json:"notes"`
		Items           []struct {
			ProductID   uuid.UUID  `json:"product_id" binding:"required"`
			ProductCode string     `json:"product_code"`
			ProductName string     `json:"product_name"`
			Brand       string     `json:"brand"`
			Qty         float64    `json:"qty" binding:"required"`
			UnitID      *uuid.UUID `json:"unit_id"`
			UnitName    string     `json:"unit_name"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data mutasi tidak valid", err.Error())
		return
	}

	if req.FromWarehouseID == req.ToWarehouseID {
		utils.SendError(c, http.StatusBadRequest, "Gudang asal dan gudang tujuan tidak boleh sama", nil)
		return
	}

	tx := database.DB.Begin()

	transferNo, err := services.GenerateDocNumber(tx, companyID, "TR")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor mutasi", err.Error())
		return
	}

	txnDate := time.Now()
	if req.Date != nil && *req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", *req.Date); err == nil {
			txnDate = parsed
		} else if parsed, err := time.Parse(time.RFC3339, *req.Date); err == nil {
			txnDate = parsed
		}
	}

	var totalItems float64
	for _, it := range req.Items {
		totalItems += it.Qty
	}

	transfer := models.WarehouseTransfer{
		CompanyID:       companyID,
		BranchID:        branchID,
		TransferOrderID: req.TransferOrderID,
		TransferNo:      transferNo,
		Date:            txnDate,
		FromWarehouseID: req.FromWarehouseID,
		ToWarehouseID:   req.ToWarehouseID,
		TotalItems:      totalItems,
		Status:          "RECEIVED",
		Notes:           req.Notes,
		ComputerName:    utils.GetComputerName(c),
		CreatedBy:       userID,
		CreatedByName:   userName,
	}

	if err := tx.Create(&transfer).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat mutasi", err.Error())
		return
	}

	for _, item := range req.Items {
		var srcBalance models.StockBalance
		if err := tx.Where("warehouse_id = ? AND product_id = ?", req.FromWarehouseID, item.ProductID).First(&srcBalance).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Produk tidak ada di gudang asal", nil)
			return
		}

		if srcBalance.AvailableQty < item.Qty {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Stok di gudang asal tidak mencukupi (Tersedia: %.2f)", srcBalance.AvailableQty), nil)
			return
		}

		// Reduce from source warehouse
		_, err := services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.FromWarehouseID,
			ProductID:    item.ProductID,
			DocType:      "TRANSFER_OUT",
			DocNo:        transfer.TransferNo,
			MovementType: "OUT",
			Qty:          item.Qty,
			UnitCost:     srcBalance.AvgCost,
			Notes:        fmt.Sprintf("Mutasi Keluar ke Gudang Tujuan (%s)", transfer.TransferNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}

		// Add to destination warehouse
		_, err = services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.ToWarehouseID,
			ProductID:    item.ProductID,
			DocType:      "TRANSFER_IN",
			DocNo:        transfer.TransferNo,
			MovementType: "IN",
			Qty:          item.Qty,
			UnitCost:     srcBalance.AvgCost,
			Notes:        fmt.Sprintf("Mutasi Masuk dari Gudang Asal (%s)", transfer.TransferNo),
			CreatedBy:    userID,
		})
		if err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
			return
		}

		tItem := models.WarehouseTransferItem{
			TransferID:  transfer.ID,
			ProductID:   item.ProductID,
			ProductCode: item.ProductCode,
			ProductName: item.ProductName,
			Brand:       item.Brand,
			Qty:         item.Qty,
			UnitID:      item.UnitID,
			UnitName:    item.UnitName,
			Cost:        srcBalance.AvgCost,
		}
		tx.Create(&tItem)
	}

	// If linked to TransferOrderID, update received quantities
	if req.TransferOrderID != nil && *req.TransferOrderID != uuid.Nil {
		var to models.ItemTransferOrder
		if err := tx.First(&to, *req.TransferOrderID).Error; err == nil {
			to.ReceivedQty += totalItems
			if to.ReceivedQty >= to.TotalQty {
				to.ProcessStatus = "SELESAI"
				to.Status = "COMPLETED"
			} else if to.ReceivedQty > 0 {
				to.ProcessStatus = "SEBAGIAN"
			}
			tx.Save(&to)
		}
	}

	tx.Commit()
	utils.SendCreated(c, "Mutasi barang antar gudang berhasil", transfer)
}

func (h *InventoryHandler) UpdateTransfer(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var transfer models.WarehouseTransfer
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&transfer).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Item transfer tidak ditemukan", nil)
		return
	}

	var req struct {
		Notes *string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.Notes != nil {
		transfer.Notes = *req.Notes
	}
	transfer.UpdatedBy = &userID
	transfer.UpdatedByName = userName

	if err := database.DB.Save(&transfer).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate item transfer", err.Error())
		return
	}

	utils.SendSuccess(c, "Item transfer berhasil diperbarui", transfer)
}

func (h *InventoryHandler) DeleteTransfer(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("transfer_id = ?", id).Delete(&models.WarehouseTransferItem{})
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.WarehouseTransfer{}).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus item transfer", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Item transfer berhasil dihapus", nil)
}

// ==========================================
// 6. SALDO AWAL (INITIAL STOCK BALANCE)
// ==========================================

func (h *InventoryHandler) GetInitialStock(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("product_code ILIKE ? OR product_name ILIKE ? OR notes ILIKE ?", like, like, like)
	}

	if warehouseID := c.Query("warehouse_id"); warehouseID != "" && warehouseID != "all" {
		if wid, err := uuid.Parse(warehouseID); err == nil {
			query = query.Where("warehouse_id = ?", wid)
		}
	}

	var items []models.InitialStockEntry
	query.Preload("Warehouse").Preload("Product").Order("product_code ASC").Find(&items)

	// Summary totals
	var totQty float64
	var subTotal float64
	for _, it := range items {
		totQty += it.Qty
		subTotal += it.TotalPrice
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Daftar saldo awal item",
		"data":    items,
		"meta": gin.H{
			"total_items": totQty,
			"sub_total":   subTotal,
		},
	})
}

func (h *InventoryHandler) CreateInitialStock(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		WarehouseID uuid.UUID  `json:"warehouse_id" binding:"required"`
		ProductID   uuid.UUID  `json:"product_id" binding:"required"`
		Qty         float64    `json:"qty" binding:"required"`
		UnitID      *uuid.UUID `json:"unit_id"`
		UnitName    string     `json:"unit_name"`
		UnitPrice   float64    `json:"unit_price" binding:"required"`
		Date        *string    `json:"date"`
		Notes       string     `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data saldo awal tidak lengkap", err.Error())
		return
	}

	tx := database.DB.Begin()

	var prod models.Product
	if err := tx.First(&prod, req.ProductID).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Produk tidak ditemukan", nil)
		return
	}

	var wh models.Warehouse
	if err := tx.First(&wh, req.WarehouseID).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Gudang tidak ditemukan", nil)
		return
	}

	txnDate := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	if req.Date != nil && *req.Date != "" {
		if parsed, err := time.Parse("2006-01-02", *req.Date); err == nil {
			txnDate = parsed
		}
	}

	uName := req.UnitName
	if uName == "" {
		uName = "PCS"
	}

	totalPrice := req.Qty * req.UnitPrice

	entry := models.InitialStockEntry{
		CompanyID:     companyID,
		BranchID:      branchID,
		WarehouseID:   req.WarehouseID,
		ProductID:     req.ProductID,
		ProductCode:   prod.Code,
		ProductName:   prod.Name,
		WarehouseName: wh.Name,
		Date:          txnDate,
		Qty:           req.Qty,
		UnitID:        req.UnitID,
		UnitName:      uName,
		UnitPrice:     req.UnitPrice,
		TotalPrice:    totalPrice,
		Notes:         req.Notes,
		CreatedBy:     userID,
		CreatedByName: userName,
	}

	if err := tx.Create(&entry).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan saldo awal", err.Error())
		return
	}

	// Update or create StockBalance
	var balance models.StockBalance
	if err := tx.Where("warehouse_id = ? AND product_id = ?", req.WarehouseID, req.ProductID).First(&balance).Error; err != nil {
		balance = models.StockBalance{
			WarehouseID:  req.WarehouseID,
			ProductID:    req.ProductID,
			Qty:          req.Qty,
			AvailableQty: req.Qty,
			AvgCost:      req.UnitPrice,
		}
		tx.Create(&balance)
	} else {
		balance.Qty = req.Qty
		balance.AvailableQty = req.Qty
		balance.AvgCost = req.UnitPrice
		tx.Save(&balance)
	}

	// Record StockMovement
	tx.Create(&models.StockMovement{
		CompanyID:    companyID,
		BranchID:     branchID,
		WarehouseID:  req.WarehouseID,
		ProductID:    req.ProductID,
		DocType:      "OPENING",
		DocNo:        "SA-" + prod.Code,
		MovementType: "IN",
		Qty:          req.Qty,
		CostPerUnit:  req.UnitPrice,
		TotalCost:    totalPrice,
		BalanceAfter: req.Qty,
		Notes:        "Saldo Awal Item",
		CreatedBy:    userID,
	})

	tx.Commit()
	utils.SendCreated(c, "Saldo awal item berhasil disimpan", entry)
}

func (h *InventoryHandler) UpdateInitialStock(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var entry models.InitialStockEntry
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&entry).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Saldo awal tidak ditemukan", nil)
		return
	}

	var req struct {
		Qty       *float64 `json:"qty"`
		UnitPrice *float64 `json:"unit_price"`
		Notes     *string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	if req.Qty != nil {
		entry.Qty = *req.Qty
	}
	if req.UnitPrice != nil {
		entry.UnitPrice = *req.UnitPrice
	}
	entry.TotalPrice = entry.Qty * entry.UnitPrice
	if req.Notes != nil {
		entry.Notes = *req.Notes
	}

	if err := tx.Save(&entry).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate saldo awal", err.Error())
		return
	}

	// Sync stock balance
	var balance models.StockBalance
	if err := tx.Where("warehouse_id = ? AND product_id = ?", entry.WarehouseID, entry.ProductID).First(&balance).Error; err == nil {
		balance.Qty = entry.Qty
		balance.AvailableQty = entry.Qty
		balance.AvgCost = entry.UnitPrice
		tx.Save(&balance)
	}

	tx.Commit()
	utils.SendSuccess(c, "Saldo awal berhasil diperbarui", entry)
}

func (h *InventoryHandler) DeleteInitialStock(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	var entry models.InitialStockEntry
	if err := tx.Where("id = ? AND company_id = ?", id, companyID).First(&entry).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusNotFound, "Saldo awal tidak ditemukan", nil)
		return
	}

	tx.Where("warehouse_id = ? AND product_id = ? AND doc_type = 'OPENING'", entry.WarehouseID, entry.ProductID).Delete(&models.StockMovement{})
	tx.Delete(&entry)

	tx.Commit()
	utils.SendSuccess(c, "Saldo awal berhasil dihapus", nil)
}

func (h *InventoryHandler) DeleteAllInitialStock(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	tx := database.DB.Begin()
	tx.Where("company_id = ?", companyID).Delete(&models.InitialStockEntry{})
	tx.Where("company_id = ? AND doc_type = 'OPENING'", companyID).Delete(&models.StockMovement{})
	tx.Commit()

	utils.SendSuccess(c, "Semua saldo awal berhasil direset", nil)
}

// ==========================================
// 7. STOCK OPNAME
// ==========================================

func (h *InventoryHandler) GetStockOpnames(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var opnames []models.StockOpname
	database.DB.Where("company_id = ?", companyID).
		Preload("Warehouse").Preload("User").Preload("Items.Product").
		Order("date DESC").Find(&opnames)

	utils.SendSuccess(c, "Daftar stok opname", opnames)
}

func (h *InventoryHandler) CreateStockOpname(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		WarehouseID uuid.UUID `json:"warehouse_id" binding:"required"`
		Notes       string    `json:"notes"`
		Items       []struct {
			ProductID   uuid.UUID `json:"product_id" binding:"required"`
			PhysicalQty float64   `json:"physical_qty"`
			Notes       string    `json:"notes"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data stok opname tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()

	opnameNo, err := services.GenerateDocNumber(tx, companyID, "OP")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor dokumen opname", err.Error())
		return
	}

	opname := models.StockOpname{
		CompanyID:   companyID,
		BranchID:    branchID,
		WarehouseID: req.WarehouseID,
		OpnameNo:    opnameNo,
		Date:        time.Now(),
		Status:      "COMPLETED",
		Notes:       req.Notes,
		CreatedBy:   userID,
	}

	if err := tx.Create(&opname).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan opname", err.Error())
		return
	}

	var totalVarianceValue float64

	for _, item := range req.Items {
		var balance models.StockBalance
		tx.Where("warehouse_id = ? AND product_id = ?", req.WarehouseID, item.ProductID).First(&balance)

		diffQty := item.PhysicalQty - balance.Qty
		varianceVal := diffQty * balance.AvgCost
		totalVarianceValue += varianceVal

		opItem := models.StockOpnameItem{
			OpnameID:      opname.ID,
			ProductID:     item.ProductID,
			SystemQty:     balance.Qty,
			PhysicalQty:   item.PhysicalQty,
			DifferenceQty: diffQty,
			CostPerUnit:   balance.AvgCost,
			TotalVariance: varianceVal,
			Notes:         item.Notes,
		}
		tx.Create(&opItem)

		// Mutate stock if difference
		if diffQty > 0 {
			_, err := services.MutateStock(tx, services.StockMutationParams{
				CompanyID:    companyID,
				BranchID:     branchID,
				WarehouseID:  req.WarehouseID,
				ProductID:    item.ProductID,
				DocType:      "OPNAME",
				DocNo:        opname.OpnameNo,
				MovementType: "IN",
				Qty:          diffQty,
				UnitCost:     balance.AvgCost,
				Notes:        fmt.Sprintf("Penyesuaian Opname Lebih Fisik: %s", opname.OpnameNo),
				CreatedBy:    userID,
			})
			if err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
				return
			}
		} else if diffQty < 0 {
			_, err := services.MutateStock(tx, services.StockMutationParams{
				CompanyID:    companyID,
				BranchID:     branchID,
				WarehouseID:  req.WarehouseID,
				ProductID:    item.ProductID,
				DocType:      "OPNAME",
				DocNo:        opname.OpnameNo,
				MovementType: "OUT",
				Qty:          -diffQty,
				UnitCost:     balance.AvgCost,
				Notes:        fmt.Sprintf("Penyesuaian Opname Kurang Fisik: %s", opname.OpnameNo),
				CreatedBy:    userID,
			})
			if err != nil {
				tx.Rollback()
				utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
				return
			}
		}
	}

	// Post Accounting Journal
	if totalVarianceValue != 0 {
		var entries []services.JournalEntryParam
		if totalVarianceValue > 0 {
			entries = append(entries,
				services.JournalEntryParam{AccountCode: "1-1300", Debit: totalVarianceValue, Credit: 0, Description: "Koreksi Fisik Lebih Stok Opname"},
				services.JournalEntryParam{AccountCode: "4-9000", Debit: 0, Credit: totalVarianceValue, Description: "Pendapatan Selisih Stok Opname"},
			)
		} else {
			lossVal := -totalVarianceValue
			entries = append(entries,
				services.JournalEntryParam{AccountCode: "6-4000", Debit: lossVal, Credit: 0, Description: "Beban Selisih Stok Opname Hilang/Rusak"},
				services.JournalEntryParam{AccountCode: "1-1300", Debit: 0, Credit: lossVal, Description: "Koreksi Fisik Kurang Persediaan"},
			)
		}

		_, _ = services.PostDoubleEntryJournal(tx, services.JournalPostParams{
			CompanyID:   companyID,
			BranchID:    branchID,
			Date:        time.Now(),
			RefType:     "OPNAME",
			RefNo:       opname.OpnameNo,
			Description: fmt.Sprintf("Jurnal Penyesuaian Hasil Stok Opname %s", opname.OpnameNo),
			CreatedBy:   userID,
			Entries:     entries,
		})
	}

	tx.Commit()
	utils.SendCreated(c, "Stok opname berhasil disimpan dan stok disinkronkan", opname)
}

// ==========================================
// 8. PROSES PERBAIKAN SALDO & UTILITIES
// ==========================================

func (h *InventoryHandler) FixStockBalances(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	var products []models.Product
	database.DB.Where("company_id = ?", companyID).Find(&products)

	var warehouses []models.Warehouse
	database.DB.Where("company_id = ?", companyID).Find(&warehouses)

	fixedCount := 0
	for _, w := range warehouses {
		for _, p := range products {
			var movements []models.StockMovement
			database.DB.Where("warehouse_id = ? AND product_id = ?", w.ID, p.ID).
				Order("created_at ASC").Find(&movements)

			var runningQty float64
			for _, m := range movements {
				if m.MovementType == "IN" {
					runningQty += m.Qty
				} else if m.MovementType == "OUT" {
					runningQty -= m.Qty
				}
			}

			var bal models.StockBalance
			if err := database.DB.Where("warehouse_id = ? AND product_id = ?", w.ID, p.ID).First(&bal).Error; err == nil {
				if bal.Qty != runningQty {
					bal.Qty = runningQty
					bal.AvailableQty = runningQty - bal.ReservedQty
					database.DB.Save(&bal)
					fixedCount++
				}
			}
		}
	}

	utils.SendSuccess(c, fmt.Sprintf("Proses perbaikan saldo selesai. Sebanyak %d saldo item disinkronkan kembali.", fixedCount), gin.H{
		"fixed_count": fixedCount,
	})
}

// ==========================================
// MONITORING OBAT EXPIRED / KADALUARSA (ED)
// ==========================================

type ExpiredDrugItem struct {
	ID            uuid.UUID  `json:"id"`
	Code          string     `json:"code"`
	Barcode       string     `json:"barcode"`
	Name          string     `json:"name"`
	BatchNumber   string     `json:"batch_number"`
	ExpiredDate   *time.Time `json:"expired_date"`
	ExpiredDateStr string    `json:"expired_date_str"`
	DaysRemaining int        `json:"days_remaining"`
	Status        string     `json:"status"`
	StatusLabel   string     `json:"status_label"`
	CategoryName  string     `json:"category_name"`
	BrandName     string     `json:"brand_name"`
	UnitName      string     `json:"unit_name"`
	Rack          string     `json:"rack"`
	CurrentStock  float64    `json:"current_stock"`
	PurchasePrice float64    `json:"purchase_price"`
	SellingPrice  float64    `json:"selling_price"`
	RiskValue     float64    `json:"risk_value"`
}

func (h *InventoryHandler) GetExpiredDrugs(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	filter := c.DefaultQuery("filter", "all") // all, expired, 1_week, 2_weeks, 30_days, 2_months, 3_months
	search := c.Query("search")
	categoryID := c.Query("category_id")
	brandID := c.Query("brand_id")
	stockOnly := c.Query("stock_only") == "true"

	var products []models.Product
	q := database.DB.Model(&models.Product{}).
		Where("company_id = ? AND expired_date IS NOT NULL", companyID).
		Preload("Category").
		Preload("Brand").
		Preload("BaseUnit").
		Preload("StockBalances")

	if categoryID != "" && categoryID != "ALL" && categoryID != "-- Semua Jenis --" {
		q = q.Where("category_id = ?", categoryID)
	}
	if brandID != "" && brandID != "ALL" && brandID != "-- Semua Merek --" {
		q = q.Where("brand_id = ?", brandID)
	}
	if search != "" {
		s := "%" + search + "%"
		q = q.Where("name ILIKE ? OR code ILIKE ? OR barcode ILIKE ? OR batch_number ILIKE ?", s, s, s, s)
	}

	if err := q.Order("expired_date ASC").Find(&products).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memuat data obat expired", err.Error())
		return
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var items []ExpiredDrugItem
	var countExpired, count1Week, count2Weeks, count30Days, count2Months, count3Months int
	var totalRiskValue float64
	var totalRiskQty float64

	for _, p := range products {
		var stockQty float64
		for _, sb := range p.StockBalances {
			stockQty += sb.AvailableQty
		}

		if stockOnly && stockQty <= 0 {
			continue
		}

		if p.ExpiredDate == nil {
			continue
		}

		expDate := *p.ExpiredDate
		expDateDay := time.Date(expDate.Year(), expDate.Month(), expDate.Day(), 0, 0, 0, 0, expDate.Location())
		daysRemaining := int(expDateDay.Sub(today).Hours() / 24)

		var status, statusLabel string
		if daysRemaining < 0 {
			status = "EXPIRED"
			statusLabel = fmt.Sprintf("Expired (%d hari lalu)", -daysRemaining)
			countExpired++
		} else if daysRemaining <= 7 {
			status = "CRITICAL_1_WEEK"
			statusLabel = fmt.Sprintf("Kritis (%d hari lagi)", daysRemaining)
			count1Week++
		} else if daysRemaining <= 14 {
			status = "WARNING_2_WEEKS"
			statusLabel = fmt.Sprintf("Perhatian (%d hari lagi)", daysRemaining)
			count2Weeks++
		} else if daysRemaining <= 30 {
			status = "ALERT_30_DAYS"
			statusLabel = fmt.Sprintf("Waspada (%d hari lagi)", daysRemaining)
			count30Days++
		} else if daysRemaining <= 60 {
			status = "NOTICE_2_MONTHS"
			statusLabel = fmt.Sprintf("≤ 2 Bulan (%d hari lagi)", daysRemaining)
			count2Months++
		} else if daysRemaining <= 90 {
			status = "NOTICE_3_MONTHS"
			statusLabel = fmt.Sprintf("≤ 3 Bulan (%d hari lagi)", daysRemaining)
			count3Months++
		} else {
			status = "SAFE"
			statusLabel = fmt.Sprintf("Aman (%d hari lagi)", daysRemaining)
		}

		// Calculate risk value
		riskVal := stockQty * p.PurchasePrice
		if daysRemaining <= 90 {
			totalRiskValue += riskVal
			totalRiskQty += stockQty
		}

		// Apply filter
		include := false
		switch filter {
		case "expired":
			include = daysRemaining < 0
		case "1_week":
			// 1 minggu: expired or expiring within 7 days
			include = daysRemaining <= 7
		case "2_weeks":
			include = daysRemaining <= 14
		case "30_days":
			include = daysRemaining <= 30
		case "2_months":
			include = daysRemaining <= 60
		case "3_months":
			include = daysRemaining <= 90
		default: // "all"
			include = true
		}

		if include {
			catName := "-"
			if p.Category != nil {
				catName = p.Category.Name
			}
			brandName := "-"
			if p.Brand != nil {
				brandName = p.Brand.Name
			}
			unitName := "PCS"
			if p.BaseUnit != nil {
				unitName = p.BaseUnit.Name
			}

			items = append(items, ExpiredDrugItem{
				ID:             p.ID,
				Code:           p.Code,
				Barcode:        p.Barcode,
				Name:           p.Name,
				BatchNumber:    p.BatchNumber,
				ExpiredDate:    p.ExpiredDate,
				ExpiredDateStr: expDate.Format("2006-01-02"),
				DaysRemaining:  daysRemaining,
				Status:         status,
				StatusLabel:    statusLabel,
				CategoryName:   catName,
				BrandName:      brandName,
				UnitName:       unitName,
				Rack:           p.Rack,
				CurrentStock:   stockQty,
				PurchasePrice:  p.PurchasePrice,
				SellingPrice:   p.SellingPrice,
				RiskValue:      riskVal,
			})
		}
	}

	utils.SendSuccess(c, "Data monitoring obat expired & mendekati expired berhasil dimuat", gin.H{
		"items": items,
		"metrics": gin.H{
			"count_expired":        countExpired,
			"count_1_week":         count1Week,
			"count_2_weeks":        count2Weeks,
			"count_30_days":        count30Days,
			"count_2_months":       count2Months,
			"count_3_months":       count3Months,
			"total_risk_stock_qty": totalRiskQty,
			"total_risk_value":     totalRiskValue,
			"total_monitored":      len(products),
		},
	})
}

func (h *InventoryHandler) UpdateDrugExpiry(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID produk tidak valid", err.Error())
		return
	}

	var req struct {
		BatchNumber string `json:"batch_number"`
		ExpiredDate string `json:"expired_date"` // YYYY-MM-DD
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	var prod models.Product
	if err := database.DB.Where("id = ? AND company_id = ?", productID, companyID).First(&prod).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Produk tidak ditemukan", err.Error())
		return
	}

	prod.BatchNumber = req.BatchNumber
	if req.ExpiredDate != "" {
		t, err := time.Parse("2006-01-02", req.ExpiredDate)
		if err == nil {
			prod.ExpiredDate = &t
		}
	} else {
		prod.ExpiredDate = nil
	}

	if err := database.DB.Save(&prod).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui data expired", err.Error())
		return
	}

	// Also sync to stock balances for this product
	database.DB.Model(&models.StockBalance{}).Where("product_id = ?", productID).Updates(map[string]interface{}{
		"batch_number": prod.BatchNumber,
		"expired_date": prod.ExpiredDate,
	})

	utils.SendSuccess(c, "Data batch dan tanggal kadaluarsa produk berhasil diperbarui", prod)
}
