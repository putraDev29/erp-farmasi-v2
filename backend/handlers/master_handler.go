package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MasterHandler struct{}

func NewMasterHandler() *MasterHandler {
	return &MasterHandler{}
}

// Products
func (h *MasterHandler) GetProducts(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	warehouseID := c.Query("warehouse_id")
	categoryID := c.Query("category_id")
	brandID := c.Query("brand_id")
	prodType := c.Query("type")
	rack := c.Query("rack")
	stockOption := c.Query("stock_option")
	discontinued := c.Query("discontinued")
	sortBy := c.DefaultQuery("sort_by", "code")
	sortDir := c.DefaultQuery("sort_dir", "asc")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "25"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 25
	}

	query := database.DB.Model(&models.Product{}).
		Where("company_id = ?", companyID).
		Preload("Category").Preload("SubCategory").Preload("Brand").Preload("BaseUnit").
		Preload("Supplier").Preload("StockBalances")

	if search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ? OR barcode ILIKE ? OR sku ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if categoryID != "" && categoryID != "ALL" && categoryID != "Semua" {
		query = query.Where("category_id = ?", categoryID)
	}
	if brandID != "" && brandID != "ALL" && brandID != "Semua" {
		query = query.Where("brand_id = ?", brandID)
	}
	if prodType != "" && prodType != "ALL" && prodType != "Semua" {
		query = query.Where("type = ?", prodType)
	}
	if rack != "" {
		query = query.Where("rack ILIKE ?", "%"+rack+"%")
	}
	if discontinued == "true" {
		query = query.Where("sales_status IN ('TIDAK_DIJUAL', 'BISA_BELI_TIDAK_DIJUAL')")
	} else if discontinued == "false" {
		query = query.Where("sales_status = 'MASIH_DIJUAL'")
	}

	// Order by clause
	direction := "ASC"
	if strings.ToLower(sortDir) == "desc" {
		direction = "DESC"
	}
	orderClause := "code " + direction
	switch strings.ToLower(sortBy) {
	case "name":
		orderClause = "name " + direction
	case "purchase_price":
		orderClause = "purchase_price " + direction
	case "selling_price":
		orderClause = "selling_price " + direction
	case "rack":
		orderClause = "rack " + direction
	default:
		orderClause = "code " + direction
	}

	var total int64
	query.Count(&total)

	var products []models.Product
	query.Offset((page - 1) * pageSize).Limit(pageSize).Order(orderClause).Find(&products)

	// Calculate and assign TotalStock and AvgCost per product
	for i := range products {
		var totalQty float64
		var totalCost float64
		var countBalance float64
		for _, sb := range products[i].StockBalances {
			if warehouseID == "" || sb.WarehouseID.String() == warehouseID {
				totalQty += sb.Qty
				if sb.AvgCost > 0 {
					totalCost += sb.AvgCost
					countBalance++
				}
			}
		}
		products[i].TotalStock = totalQty
		if countBalance > 0 {
			products[i].AvgCost = totalCost / countBalance
		} else {
			products[i].AvgCost = products[i].PurchasePrice
		}
	}

	// Optional filtering by stock level in memory if requested
	if stockOption != "" && stockOption != "ALL" && stockOption != "Semua Data" {
		var filtered []models.Product
		for _, p := range products {
			switch stockOption {
			case "STOK_ADA":
				if p.TotalStock > 0 {
					filtered = append(filtered, p)
				}
			case "STOK_KOSONG":
				if p.TotalStock == 0 {
					filtered = append(filtered, p)
				}
			case "STOK_MINUS":
				if p.TotalStock < 0 {
					filtered = append(filtered, p)
				}
			case "STOK_MINIMUM":
				if p.TotalStock <= p.MinStock {
					filtered = append(filtered, p)
				}
			default:
				filtered = append(filtered, p)
			}
		}
		products = filtered
	}

	utils.SendPaginated(c, "Daftar produk", products, total, page, pageSize)
}

func (h *MasterHandler) GetProductByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var product models.Product
	if err := database.DB.
		Preload("Category").Preload("SubCategory").Preload("Brand").Preload("BaseUnit").
		Preload("Supplier").Preload("ShareWarehouse").
		Preload("CogsAccount").Preload("SalesAccount").Preload("ServiceRevenueAccount").
		Preload("InventoryAccount").Preload("NonInventoryAccount").Preload("WipAccount").
		Preload("AssemblyLaborAccount").Preload("AssemblyOverheadAccount").
		Preload("Conversions.ToUnit").Preload("Prices").
		Preload("Discounts").Preload("Images").
		First(&product, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Produk tidak ditemukan", err.Error())
		return
	}

	utils.SendSuccess(c, "Detail produk", product)
}

