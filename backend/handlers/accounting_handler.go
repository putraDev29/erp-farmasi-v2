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

type AccountingHandler struct{}

func NewAccountingHandler() *AccountingHandler {
	return &AccountingHandler{}
}

// Chart of Accounts
func (h *AccountingHandler) GetAccounts(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	category := c.Query("category")

	query := database.DB.Where("company_id = ?", companyID)
	if category != "" && category != "Semua Akun" && category != "ALL" {
		switch category {
		case "Aktiva":
			query = query.Where("code LIKE '1-%'")
		case "Kewajiban":
			query = query.Where("code LIKE '2-%'")
		case "Modal":
			query = query.Where("code LIKE '3-%'")
		case "Pendapatan":
			query = query.Where("code LIKE '4-%'")
		case "HPP":
			query = query.Where("code LIKE '5-%'")
		case "Biaya":
			query = query.Where("code LIKE '6-%'")
		case "Pendapatan Lain":
			query = query.Where("code LIKE '7-%'")
		case "Biaya Lain":
			query = query.Where("code LIKE '8-%'")
		}
	}

	var accounts []models.Account
	query.Order("code ASC").Find(&accounts)
	utils.SendSuccess(c, "Bagan Akun Standar (COA)", accounts)
}

func (h *AccountingHandler) CreateAccount(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var acc models.Account
	if err := c.ShouldBindJSON(&acc); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data akun tidak valid", err.Error())
		return
	}

	acc.CompanyID = companyID
	if acc.NormalBalance == "" {
		if len(acc.Code) > 0 && (acc.Code[0] == '1' || acc.Code[0] == '5' || acc.Code[0] == '6' || acc.Code[0] == '8') {
			acc.NormalBalance = "DEBIT"
		} else {
			acc.NormalBalance = "CREDIT"
		}
	}

	if err := database.DB.Create(&acc).Error; err != nil {
		utils.SendError(c, http.StatusBadRequest, "Gagal membuat akun atau kode akun sudah digunakan", err.Error())
		return
	}

	utils.SendCreated(c, "Akun COA berhasil dibuat", acc)
}

func (h *AccountingHandler) UpdateAccount(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID akun tidak valid", err.Error())
		return
	}

	var req models.Account
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data akun tidak valid", err.Error())
		return
	}

	var acc models.Account
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&acc).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Akun tidak ditemukan", err.Error())
		return
	}

	acc.Name = req.Name
	acc.Type = req.Type
	acc.Subtype = req.Subtype
	acc.IsHeader = req.IsHeader
	if req.NormalBalance != "" {
		acc.NormalBalance = req.NormalBalance
	}

	if err := database.DB.Save(&acc).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal memperbarui akun", err.Error())
		return
	}

	utils.SendSuccess(c, "Akun berhasil diperbarui", acc)
}

func (h *AccountingHandler) DeleteAccount(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID akun tidak valid", err.Error())
		return
	}

	var count int64
	database.DB.Model(&models.JournalEntry{}).Where("account_id = ?", id).Count(&count)
	if count > 0 {
		utils.SendError(c, http.StatusBadRequest, "Akun tidak dapat dihapus karena sudah memiliki catatan jurnal transaksi.", nil)
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.Account{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus akun", err.Error())
		return
	}

	utils.SendSuccess(c, "Akun berhasil dihapus", nil)
}

// Journals (Jurnal Umum & Transaksi)
func (h *AccountingHandler) GetJournals(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	tab := strings.ToLower(c.Query("tab"))
	refType := c.Query("ref_type")
	keyword := c.Query("keyword")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := database.DB.Where("company_id = ?", companyID).
		Preload("Entries.Account").Preload("User").
		Order("date DESC, created_at DESC")

	if tab != "" && tab != "semua" && tab != "all" {
		switch tab {
		case "pembelian":
			query = query.Where("ref_type IN ('PURCHASE', 'PURCHASE_RETURN', 'PAYMENT_OUT')")
		case "penjualan":
			query = query.Where("ref_type IN ('SALE', 'SALES_RETURN', 'PAYMENT_IN', 'KASIR')")
		case "perakitan":
			query = query.Where("ref_type IN ('ASSEMBLY', 'ASSEMBLY_PROCESS', 'ASSEMBLY_FINISHED')")
		case "persediaan":
			query = query.Where("ref_type IN ('ITEM_IN', 'ITEM_OUT', 'OPNAME', 'TRANSFER')")
		case "kas":
			query = query.Where("ref_type IN ('CASH_IN', 'CASH_OUT', 'CASH_TRANSFER', 'CASH_TRX')")
		case "aset":
			query = query.Where("ref_type IN ('DEPRECIATION', 'FIXED_ASSET')")
		case "manual":
			query = query.Where("ref_type = 'MANUAL'")
		}
	} else if refType != "" && refType != "ALL" {
		query = query.Where("ref_type = ?", refType)
	}

	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate+" 23:59:59")
	}
	if keyword != "" {
		q := "%" + keyword + "%"
		query = query.Where("doc_no ILIKE ? OR ref_no ILIKE ? OR description ILIKE ?", q, q, q)
	}

	var journals []models.Journal
	query.Find(&journals)

	utils.SendSuccess(c, "Daftar jurnal pembukuan", journals)
}

