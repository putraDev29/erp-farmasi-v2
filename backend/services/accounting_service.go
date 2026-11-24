package services

import (
	"errors"
	"fmt"
	"math"
	"time"

	"farmasi/backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type JournalEntryParam struct {
	AccountCode string
	Debit       float64
	Credit      float64
	Description string
}

type JournalPostParams struct {
	CompanyID   uuid.UUID
	BranchID    uuid.UUID
	DocNo       string
	Date        time.Time
	RefType     string
	RefNo       string
	Description string
	CreatedBy   uuid.UUID
	Entries     []JournalEntryParam
}

// PostDoubleEntryJournal creates a balanced journal and updates COA balances
func PostDoubleEntryJournal(tx *gorm.DB, params JournalPostParams) (*models.Journal, error) {
	if len(params.Entries) < 2 {
		return nil, errors.New("jurnal minimal harus memiliki 2 baris entri (debit & kredit)")
	}

	var totalDebit, totalCredit float64
	for _, e := range params.Entries {
		totalDebit += e.Debit
		totalCredit += e.Credit
	}

	// Validate balanced journal: math.Abs(totalDebit - totalCredit) < 0.01
	if math.Abs(totalDebit-totalCredit) > 0.01 {
		return nil, fmt.Errorf("jurnal tidak seimbang: Total Debit (%.2f) != Total Kredit (%.2f)", totalDebit, totalCredit)
	}

	docNo := params.DocNo
	if docNo == "" {
		generated, err := GenerateDocNumber(tx, params.CompanyID, "JV")
		if err != nil {
			return nil, err
		}
		docNo = generated
	}

	journal := models.Journal{
		CompanyID:   params.CompanyID,
		BranchID:    params.BranchID,
		DocNo:       docNo,
		Date:        params.Date,
		RefType:     params.RefType,
		RefNo:       params.RefNo,
		Description: params.Description,
		Status:      "POSTED",
		TotalDebit:  totalDebit,
		TotalCredit: totalCredit,
		CreatedBy:   params.CreatedBy,
	}

	if err := tx.Create(&journal).Error; err != nil {
		return nil, err
	}

	for _, entry := range params.Entries {
		var account models.Account
		err := tx.Where("company_id = ? AND code = ?", params.CompanyID, entry.AccountCode).First(&account).Error
		if err != nil {
			return nil, fmt.Errorf("akun dengan kode %s tidak ditemukan", entry.AccountCode)
		}

		je := models.JournalEntry{
			JournalID:   journal.ID,
			AccountID:   account.ID,
			Debit:       entry.Debit,
			Credit:      entry.Credit,
			Description: entry.Description,
		}
		if err := tx.Create(&je).Error; err != nil {
			return nil, err
		}

		// Update Account balance based on real journal entries sum
		realBal := GetAccountRealBalance(tx, account.ID)
		account.Balance = realBal

		// Indonesian Accounting Standard (SAK / PSAK): Saldo Kas & Bank tidak boleh minus / overdraft
		if account.Subtype == "CASH_BANK" && account.Balance < -0.001 && params.RefType != "INITIAL_BALANCE" {
			return nil, fmt.Errorf("transaksi ditolak: Saldo kas/bank %s (%s) tidak mencukupi untuk transaksi ini (saldo akhir akan minus Rp %.2f). Sesuai aturan akuntansi Indonesia, saldo kas tidak boleh negatif", account.Name, account.Code, account.Balance)
		}

		if err := tx.Save(&account).Error; err != nil {
			return nil, err
		}
	}

	return &journal, nil
}

// GetAccountRealBalance calculates the actual current balance from all posted journal entries
func GetAccountRealBalance(tx *gorm.DB, accountID uuid.UUID) float64 {
	var acc models.Account
	if err := tx.First(&acc, "id = ?", accountID).Error; err != nil {
		return 0
	}
	var res struct {
		Debit  float64
		Credit float64
	}
	tx.Model(&models.JournalEntry{}).
		Select("COALESCE(SUM(debit), 0) as debit, COALESCE(SUM(credit), 0) as credit").
		Where("account_id = ? AND deleted_at IS NULL", accountID).
		Scan(&res)

	if acc.NormalBalance == "CREDIT" {
		return res.Credit - res.Debit
	}
	return res.Debit - res.Credit
}