func (h *MasterHandler) CreateProduct(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data produk tidak valid", err.Error())
		return
	}

	product.CompanyID = companyID

	// Auto generate code if empty or "Auto"
	if product.Code == "" || product.Code == "Auto" || product.Code == "AUTO" {
		var count int64
		database.DB.Model(&models.Product{}).Where("company_id = ?", companyID).Count(&count)
		product.Code = fmt.Sprintf("ITM-%04d", count+1)
		var existingCount int64
		for {
			database.DB.Model(&models.Product{}).Where("company_id = ? AND code = ?", companyID, product.Code).Count(&existingCount)
			if existingCount == 0 {
				break
			}
			count++
			product.Code = fmt.Sprintf("ITM-%04d", count+1)
		}
	}

	tx := database.DB.Begin()
	if err := tx.Create(&product).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusBadRequest, "Gagal menambahkan produk (kode atau barcode mungkin duplikat)", err.Error())
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Produk berhasil ditambahkan", product)
}

func (h *MasterHandler) UpdateProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	var existing models.Product
	if err := database.DB.First(&existing, id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Produk tidak ditemukan", err.Error())
		return
	}

	var payload models.Product
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data produk tidak valid", err.Error())
		return
	}

	payload.ID = id
	payload.CompanyID = existing.CompanyID

	tx := database.DB.Begin()
	// Update discounts if provided
	if len(payload.Discounts) > 0 {
		tx.Where("product_id = ?", id).Delete(&models.ItemDiscount{})
		for i := range payload.Discounts {
			payload.Discounts[i].ProductID = id
		}
	}
	// Update images if provided
	if len(payload.Images) > 0 {
		tx.Where("product_id = ?", id).Delete(&models.ProductImage{})
		for i := range payload.Images {
			payload.Images[i].ProductID = id
		}
	}

	if err := tx.Save(&payload).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusBadRequest, "Gagal memperbarui produk", err.Error())
		return
	}

	tx.Commit()
	utils.SendSuccess(c, "Produk berhasil diperbarui", payload)
}

func (h *MasterHandler) DeleteProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	if err := database.DB.Delete(&models.Product{}, id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus produk", err.Error())
		return
	}

	utils.SendSuccess(c, "Produk berhasil dihapus", nil)
}

// Categories
func (h *MasterHandler) GetCategories(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var categories []models.Category
	query.Order("name ASC").Find(&categories)
	utils.SendSuccess(c, "Daftar kategori", categories)
}

func (h *MasterHandler) CreateCategory(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var cat models.Category
	if err := c.ShouldBindJSON(&cat); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data kategori tidak valid", err.Error())
		return
	}
	cat.CompanyID = companyID
	if strings.TrimSpace(cat.Code) == "" || strings.EqualFold(cat.Code, "auto") {
		var count int64
		database.DB.Model(&models.Category{}).Where("company_id = ?", companyID).Count(&count)
		cat.Code = fmt.Sprintf("KAT-%03d", count+1)
	}
	if err := database.DB.Create(&cat).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat kategori", err.Error())
		return
	}
	utils.SendCreated(c, "Kategori berhasil dibuat", cat)
}

func (h *MasterHandler) UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var cat models.Category
	if err := database.DB.First(&cat, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Kategori tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&cat); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&cat)
	utils.SendSuccess(c, "Kategori berhasil diperbarui", cat)
}

func (h *MasterHandler) DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Category{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus kategori", err.Error())
		return
	}
	utils.SendSuccess(c, "Kategori berhasil dihapus", nil)
}

// Brands
func (h *MasterHandler) GetBrands(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var brands []models.Brand
	query.Order("name ASC").Find(&brands)
	utils.SendSuccess(c, "Daftar merek", brands)
}

