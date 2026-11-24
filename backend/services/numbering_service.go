package services

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"farmasi/backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func GenerateDocNumber(tx *gorm.DB, companyID uuid.UUID, docType string) (string, error) {
	var format models.NumberingFormat
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("company_id = ? AND doc_type = ?", companyID, docType).
		First(&format).Error

	now := time.Now()
	prefix := docType + "/"
	counterLen := 5

	if err != nil {
		// Create default if not found
		format = models.NumberingFormat{
			CompanyID:     companyID,
			DocType:       docType,
			Prefix:        prefix,
			CounterLength: counterLen,
			CurrentNumber: 1,
			ResetPeriod:   "YEARLY",
		}
		if err := tx.Create(&format).Error; err != nil {
			return "", err
		}
	} else {
		format.CurrentNumber++
		if err := tx.Save(&format).Error; err != nil {
			return "", err
		}
	}

	formattedNum := fmt.Sprintf("%s%04d/%02d/%0*d",
		format.Prefix,
		now.Year(),
		int(now.Month()),
		format.CounterLength,
		format.CurrentNumber,
	)

	return formattedNum, nil
}

// GenerateCashTransactionNumber safely generates a unique CashTransaction doc number (e.g. 0428/KASO/UTAMA/1126)
func GenerateCashTransactionNumber(tx *gorm.DB, companyID uuid.UUID, tag string, date time.Time) string {
	mmyy := date.Format("0106")
	pattern := "%/" + tag + "/%/" + mmyy

	var existing []string
	tx.Unscoped().Model(&models.CashTransaction{}).
		Where("company_id = ? AND trx_no LIKE ?", companyID, pattern).
		Pluck("trx_no", &existing)

	maxSeq := 0
	for _, no := range existing {
		parts := strings.Split(no, "/")
		if len(parts) >= 1 {
			if num, err := strconv.Atoi(parts[0]); err == nil {
				if num > maxSeq {
					maxSeq = num
				}
			}
		}
	}

	nextSeq := maxSeq + 1
	for {
		candidate := fmt.Sprintf("%04d/%s/UTAMA/%s", nextSeq, tag, mmyy)
		var exists int64
		tx.Unscoped().Model(&models.CashTransaction{}).
			Where("company_id = ? AND trx_no = ?", companyID, candidate).
			Count(&exists)
		if exists == 0 {
			return candidate
		}
		nextSeq++
	}
}