// SyncAllAccountBalances recalculates and updates the cached balance of all accounts in the company
func SyncAllAccountBalances(tx *gorm.DB, companyID uuid.UUID) error {
	var accounts []models.Account
	if err := tx.Where("company_id = ?", companyID).Find(&accounts).Error; err != nil {
		return err
	}
	for _, acc := range accounts {
		var res struct {
			Debit  float64
			Credit float64
		}
		tx.Model(&models.JournalEntry{}).
			Select("COALESCE(SUM(debit), 0) as debit, COALESCE(SUM(credit), 0) as credit").
			Where("account_id = ? AND deleted_at IS NULL", acc.ID).
			Scan(&res)

		bal := res.Debit - res.Credit
		if acc.NormalBalance == "CREDIT" {
			bal = res.Credit - res.Debit
		}
		tx.Model(&models.Account{}).Where("id = ?", acc.ID).Update("balance", bal)
	}
	return nil
}

// ResolveSettingAccountCodeWithFallback searches primaryKey first, then fallbackKey, then defaultCode/defaultName
func ResolveSettingAccountCodeWithFallback(tx *gorm.DB, companyID uuid.UUID, primaryKey string, fallbackKey string, defaultCode string, defaultName string, defaultType string, defaultSubtype string, normalBalance string) string {
	var setting models.AccountSetting
	if err := tx.Where("company_id = ? AND key = ?", companyID, primaryKey).Preload("Account").First(&setting).Error; err == nil {
		if setting.Account != nil && setting.Account.Code != "" {
			return setting.Account.Code
		}
	}
	if fallbackKey != "" {
		if err := tx.Where("company_id = ? AND key = ?", companyID, fallbackKey).Preload("Account").First(&setting).Error; err == nil {
			if setting.Account != nil && setting.Account.Code != "" {
				return setting.Account.Code
			}
		}
	}
	return ResolveSettingAccountCode(tx, companyID, primaryKey, defaultCode, defaultName, defaultType, defaultSubtype, normalBalance)
}

// ResolveSettingAccountCode finds the configured account code for a setting key in models.AccountSetting,
// or falls back to searching by defaultCode or defaultName, or creates it automatically if missing.
func ResolveSettingAccountCode(tx *gorm.DB, companyID uuid.UUID, settingKey string, defaultCode string, defaultName string, defaultType string, defaultSubtype string, normalBalance string) string {
	// 1. Check if configured in AccountSetting
	var setting models.AccountSetting
	if err := tx.Where("company_id = ? AND key = ?", companyID, settingKey).Preload("Account").First(&setting).Error; err == nil {
		if setting.Account != nil && setting.Account.Code != "" {
			return setting.Account.Code
		}
	}

	// 2. Check if account already exists with defaultCode
	var acc models.Account
	if err := tx.Where("company_id = ? AND code = ?", companyID, defaultCode).First(&acc).Error; err == nil {
		tx.Where("company_id = ? AND key = ?", companyID, settingKey).Assign(models.AccountSetting{
			AccountID:   acc.ID,
			Description: defaultName,
		}).FirstOrCreate(&models.AccountSetting{
			CompanyID:   companyID,
			Key:         settingKey,
			AccountID:   acc.ID,
			Description: defaultName,
		})
		return acc.Code
	}

	// 3. Check if account exists with matching name
	if err := tx.Where("company_id = ? AND name ILIKE ?", companyID, "%"+defaultName+"%").First(&acc).Error; err == nil {
		tx.Where("company_id = ? AND key = ?", companyID, settingKey).Assign(models.AccountSetting{
			AccountID:   acc.ID,
			Description: defaultName,
		}).FirstOrCreate(&models.AccountSetting{
			CompanyID:   companyID,
			Key:         settingKey,
			AccountID:   acc.ID,
			Description: defaultName,
		})
		return acc.Code
	}

	// 4. Create the account if not found
	newAcc := models.Account{
		CompanyID:     companyID,
		Code:          defaultCode,
		Name:          defaultName,
		Type:          defaultType,
		Subtype:       defaultSubtype,
		NormalBalance: normalBalance,
		IsHeader:      false,
		IsActive:      true,
	}
	if err := tx.Create(&newAcc).Error; err == nil {
		tx.Create(&models.AccountSetting{
			CompanyID:   companyID,
			Key:         settingKey,
			AccountID:   newAcc.ID,
			Description: defaultName,
		})
		return newAcc.Code
	}

	return defaultCode
}

