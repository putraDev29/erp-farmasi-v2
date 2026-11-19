package tests

import (
	"testing"

	"farmasi/backend/config"
	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/services"
	"farmasi/backend/utils"
)

func TestDatabaseMigrationAndSeeding(t *testing.T) {
	cfg := config.LoadConfig()
	db, err := database.ConnectDB(cfg)
	if err != nil {
		t.Fatalf("Failed to connect database: %v", err)
	}

	if err := database.MigrateDB(db); err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	if err := database.SeedInitialData(db); err != nil {
		t.Fatalf("Failed to seed initial data: %v", err)
	}

	// Verify Company seeded
	var comp models.Company
	if err := db.Where("code = ?", "CORP01").First(&comp).Error; err != nil {
		t.Errorf("Expected CORP01 company, got error: %v", err)
	}

	// Verify SuperAdmin user
	var user models.User
	if err := db.Where("username = ?", "admin").First(&user).Error; err != nil {
		t.Errorf("Expected admin user, got error: %v", err)
	}

	// Verify Password hashing
	if !utils.CheckPasswordHash("admin123", user.PasswordHash) {
		t.Errorf("Admin password hash check failed")
	}

	// Verify Products seeded
	var prodCount int64
	db.Model(&models.Product{}).Count(&prodCount)
	if prodCount == 0 {
		t.Errorf("Expected seeded products, got 0")
	}

	// Verify COA accounts seeded
	var accCount int64
	db.Model(&models.Account{}).Count(&accCount)
	if accCount == 0 {
		t.Errorf("Expected seeded COA accounts, got 0")
	}

	t.Logf("Migration & Seed Verified: %d products, %d accounts", prodCount, accCount)
}

func TestDoubleEntryJournalBalance(t *testing.T) {
	cfg := config.LoadConfig()
	db, _ := database.ConnectDB(cfg)

	var comp models.Company
	db.Where("code = ?", "CORP01").First(&comp)
	var branch models.Branch
	db.Where("company_id = ?", comp.ID).First(&branch)
	var user models.User
	db.Where("username = ?", "admin").First(&user)

	// Test unbalanced journal MUST FAIL
	tx := db.Begin()
	_, err := services.PostDoubleEntryJournal(tx, services.JournalPostParams{
		CompanyID:   comp.ID,
		BranchID:    branch.ID,
		RefType:     "TEST",
		RefNo:       "UNBALANCED",
		Description: "Test Unbalanced",
		CreatedBy:   user.ID,
		Entries: []services.JournalEntryParam{
			{AccountCode: "1-1100", Debit: 100000, Credit: 0, Description: "Kas"},
			{AccountCode: "4-1000", Debit: 0, Credit: 90000, Description: "Pendapatan"}, // Diff of 10000!
		},
	})
	tx.Rollback()

	if err == nil {
		t.Errorf("Expected error on unbalanced journal, but got nil")
	} else {
		t.Logf("Unbalanced journal correctly rejected: %v", err)
	}
}
