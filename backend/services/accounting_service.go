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

		// Update Account balance based on normal balance
		if account.NormalBalance == "DEBIT" {
			account.Balance += (entry.Debit - entry.Credit)
		} else {
			account.Balance += (entry.Credit - entry.Debit)
		}

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