func (h *MasterHandler) CreateBrand(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var brand models.Brand
	if err := c.ShouldBindJSON(&brand); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data merek tidak valid", err.Error())
		return
	}
	brand.CompanyID = companyID
	if strings.TrimSpace(brand.Code) == "" || strings.EqualFold(brand.Code, "auto") {
		var count int64
		database.DB.Model(&models.Brand{}).Where("company_id = ?", companyID).Count(&count)
		brand.Code = fmt.Sprintf("MRK-%03d", count+1)
	}
	if err := database.DB.Create(&brand).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat merek", err.Error())
		return
	}
	utils.SendCreated(c, "Merek berhasil dibuat", brand)
}

func (h *MasterHandler) UpdateBrand(c *gin.Context) {
	id := c.Param("id")
	var brand models.Brand
	if err := database.DB.First(&brand, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Merek tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&brand); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&brand)
	utils.SendSuccess(c, "Merek berhasil diperbarui", brand)
}

func (h *MasterHandler) DeleteBrand(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Brand{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus merek", err.Error())
		return
	}
	utils.SendSuccess(c, "Merek berhasil dihapus", nil)
}

// Units
func (h *MasterHandler) GetUnits(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var units []models.Unit
	query.Order("name ASC").Find(&units)
	utils.SendSuccess(c, "Daftar satuan", units)
}

func (h *MasterHandler) CreateUnit(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var unit models.Unit
	if err := c.ShouldBindJSON(&unit); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data satuan tidak valid", err.Error())
		return
	}
	unit.CompanyID = companyID
	if strings.TrimSpace(unit.Code) == "" || strings.EqualFold(unit.Code, "auto") {
		if strings.TrimSpace(unit.Name) != "" {
			unit.Code = strings.ToUpper(strings.TrimSpace(unit.Name))
			if len(unit.Code) > 15 {
				unit.Code = unit.Code[:15]
			}
		} else {
			var count int64
			database.DB.Model(&models.Unit{}).Where("company_id = ?", companyID).Count(&count)
			unit.Code = fmt.Sprintf("STN-%02d", count+1)
		}
	}
	if strings.TrimSpace(unit.Name) == "" {
		unit.Name = unit.Code
	}
	if err := database.DB.Create(&unit).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat satuan", err.Error())
		return
	}
	utils.SendCreated(c, "Satuan berhasil dibuat", unit)
}

func (h *MasterHandler) UpdateUnit(c *gin.Context) {
	id := c.Param("id")
	var unit models.Unit
	if err := database.DB.First(&unit, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Satuan tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&unit); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&unit)
	utils.SendSuccess(c, "Satuan berhasil diperbarui", unit)
}

func (h *MasterHandler) DeleteUnit(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Unit{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus satuan", err.Error())
		return
	}
	utils.SendSuccess(c, "Satuan berhasil dihapus", nil)
}

// Suppliers
func (h *MasterHandler) GetSuppliers(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	sortBy := c.DefaultQuery("sort_by", "name")
	sortDir := c.DefaultQuery("sort_dir", "asc")

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(address) LIKE ? OR LOWER(phone) LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	orderClause := "name ASC"
	switch sortBy {
	case "code":
		orderClause = "code " + sortDir
	case "city":
		orderClause = "city " + sortDir
	default:
		orderClause = "name " + sortDir
	}

	var suppliers []models.Supplier
	query.Order(orderClause).Find(&suppliers)
	utils.SendSuccess(c, "Daftar pemasok", suppliers)
}

func (h *MasterHandler) CreateSupplier(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var sup models.Supplier
	if err := c.ShouldBindJSON(&sup); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pemasok tidak valid", err.Error())
		return
	}
	sup.CompanyID = companyID
	if strings.TrimSpace(sup.Code) == "" || strings.EqualFold(sup.Code, "auto") {
		var count int64
		database.DB.Model(&models.Supplier{}).Where("company_id = ?", companyID).Count(&count)
		sup.Code = fmt.Sprintf("SUP-%04d", count+1)
	}
	if err := database.DB.Create(&sup).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pemasok", err.Error())
		return
	}
	utils.SendCreated(c, "Pemasok berhasil dibuat", sup)
}

func (h *MasterHandler) UpdateSupplier(c *gin.Context) {
	id := c.Param("id")
	var sup models.Supplier
	if err := database.DB.First(&sup, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pemasok tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&sup); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&sup)
	utils.SendSuccess(c, "Pemasok berhasil diperbarui", sup)
}

func (h *MasterHandler) DeleteSupplier(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Supplier{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pemasok", err.Error())
		return
	}
	utils.SendSuccess(c, "Pemasok berhasil dihapus", nil)
}