func (h *AccountingHandler) CreateManualJournal(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req struct {
		Description string `json:"description" binding:"required"`
		Date        time.Time `json:"date"`
		Entries     []struct {
			AccountCode string  `json:"account_code" binding:"required"`
			Debit       float64 `json:"debit"`
			Credit      float64 `json:"credit"`
			Description string  `json:"description"`
		} `json:"entries" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data entri jurnal manual tidak valid", err.Error())
		return
	}

	journalDate := req.Date
	if journalDate.IsZero() {
		journalDate = time.Now()
	}

	var entryParams []services.JournalEntryParam
	for _, e := range req.Entries {
		entryParams = append(entryParams, services.JournalEntryParam{
			AccountCode: e.AccountCode,
			Debit:       e.Debit,
			Credit:      e.Credit,
			Description: e.Description,
		})
	}

	tx := database.DB.Begin()
	journal, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   companyID,
		BranchID:    branchID,
		Date:        journalDate,
		RefType:     "MANUAL",
		RefNo:       "MANUAL",
		Description: req.Description,
		CreatedBy:   userID,
		Entries:     entryParams,
	})
	if err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	tx.Commit()
	utils.SendCreated(c, "Jurnal manual berhasil diposting", journal)
}

// General Ledger (Buku Besar)
func (h *AccountingHandler) GetGeneralLedger(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	accountID := c.Query("account_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if accountID == "" {
		// Default to first active account
		var firstAcc models.Account
		if err := database.DB.Where("company_id = ? AND is_header = false", companyID).Order("code ASC").First(&firstAcc).Error; err == nil {
			accountID = firstAcc.ID.String()
		} else {
			utils.SendError(c, http.StatusBadRequest, "ID akun perkiraan harus dipilih", nil)
			return
		}
	}

	var account models.Account
	if err := database.DB.Where("id = ? AND company_id = ?", accountID, companyID).First(&account).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Akun perkiraan tidak ditemukan", err.Error())
		return
	}

	// Calculate opening balance before start_date (and include INITIAL_BALANCE journals)
	var openingBalance float64 = 0
	var preDebit, preCredit float64
	if startDate != "" {
		database.DB.Model(&models.JournalEntry{}).
			Joins("JOIN journals ON journals.id = journal_entries.journal_id").
			Where("journal_entries.account_id = ? AND (journals.date < ? OR journals.ref_type = 'INITIAL_BALANCE')", accountID, startDate).
			Select("COALESCE(SUM(journal_entries.debit), 0)").Scan(&preDebit)

		database.DB.Model(&models.JournalEntry{}).
			Joins("JOIN journals ON journals.id = journal_entries.journal_id").
			Where("journal_entries.account_id = ? AND (journals.date < ? OR journals.ref_type = 'INITIAL_BALANCE')", accountID, startDate).
			Select("COALESCE(SUM(journal_entries.credit), 0)").Scan(&preCredit)
	} else {
		database.DB.Model(&models.JournalEntry{}).
			Joins("JOIN journals ON journals.id = journal_entries.journal_id").
			Where("journal_entries.account_id = ? AND journals.ref_type = 'INITIAL_BALANCE'", accountID).
			Select("COALESCE(SUM(journal_entries.debit), 0)").Scan(&preDebit)

		database.DB.Model(&models.JournalEntry{}).
			Joins("JOIN journals ON journals.id = journal_entries.journal_id").
			Where("journal_entries.account_id = ? AND journals.ref_type = 'INITIAL_BALANCE'", accountID).
			Select("COALESCE(SUM(journal_entries.credit), 0)").Scan(&preCredit)
	}

	if account.NormalBalance == "CREDIT" {
		openingBalance = preCredit - preDebit
	} else {
		openingBalance = preDebit - preCredit
	}

	// Also check InitialBalanceEntry if journals didn't yield an initial balance
	if openingBalance == 0 {
		var ibEntry models.InitialBalanceEntry
		if err := database.DB.Where("company_id = ? AND account_id = ? AND type = 'ACCOUNT'", companyID, accountID).First(&ibEntry).Error; err == nil {
			if account.NormalBalance == "CREDIT" {
				openingBalance = ibEntry.Credit - ibEntry.Debit
			} else {
				openingBalance = ibEntry.Debit - ibEntry.Credit
			}
		}
	}

	query := database.DB.Model(&models.JournalEntry{}).
		Joins("JOIN journals ON journals.id = journal_entries.journal_id").
		Where("journal_entries.account_id = ? AND journals.ref_type != 'INITIAL_BALANCE'", accountID).
		Preload("Account").Preload("Journal")

	if startDate != "" {
		query = query.Where("journals.date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("journals.date <= ?", endDate+" 23:59:59")
	}

	var rawEntries []models.JournalEntry
	query.Order("journals.date ASC, journals.created_at ASC").Find(&rawEntries)

	type GLLine struct {
		ID          uuid.UUID `json:"id"`
		DocNo       string    `json:"doc_no"`
		Date        time.Time `json:"date"`
		Description string    `json:"description"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Saldo       float64   `json:"saldo"`
	}

	var lines []GLLine
	// Sesuai format Ketoko: Baris pertama adalah "Saldo Awal" tanpa No Transaksi, Debet 0.00, Kredit 0.00, langsung isi Saldo
	lines = append(lines, GLLine{
		ID:          uuid.Nil,
		DocNo:       "",
		Date:        time.Time{},
		Description: "Saldo Awal",
		Debit:       0,
		Credit:      0,
		Saldo:       openingBalance,
	})

	running := openingBalance
	var totalDebit, totalCredit float64

	for _, e := range rawEntries {
		totalDebit += e.Debit
		totalCredit += e.Credit
		if account.NormalBalance == "CREDIT" {
			running += (e.Credit - e.Debit)
		} else {
			running += (e.Debit - e.Credit)
		}

		docNo := ""
		date := e.CreatedAt
		desc := e.Description
		if e.Journal != nil {
			if e.Journal.RefNo != "" {
				docNo = e.Journal.RefNo
			} else {
				docNo = e.Journal.DocNo
			}
			date = e.Journal.Date
			if desc == "" {
				desc = e.Journal.Description
			}
		}

		lines = append(lines, GLLine{
			ID:          e.ID,
			DocNo:       docNo,
			Date:        date,
			Description: desc,
			Debit:       e.Debit,
			Credit:      e.Credit,
			Saldo:       running,
		})
	}

	utils.SendSuccess(c, "Buku Besar (General Ledger)", gin.H{
		"account":         account,
		"opening_balance": openingBalance,
		"entries":         lines,
		"total_debit":     totalDebit,
		"total_credit":    totalCredit,
		"ending_balance":  running,
	})
}

// Trial Balance (Neraca Saldo)
func (h *AccountingHandler) GetTrialBalance(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var accounts []models.Account
	database.DB.Where("company_id = ? AND is_header = false", companyID).Order("code ASC").Find(&accounts)

	type TBRow struct {
		Code          string  `json:"code"`
		Name          string  `json:"name"`
		Type          string  `json:"type"`
		NormalBalance string  `json:"normal_balance"`
		Debit         float64 `json:"debit"`
		Credit        float64 `json:"credit"`
	}

	var rows []TBRow
	var totalDebit, totalCredit float64

	for _, a := range accounts {
		var debit, credit float64
		if a.NormalBalance == "DEBIT" {
			if a.Balance >= 0 {
				debit = a.Balance
			} else {
				credit = -a.Balance
			}
		} else {
			if a.Balance >= 0 {
				credit = a.Balance
			} else {
				debit = -a.Balance
			}
		}

		rows = append(rows, TBRow{
			Code:          a.Code,
			Name:          a.Name,
			Type:          a.Type,
			NormalBalance: a.NormalBalance,
			Debit:         debit,
			Credit:        credit,
		})
		totalDebit += debit
		totalCredit += credit
	}

	utils.SendSuccess(c, "Neraca Saldo (Trial Balance)", gin.H{
		"rows":         rows,
		"total_debit":  totalDebit,
		"total_credit": totalCredit,
		"is_balanced":  (totalDebit - totalCredit) < 0.01 && (totalCredit - totalDebit) < 0.01,
	})
}

