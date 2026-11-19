package services

import (
	"fmt"
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
