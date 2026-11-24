package database

import (
	"fmt"
	"log"
	"time"

	"farmasi/backend/config"
	"farmasi/backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Jakarta",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
		cfg.DBSSLMode,
	)

	gormLogger := logger.Default.LogMode(logger.Warn)
	if cfg.Env == "development" {
		gormLogger = logger.Default.LogMode(logger.Info)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB instance: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	DB = db
	log.Println("[Database] Connected successfully to PostgreSQL")
	return DB, nil
}

func MigrateDB(db *gorm.DB) error {
	log.Println("[Database] Running auto-migrations...")

	// Enable uuid-ossp or pgcrypto extension
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
	db.Exec("ALTER TABLE role_module_permissions ALTER COLUMN module TYPE VARCHAR(255);")
	db.Exec("ALTER TABLE sales_orders ALTER COLUMN process_status TYPE VARCHAR(100);")
	db.Exec("ALTER TABLE sales_orders ALTER COLUMN status TYPE VARCHAR(50);")
	db.Exec("ALTER TABLE sales ALTER COLUMN status TYPE VARCHAR(50);")
	db.Exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'TRANSAKSI';")
	db.Exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS doc_no VARCHAR(100);")
	db.Exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;")
	db.Exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Sukses';")
	db.Exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS computer_name VARCHAR(100) DEFAULT 'Desktop (Windows)';")

	// Clean up and standardize SP Numbers
	db.Exec("UPDATE sales SET customer_sp_number = REPLACE(customer_sp_number, 'SP/INV/', 'SP/') WHERE customer_sp_number LIKE 'SP/INV/%';")
	db.Exec("UPDATE sales_orders SET customer_sp_number = REPLACE(customer_sp_number, 'SP/SO/', 'SP/') WHERE customer_sp_number LIKE 'SP/SO/%';")
	db.Exec("UPDATE sales SET customer_sp_number = 'SP/' || REPLACE(REPLACE(invoice_no, 'INV/', ''), 'POS/', '') WHERE (customer_sp_number IS NULL OR customer_sp_number = '') AND invoice_no IS NOT NULL;")
	db.Exec("UPDATE sales_orders SET customer_sp_number = 'SP/' || REPLACE(order_no, 'SO/', '') WHERE (customer_sp_number IS NULL OR customer_sp_number = '') AND order_no IS NOT NULL;")

	err := db.AutoMigrate(
		// Core & IAM
		&models.Company{},
		&models.Branch{},
		&models.Warehouse{},
		&models.Department{},
		&models.Permission{},
		&models.Role{},
		&models.RolePermission{},
		&models.RoleModulePermission{},
		&models.User{},
		&models.UserRole{},
		&models.BranchAccess{},
		&models.WarehouseAccess{},
		&models.AuditLog{},
		&models.Setting{},
		&models.NumberingFormat{},

		// Master Data
		&models.Category{},
		&models.SubCategory{},
		&models.Brand{},
		&models.Unit{},
		&models.Variant{},
		&models.EMoney{},
		&models.ShippingFee{},
		&models.Product{},
		&models.UnitConversion{},
		&models.ProductPrice{},
		&models.ItemDiscount{},
		&models.ProductImage{},
		&models.CustomerGroup{},
		&models.Territory{},
		&models.SubTerritory{},
		&models.PeriodicDiscount{},
		&models.PeriodicPromotion{},
		&models.TebusMurahPromotion{},
		&models.CustomerPointSetting{},
		&models.Customer{},
		&models.Supplier{},
		&models.Bank{},
		&models.PaymentMethod{},
		&models.SalesRepresentative{},

		// Inventory
		&models.StockBalance{},
		&models.StockMovement{},
		&models.ProductBatch{},
		&models.StockOpname{},
		&models.StockOpnameItem{},
		&models.WarehouseTransfer{},
		&models.WarehouseTransferItem{},
		&models.ItemEntry{},
		&models.ItemEntryItem{},
		&models.ItemExit{},
		&models.ItemExitItem{},
		&models.ItemTransferOrder{},
		&models.ItemTransferOrderItem{},
		&models.InitialStockEntry{},

		// Purchasing
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.Purchase{},
		&models.PurchaseItem{},
		&models.PurchaseReturn{},
		&models.PurchaseReturnItem{},
		&models.PurchaseReturnStatusLog{},
		&models.SupplierPayment{},
		&models.SupplierPaymentDetail{},

		// Sales & POS
		&models.SalesOrder{},
		&models.SalesOrderItem{},
		&models.Sale{},
		&models.SaleItem{},
		&models.SalePayment{},
		&models.SalesReturn{},
		&models.SalesReturnItem{},
		&models.SalesReturnStatusLog{},
		&models.CustomerPayment{},
		&models.CustomerPaymentDetail{},
		&models.SalesCommissionPayment{},
		&models.SalesDelivery{},

		// Assembly
		&models.BillOfMaterial{},
		&models.BOMItem{},
		&models.AssemblyOrder{},
		&models.AssemblyOrderItem{},
		&models.AssemblyProcess{},
		&models.AssemblyFinished{},

		// Accounting
		&models.Account{},
		&models.Journal{},
		&models.JournalEntry{},
		&models.FixedAsset{},
		&models.AssetDepreciation{},
		&models.AccountingPeriod{},
		&models.CashTransaction{},
		&models.CashTransactionItem{},
		&models.DepositRecord{},
		&models.AssetGroup{},
		&models.AccountSetting{},
		&models.AuditNote{},
		&models.AuditNoteItem{},
		&models.InitialBalanceEntry{},

		// Documents & PBF Compliance Attachments
		&models.DocumentAttachment{},
	)

	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Println("[Database] All tables migrated successfully!")
	return nil
}