// Financial Statements: Profit & Loss (Laba Rugi)
func (h *AccountingHandler) GetProfitAndLoss(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var revenueAccounts []models.Account
	var cogsAccounts []models.Account
	var expenseAccounts []models.Account

	database.DB.Where("company_id = ? AND type = 'REVENUE' AND is_header = false", companyID).Find(&revenueAccounts)
	database.DB.Where("company_id = ? AND type = 'EXPENSE' AND subtype = 'COGS' AND is_header = false", companyID).Find(&cogsAccounts)
	database.DB.Where("company_id = ? AND type = 'EXPENSE' AND subtype != 'COGS' AND is_header = false", companyID).Find(&expenseAccounts)

	var totalRevenue, totalCOGS, totalExpense float64
	for _, a := range revenueAccounts {
		totalRevenue += a.Balance
	}
	for _, a := range cogsAccounts {
		totalCOGS += a.Balance
	}
	for _, a := range expenseAccounts {
		totalExpense += a.Balance
	}

	grossProfit := totalRevenue - totalCOGS
	netProfit := grossProfit - totalExpense

	utils.SendSuccess(c, "Laporan Laba Rugi", gin.H{
		"revenue_accounts": revenueAccounts,
		"total_revenue":    totalRevenue,
		"cogs_accounts":    cogsAccounts,
		"total_cogs":       totalCOGS,
		"gross_profit":     grossProfit,
		"expense_accounts": expenseAccounts,
		"total_expense":    totalExpense,
		"net_profit":       netProfit,
	})
}

// Financial Statements: Balance Sheet (Neraca)
func (h *AccountingHandler) GetBalanceSheet(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)

	var assetAccounts []models.Account
	var liabilityAccounts []models.Account
	var equityAccounts []models.Account

	database.DB.Where("company_id = ? AND type = 'ASSET' AND is_header = false", companyID).Find(&assetAccounts)
	database.DB.Where("company_id = ? AND type = 'LIABILITY' AND is_header = false", companyID).Find(&liabilityAccounts)
	database.DB.Where("company_id = ? AND type = 'EQUITY' AND is_header = false", companyID).Find(&equityAccounts)

	var totalAssets, totalLiabilities, totalEquity float64
	for _, a := range assetAccounts {
		totalAssets += a.Balance
	}
	for _, a := range liabilityAccounts {
		totalLiabilities += a.Balance
	}
	for _, a := range equityAccounts {
		totalEquity += a.Balance
	}

	utils.SendSuccess(c, "Laporan Neraca Keuangan", gin.H{
		"asset_accounts":      assetAccounts,
		"total_assets":        totalAssets,
		"liability_accounts":  liabilityAccounts,
		"total_liabilities":   totalLiabilities,
		"equity_accounts":     equityAccounts,
		"total_equity":        totalEquity,
		"total_liab_equity":   totalLiabilities + totalEquity,
	})
}

// Fixed Assets (Aset Tetap)
func (h *AccountingHandler) GetFixedAssets(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var assets []models.FixedAsset
	database.DB.Where("company_id = ?", companyID).
		Preload("AssetAccount").Preload("DeprecAccount").Preload("AccumDeprecAcc").
		Find(&assets)

	utils.SendSuccess(c, "Daftar aset tetap", assets)
}

func (h *AccountingHandler) CreateFixedAsset(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)

	var asset models.FixedAsset
	if err := c.ShouldBindJSON(&asset); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data aset tetap tidak valid", err.Error())
		return
	}

	asset.CompanyID = companyID
	asset.BranchID = branchID
	asset.BookValue = asset.AcquisitionCost
	if asset.UsefulLifeMonths > 0 {
		asset.MonthlyDeprecRate = (asset.AcquisitionCost - asset.SalvageValue) / float64(asset.UsefulLifeMonths)
	}

	if err := database.DB.Create(&asset).Error; err != nil {
		utils.SendError(c, http.StatusBadRequest, "Gagal menambahkan aset tetap", err.Error())
		return
	}

	utils.SendCreated(c, "Aset tetap berhasil didaftarkan", asset)
}

// Cash Transactions (Kas Masuk, Kas Keluar, Kas Transfer)
func (h *AccountingHandler) GetCashTransactions(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	trxType := c.Query("type")
	search := c.Query("search")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := database.DB.Where("company_id = ?", companyID)
	if trxType != "" {
		query = query.Where("type = ?", trxType)
	}
	if search != "" {
		s := "%" + search + "%"
		query = query.Where("trx_no ILIKE ? OR description ILIKE ? OR payee_recipient ILIKE ?", s, s, s)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate+" 23:59:59")
	}

	var trxs []models.CashTransaction
	query.Preload("Account").Preload("OppositeAcc").Preload("TargetAccount").Preload("Items.Account").
		Order("date desc, created_at desc").Find(&trxs)

	utils.SendSuccess(c, "Daftar transaksi kas", trxs)
}