// Customers
func (h *MasterHandler) GetCustomers(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	sortBy := c.DefaultQuery("sort_by", "name")
	sortDir := c.DefaultQuery("sort_dir", "asc")

	query := database.DB.Where("company_id = ?", companyID).Preload("CustomerGroup").Preload("Territory")
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(address) LIKE ? OR LOWER(phone) LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	orderClause := "name ASC"
	switch sortBy {
	case "code":
		orderClause = "code " + sortDir
	case "total_spent":
		orderClause = "total_spent " + sortDir
	default:
		orderClause = "name " + sortDir
	}

	var customers []models.Customer
	query.Order(orderClause).Find(&customers)
	utils.SendSuccess(c, "Daftar pelanggan", customers)
}

func (h *MasterHandler) CreateCustomer(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var cust models.Customer
	if err := c.ShouldBindJSON(&cust); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pelanggan tidak valid", err.Error())
		return
	}
	cust.CompanyID = companyID
	if strings.TrimSpace(cust.Code) == "" || strings.EqualFold(cust.Code, "auto") {
		var count int64
		database.DB.Model(&models.Customer{}).Where("company_id = ?", companyID).Count(&count)
		cust.Code = fmt.Sprintf("CUST-%04d", count+1)
	}
	if err := database.DB.Create(&cust).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat pelanggan", err.Error())
		return
	}
	utils.SendCreated(c, "Pelanggan berhasil dibuat", cust)
}

func (h *MasterHandler) UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	var cust models.Customer
	if err := database.DB.First(&cust, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Pelanggan tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&cust); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&cust)
	utils.SendSuccess(c, "Pelanggan berhasil diperbarui", cust)
}

func (h *MasterHandler) DeleteCustomer(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Customer{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus pelanggan", err.Error())
		return
	}
	utils.SendSuccess(c, "Pelanggan berhasil dihapus", nil)
}

// Sales Representatives
func (h *MasterHandler) GetSalesReps(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}
	sortBy := c.DefaultQuery("sort_by", "name")
	sortDir := c.DefaultQuery("sort_dir", "asc")

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(phone) LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern)
	}

	orderClause := "name " + sortDir
	if sortBy == "code" {
		orderClause = "code " + sortDir
	} else if sortBy == "city" {
		orderClause = "city " + sortDir
	}

	var reps []models.SalesRepresentative
	query.Order(orderClause).Find(&reps)
	utils.SendSuccess(c, "Daftar sales", reps)
}

func (h *MasterHandler) CreateSalesRep(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var rep models.SalesRepresentative
	if err := c.ShouldBindJSON(&rep); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data sales tidak valid", err.Error())
		return
	}
	rep.CompanyID = companyID
	if strings.TrimSpace(rep.Code) == "" || strings.EqualFold(rep.Code, "auto") {
		var count int64
		database.DB.Model(&models.SalesRepresentative{}).Where("company_id = ?", companyID).Count(&count)
		rep.Code = fmt.Sprintf("SLS-%03d", count+1)
	}
	if err := database.DB.Create(&rep).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat data sales", err.Error())
		return
	}
	utils.SendCreated(c, "Sales berhasil dibuat", rep)
}

func (h *MasterHandler) UpdateSalesRep(c *gin.Context) {
	id := c.Param("id")
	var rep models.SalesRepresentative
	if err := database.DB.First(&rep, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Sales tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&rep); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&rep)
	utils.SendSuccess(c, "Sales berhasil diperbarui", rep)
}

func (h *MasterHandler) DeleteSalesRep(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.SalesRepresentative{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus sales", err.Error())
		return
	}
	utils.SendSuccess(c, "Sales berhasil dihapus", nil)
}

// Customer Groups
func (h *MasterHandler) GetCustomerGroups(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ?", searchPattern, searchPattern)
	}

	var groups []models.CustomerGroup
	query.Order("name ASC").Find(&groups)
	utils.SendSuccess(c, "Daftar grup pelanggan", groups)
}

func (h *MasterHandler) CreateCustomerGroup(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var group models.CustomerGroup
	if err := c.ShouldBindJSON(&group); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data grup pelanggan tidak valid", err.Error())
		return
	}
	group.CompanyID = companyID
	if strings.TrimSpace(group.Code) == "" || strings.EqualFold(group.Code, "auto") {
		var count int64
		database.DB.Model(&models.CustomerGroup{}).Where("company_id = ?", companyID).Count(&count)
		group.Code = fmt.Sprintf("GRP-%02d", count+1)
	}
	if err := database.DB.Create(&group).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat grup pelanggan", err.Error())
		return
	}
	utils.SendCreated(c, "Grup pelanggan berhasil dibuat", group)
}

