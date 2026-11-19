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
	database.DB.Model(&models.Sale{}).Where("company_id = ? AND status = 'POSTED'", companyID).Select("COALESCE(SUM(remaining_amount), 0)").Scan(&totalReceivables)

	var totalPayables float64
	database.DB.Model(&models.Purchase{}).Where("company_id = ? AND status = 'POSTED'", companyID).Select("COALESCE(SUM(remaining_amount), 0)").Scan(&totalPayables)

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

	utils.SendSuccess(c, "Ringkasan data dashboard eksekutif", gin.H{
		"sales_summary": gin.H{
			"total_amount": totalSalesAmount,
			"total_count":  salesCount,
		},
		"purchase_summary": gin.H{
			"total_amount": totalPurchasesAmount,
			"total_count":  purchasesCount,
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
		"recent_sales":            recentSales,
		"chart_data":              chartData,
		"top_products":            topProducts,
	})
}