func (h *AccountingHandler) CreateCashTransaction(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	type CashItemReq struct {
		AccountID uuid.UUID `json:"account_id"`
		Notes     string    `json:"notes"`
		Amount    float64   `json:"amount"`
	}

	var req struct {
		TrxNo           string        `json:"trx_no"`
		Type            string        `json:"type" binding:"required"` // IN, OUT, TRANSFER
		Date            time.Time     `json:"date"`
		AccountID       uuid.UUID     `json:"account_id" binding:"required"`
		OppositeAccID   *uuid.UUID    `json:"opposite_acc_id"`
		TargetAccountID *uuid.UUID    `json:"target_account_id"`
		Amount          float64       `json:"amount"`
		PayeeRecipient  string        `json:"payee_recipient"`
		Description     string        `json:"description"`
		Items           []CashItemReq `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data transaksi kas tidak valid", err.Error())
		return
	}

	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	// Calculate total amount from items if items exist
	totalAmount := req.Amount
	if len(req.Items) > 0 {
		var sum float64
		for _, it := range req.Items {
			sum += it.Amount
		}
		if sum > 0 {
			totalAmount = sum
		}
	}
	if totalAmount <= 0 {
		utils.SendError(c, http.StatusBadRequest, "Jumlah transaksi harus lebih besar dari 0", nil)
		return
	}

	tx := database.DB.Begin()

	// Validasi Saldo Kas (Standar Akuntansi Indonesia: Saldo Kas/Bank tidak boleh negatif)
	if req.Type == "OUT" || req.Type == "TRANSFER" {
		var srcAcc models.Account
		if err := tx.Where("id = ? AND company_id = ?", req.AccountID, companyID).First(&srcAcc).Error; err != nil {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, "Akun sumber kas/bank tidak ditemukan", err.Error())
			return
		}

		var totalDeb, totalCred float64
		tx.Model(&models.JournalEntry{}).Where("account_id = ?", srcAcc.ID).Select("COALESCE(SUM(debit), 0)").Scan(&totalDeb)
		tx.Model(&models.JournalEntry{}).Where("account_id = ?", srcAcc.ID).Select("COALESCE(SUM(credit), 0)").Scan(&totalCred)

		var initBal models.InitialBalanceEntry
		if err := tx.Where("company_id = ? AND account_id = ? AND type = 'ACCOUNT'", companyID, srcAcc.ID).First(&initBal).Error; err == nil {
			totalDeb += initBal.Debit
			totalCred += initBal.Credit
		}

		currentBalance := totalDeb - totalCred
		if srcAcc.NormalBalance == "CREDIT" {
			currentBalance = totalCred - totalDeb
		}

		if currentBalance < totalAmount {
			tx.Rollback()
			utils.SendError(c, http.StatusBadRequest, fmt.Sprintf("Transaksi kas ditolak: Saldo akun %s (%s) tidak mencukupi untuk pengeluaran sebesar Rp %.2f. Saldo saat ini hanya Rp %.2f. Sesuai aturan akuntansi Indonesia, saldo kas tidak boleh negatif/minus.", srcAcc.Code, srcAcc.Name, totalAmount, currentBalance), nil)
			return
		}
	}

	// Generate doc number if Auto or empty
	docNo := req.TrxNo
	tag := "KASI"
	if req.Type == "OUT" {
		tag = "KASO"
	} else if req.Type == "TRANSFER" {
		tag = "KASTR"
	}

	if docNo == "" || docNo == "Auto" {
		docNo = services.GenerateCashTransactionNumber(tx, companyID, tag, req.Date)
	}

	// Create Journal
	journal := models.Journal{
		CompanyID:   companyID,
		BranchID:    branchID,
		DocNo:       "JRN-" + docNo,
		Date:        req.Date,
		RefType:     "CASH_" + req.Type,
		RefNo:       docNo,
		Description: req.Description,
		Status:      "POSTED",
		TotalDebit:  totalAmount,
		TotalCredit: totalAmount,
		CreatedBy:   userID,
	}
	if err := tx.Create(&journal).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal transaksi kas", err.Error())
		return
	}

	// Create Journal Entries & Mutate Account Balances
	if req.Type == "IN" {
		// Debit Kas/Bank
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.AccountID,
			Debit:       totalAmount,
			Description: req.Description,
		})
		tx.Model(&models.Account{}).Where("id = ?", req.AccountID).Update("balance", gorm.Expr("balance + ?", totalAmount))

		// Credit Items or OppositeAcc
		if len(req.Items) > 0 {
			for _, it := range req.Items {
				desc := it.Notes
				if desc == "" {
					desc = req.Description
				}
				tx.Create(&models.JournalEntry{
					JournalID:   journal.ID,
					AccountID:   it.AccountID,
					Credit:      it.Amount,
					Description: desc,
				})
				tx.Model(&models.Account{}).Where("id = ?", it.AccountID).Update("balance", gorm.Expr("balance + ?", it.Amount))
			}
		} else if req.OppositeAccID != nil {
			tx.Create(&models.JournalEntry{
				JournalID:   journal.ID,
				AccountID:   *req.OppositeAccID,
				Credit:      totalAmount,
				Description: req.Description,
			})
			tx.Model(&models.Account{}).Where("id = ?", *req.OppositeAccID).Update("balance", gorm.Expr("balance + ?", totalAmount))
		}
	} else if req.Type == "OUT" {
		// Debit Items (Beban/Biaya) or OppositeAcc
		if len(req.Items) > 0 {
			for _, it := range req.Items {
				desc := it.Notes
				if desc == "" {
					desc = req.Description
				}
				tx.Create(&models.JournalEntry{
					JournalID:   journal.ID,
					AccountID:   it.AccountID,
					Debit:       it.Amount,
					Description: desc,
				})
				tx.Model(&models.Account{}).Where("id = ?", it.AccountID).Update("balance", gorm.Expr("balance + ?", it.Amount))
			}
		} else if req.OppositeAccID != nil {
			tx.Create(&models.JournalEntry{
				JournalID:   journal.ID,
				AccountID:   *req.OppositeAccID,
				Debit:       totalAmount,
				Description: req.Description,
			})
			tx.Model(&models.Account{}).Where("id = ?", *req.OppositeAccID).Update("balance", gorm.Expr("balance + ?", totalAmount))
		}

		// Credit Kas/Bank
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.AccountID,
			Credit:      totalAmount,
			Description: req.Description,
		})
		tx.Model(&models.Account{}).Where("id = ?", req.AccountID).Update("balance", gorm.Expr("balance - ?", totalAmount))
	} else if req.Type == "TRANSFER" {
		// Debit Kas Tujuan
		if req.TargetAccountID != nil {
			tx.Create(&models.JournalEntry{
				JournalID:   journal.ID,
				AccountID:   *req.TargetAccountID,
				Debit:       totalAmount,
				Description: req.Description,
			})
			tx.Model(&models.Account{}).Where("id = ?", *req.TargetAccountID).Update("balance", gorm.Expr("balance + ?", totalAmount))
		}

		// Credit Kas Sumber
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.AccountID,
			Credit:      totalAmount,
			Description: req.Description,
		})
		tx.Model(&models.Account{}).Where("id = ?", req.AccountID).Update("balance", gorm.Expr("balance - ?", totalAmount))
	}

	cashTrx := models.CashTransaction{
		CompanyID:       companyID,
		BranchID:        branchID,
		TrxNo:           docNo,
		Date:            req.Date,
		Type:            req.Type,
		AccountID:       req.AccountID,
		OppositeAccID:   req.OppositeAccID,
		TargetAccountID: req.TargetAccountID,
		Amount:          totalAmount,
		PayeeRecipient:  req.PayeeRecipient,
		Description:     req.Description,
		JournalID:       &journal.ID,
		CreatedBy:       userID,
	}

	if err := tx.Create(&cashTrx).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan transaksi kas", err.Error())
		return
	}

	// Save items if any
	if len(req.Items) > 0 {
		for _, it := range req.Items {
			itemRec := models.CashTransactionItem{
				TransactionID: cashTrx.ID,
				AccountID:     it.AccountID,
				Amount:        it.Amount,
				Notes:         it.Notes,
			}
			tx.Create(&itemRec)
		}
	}

	tx.Commit()

	// Reload with relations
	database.DB.Preload("Account").Preload("OppositeAcc").Preload("TargetAccount").Preload("Items.Account").First(&cashTrx, "id = ?", cashTrx.ID)
	utils.SendCreated(c, "Transaksi kas berhasil disimpan", cashTrx)
}

func (h *AccountingHandler) DeleteCashTransaction(c *gin.Context) {
	id := c.Param("id")
	var trx models.CashTransaction
	if err := database.DB.Preload("Items").First(&trx, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Transaksi kas tidak ditemukan", nil)
		return
	}

	tx := database.DB.Begin()
	// Revert balance
	if trx.Type == "IN" {
		tx.Model(&models.Account{}).Where("id = ?", trx.AccountID).Update("balance", gorm.Expr("balance - ?", trx.Amount))
		if len(trx.Items) > 0 {
			for _, it := range trx.Items {
				tx.Model(&models.Account{}).Where("id = ?", it.AccountID).Update("balance", gorm.Expr("balance - ?", it.Amount))
			}
		} else if trx.OppositeAccID != nil {
			tx.Model(&models.Account{}).Where("id = ?", *trx.OppositeAccID).Update("balance", gorm.Expr("balance - ?", trx.Amount))
		}
	} else if trx.Type == "OUT" {
		tx.Model(&models.Account{}).Where("id = ?", trx.AccountID).Update("balance", gorm.Expr("balance + ?", trx.Amount))
		if len(trx.Items) > 0 {
			for _, it := range trx.Items {
				tx.Model(&models.Account{}).Where("id = ?", it.AccountID).Update("balance", gorm.Expr("balance - ?", it.Amount))
			}
		} else if trx.OppositeAccID != nil {
			tx.Model(&models.Account{}).Where("id = ?", *trx.OppositeAccID).Update("balance", gorm.Expr("balance - ?", trx.Amount))
		}
	} else if trx.Type == "TRANSFER" {
		tx.Model(&models.Account{}).Where("id = ?", trx.AccountID).Update("balance", gorm.Expr("balance + ?", trx.Amount))
		if trx.TargetAccountID != nil {
			tx.Model(&models.Account{}).Where("id = ?", *trx.TargetAccountID).Update("balance", gorm.Expr("balance - ?", trx.Amount))
		}
	}

	// Delete items
	tx.Where("transaction_id = ?", trx.ID).Delete(&models.CashTransactionItem{})

	if trx.JournalID != nil {
		tx.Where("journal_id = ?", *trx.JournalID).Delete(&models.JournalEntry{})
		tx.Where("id = ?", *trx.JournalID).Delete(&models.Journal{})
	}
	tx.Delete(&trx)
	tx.Commit()

	utils.SendSuccess(c, "Transaksi kas berhasil dihapus", nil)
}

// Deposit Handlers
func (h *AccountingHandler) GetDeposits(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	partyType := c.Query("party_type")
	search := c.Query("search")

	query := database.DB.Where("company_id = ?", companyID)
	if partyType != "" {
		query = query.Where("party_type = ?", partyType)
	}
	if search != "" {
		s := "%" + search + "%"
		query = query.Where("doc_no ILIKE ? OR notes ILIKE ?", s, s)
	}

	var deposits []models.DepositRecord
	query.Preload("Supplier").Preload("Customer").Preload("CashAccount").Preload("DepositAcc").Preload("Creator").Preload("Updater").
		Order("date desc, created_at desc").Find(&deposits)

	utils.SendSuccess(c, "Daftar deposit", deposits)
}

func (h *AccountingHandler) CreateDeposit(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var req models.DepositRecord
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data deposit tidak valid", err.Error())
		return
	}

	req.CompanyID = companyID
	req.BranchID = branchID
	req.CreatedBy = &userID
	req.UpdatedBy = &userID
	if req.Currency == "" {
		req.Currency = "IDR"
	}
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	tag := "DPIN"
	if req.PartyType == "SUPPLIER" {
		tag = "DOUT"
	}
	req.DepositType = tag

	if req.DocNo == "" || req.DocNo == "Auto" {
		var count int64
		database.DB.Model(&models.DepositRecord{}).Where("company_id = ? AND party_type = ?", companyID, req.PartyType).Count(&count)
		mmyy := req.Date.Format("0106")
		req.DocNo = fmt.Sprintf("%04d/%s/UTAMA/%s", count+1, tag, mmyy)
	}

	tx := database.DB.Begin()

	// Double-entry Journal
	journal := models.Journal{
		CompanyID:   companyID,
		BranchID:    branchID,
		DocNo:       "JRN-" + req.DocNo,
		Date:        req.Date,
		RefType:     "DEPOSIT_" + tag,
		RefNo:       req.DocNo,
		Description: req.Notes,
		Status:      "POSTED",
		TotalDebit:  req.Amount,
		TotalCredit: req.Amount,
		CreatedBy:   userID,
	}
	if err := tx.Create(&journal).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat jurnal deposit", err.Error())
		return
	}
	req.JournalID = &journal.ID

	if req.PartyType == "CUSTOMER" {
		// DPIN: Kas bertambah (Debit), Akun Deposit/Titipan bertambah (Credit)
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.CashAccountID,
			Debit:       req.Amount,
			Description: req.Notes,
		})
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.DepositAccID,
			Credit:      req.Amount,
			Description: req.Notes,
		})
		tx.Model(&models.Account{}).Where("id = ?", req.CashAccountID).Update("balance", gorm.Expr("balance + ?", req.Amount))
		tx.Model(&models.Account{}).Where("id = ?", req.DepositAccID).Update("balance", gorm.Expr("balance + ?", req.Amount))
	} else {
		// DOUT: Deposit/Uang Muka Supplier bertambah (Debit), Kas berkurang (Credit)
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.DepositAccID,
			Debit:       req.Amount,
			Description: req.Notes,
		})
		tx.Create(&models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   req.CashAccountID,
			Credit:      req.Amount,
			Description: req.Notes,
		})
		tx.Model(&models.Account{}).Where("id = ?", req.DepositAccID).Update("balance", gorm.Expr("balance + ?", req.Amount))
		tx.Model(&models.Account{}).Where("id = ?", req.CashAccountID).Update("balance", gorm.Expr("balance - ?", req.Amount))
	}

	if err := tx.Create(&req).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal mencatat deposit", err.Error())
		return
	}

	tx.Commit()

	database.DB.Preload("Supplier").Preload("Customer").Preload("CashAccount").Preload("DepositAcc").Preload("Creator").Preload("Updater").First(&req, "id = ?", req.ID)
	utils.SendCreated(c, "Deposit berhasil dicatat", req)
}

func (h *AccountingHandler) DeleteDeposit(c *gin.Context) {
	id := c.Param("id")
	var dep models.DepositRecord
	if err := database.DB.First(&dep, "id = ?", id).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Deposit tidak ditemukan", nil)
		return
	}

	tx := database.DB.Begin()

	if dep.PartyType == "CUSTOMER" {
		tx.Model(&models.Account{}).Where("id = ?", dep.CashAccountID).Update("balance", gorm.Expr("balance - ?", dep.Amount))
		tx.Model(&models.Account{}).Where("id = ?", dep.DepositAccID).Update("balance", gorm.Expr("balance - ?", dep.Amount))
	} else {
		tx.Model(&models.Account{}).Where("id = ?", dep.DepositAccID).Update("balance", gorm.Expr("balance - ?", dep.Amount))
		tx.Model(&models.Account{}).Where("id = ?", dep.CashAccountID).Update("balance", gorm.Expr("balance + ?", dep.Amount))
	}

	if dep.JournalID != nil {
		tx.Where("journal_id = ?", *dep.JournalID).Delete(&models.JournalEntry{})
		tx.Where("id = ?", *dep.JournalID).Delete(&models.Journal{})
	}
	tx.Delete(&dep)
	tx.Commit()

	utils.SendSuccess(c, "Deposit berhasil dihapus", nil)
}

// Asset Groups
func (h *AccountingHandler) GetAssetGroups(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var groups []models.AssetGroup
	database.DB.Where("company_id = ?", companyID).Preload("AssetAcc").Preload("DeprecAcc").Preload("AccumAcc").Find(&groups)
	utils.SendSuccess(c, "Daftar grup aset", groups)
}

func (h *AccountingHandler) CreateAssetGroup(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var group models.AssetGroup
	if err := c.ShouldBindJSON(&group); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data grup aset tidak valid", err.Error())
		return
	}
	group.CompanyID = companyID
	if err := database.DB.Create(&group).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat grup aset", err.Error())
		return
	}
	utils.SendCreated(c, "Grup aset berhasil dibuat", group)
}

// Asset Depreciation Process
func (h *AccountingHandler) ProcessAssetDepreciation(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	var assets []models.FixedAsset
	database.DB.Where("company_id = ? AND status = 'ACTIVE'", companyID).Find(&assets)

	tx := database.DB.Begin()
	deprecCount := 0
	totalAmount := 0.0

	for _, a := range assets {
		if a.BookValue > a.SalvageValue && a.MonthlyDeprecRate > 0 {
			depAmount := a.MonthlyDeprecRate
			if a.BookValue-depAmount < a.SalvageValue {
				depAmount = a.BookValue - a.SalvageValue
			}

			// Update asset
			tx.Model(&a).Updates(map[string]interface{}{
				"accumulated_deprec": gorm.Expr("accumulated_deprec + ?", depAmount),
				"book_value":         gorm.Expr("book_value - ?", depAmount),
			})

			// Create Journal
			jrn := models.Journal{
				CompanyID:   companyID,
				BranchID:    branchID,
				DocNo:       fmt.Sprintf("JRN-DEP-%s-%s", a.AssetCode, time.Now().Format("200601")),
				Date:        time.Now(),
				RefType:     "DEPRECIATION",
				RefNo:       a.AssetCode,
				Description: fmt.Sprintf("Penyusutan Bulanan Aset %s (%s)", a.Name, a.AssetCode),
				Status:      "POSTED",
				TotalDebit:  depAmount,
				TotalCredit: depAmount,
				CreatedBy:   userID,
			}
			tx.Create(&jrn)

			tx.Create(&models.JournalEntry{
				JournalID:   jrn.ID,
				AccountID:   a.DeprecAccountID,
				Debit:       depAmount,
				Description: "Beban Penyusutan Aset",
			})
			tx.Create(&models.JournalEntry{
				JournalID:   jrn.ID,
				AccountID:   a.AccumDeprecAccID,
				Credit:      depAmount,
				Description: "Akumulasi Penyusutan Aset",
			})

			tx.Create(&models.AssetDepreciation{
				FixedAssetID: a.ID,
				PeriodDate:   time.Now(),
				Amount:       depAmount,
				JournalID:    &jrn.ID,
			})

			deprecCount++
			totalAmount += depAmount
		}
	}

	tx.Commit()
	utils.SendSuccess(c, "Proses penyusutan selesai", gin.H{
		"assets_processed": deprecCount,
		"total_amount":     totalAmount,
	})
}

// Yearly Closing Process
func (h *AccountingHandler) YearlyClosing(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var req struct {
		Year int `json:"year" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Tahun buku harus ditentukan", err.Error())
		return
	}

	now := time.Now()
	period := models.AccountingPeriod{
		CompanyID: companyID,
		Year:      req.Year,
		Month:     12,
		IsClosed:  true,
		ClosedAt:  &now,
	}
	database.DB.Where("company_id = ? AND year = ?", companyID, req.Year).Assign(period).FirstOrCreate(&period)

	utils.SendSuccess(c, fmt.Sprintf("Tutup buku tahunan periode %d berhasil diproses", req.Year), period)
}