func (h *MasterHandler) UpdateCustomerGroup(c *gin.Context) {
	id := c.Param("id")
	var group models.CustomerGroup
	if err := database.DB.First(&group, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Grup pelanggan tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&group); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&group)
	utils.SendSuccess(c, "Grup pelanggan berhasil diperbarui", group)
}

func (h *MasterHandler) DeleteCustomerGroup(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.CustomerGroup{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus grup pelanggan", err.Error())
		return
	}
	utils.SendSuccess(c, "Grup pelanggan berhasil dihapus", nil)
}

// Territories
func (h *MasterHandler) GetTerritories(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ?", searchPattern, searchPattern)
	}

	var territories []models.Territory
	query.Order("name ASC").Find(&territories)
	utils.SendSuccess(c, "Daftar wilayah", territories)
}

func (h *MasterHandler) CreateTerritory(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var t models.Territory
	if err := c.ShouldBindJSON(&t); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data wilayah tidak valid", err.Error())
		return
	}
	t.CompanyID = companyID
	if strings.TrimSpace(t.Code) == "" || strings.EqualFold(t.Code, "auto") {
		var count int64
		database.DB.Model(&models.Territory{}).Where("company_id = ?", companyID).Count(&count)
		t.Code = fmt.Sprintf("WIL-%03d", count+1)
	}
	if err := database.DB.Create(&t).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat wilayah", err.Error())
		return
	}
	utils.SendCreated(c, "Wilayah berhasil dibuat", t)
}

func (h *MasterHandler) UpdateTerritory(c *gin.Context) {
	id := c.Param("id")
	var t models.Territory
	if err := database.DB.First(&t, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Wilayah tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&t); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&t)
	utils.SendSuccess(c, "Wilayah berhasil diperbarui", t)
}

func (h *MasterHandler) DeleteTerritory(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Territory{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus wilayah", err.Error())
		return
	}
	utils.SendSuccess(c, "Wilayah berhasil dihapus", nil)
}

// Sub Territories
func (h *MasterHandler) GetSubTerritories(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID).Preload("Territory")
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ?", searchPattern, searchPattern)
	}

	var subTerritories []models.SubTerritory
	query.Order("name ASC").Find(&subTerritories)
	utils.SendSuccess(c, "Daftar sub wilayah", subTerritories)
}

func (h *MasterHandler) CreateSubTerritory(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var st models.SubTerritory
	if err := c.ShouldBindJSON(&st); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data sub wilayah tidak valid", err.Error())
		return
	}
	st.CompanyID = companyID
	if strings.TrimSpace(st.Code) == "" || strings.EqualFold(st.Code, "auto") {
		var count int64
		database.DB.Model(&models.SubTerritory{}).Where("company_id = ?", companyID).Count(&count)
		st.Code = fmt.Sprintf("SWIL-%03d", count+1)
	}
	if err := database.DB.Create(&st).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat sub wilayah", err.Error())
		return
	}
	utils.SendCreated(c, "Sub wilayah berhasil dibuat", st)
}

func (h *MasterHandler) UpdateSubTerritory(c *gin.Context) {
	id := c.Param("id")
	var st models.SubTerritory
	if err := database.DB.First(&st, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Sub wilayah tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&st); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&st)
	utils.SendSuccess(c, "Sub wilayah berhasil diperbarui", st)
}

func (h *MasterHandler) DeleteSubTerritory(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.SubTerritory{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus sub wilayah", err.Error())
		return
	}
	utils.SendSuccess(c, "Sub wilayah berhasil dihapus", nil)
}

// Periodic Discounts
func (h *MasterHandler) GetPeriodicDiscounts(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var list []models.PeriodicDiscount
	database.DB.Where("company_id = ?", companyID).Order("priority ASC").Find(&list)
	utils.SendSuccess(c, "Daftar diskon periode", list)
}

func (h *MasterHandler) CreatePeriodicDiscount(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var item models.PeriodicDiscount
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data diskon tidak valid", err.Error())
		return
	}
	item.CompanyID = companyID
	if err := database.DB.Create(&item).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat diskon", err.Error())
		return
	}
	utils.SendCreated(c, "Diskon periode berhasil dibuat", item)
}

