package handlers

import (
	"fmt"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) GetSummary(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	// 1. Sales metrics
	var salesCount int64
	var totalSalesAmount float64
	database.DB.Model(&models.Sale{}).Where("company_id = ? AND status = 'POSTED'", companyID).Count(&salesCount)
	database.DB.Model(&models.Sale{}).Where("company_id = ? AND status = 'POSTED'", companyID).Select("COALESCE(SUM(total_amount), 0)").Scan(&totalSalesAmount)

	// 2. Purchases metrics
	var purchasesCount int64
	var totalPurchasesAmount float64
	database.DB.Model(&models.Purchase{}).Where("company_id = ? AND status = 'POSTED'", companyID).Count(&purchasesCount)
	database.DB.Model(&models.Purchase{}).Where("company_id = ? AND status = 'POSTED'", companyID).Select("COALESCE(SUM(total_amount), 0)").Scan(&totalPurchasesAmount)

	// 3. Receivables & Payables
	var totalReceivables float64
	database.DB.Model(&models.Sale{}).Where("company_id = ? AND status NOT IN ('CANCELLED', 'DRAFT')", companyID).Select("COALESCE(SUM(remaining_amount), 0)").Scan(&totalReceivables)

	var totalPayables float64
	database.DB.Model(&models.Purchase{}).Where("company_id = ? AND status NOT IN ('CANCELLED', 'DRAFT')", companyID).Select("COALESCE(SUM(remaining_amount), 0)").Scan(&totalPayables)

	// 4. Cash & Bank balance from COA
	var cashBankBalance float64
	database.DB.Model(&models.Account{}).Where("company_id = ? AND subtype = 'CASH_BANK'", companyID).Select("COALESCE(SUM(balance), 0)").Scan(&cashBankBalance)

	// 5. Inventory Valuation
	var inventoryValuation float64
	database.DB.Model(&models.StockBalance{}).
		Select("COALESCE(SUM(qty * avg_cost), 0)").Scan(&inventoryValuation)

	// 6. Low stock products count
	var lowStockCount int64
	database.DB.Model(&models.StockBalance{}).
		Joins("JOIN products ON products.id = stock_balances.product_id").
		Where("stock_balances.available_qty <= products.min_stock").
		Count(&lowStockCount)

	// 7. Recent Transactions (latest 5 sales)
	var recentSales []models.Sale
	database.DB.Where("company_id = ?", companyID).
		Preload("Customer").Order("created_at DESC").Limit(5).Find(&recentSales)

	// 8. Monthly Sales & Purchase chart data (last 6 months)
	type MonthlyMetric struct {
		Month     string  `json:"month"`
		Sales     float64 `json:"sales"`
		Purchases float64 `json:"purchases"`
	}

	var chartData []MonthlyMetric
	now := time.Now()
	for i := 5; i >= 0; i-- {
		t := now.AddDate(0, -i, 0)
		monthLabel := t.Format("Jan 2006")
		startOfMonth := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

		var mSales, mPurchases float64
		database.DB.Model(&models.Sale{}).
			Where("company_id = ? AND status = 'POSTED' AND date >= ? AND date <= ?", companyID, startOfMonth, endOfMonth).
			Select("COALESCE(SUM(total_amount), 0)").Scan(&mSales)

		database.DB.Model(&models.Purchase{}).
			Where("company_id = ? AND status = 'POSTED' AND date >= ? AND date <= ?", companyID, startOfMonth, endOfMonth).
			Select("COALESCE(SUM(total_amount), 0)").Scan(&mPurchases)

		chartData = append(chartData, MonthlyMetric{
			Month:     monthLabel,
			Sales:     mSales,
			Purchases: mPurchases,
		})
	}

	// 9. Best selling products (top 5)
	type TopProduct struct {
		Name       string  `json:"name"`
		TotalQty   float64 `json:"total_qty"`
		TotalSales float64 `json:"total_sales"`
	}
	var topProducts []TopProduct
	database.DB.Table("sale_items").
		Select("products.name as name, SUM(sale_items.qty) as total_qty, SUM(sale_items.total_amount) as total_sales").
		Joins("JOIN products ON products.id = sale_items.product_id").
		Group("products.name").
		Order("total_qty DESC").
		Limit(5).
		Scan(&topProducts)

	// 10. Gross Profit & Net Profit estimates
	grossProfit := totalSalesAmount - (totalSalesAmount * 0.6) // Based on COGS ~60%
	netProfit := grossProfit - (totalPurchasesAmount * 0.1)

	// 11. Expiring Drugs Alert (≤ 1 Minggu & Sudah Expired)
	todayMidnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	oneWeekFromNow := todayMidnight.AddDate(0, 0, 7).Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	type ExpiringCriticalDrug struct {
		ID            uuid.UUID  `json:"id"`
		Code          string     `json:"code"`
		Name          string     `json:"name"`
		BatchNumber   string     `json:"batch_number"`
		ExpiredDate   *time.Time `json:"expired_date"`
		DaysRemaining int        `json:"days_remaining"`
		Status        string     `json:"status"`
		StatusLabel   string     `json:"status_label"`
		CurrentStock  float64    `json:"current_stock"`
		UnitName      string     `json:"unit_name"`
	}

	var rawExpiringProds []models.Product
	database.DB.Model(&models.Product{}).
		Where("company_id = ? AND expired_date IS NOT NULL AND expired_date <= ?", companyID, oneWeekFromNow).
		Preload("BaseUnit").
		Preload("StockBalances").
		Order("expired_date ASC").
		Find(&rawExpiringProds)

	var expiringCriticalItems []ExpiringCriticalDrug
	for _, p := range rawExpiringProds {
		var stockQty float64
		for _, sb := range p.StockBalances {
			stockQty += sb.AvailableQty
		}

		days := int(time.Date(p.ExpiredDate.Year(), p.ExpiredDate.Month(), p.ExpiredDate.Day(), 0, 0, 0, 0, p.ExpiredDate.Location()).Sub(todayMidnight).Hours() / 24)
		st := "CRITICAL_1_WEEK"
		stLabel := "Kritis (Hari ini)"
		if days < 0 {
			st = "EXPIRED"
			stLabel = fmt.Sprintf("Expired (%d hari lalu)", -days)
		} else if days == 0 {
			stLabel = "Expired Hari Ini"
		} else {
			stLabel = fmt.Sprintf("Expired dlm %d hari", days)
		}

		uName := "PCS"
		if p.BaseUnit != nil {
			uName = p.BaseUnit.Name
		}

		expiringCriticalItems = append(expiringCriticalItems, ExpiringCriticalDrug{
			ID:            p.ID,
			Code:          p.Code,
			Name:          p.Name,
			BatchNumber:   p.BatchNumber,
			ExpiredDate:   p.ExpiredDate,
			DaysRemaining: days,
			Status:        st,
			StatusLabel:   stLabel,
			CurrentStock:  stockQty,
			UnitName:      uName,
		})
	}

	// 12. Data Barang Pembelian yang Masih Proses atau Masih Dalam Pengiriman
	type InProgressPurchaseItem struct {
		ID            uuid.UUID  `json:"id"`
		DocType       string     `json:"doc_type"` // "PO" or "FAKTUR"
		DocNo         string     `json:"doc_no"`
		DocID         uuid.UUID  `json:"doc_id"`
		Date          time.Time  `json:"date"`
		ExpectedDate  *time.Time `json:"expected_date,omitempty"`
		SupplierName  string     `json:"supplier_name"`
		WarehouseName string     `json:"warehouse_name"`
		ProductID     uuid.UUID  `json:"product_id"`
		ProductCode   string     `json:"product_code"`
		ProductName   string     `json:"product_name"`
		UnitName      string     `json:"unit_name"`
		OrderedQty    float64    `json:"ordered_qty"`
		ReceivedQty   float64    `json:"received_qty"`
		PendingQty    float64    `json:"pending_qty"`
		UnitPrice     float64    `json:"unit_price"`
		TotalAmount   float64    `json:"total_amount"`
		Status        string     `json:"status"` // "DALAM_PENGIRIMAN", "MENUNGGU_PENERIMAAN", "VERIFIKASI_GUDANG", "DIPROSES", "SEBAGIAN_DIKIRIM"
		StatusLabel   string     `json:"status_label"`
	}

	var inProgressItems []InProgressPurchaseItem
	uniqueDocMap := make(map[string]bool)
	var totalPendingItems int
	var totalPendingAmount float64
	var inTransitCount int
	var warehouseVerificationCount int

	// 12. Ambil dari Faktur Pembelian (Purchase Invoices) yang sedang menunggu penerimaan / verifikasi fisik gudang (Alur Resmi)
	var inProgressPurchases []models.Purchase
	database.DB.Model(&models.Purchase{}).
		Where("company_id = ? AND status != 'CANCELLED' AND verification_status IN ('MENUNGGU_PENERIMAAN', 'DIPERIKSA_GUDANG', 'VERIFIKASI_GUDANG')", companyID).
		Preload("Supplier").
		Preload("Warehouse").
		Preload("Items.Product").
		Preload("Items.Unit").
		Order("date DESC").
		Limit(100).
		Find(&inProgressPurchases)

	for _, p := range inProgressPurchases {
		suppName := "Supplier / Distributor PBF"
		if p.Supplier != nil && p.Supplier.Name != "" {
			suppName = p.Supplier.Name
		}
		whName := "Gudang Utama Farmasi"
		if p.Warehouse != nil && p.Warehouse.Name != "" {
			whName = p.Warehouse.Name
		}

		st := "MENUNGGU_PENERIMAAN"
		stLabel := "Menunggu Kedatangan Barang PBF"
		if p.VerificationStatus == "DIPERIKSA_GUDANG" || p.VerificationStatus == "VERIFIKASI_GUDANG" {
			st = "VERIFIKASI_GUDANG"
			stLabel = "Pemeriksaan Fisik Gudang"
		}

		for _, it := range p.Items {
			totalPendingItems++
			itemTotal := it.Qty*it.UnitPrice - it.Discount
			totalPendingAmount += itemTotal

			if st == "VERIFIKASI_GUDANG" {
				warehouseVerificationCount++
			} else {
				inTransitCount++
			}

			prodName := "Item Obat"
			prodCode := "-"
			if it.Product != nil {
				prodName = it.Product.Name
				prodCode = it.Product.Code
			}
			unitName := "PCS"
			if it.Unit != nil && it.Unit.Name != "" {
				unitName = it.Unit.Name
			}

			inProgressItems = append(inProgressItems, InProgressPurchaseItem{
				ID:            it.ID,
				DocType:       "FAKTUR",
				DocNo:         p.InvoiceNo,
				DocID:         p.ID,
				Date:          p.Date,
				SupplierName:  suppName,
				WarehouseName: whName,
				ProductID:     it.ProductID,
				ProductCode:   prodCode,
				ProductName:   prodName,
				UnitName:      unitName,
				OrderedQty:    it.Qty,
				ReceivedQty:   0,
				PendingQty:    it.Qty,
				UnitPrice:     it.UnitPrice,
				TotalAmount:   itemTotal,
				Status:        st,
				StatusLabel:   stLabel,
			})
		}
		uniqueDocMap[p.InvoiceNo] = true
	}

	// 13. Peringatan Piutang Jatuh Tempo (Kurang 7 Hari & Overdue)
	type DueReceivableItem struct {
		ID              uuid.UUID `json:"id"`
		InvoiceNo       string    `json:"invoice_no"`
		Date            time.Time `json:"date"`
		DueDate         time.Time `json:"due_date"`
		CustomerID      uuid.UUID `json:"customer_id"`
		CustomerName    string    `json:"customer_name"`
		TotalAmount     float64   `json:"total_amount"`
		RemainingAmount float64   `json:"remaining_amount"`
		DaysRemaining   int       `json:"days_remaining"`
		Status          string    `json:"status"` // "OVERDUE", "TODAY", "DUE_SOON"
		StatusLabel     string    `json:"status_label"`
	}

	var rawDueSales []models.Sale
	database.DB.Model(&models.Sale{}).
		Where("company_id = ? AND status NOT IN ('CANCELLED', 'DRAFT') AND remaining_amount > 0 AND due_date <= ?", companyID, oneWeekFromNow).
		Preload("Customer").
		Order("due_date ASC").
		Limit(100).
		Find(&rawDueSales)

	dueReceivablesItems := make([]DueReceivableItem, 0)
	var dueReceivablesTotal float64
	var dueReceivablesOverdueCount int

	for _, s := range rawDueSales {
		dueReceivablesTotal += s.RemainingAmount
		custName := "Pelanggan Umum"
		if s.Customer.Name != "" {
			custName = s.Customer.Name
		}
		days := int(time.Date(s.DueDate.Year(), s.DueDate.Month(), s.DueDate.Day(), 0, 0, 0, 0, s.DueDate.Location()).Sub(todayMidnight).Hours() / 24)
		st := "DUE_SOON"
		stLabel := fmt.Sprintf("%d hari lagi", days)
		if days < 0 {
			st = "OVERDUE"
			stLabel = fmt.Sprintf("Lewat %d hari", -days)
			dueReceivablesOverdueCount++
		} else if days == 0 {
			st = "TODAY"
			stLabel = "Hari Ini"
		}

		dueReceivablesItems = append(dueReceivablesItems, DueReceivableItem{
			ID:              s.ID,
			InvoiceNo:       s.InvoiceNo,
			Date:            s.Date,
			DueDate:         s.DueDate,
			CustomerID:      s.CustomerID,
			CustomerName:    custName,
			TotalAmount:     s.TotalAmount,
			RemainingAmount: s.RemainingAmount,
			DaysRemaining:   days,
			Status:          st,
			StatusLabel:     stLabel,
		})
	}

	// 14. Peringatan Hutang Jatuh Tempo (Kurang 7 Hari & Overdue)
	type DuePayableItem struct {
		ID              uuid.UUID `json:"id"`
		InvoiceNo       string    `json:"invoice_no"`
		PBFInvoiceNo    string    `json:"pbf_invoice_no"`
		Date            time.Time `json:"date"`
		DueDate         time.Time `json:"due_date"`
		SupplierID      uuid.UUID `json:"supplier_id"`
		SupplierName    string    `json:"supplier_name"`
		TotalAmount     float64   `json:"total_amount"`
		RemainingAmount float64   `json:"remaining_amount"`
		DaysRemaining   int       `json:"days_remaining"`
		Status          string    `json:"status"` // "OVERDUE", "TODAY", "DUE_SOON"
		StatusLabel     string    `json:"status_label"`
	}

	var rawDuePurchases []models.Purchase
	database.DB.Model(&models.Purchase{}).
		Where("company_id = ? AND status NOT IN ('CANCELLED', 'DRAFT') AND remaining_amount > 0 AND due_date <= ?", companyID, oneWeekFromNow).
		Preload("Supplier").
		Order("due_date ASC").
		Limit(100).
		Find(&rawDuePurchases)

	duePayablesItems := make([]DuePayableItem, 0)
	var duePayablesTotal float64
	var duePayablesOverdueCount int

	for _, p := range rawDuePurchases {
		duePayablesTotal += p.RemainingAmount
		suppName := "Supplier PBF"
		if p.Supplier != nil && p.Supplier.Name != "" {
			suppName = p.Supplier.Name
		}
		days := int(time.Date(p.DueDate.Year(), p.DueDate.Month(), p.DueDate.Day(), 0, 0, 0, 0, p.DueDate.Location()).Sub(todayMidnight).Hours() / 24)
		st := "DUE_SOON"
		stLabel := fmt.Sprintf("%d hari lagi", days)
		if days < 0 {
			st = "OVERDUE"
			stLabel = fmt.Sprintf("Lewat %d hari", -days)
			duePayablesOverdueCount++
		} else if days == 0 {
			st = "TODAY"
			stLabel = "Hari Ini"
		}

		duePayablesItems = append(duePayablesItems, DuePayableItem{
			ID:              p.ID,
			InvoiceNo:       p.InvoiceNo,
			PBFInvoiceNo:    p.PBFInvoiceNo,
			Date:            p.Date,
			DueDate:         p.DueDate,
			SupplierID:      p.SupplierID,
			SupplierName:    suppName,
			TotalAmount:     p.TotalAmount,
			RemainingAmount: p.RemainingAmount,
			DaysRemaining:   days,
			Status:          st,
			StatusLabel:     stLabel,
		})
	}

	utils.SendSuccess(c, "Ringkasan data dashboard eksekutif", gin.H{
		"sales_summary": gin.H{
			"total_amount": totalSalesAmount,
			"total_count":  salesCount,
		},
		"purchase_summary": gin.H{
			"total_amount": totalPurchasesAmount,
			"total_count":  purchasesCount,
		},
		"in_progress_purchases": gin.H{
			"total_items":                  totalPendingItems,
			"total_docs":                   len(uniqueDocMap),
			"total_amount":                 totalPendingAmount,
			"in_transit_count":             inTransitCount,
			"warehouse_verification_count": warehouseVerificationCount,
			"items":                        inProgressItems,
		},
		"financials": gin.H{
			"cash_bank_balance":   cashBankBalance,
			"receivables":         totalReceivables,
			"payables":            totalPayables,
			"inventory_valuation": inventoryValuation,
			"gross_profit":        grossProfit,
			"net_profit":          netProfit,
		},
		"low_stock_count":         lowStockCount,
		"expiring_critical_count": len(expiringCriticalItems),
		"expiring_critical_items": expiringCriticalItems,
		"due_receivables": gin.H{
			"count":         len(dueReceivablesItems),
			"total_amount":  dueReceivablesTotal,
			"overdue_count": dueReceivablesOverdueCount,
			"items":         dueReceivablesItems,
		},
		"due_payables": gin.H{
			"count":         len(duePayablesItems),
			"total_amount":  duePayablesTotal,
			"overdue_count": duePayablesOverdueCount,
			"items":         duePayablesItems,
		},
		"recent_sales":            recentSales,
		"chart_data":              chartData,
		"top_products":            topProducts,
	})
}