// Account Settings
func (h *AccountingHandler) GetAccountSettings(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var settings []models.AccountSetting
	database.DB.Where("company_id = ?", companyID).Preload("Account").Find(&settings)
	utils.SendSuccess(c, "Pengaturan perkiraan akun", settings)
}

func (h *AccountingHandler) UpdateAccountSetting(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	var req models.AccountSetting
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data setting tidak valid", err.Error())
		return
	}
	req.CompanyID = companyID
	database.DB.Where("company_id = ? AND key = ?", companyID, req.Key).Assign(req).FirstOrCreate(&req)
	utils.SendSuccess(c, "Setting perkiraan akun berhasil disimpan", req)
}

func (h *AccountingHandler) BatchUpdateAccountSettings(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	type SettingReq struct {
		Key         string `json:"key"`
		AccountID   string `json:"account_id"`
		Description string `json:"description"`
	}
	var req []SettingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data setting tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()
	for _, item := range req {
		if item.Key == "" || item.AccountID == "" {
			continue
		}
		accID, err := uuid.Parse(item.AccountID)
		if err != nil {
			continue
		}

		var setting models.AccountSetting
		if err := tx.Where("company_id = ? AND key = ?", companyID, item.Key).First(&setting).Error; err != nil {
			setting = models.AccountSetting{
				CompanyID:   companyID,
				Key:         item.Key,
				AccountID:   accID,
				Description: item.Description,
			}
			tx.Create(&setting)
		} else {
			setting.AccountID = accID
			if item.Description != "" {
				setting.Description = item.Description
			}
			tx.Save(&setting)
		}
	}
	tx.Commit()
	utils.SendSuccess(c, "Semua setting perkiraan akun berhasil disimpan", nil)
}