func (h *MasterHandler) UpdatePeriodicDiscount(c *gin.Context) {
	id := c.Param("id")
	var item models.PeriodicDiscount
	if err := database.DB.First(&item, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Diskon tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&item)
	utils.SendSuccess(c, "Diskon periode berhasil diperbarui", item)
}

func (h *MasterHandler) DeletePeriodicDiscount(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.PeriodicDiscount{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus diskon", err.Error())
		return
	}
	utils.SendSuccess(c, "Diskon periode berhasil dihapus", nil)
}

// Periodic Promotions
func (h *MasterHandler) GetPeriodicPromotions(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var list []models.PeriodicPromotion
	database.DB.Where("company_id = ?", companyID).Order("priority ASC").Find(&list)
	utils.SendSuccess(c, "Daftar periode promosi", list)
}

func (h *MasterHandler) CreatePeriodicPromotion(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var item models.PeriodicPromotion
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data promosi tidak valid", err.Error())
		return
	}
	item.CompanyID = companyID
	if err := database.DB.Create(&item).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat promosi", err.Error())
		return
	}
	utils.SendCreated(c, "Periode promosi berhasil dibuat", item)
}

func (h *MasterHandler) UpdatePeriodicPromotion(c *gin.Context) {
	id := c.Param("id")
	var item models.PeriodicPromotion
	if err := database.DB.First(&item, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Promosi tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&item)
	utils.SendSuccess(c, "Periode promosi berhasil diperbarui", item)
}

func (h *MasterHandler) DeletePeriodicPromotion(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.PeriodicPromotion{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus promosi", err.Error())
		return
	}
	utils.SendSuccess(c, "Periode promosi berhasil dihapus", nil)
}

// Tebus Murah Promotions
func (h *MasterHandler) GetTebusMurahPromotions(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var list []models.TebusMurahPromotion
	database.DB.Where("company_id = ?", companyID).Order("priority ASC").Find(&list)
	utils.SendSuccess(c, "Daftar periode tebus murah", list)
}

func (h *MasterHandler) CreateTebusMurahPromotion(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var item models.TebusMurahPromotion
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tebus murah tidak valid", err.Error())
		return
	}
	item.CompanyID = companyID
	if err := database.DB.Create(&item).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat tebus murah", err.Error())
		return
	}
	utils.SendCreated(c, "Periode tebus murah berhasil dibuat", item)
}

func (h *MasterHandler) UpdateTebusMurahPromotion(c *gin.Context) {
	id := c.Param("id")
	var item models.TebusMurahPromotion
	if err := database.DB.First(&item, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Tebus murah tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&item)
	utils.SendSuccess(c, "Periode tebus murah berhasil diperbarui", item)
}

func (h *MasterHandler) DeleteTebusMurahPromotion(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.TebusMurahPromotion{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus tebus murah", err.Error())
		return
	}
	utils.SendSuccess(c, "Periode tebus murah berhasil dihapus", nil)
}

// Customer Point Settings
func (h *MasterHandler) GetCustomerPointSettings(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var setting models.CustomerPointSetting
	err := database.DB.Where("company_id = ?", companyID).First(&setting).Error
	if err != nil {
		// Provide default values if not exists yet
		setting = models.CustomerPointSetting{
			CompanyID:              companyID,
			PointType:              "TIDAK_MEMAKAI",
			InvoiceMultipleAmount:  100000,
			CollectStartDate:       "2023-01-01",
			CollectEndDate:         "2026-12-31",
			RedeemStartDate:        "2023-01-01",
			RedeemEndDate:          "2026-12-31",
			GeneralCustomerName:    "KASIR",
			NonMemberEarnPoints:    false,
			PrintNoteDefault:       "Point Transaksi : [PNT], Periode penukaran Point dari [TTD] s/d [TTS]. Kumpulkan sebanyak banyaknya dapatkan hadiahnya.",
			PointRedeemValue:       100,
			PointValidityDays:      30,
			ShowClaimButtonInSales: false,
			PrintNoteVoucher:       "Nilai Point Nominal [PNT]. Tukarkan sebagai Voucher belanja, sampai tanggal [TBP]",
			PrintNoteGift:          "Point Transaksi : [PNT], Periode penukaran Point dari [TTD] s/d [TTS], Kumpulkan sebanyak banyaknya dapatkan hadiahnya, Total Point : [TOP]",
		}
		database.DB.Create(&setting)
	}
	utils.SendSuccess(c, "Pengaturan point pelanggan", setting)
}

