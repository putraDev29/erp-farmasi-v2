package handlers

import (
	"fmt"
	"net/http"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/services"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AssemblyHandler struct{}

func NewAssemblyHandler() *AssemblyHandler {
	return &AssemblyHandler{}
}

// ==========================================
// BILL OF MATERIALS (BOM)
// ==========================================

func (h *AssemblyHandler) GetBOMs(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var boms []models.BillOfMaterial
	database.DB.Where("company_id = ?", companyID).
		Preload("Product").Preload("Unit").Preload("Items.Product").Preload("Items.Unit").
		Order("name ASC").Find(&boms)

	utils.SendSuccess(c, "Daftar formula BOM perakitan", boms)
}

func (h *AssemblyHandler) CreateBOM(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	var req struct {
		Code         string    `json:"code" binding:"required"`
		Name         string    `json:"name" binding:"required"`
		ProductID    uuid.UUID `json:"product_id" binding:"required"`
		UnitID       uuid.UUID `json:"unit_id" binding:"required"`
		YieldQty     float64   `json:"yield_qty" binding:"required"`
		LaborCost    float64   `json:"labor_cost"`
		OverheadCost float64   `json:"overhead_cost"`
		Notes        string    `json:"notes"`
		Items        []struct {
			ProductID uuid.UUID `json:"product_id" binding:"required"`
			UnitID    uuid.UUID `json:"unit_id" binding:"required"`
			Qty       float64   `json:"qty" binding:"required"`
			ScrapRate float64   `json:"scrap_rate"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data formula BOM tidak lengkap", err.Error())
		return
	}

	tx := database.DB.Begin()

	bom := models.BillOfMaterial{
		CompanyID:    companyID,
		Code:         req.Code,
		Name:         req.Name,
		ProductID:    req.ProductID,
		UnitID:       req.UnitID,
		YieldQty:     req.YieldQty,
		LaborCost:    req.LaborCost,
		OverheadCost: req.OverheadCost,
		Notes:        req.Notes,
		IsActive:     true,
	}

	if err := tx.Create(&bom).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusBadRequest, "Kode formula BOM sudah digunakan", err.Error())
		return
	}

	for _, it := range req.Items {
		item := models.BOMItem{
			BOMID:     bom.ID,
			ProductID: it.ProductID,
			UnitID:    it.UnitID,
			Qty:       it.Qty,
			ScrapRate: it.ScrapRate,
		}
		tx.Create(&item)
	}

	tx.Commit()
	utils.SendCreated(c, "Formula BOM berhasil dibuat", bom)
}

// ==========================================
// 1. PESANAN PERAKITAN (ASSEMBLY ORDERS)
// ==========================================

func (h *AssemblyHandler) GetAssemblyOrders(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("order_no ILIKE ? OR customer_name ILIKE ? OR customer_code ILIKE ? OR product_name ILIKE ? OR notes ILIKE ?", like, like, like, like, like)
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
	} else if sortBy == "Nama" || sortBy == "name" {
		orderClause = "customer_name " + sortDir
	}

	var orders []models.AssemblyOrder
	query.Preload("Customer").Preload("Product").Preload("BOM").Preload("Warehouse").Preload("Items.Product").
		Order(orderClause).Find(&orders)

	utils.SendSuccess(c, "Daftar pesanan perakitan", orders)
}

func (h *AssemblyHandler) CreateAssemblyOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		WarehouseID  uuid.UUID  `json:"warehouse_id" binding:"required"`
		CustomerID   *uuid.UUID `json:"customer_id"`
		CustomerCode string     `json:"customer_code"`
		CustomerName string     `json:"customer_name"`
		BOMID        *uuid.UUID `json:"bom_id"`
		ProductID    *uuid.UUID `json:"product_id"`
		ProductName  string     `json:"product_name"`
		UnitID       *uuid.UUID `json:"unit_id"`
		OrderedQty   float64    `json:"ordered_qty"`
		TargetQty    float64    `json:"target_qty"`
		Date         *string    `json:"date"`
		Notes        string     `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pesanan perakitan tidak valid", err.Error())
		return
	}

	qty := req.OrderedQty
	if qty <= 0 {
		qty = req.TargetQty
	}
	if qty <= 0 {
		qty = 1
	}

	tx := database.DB.Begin()

	orderNo, err := services.GenerateDocNumber(tx, companyID, "PO-RAKIT")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor pesanan perakitan", err.Error())
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

	// Lookup customer if ID provided
	custCode := req.CustomerCode
	custName := req.CustomerName
	if req.CustomerID != nil && *req.CustomerID != uuid.Nil {
		var cust models.Customer
		if err := tx.First(&cust, *req.CustomerID).Error; err == nil {
			if custCode == "" {
				custCode = cust.Code
			}
			if custName == "" {
				custName = cust.Name
			}
		}
	}

	prodName := req.ProductName
	if req.ProductID != nil && *req.ProductID != uuid.Nil && prodName == "" {
		var prod models.Product
		if err := tx.First(&prod, *req.ProductID).Error; err == nil {
			prodName = prod.Name
		}
	}

	order := models.AssemblyOrder{
		CompanyID:     companyID,
		BranchID:      branchID,
		WarehouseID:   req.WarehouseID,
		OrderNo:       orderNo,
		Date:          txnDate,
		CustomerID:    req.CustomerID,
		CustomerCode:  custCode,
		CustomerName:  custName,
		BOMID:         req.BOMID,
		ProductID:     req.ProductID,
		ProductName:   prodName,
		UnitID:        req.UnitID,
		OrderedQty:    qty,
		ProcessedQty:  0,
		TargetQty:     qty,
		FinishedQty:   0,
		Status:        "PENDING",
		ProcessStatus: "BELUM",
		Notes:         req.Notes,
		CreatedBy:     userID,
		CreatedByName: userName,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan pesanan perakitan", err.Error())
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Pesanan perakitan berhasil dibuat", order)
}

func (h *AssemblyHandler) UpdateAssemblyOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	var order models.AssemblyOrder
	if err := database.DB.Where("id = ? AND company_id = ?", orderID, companyID).First(&order).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pesanan perakitan tidak ditemukan", nil)
		return
	}

	var req struct {
		WarehouseID   *uuid.UUID `json:"warehouse_id"`
		CustomerID    *uuid.UUID `json:"customer_id"`
		CustomerCode  *string    `json:"customer_code"`
		CustomerName  *string    `json:"customer_name"`
		ProductID     *uuid.UUID `json:"product_id"`
		ProductName   *string    `json:"product_name"`
		OrderedQty    *float64   `json:"ordered_qty"`
		ProcessedQty  *float64   `json:"processed_qty"`
		Status        *string    `json:"status"`
		ProcessStatus *string    `json:"process_status"`
		Notes         *string    `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.WarehouseID != nil {
		order.WarehouseID = *req.WarehouseID
	}
	if req.CustomerID != nil {
		order.CustomerID = req.CustomerID
	}
	if req.CustomerCode != nil {
		order.CustomerCode = *req.CustomerCode
	}
	if req.CustomerName != nil {
		order.CustomerName = *req.CustomerName
	}
	if req.ProductID != nil {
		order.ProductID = req.ProductID
	}
	if req.ProductName != nil {
		order.ProductName = *req.ProductName
	}
	if req.OrderedQty != nil {
		order.OrderedQty = *req.OrderedQty
		order.TargetQty = *req.OrderedQty
	}
	if req.ProcessedQty != nil {
		order.ProcessedQty = *req.ProcessedQty
	}
	if req.Status != nil {
		order.Status = *req.Status
	}
	if req.ProcessStatus != nil {
		order.ProcessStatus = *req.ProcessStatus
	}
	if req.Notes != nil {
		order.Notes = *req.Notes
	}
	order.UpdatedBy = &userID
	order.UpdatedByName = userName

	if err := database.DB.Save(&order).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate pesanan perakitan", err.Error())
		return
	}

	utils.SendSuccess(c, "Pesanan perakitan berhasil diperbarui", order)
}

func (h *AssemblyHandler) DeleteAssemblyOrder(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	tx := database.DB.Begin()
	tx.Where("assembly_order_id = ?", orderID).Delete(&models.AssemblyOrderItem{})
	if err := tx.Where("id = ? AND company_id = ?", orderID, companyID).Delete(&models.AssemblyOrder{}).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pesanan perakitan", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Pesanan perakitan berhasil dihapus", nil)
}

// ==========================================
// 2. PROSES PERAKITAN (ASSEMBLY PROCESS)
// ==========================================

func (h *AssemblyHandler) GetAssemblyProcesses(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("process_no ILIKE ? OR customer_name ILIKE ? OR customer_code ILIKE ? OR product_name ILIKE ? OR notes ILIKE ?", like, like, like, like, like)
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
	if sortBy == "No Transaksi" || sortBy == "process_no" {
		orderClause = "process_no " + sortDir
	} else if sortBy == "Tanggal" || sortBy == "date" {
		orderClause = "date " + sortDir
	} else if sortBy == "Nama" || sortBy == "name" {
		orderClause = "customer_name " + sortDir
	}

	var processes []models.AssemblyProcess
	query.Preload("AssemblyOrder").Preload("Warehouse").Preload("Product").
		Order(orderClause).Find(&processes)

	utils.SendSuccess(c, "Daftar proses perakitan", processes)
}

func (h *AssemblyHandler) CreateAssemblyProcess(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		WarehouseID     uuid.UUID  `json:"warehouse_id" binding:"required"`
		AssemblyOrderID *uuid.UUID `json:"assembly_order_id"`
		CustomerCode    string     `json:"customer_code"`
		CustomerName    string     `json:"customer_name"`
		ProductID       *uuid.UUID `json:"product_id"`
		ProductName     string     `json:"product_name"`
		ProcessQty      float64    `json:"process_qty"`
		FinishedQty     float64    `json:"finished_qty"`
		Date            *string    `json:"date"`
		Notes           string     `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data proses perakitan tidak valid", err.Error())
		return
	}

	if req.ProcessQty <= 0 {
		req.ProcessQty = 1
	}

	tx := database.DB.Begin()

	processNo, err := services.GenerateDocNumber(tx, companyID, "PR")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor proses perakitan", err.Error())
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

	custCode := req.CustomerCode
	custName := req.CustomerName
	prodID := req.ProductID
	prodName := req.ProductName

	// If linked to AssemblyOrder
	if req.AssemblyOrderID != nil && *req.AssemblyOrderID != uuid.Nil {
		var ao models.AssemblyOrder
		if err := tx.First(&ao, *req.AssemblyOrderID).Error; err == nil {
			if custCode == "" {
				custCode = ao.CustomerCode
			}
			if custName == "" {
				custName = ao.CustomerName
			}
			if prodID == nil || *prodID == uuid.Nil {
				prodID = ao.ProductID
			}
			if prodName == "" {
				prodName = ao.ProductName
			}

			// Update processed qty on AssemblyOrder
			ao.ProcessedQty += req.ProcessQty
			if ao.ProcessedQty >= ao.OrderedQty {
				ao.ProcessStatus = "SELESAI"
			} else if ao.ProcessedQty > 0 {
				ao.ProcessStatus = "SEBAGIAN"
			}
			tx.Save(&ao)
		}
	}

	process := models.AssemblyProcess{
		CompanyID:       companyID,
		BranchID:        branchID,
		WarehouseID:     req.WarehouseID,
		AssemblyOrderID: req.AssemblyOrderID,
		ProcessNo:       processNo,
		Date:            txnDate,
		CustomerCode:    custCode,
		CustomerName:    custName,
		ProductID:       prodID,
		ProductName:     prodName,
		ProcessQty:      req.ProcessQty,
		FinishedQty:     req.FinishedQty,
		Notes:           req.Notes,
		Status:          "IN_PROGRESS",
		CreatedBy:       userID,
		CreatedByName:   userName,
	}

	if err := tx.Create(&process).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat proses perakitan", err.Error())
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Proses perakitan berhasil dibuat", process)
}

func (h *AssemblyHandler) UpdateAssemblyProcess(c *gin.Context) {
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

	var process models.AssemblyProcess
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&process).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Proses perakitan tidak ditemukan", nil)
		return
	}

	var req struct {
		CustomerCode *string  `json:"customer_code"`
		CustomerName *string  `json:"customer_name"`
		ProductName  *string  `json:"product_name"`
		ProcessQty   *float64 `json:"process_qty"`
		FinishedQty  *float64 `json:"finished_qty"`
		Notes        *string  `json:"notes"`
		Status       *string  `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.CustomerCode != nil {
		process.CustomerCode = *req.CustomerCode
	}
	if req.CustomerName != nil {
		process.CustomerName = *req.CustomerName
	}
	if req.ProductName != nil {
		process.ProductName = *req.ProductName
	}
	if req.ProcessQty != nil {
		process.ProcessQty = *req.ProcessQty
	}
	if req.FinishedQty != nil {
		process.FinishedQty = *req.FinishedQty
	}
	if req.Notes != nil {
		process.Notes = *req.Notes
	}
	if req.Status != nil {
		process.Status = *req.Status
	}
	process.UpdatedBy = &userID
	process.UpdatedByName = userName

	if err := database.DB.Save(&process).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate proses perakitan", err.Error())
		return
	}

	utils.SendSuccess(c, "Proses perakitan berhasil diperbarui", process)
}

func (h *AssemblyHandler) DeleteAssemblyProcess(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.AssemblyProcess{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus proses perakitan", err.Error())
		return
	}

	utils.SendSuccess(c, "Proses perakitan berhasil dihapus", nil)
}

// ==========================================
// 3. PROSES JADI (ASSEMBLY FINISHED)
// ==========================================

func (h *AssemblyHandler) GetAssemblyFinished(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	query := database.DB.Where("company_id = ?", companyID)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("finished_no ILIKE ? OR customer_name ILIKE ? OR customer_code ILIKE ? OR product_name ILIKE ? OR notes ILIKE ?", like, like, like, like, like)
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
	if sortBy == "No Transaksi" || sortBy == "finished_no" {
		orderClause = "finished_no " + sortDir
	} else if sortBy == "Tanggal" || sortBy == "date" {
		orderClause = "date " + sortDir
	} else if sortBy == "Nama" || sortBy == "name" {
		orderClause = "customer_name " + sortDir
	}

	var finishedList []models.AssemblyFinished
	query.Preload("AssemblyProcess").Preload("Warehouse").Preload("Product").
		Order(orderClause).Find(&finishedList)

	utils.SendSuccess(c, "Daftar proses jadi", finishedList)
}

func (h *AssemblyHandler) CreateAssemblyFinished(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)
	userName := c.GetString("username")
	if userName == "" {
		userName = "ADMIN2"
	}

	var req struct {
		WarehouseID       uuid.UUID  `json:"warehouse_id" binding:"required"`
		AssemblyProcessID *uuid.UUID `json:"assembly_process_id"`
		CustomerCode      string     `json:"customer_code"`
		CustomerName      string     `json:"customer_name"`
		ProductID         *uuid.UUID `json:"product_id"`
		ProductName       string     `json:"product_name"`
		TotalProcess      float64    `json:"total_process"`
		Date              *string    `json:"date"`
		Notes             string     `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data proses jadi tidak valid", err.Error())
		return
	}

	if req.TotalProcess <= 0 {
		req.TotalProcess = 1
	}

	tx := database.DB.Begin()

	finishedNo, err := services.GenerateDocNumber(tx, companyID, "PJ")
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat nomor proses jadi", err.Error())
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

	custCode := req.CustomerCode
	custName := req.CustomerName
	prodID := req.ProductID
	prodName := req.ProductName

	// If linked to AssemblyProcess
	if req.AssemblyProcessID != nil && *req.AssemblyProcessID != uuid.Nil {
		var ap models.AssemblyProcess
		if err := tx.First(&ap, *req.AssemblyProcessID).Error; err == nil {
			if custCode == "" {
				custCode = ap.CustomerCode
			}
			if custName == "" {
				custName = ap.CustomerName
			}
			if prodID == nil || *prodID == uuid.Nil {
				prodID = ap.ProductID
			}
			if prodName == "" {
				prodName = ap.ProductName
			}

			// Update finished qty on process
			ap.FinishedQty += req.TotalProcess
			if ap.FinishedQty >= ap.ProcessQty {
				ap.Status = "COMPLETED"
			}
			tx.Save(&ap)
		}
	}

	finished := models.AssemblyFinished{
		CompanyID:         companyID,
		BranchID:          branchID,
		WarehouseID:       req.WarehouseID,
		AssemblyProcessID: req.AssemblyProcessID,
		FinishedNo:        finishedNo,
		Date:              txnDate,
		CustomerCode:      custCode,
		CustomerName:      custName,
		ProductID:         prodID,
		ProductName:       prodName,
		TotalProcess:      req.TotalProcess,
		Notes:             req.Notes,
		Status:            "COMPLETED",
		CreatedBy:         userID,
		CreatedByName:     userName,
	}

	if err := tx.Create(&finished).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat proses jadi", err.Error())
		return
	}

	// If product is linked, add finished goods to stock
	if prodID != nil && *prodID != uuid.Nil {
		_, _ = services.MutateStock(tx, services.StockMutationParams{
			CompanyID:    companyID,
			BranchID:     branchID,
			WarehouseID:  req.WarehouseID,
			ProductID:    *prodID,
			DocType:      "ASSEMBLY_FIN",
			DocNo:        finishedNo,
			MovementType: "IN",
			Qty:          req.TotalProcess,
			UnitCost:     0,
			Notes:        fmt.Sprintf("Barang Jadi Hasil Perakitan: %s", finishedNo),
			CreatedBy:    userID,
		})
	}

	tx.Commit()
	utils.SendCreated(c, "Proses jadi berhasil dibuat", finished)
}