// Audit Notes (Catatan Transaksi)
func (h *AccountingHandler) GetAuditNotes(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	search := c.Query("search")

	var count int64
	database.DB.Model(&models.AuditNote{}).Where("company_id = ?", companyID).Count(&count)
	if count == 0 {
		defaultPresets := []struct {
			Code string
			Name string
		}{
			{"1027", "Biaya Promosi"},
			{"1026", "Pemindahan dari Bank ke Kas Kecil"},
			{"1025", "Pembelian Barang Dagangan + PPN"},
			{"1024", "Saldo Awal"},
			{"1023", "Pendapatan Jasa"},
			{"1022", "Biaya Gaji Pegawai"},
			{"1021", "Biaya Iklan"},
			{"1020", "Biaya Sewa Kendaraan Kredit"},
			{"1019", "Biaya Sewa Kendaraan Tunai"},
			{"1018", "Biaya Gaji Harian"},
			{"1017", "Biaya Listrik, Air, Telp"},
			{"1016", "Retur Penjualan Kredit"},
			{"1015", "Retur Pembelian Tunai"},
			{"1014", "Pembayaran Piutang"},
			{"1013", "Penjualan Barang Dagangan Kredit"},
			{"1012", "Penjualan Barang Dagangan Tunai"},
			{"1011", "Pembelian Barang Dagangan Kredit"},
			{"1010", "Pembelian Barang Dagangan Tunai"},
			{"1009", "Penyusutan Kendaraan"},
			{"1008", "Penyusutan Peralatan Kantor"},
			{"1007", "Pembelian Kendaraan dengan DP"},
			{"1006", "Pembelian Kendaraan Tunai"},
			{"1005", "Pembelian Gedung Tunai"},
			{"1004", "Pembelian Tanah Tunai"},
			{"1003", "Pembayaran Hutang Pembelian"},
			{"1002", "Pembelian Peralatan Kantor Kredit"},
			{"1001", "Pembelian Peralatan Kantor Tunai"},
			{"1000", "Setoran Modal"},
		}
		var uID *uuid.UUID
		if val, exists := c.Get("user_id"); exists {
			if id, ok := val.(uuid.UUID); ok {
				uID = &id
			}
		}
		for _, p := range defaultPresets {
			an := models.AuditNote{
				CompanyID: companyID,
				UserID:    uID,
				Code:      p.Code,
				Name:      p.Name,
				Date:      time.Now(),
			}
			database.DB.Create(&an)
		}
	}

	query := database.DB.Where("company_id = ?", companyID)
	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ?", s, s)
	}

	var notes []models.AuditNote
	query.Preload("Items.Account").Order("code desc").Find(&notes)
	utils.SendSuccess(c, "Daftar catatan audit transaksi", notes)
}