func (h *MasterHandler) UpdateCustomerPointSettings(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var setting models.CustomerPointSetting
	err := database.DB.Where("company_id = ?", companyID).First(&setting).Error
	if err != nil {
		setting.CompanyID = companyID
	}
	if err := c.ShouldBindJSON(&setting); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data pengaturan tidak valid", err.Error())
		return
	}
	setting.CompanyID = companyID
	database.DB.Save(&setting)
	utils.SendSuccess(c, "Pengaturan point pelanggan berhasil disimpan", setting)
}

// Banks
func (h *MasterHandler) GetBanks(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ?", searchPattern, searchPattern)
	}

	var banks []models.Bank
	query.Order("name ASC").Find(&banks)
	utils.SendSuccess(c, "Daftar rekening bank", banks)
}

func (h *MasterHandler) CreateBank(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var bank models.Bank
	if err := c.ShouldBindJSON(&bank); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data bank tidak valid", err.Error())
		return
	}
	bank.CompanyID = companyID
	if strings.TrimSpace(bank.Code) == "" || strings.EqualFold(bank.Code, "auto") {
		var count int64
		database.DB.Model(&models.Bank{}).Where("company_id = ?", companyID).Count(&count)
		bank.Code = fmt.Sprintf("BNK-%02d", count+1)
	}
	if err := database.DB.Create(&bank).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat bank", err.Error())
		return
	}
	utils.SendCreated(c, "Bank berhasil dibuat", bank)
}

func (h *MasterHandler) UpdateBank(c *gin.Context) {
	id := c.Param("id")
	var bank models.Bank
	if err := database.DB.First(&bank, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Bank tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&bank); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&bank)
	utils.SendSuccess(c, "Bank berhasil diperbarui", bank)
}

func (h *MasterHandler) DeleteBank(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Bank{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus bank", err.Error())
		return
	}
	utils.SendSuccess(c, "Bank berhasil dihapus", nil)
}

// Variants
func (h *MasterHandler) GetVariants(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var variants []models.Variant
	query.Order("name ASC").Find(&variants)
	utils.SendSuccess(c, "Daftar varian", variants)
}

func (h *MasterHandler) CreateVariant(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var v models.Variant
	if err := c.ShouldBindJSON(&v); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data varian tidak valid", err.Error())
		return
	}
	v.CompanyID = companyID
	if err := database.DB.Create(&v).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat varian", err.Error())
		return
	}
	utils.SendCreated(c, "Varian berhasil dibuat", v)
}

func (h *MasterHandler) UpdateVariant(c *gin.Context) {
	id := c.Param("id")
	var v models.Variant
	if err := database.DB.First(&v, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Varian tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&v); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&v)
	utils.SendSuccess(c, "Varian berhasil diperbarui", v)
}

func (h *MasterHandler) DeleteVariant(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Variant{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus varian", err.Error())
		return
	}
	utils.SendSuccess(c, "Varian berhasil dihapus", nil)
}

// E-Money
func (h *MasterHandler) GetEMoneys(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var emoneys []models.EMoney
	query.Order("name ASC").Find(&emoneys)
	utils.SendSuccess(c, "Daftar e-money", emoneys)
}

func (h *MasterHandler) CreateEMoney(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var em models.EMoney
	if err := c.ShouldBindJSON(&em); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data e-money tidak valid", err.Error())
		return
	}
	em.CompanyID = companyID
	if strings.TrimSpace(em.Code) == "" || strings.EqualFold(em.Code, "auto") {
		var count int64
		database.DB.Model(&models.EMoney{}).Where("company_id = ?", companyID).Count(&count)
		em.Code = fmt.Sprintf("EMN-%02d", count+1)
	}
	if err := database.DB.Create(&em).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat e-money", err.Error())
		return
	}
	utils.SendCreated(c, "E-Money berhasil dibuat", em)
}