func (h *AssemblyHandler) UpdateAssemblyFinished(c *gin.Context) {
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

	var finished models.AssemblyFinished
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&finished).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Proses jadi tidak ditemukan", nil)
		return
	}

	var req struct {
		CustomerCode *string  `json:"customer_code"`
		CustomerName *string  `json:"customer_name"`
		ProductName  *string  `json:"product_name"`
		TotalProcess *float64 `json:"total_process"`
		Notes        *string  `json:"notes"`
		Status       *string  `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	if req.CustomerCode != nil {
		finished.CustomerCode = *req.CustomerCode
	}
	if req.CustomerName != nil {
		finished.CustomerName = *req.CustomerName
	}
	if req.ProductName != nil {
		finished.ProductName = *req.ProductName
	}
	if req.TotalProcess != nil {
		finished.TotalProcess = *req.TotalProcess
	}
	if req.Notes != nil {
		finished.Notes = *req.Notes
	}
	if req.Status != nil {
		finished.Status = *req.Status
	}
	finished.UpdatedBy = &userID
	finished.UpdatedByName = userName

	if err := database.DB.Save(&finished).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal mengupdate proses jadi", err.Error())
		return
	}

	utils.SendSuccess(c, "Proses jadi berhasil diperbarui", finished)
}

func (h *AssemblyHandler) DeleteAssemblyFinished(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", nil)
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.AssemblyFinished{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus proses jadi", err.Error())
		return
	}

	utils.SendSuccess(c, "Proses jadi berhasil dihapus", nil)
}