func (h *AccountingHandler) CreateAuditNote(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	userID := c.MustGet("user_id").(uuid.UUID)

	type CreateReq struct {
		Code  string                 `json:"code"`
		Name  string                 `json:"name"`
		Items []models.AuditNoteItem `json:"items"`
	}
	var req CreateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data catatan tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()
	if req.Code == "" {
		var count int64
		tx.Model(&models.AuditNote{}).Where("company_id = ?", companyID).Count(&count)
		req.Code = fmt.Sprintf("%d", 1000+count)
	}

	note := models.AuditNote{
		CompanyID: companyID,
		UserID:    &userID,
		Code:      req.Code,
		Name:      req.Name,
		Date:      time.Now(),
	}
	if err := tx.Create(&note).Error; err != nil {
		tx.Rollback()
		utils.SendError(c, http.StatusInternalServerError, "Gagal membuat catatan transaksi", err.Error())
		return
	}

	for _, it := range req.Items {
		if it.AccountID != uuid.Nil {
			it.AuditNoteID = note.ID
			tx.Create(&it)
		}
	}
	tx.Commit()

	database.DB.Preload("Items.Account").First(&note, note.ID)
	utils.SendCreated(c, "Catatan transaksi berhasil dibuat", note)
}

func (h *AccountingHandler) UpdateAuditNote(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID catatan tidak valid", err.Error())
		return
	}

	var existing models.AuditNote
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&existing).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Catatan transaksi tidak ditemukan", err.Error())
		return
	}

	type NoteReq struct {
		Name  string                 `json:"name"`
		Code  string                 `json:"code"`
		Items []models.AuditNoteItem `json:"items"`
	}
	var req NoteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Code != "" {
		existing.Code = req.Code
	}
	tx.Save(&existing)

	tx.Where("audit_note_id = ?", existing.ID).Delete(&models.AuditNoteItem{})
	for _, it := range req.Items {
		if it.AccountID != uuid.Nil {
			it.AuditNoteID = existing.ID
			tx.Create(&it)
		}
	}
	tx.Commit()

	database.DB.Preload("Items.Account").First(&existing, existing.ID)
	utils.SendSuccess(c, "Catatan transaksi berhasil diperbarui", existing)
}

func (h *AccountingHandler) DeleteAuditNote(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.AuditNote{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus catatan transaksi", err.Error())
		return
	}
	utils.SendSuccess(c, "Catatan transaksi berhasil dihapus", nil)
}

// UpdateFixedAsset
func (h *AccountingHandler) UpdateFixedAsset(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID aset tidak valid", err.Error())
		return
	}

	var req models.FixedAsset
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data aset tidak valid", err.Error())
		return
	}

	var asset models.FixedAsset
	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).First(&asset).Error; err != nil {
		utils.SendError(c, http.StatusNotFound, "Aset tidak ditemukan", err.Error())
		return
	}

	asset.Name = req.Name
	asset.AssetCode = req.AssetCode
	asset.AcquisitionCost = req.AcquisitionCost
	asset.SalvageValue = req.SalvageValue
	asset.UsefulLifeMonths = req.UsefulLifeMonths
	asset.AssetAccountID = req.AssetAccountID
	asset.DeprecAccountID = req.DeprecAccountID
	asset.AccumDeprecAccID = req.AccumDeprecAccID
	asset.Status = req.Status
	if asset.UsefulLifeMonths > 0 {
		asset.MonthlyDeprecRate = (asset.AcquisitionCost - asset.SalvageValue) / float64(asset.UsefulLifeMonths)
	}

	database.DB.Save(&asset)
	utils.SendSuccess(c, "Aset berhasil diperbarui", asset)
}