func (h *MasterHandler) UpdateEMoney(c *gin.Context) {
	id := c.Param("id")
	var em models.EMoney
	if err := database.DB.First(&em, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "E-Money tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&em); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&em)
	utils.SendSuccess(c, "E-Money berhasil diperbarui", em)
}

func (h *MasterHandler) DeleteEMoney(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.EMoney{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus e-money", err.Error())
		return
	}
	utils.SendSuccess(c, "E-Money berhasil dihapus", nil)
}

// Shipping Fees / Ongkir
func (h *MasterHandler) GetShippingFees(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	expedition := c.Query("expedition")
	fromCity := c.Query("from_city")
	toCity := c.Query("to_city")
	sortBy := c.DefaultQuery("sort_by", "expedition")
	sortDir := c.DefaultQuery("sort_dir", "asc")

	query := database.DB.Where("company_id = ?", companyID)
	if expedition != "" {
		query = query.Where("LOWER(expedition) LIKE ?", "%"+strings.ToLower(expedition)+"%")
	}
	if fromCity != "" {
		query = query.Where("LOWER(from_city) LIKE ?", "%"+strings.ToLower(fromCity)+"%")
	}
	if toCity != "" {
		query = query.Where("LOWER(to_city) LIKE ?", "%"+strings.ToLower(toCity)+"%")
	}

	orderClause := "expedition ASC"
	switch sortBy {
	case "from_city":
		orderClause = "from_city " + sortDir
	case "to_city":
		orderClause = "to_city " + sortDir
	default:
		orderClause = "expedition " + sortDir
	}

	var fees []models.ShippingFee
	query.Order(orderClause).Find(&fees)
	utils.SendSuccess(c, "Daftar ongkir", fees)
}

func (h *MasterHandler) CreateShippingFee(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var fee models.ShippingFee
	if err := c.ShouldBindJSON(&fee); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data ongkir tidak valid", err.Error())
		return
	}
	fee.CompanyID = companyID
	if fee.Country == "" {
		fee.Country = "Indonesia"
	}
	if err := database.DB.Create(&fee).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat ongkir", err.Error())
		return
	}
	utils.SendCreated(c, "Ongkir berhasil dibuat", fee)
}

func (h *MasterHandler) UpdateShippingFee(c *gin.Context) {
	id := c.Param("id")
	var fee models.ShippingFee
	if err := database.DB.First(&fee, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Ongkir tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&fee); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&fee)
	utils.SendSuccess(c, "Ongkir berhasil diperbarui", fee)
}

func (h *MasterHandler) DeleteShippingFee(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.ShippingFee{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus ongkir", err.Error())
		return
	}
	utils.SendSuccess(c, "Ongkir berhasil dihapus", nil)
}

// Sub Categories
func (h *MasterHandler) GetSubCategories(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")
	if search == "" {
		search = c.Query("q")
	}

	query := database.DB.Where("company_id = ?", companyID).Preload("Category")
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var subCats []models.SubCategory
	query.Order("name ASC").Find(&subCats)
	utils.SendSuccess(c, "Daftar sub jenis", subCats)
}

func (h *MasterHandler) CreateSubCategory(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var subCat models.SubCategory
	if err := c.ShouldBindJSON(&subCat); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data sub jenis tidak valid", err.Error())
		return
	}
	subCat.CompanyID = companyID
	if strings.TrimSpace(subCat.Code) == "" || strings.EqualFold(subCat.Code, "auto") {
		var count int64
		database.DB.Model(&models.SubCategory{}).Where("company_id = ?", companyID).Count(&count)
		subCat.Code = fmt.Sprintf("SKAT-%03d", count+1)
	}
	if err := database.DB.Create(&subCat).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat sub jenis", err.Error())
		return
	}
	utils.SendCreated(c, "Sub jenis berhasil dibuat", subCat)
}

func (h *MasterHandler) UpdateSubCategory(c *gin.Context) {
	id := c.Param("id")
	var subCat models.SubCategory
	if err := database.DB.First(&subCat, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Sub jenis tidak ditemukan", err.Error())
		return
	}
	if err := c.ShouldBindJSON(&subCat); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}
	database.DB.Save(&subCat)
	utils.SendSuccess(c, "Sub jenis berhasil diperbarui", subCat)
}

func (h *MasterHandler) DeleteSubCategory(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.SubCategory{}, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus sub jenis", err.Error())
		return
	}
	utils.SendSuccess(c, "Sub jenis berhasil dihapus", nil)
}

// Payment Methods
func (h *MasterHandler) GetPaymentMethods(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var pms []models.PaymentMethod
	database.DB.Where("company_id = ?", companyID).Preload("Bank").Order("name ASC").Find(&pms)
	utils.SendSuccess(c, "Daftar metode pembayaran", pms)
}