// DeleteFixedAsset
func (h *AccountingHandler) DeleteFixedAsset(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID aset tidak valid", err.Error())
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.FixedAsset{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus aset", err.Error())
		return
	}
	utils.SendSuccess(c, "Aset berhasil dihapus", nil)
}

// DeleteAssetGroup
func (h *AccountingHandler) DeleteAssetGroup(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID grup tidak valid", err.Error())
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.AssetGroup{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus grup aset", err.Error())
		return
	}
	utils.SendSuccess(c, "Grup aset berhasil dihapus", nil)
}

// GetDepositBalances
func (h *AccountingHandler) GetDepositBalances(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	partyType := c.Query("party_type")

	type DepositSummary struct {
		PartyType    string    `json:"party_type"`
		PartyID      uuid.UUID `json:"party_id"`
		PartyCode    string    `json:"party_code"`
		PartyName    string    `json:"party_name"`
		TotalDeposit float64   `json:"total_deposit"`
		TotalUsed    float64   `json:"total_used"`
		Balance      float64   `json:"balance"`
	}

	var summaries []DepositSummary

	if partyType == "" || partyType == "SUPPLIER" {
		var suppliers []models.Supplier
		database.DB.Where("company_id = ?", companyID).Find(&suppliers)
		for _, s := range suppliers {
			var totalDep float64
			database.DB.Model(&models.DepositRecord{}).
				Where("company_id = ? AND supplier_id = ?", companyID, s.ID).
				Select("COALESCE(SUM(amount), 0)").Scan(&totalDep)
			if totalDep > 0 {
				summaries = append(summaries, DepositSummary{
					PartyType:    "SUPPLIER",
					PartyID:      s.ID,
					PartyCode:    s.Code,
					PartyName:    s.Name,
					TotalDeposit: totalDep,
					TotalUsed:    0,
					Balance:      totalDep,
				})
			}
		}
	}

	if partyType == "" || partyType == "CUSTOMER" {
		var customers []models.Customer
		database.DB.Where("company_id = ?", companyID).Find(&customers)
		for _, cust := range customers {
			var totalDep float64
			database.DB.Model(&models.DepositRecord{}).
				Where("company_id = ? AND customer_id = ?", companyID, cust.ID).
				Select("COALESCE(SUM(amount), 0)").Scan(&totalDep)
			if totalDep > 0 {
				summaries = append(summaries, DepositSummary{
					PartyType:    "CUSTOMER",
					PartyID:      cust.ID,
					PartyCode:    cust.Code,
					PartyName:    cust.Name,
					TotalDeposit: totalDep,
					TotalUsed:    0,
					Balance:      totalDep,
				})
			}
		}
	}

	utils.SendSuccess(c, "Ringkasan saldo deposit", summaries)
}

// Initial Balance Handlers (Saldo Awal Perkiraan, Saldo Awal Hutang, Saldo Awal Piutang)
func (h *AccountingHandler) GetInitialBalances(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	entryType := c.Query("type")

	query := database.DB.Where("company_id = ?", companyID)
	if entryType != "" {
		query = query.Where("type = ?", entryType)
	}

	var entries []models.InitialBalanceEntry
	query.Preload("Account").Preload("Supplier").Preload("Customer").Order("created_at desc").Find(&entries)
	utils.SendSuccess(c, "Daftar saldo awal", entries)
}

func (h *AccountingHandler) CreateInitialBalance(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)

	var entry models.InitialBalanceEntry
	if err := c.ShouldBindJSON(&entry); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data saldo awal tidak valid", err.Error())
		return
	}

	entry.CompanyID = companyID
	entry.BranchID = branchID
	if entry.Date.IsZero() {
		entry.Date = time.Now()
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menyimpan saldo awal", err.Error())
		return
	}

	if entry.Type == "ACCOUNT" && entry.AccountID != nil {
		netBal := entry.Debit - entry.Credit
		database.DB.Model(&models.Account{}).Where("id = ?", *entry.AccountID).Update("balance", netBal)
	}

	utils.SendCreated(c, "Saldo awal berhasil disimpan", entry)
}

func (h *AccountingHandler) BatchSaveAccountInitialBalances(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	branchID := c.MustGet("branch_id").(uuid.UUID)

	type AccountBalItem struct {
		AccountID string  `json:"account_id"`
		Debit     float64 `json:"debit"`
		Credit    float64 `json:"credit"`
	}

	var req []AccountBalItem
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.SendError(c, http.StatusBadRequest, "Data akun saldo awal tidak valid", err.Error())
		return
	}

	tx := database.DB.Begin()
	for _, item := range req {
		accID, err := uuid.Parse(item.AccountID)
		if err != nil {
			continue
		}

		var acc models.Account
		if err := tx.Where("id = ? AND company_id = ?", accID, companyID).First(&acc).Error; err != nil {
			continue
		}

		netBal := item.Debit - item.Credit
		if acc.NormalBalance == "CREDIT" {
			netBal = item.Credit - item.Debit
		}
		tx.Model(&acc).Update("balance", netBal)

		var existing models.InitialBalanceEntry
		if err := tx.Where("company_id = ? AND account_id = ? AND type = 'ACCOUNT'", companyID, accID).First(&existing).Error; err == nil {
			tx.Model(&existing).Updates(map[string]interface{}{
				"debit":  item.Debit,
				"credit": item.Credit,
				"amount": item.Debit + item.Credit,
			})
		} else {
			tx.Create(&models.InitialBalanceEntry{
				CompanyID: companyID,
				BranchID:  branchID,
				Type:      "ACCOUNT",
				AccountID: &accID,
				Date:      time.Now(),
				Debit:     item.Debit,
				Credit:    item.Credit,
				Amount:    item.Debit + item.Credit,
				Notes:     "Saldo Awal Akun Perkiraan",
			})
		}
	}
	tx.Commit()

	utils.SendSuccess(c, "Seluruh saldo awal akun berhasil diperbarui", nil)
}

func (h *AccountingHandler) DeleteInitialBalance(c *gin.Context) {
	companyID := c.MustGet("company_id").(uuid.UUID)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.SendError(c, http.StatusBadRequest, "ID tidak valid", err.Error())
		return
	}

	if err := database.DB.Where("id = ? AND company_id = ?", id, companyID).Delete(&models.InitialBalanceEntry{}).Error; err != nil {
		utils.SendError(c, http.StatusInternalServerError, "Gagal menghapus saldo awal", err.Error())
		return
	}
	utils.SendSuccess(c, "Saldo awal berhasil dihapus", nil)
}
