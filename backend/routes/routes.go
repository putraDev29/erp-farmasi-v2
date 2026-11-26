package routes

import (
	"farmasi/backend/config"
	"farmasi/backend/handlers"
	"farmasi/backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRouter(cfg *config.Config) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.StructuredLogger())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.CleanJSONMiddleware())
	r.Use(middleware.ActivityLoggerMiddleware())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "Farmasi ERP API",
			"env":     cfg.Env,
		})
	})

	// Serve static uploaded files (both root and api prefix for maximum client compatibility)
	r.Static("/uploads", "./uploads")
	r.Static("/api/v1/uploads", "./uploads")

	authHandler := handlers.NewAuthHandler(cfg)
	companyHandler := handlers.NewCompanyHandler()
	userHandler := handlers.NewUserHandler()
	masterHandler := handlers.NewMasterHandler()
	inventoryHandler := handlers.NewInventoryHandler()
	purchaseHandler := handlers.NewPurchaseHandler()
	salesHandler := handlers.NewSalesHandler()
	assemblyHandler := handlers.NewAssemblyHandler()
	accountingHandler := handlers.NewAccountingHandler()
	dashboardHandler := handlers.NewDashboardHandler()
	reportHandler := handlers.NewReportHandler()
	settingHandler := handlers.NewSettingHandler()
	documentHandler := handlers.NewDocumentHandler()

	api := r.Group("/api/v1")
	{
		// Public Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register-customer", authHandler.RegisterCustomer)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Auth Profile
			protected.GET("/auth/me", authHandler.Me)

			// Dashboard
			protected.GET("/dashboard/summary", dashboardHandler.GetSummary)

			// Company, Branch, Warehouse
			protected.GET("/companies", companyHandler.GetCompanies)
			protected.PUT("/companies/:id", companyHandler.UpdateCompany)
			protected.POST("/companies/upload", companyHandler.UploadAsset)
			protected.GET("/branches", companyHandler.GetBranches)
			protected.POST("/branches", companyHandler.CreateBranch)
			protected.PUT("/branches/:id", companyHandler.UpdateBranch)
			protected.GET("/warehouses", companyHandler.GetWarehouses)
			protected.POST("/warehouses", companyHandler.CreateWarehouse)
			protected.PUT("/warehouses/:id", companyHandler.UpdateWarehouse)
			protected.DELETE("/warehouses/:id", companyHandler.DeleteWarehouse)

			// Users & IAM
			protected.GET("/users", userHandler.GetUsers)
			protected.POST("/users", userHandler.CreateUser)
			protected.PUT("/users/:id", userHandler.UpdateUser)
			protected.DELETE("/users/:id", userHandler.DeleteUser)
			protected.GET("/roles", userHandler.GetRoles)
			protected.POST("/roles", userHandler.CreateRole)
			protected.PUT("/roles/:id", userHandler.UpdateRole)
			protected.DELETE("/roles/:id", userHandler.DeleteRole)
			protected.GET("/roles/:id/permissions", userHandler.GetRolePermissions)
			protected.PUT("/roles/:id/permissions", userHandler.UpdateRolePermissions)
			protected.GET("/permissions", userHandler.GetPermissions)

			// Master Data
			protected.GET("/products", masterHandler.GetProducts)
			protected.GET("/products/:id", masterHandler.GetProductByID)
			protected.POST("/products", masterHandler.CreateProduct)
			protected.PUT("/products/:id", masterHandler.UpdateProduct)
			protected.DELETE("/products/:id", masterHandler.DeleteProduct)

			protected.GET("/categories", masterHandler.GetCategories)
			protected.POST("/categories", masterHandler.CreateCategory)
			protected.PUT("/categories/:id", masterHandler.UpdateCategory)
			protected.DELETE("/categories/:id", masterHandler.DeleteCategory)

			protected.GET("/brands", masterHandler.GetBrands)
			protected.POST("/brands", masterHandler.CreateBrand)
			protected.PUT("/brands/:id", masterHandler.UpdateBrand)
			protected.DELETE("/brands/:id", masterHandler.DeleteBrand)

			protected.GET("/units", masterHandler.GetUnits)
			protected.POST("/units", masterHandler.CreateUnit)
			protected.PUT("/units/:id", masterHandler.UpdateUnit)
			protected.DELETE("/units/:id", masterHandler.DeleteUnit)

			protected.GET("/suppliers", masterHandler.GetSuppliers)
			protected.POST("/suppliers", masterHandler.CreateSupplier)
			protected.PUT("/suppliers/:id", masterHandler.UpdateSupplier)
			protected.DELETE("/suppliers/:id", masterHandler.DeleteSupplier)

			protected.GET("/customers", masterHandler.GetCustomers)
			protected.GET("/customers/:id", masterHandler.GetCustomerByID)
			protected.POST("/customers", masterHandler.CreateCustomer)
			protected.PUT("/customers/:id", masterHandler.UpdateCustomer)
			protected.DELETE("/customers/:id", masterHandler.DeleteCustomer)
			protected.POST("/customers/:id/verify", masterHandler.VerifyCustomer)

			protected.GET("/sales-reps", masterHandler.GetSalesReps)
			protected.POST("/sales-reps", masterHandler.CreateSalesRep)
			protected.PUT("/sales-reps/:id", masterHandler.UpdateSalesRep)
			protected.DELETE("/sales-reps/:id", masterHandler.DeleteSalesRep)

			protected.GET("/customer-groups", masterHandler.GetCustomerGroups)
			protected.POST("/customer-groups", masterHandler.CreateCustomerGroup)
			protected.PUT("/customer-groups/:id", masterHandler.UpdateCustomerGroup)
			protected.DELETE("/customer-groups/:id", masterHandler.DeleteCustomerGroup)

			protected.GET("/territories", masterHandler.GetTerritories)
			protected.POST("/territories", masterHandler.CreateTerritory)
			protected.PUT("/territories/:id", masterHandler.UpdateTerritory)
			protected.DELETE("/territories/:id", masterHandler.DeleteTerritory)

			protected.GET("/sub-territories", masterHandler.GetSubTerritories)
			protected.POST("/sub-territories", masterHandler.CreateSubTerritory)
			protected.PUT("/sub-territories/:id", masterHandler.UpdateSubTerritory)
			protected.DELETE("/sub-territories/:id", masterHandler.DeleteSubTerritory)

			protected.GET("/periodic-discounts", masterHandler.GetPeriodicDiscounts)
			protected.POST("/periodic-discounts", masterHandler.CreatePeriodicDiscount)
			protected.PUT("/periodic-discounts/:id", masterHandler.UpdatePeriodicDiscount)
			protected.DELETE("/periodic-discounts/:id", masterHandler.DeletePeriodicDiscount)
			protected.GET("/discounts/periodic", masterHandler.GetPeriodicDiscounts)
			protected.POST("/discounts/periodic", masterHandler.CreatePeriodicDiscount)
			protected.PUT("/discounts/periodic/:id", masterHandler.UpdatePeriodicDiscount)
			protected.DELETE("/discounts/periodic/:id", masterHandler.DeletePeriodicDiscount)

			protected.GET("/periodic-promotions", masterHandler.GetPeriodicPromotions)
			protected.POST("/periodic-promotions", masterHandler.CreatePeriodicPromotion)
			protected.PUT("/periodic-promotions/:id", masterHandler.UpdatePeriodicPromotion)
			protected.DELETE("/periodic-promotions/:id", masterHandler.DeletePeriodicPromotion)
			protected.GET("/promotions/periodic", masterHandler.GetPeriodicPromotions)
			protected.POST("/promotions/periodic", masterHandler.CreatePeriodicPromotion)
			protected.PUT("/promotions/periodic/:id", masterHandler.UpdatePeriodicPromotion)
			protected.DELETE("/promotions/periodic/:id", masterHandler.DeletePeriodicPromotion)

			protected.GET("/tebus-murah-promotions", masterHandler.GetTebusMurahPromotions)
			protected.POST("/tebus-murah-promotions", masterHandler.CreateTebusMurahPromotion)
			protected.PUT("/tebus-murah-promotions/:id", masterHandler.UpdateTebusMurahPromotion)
			protected.DELETE("/tebus-murah-promotions/:id", masterHandler.DeleteTebusMurahPromotion)
			protected.GET("/promotions/tebus-murah", masterHandler.GetTebusMurahPromotions)
			protected.POST("/promotions/tebus-murah", masterHandler.CreateTebusMurahPromotion)
			protected.PUT("/promotions/tebus-murah/:id", masterHandler.UpdateTebusMurahPromotion)
			protected.DELETE("/promotions/tebus-murah/:id", masterHandler.DeleteTebusMurahPromotion)

			protected.GET("/customer-point-settings", masterHandler.GetCustomerPointSettings)
			protected.PUT("/customer-point-settings", masterHandler.UpdateCustomerPointSettings)

			protected.GET("/banks", masterHandler.GetBanks)
			protected.POST("/banks", masterHandler.CreateBank)
			protected.PUT("/banks/:id", masterHandler.UpdateBank)
			protected.DELETE("/banks/:id", masterHandler.DeleteBank)

			protected.GET("/variants", masterHandler.GetVariants)
			protected.POST("/variants", masterHandler.CreateVariant)
			protected.PUT("/variants/:id", masterHandler.UpdateVariant)
			protected.DELETE("/variants/:id", masterHandler.DeleteVariant)

			protected.GET("/e-moneys", masterHandler.GetEMoneys)
			protected.POST("/e-moneys", masterHandler.CreateEMoney)
			protected.PUT("/e-moneys/:id", masterHandler.UpdateEMoney)
			protected.DELETE("/e-moneys/:id", masterHandler.DeleteEMoney)

			protected.GET("/shipping-fees", masterHandler.GetShippingFees)
			protected.POST("/shipping-fees", masterHandler.CreateShippingFee)
			protected.PUT("/shipping-fees/:id", masterHandler.UpdateShippingFee)
			protected.DELETE("/shipping-fees/:id", masterHandler.DeleteShippingFee)

			protected.GET("/sub-categories", masterHandler.GetSubCategories)
			protected.POST("/sub-categories", masterHandler.CreateSubCategory)
			protected.PUT("/sub-categories/:id", masterHandler.UpdateSubCategory)
			protected.DELETE("/sub-categories/:id", masterHandler.DeleteSubCategory)

			protected.GET("/payment-methods", masterHandler.GetPaymentMethods)

			// Inventory
			protected.GET("/inventory/balances", inventoryHandler.GetStockBalances)
			protected.GET("/inventory/stock-card", inventoryHandler.GetStockCard)
			protected.GET("/inventory/opname", inventoryHandler.GetStockOpnames)
			protected.POST("/inventory/opname", inventoryHandler.CreateStockOpname)
			protected.GET("/inventory/expired-drugs", inventoryHandler.GetExpiredDrugs)
			protected.PUT("/inventory/expired-drugs/:id", inventoryHandler.UpdateDrugExpiry)

			// Item Masuk
			protected.GET("/inventory/item-entries", inventoryHandler.GetItemEntries)
			protected.GET("/inventory/item-entries/:id", inventoryHandler.GetItemEntryByID)
			protected.POST("/inventory/item-entries", inventoryHandler.CreateItemEntry)
			protected.PUT("/inventory/item-entries/:id", inventoryHandler.UpdateItemEntry)
			protected.DELETE("/inventory/item-entries/:id", inventoryHandler.DeleteItemEntry)

			// Item Keluar
			protected.GET("/inventory/item-exits", inventoryHandler.GetItemExits)
			protected.GET("/inventory/item-exits/:id", inventoryHandler.GetItemExitByID)
			protected.POST("/inventory/item-exits", inventoryHandler.CreateItemExit)
			protected.PUT("/inventory/item-exits/:id", inventoryHandler.UpdateItemExit)
			protected.DELETE("/inventory/item-exits/:id", inventoryHandler.DeleteItemExit)

			// Pesanan Item Transfer
			protected.GET("/inventory/transfer-orders", inventoryHandler.GetTransferOrders)
			protected.GET("/inventory/transfer-orders/:id", inventoryHandler.GetTransferOrderByID)
			protected.POST("/inventory/transfer-orders", inventoryHandler.CreateTransferOrder)
			protected.PUT("/inventory/transfer-orders/:id", inventoryHandler.UpdateTransferOrder)
			protected.DELETE("/inventory/transfer-orders/:id", inventoryHandler.DeleteTransferOrder)

			// Item Transfer
			protected.GET("/inventory/transfers", inventoryHandler.GetTransfers)
			protected.GET("/inventory/transfers/:id", inventoryHandler.GetTransferByID)
			protected.POST("/inventory/transfers", inventoryHandler.CreateTransfer)
			protected.PUT("/inventory/transfers/:id", inventoryHandler.UpdateTransfer)
			protected.DELETE("/inventory/transfers/:id", inventoryHandler.DeleteTransfer)

			// Saldo Awal
			protected.GET("/inventory/initial-stock", inventoryHandler.GetInitialStock)
			protected.POST("/inventory/initial-stock", inventoryHandler.CreateInitialStock)
			protected.PUT("/inventory/initial-stock/:id", inventoryHandler.UpdateInitialStock)
			protected.DELETE("/inventory/initial-stock/:id", inventoryHandler.DeleteInitialStock)
			protected.DELETE("/inventory/initial-stock/reset/all", inventoryHandler.DeleteAllInitialStock)

			// Perbaikan Saldo
			protected.POST("/inventory/fix-balances", inventoryHandler.FixStockBalances)

			// Purchasing
			protected.GET("/purchases/orders", purchaseHandler.GetPurchaseOrders)
			protected.GET("/purchases/orders/:id", purchaseHandler.GetPurchaseOrder)
			protected.POST("/purchases/orders", purchaseHandler.CreatePurchaseOrder)
			protected.PUT("/purchases/orders/:id", purchaseHandler.UpdatePurchaseOrder)
			protected.DELETE("/purchases/orders/:id", purchaseHandler.DeletePurchaseOrder)
			protected.POST("/purchases/orders/:id/send", purchaseHandler.SendPOToSupplier)
			protected.POST("/purchases/orders/:id/reallocate", purchaseHandler.ReallocateRemainingPO)
			protected.POST("/purchases/orders/:id/cancel-remaining", purchaseHandler.CancelRemainingPO)
			protected.POST("/purchases/orders/:id/receive", purchaseHandler.ReceiveAndVerifyPO)
			protected.POST("/purchases/orders/:id/fulfill-items", purchaseHandler.FulfillPurchaseOrderItems)
			protected.GET("/purchases/orders/:id/payment-history", purchaseHandler.GetPurchaseOrderPaymentHistory)

			protected.GET("/purchases", purchaseHandler.GetPurchases)
			protected.GET("/purchases/:id", purchaseHandler.GetPurchase)
			protected.GET("/purchases/:id/payment-history", purchaseHandler.GetPurchasePaymentHistory)
			protected.POST("/purchases", purchaseHandler.CreatePurchase)
			protected.PUT("/purchases/:id", purchaseHandler.UpdatePurchase)
			protected.POST("/purchases/:id/receive", purchaseHandler.ReceivePurchaseInvoice)
			protected.PUT("/purchases/:id/verify", purchaseHandler.VerifyPurchase)
			protected.PUT("/purchases/:id/admin-approve", purchaseHandler.AdminApprovePurchase)
			protected.PUT("/purchases/:id/admin-reject", purchaseHandler.AdminRejectPurchase)
			protected.DELETE("/purchases/:id", purchaseHandler.DeletePurchase)

			// Purchase Returns
			protected.GET("/purchases/returns", purchaseHandler.GetPurchaseReturns)
			protected.GET("/purchases/returns/:id", purchaseHandler.GetPurchaseReturnByID)
			protected.POST("/purchases/returns", purchaseHandler.CreatePurchaseReturn)
			protected.POST("/purchases/returns/:id/warehouse-verify", purchaseHandler.WarehouseVerifyPurchaseReturn)
			protected.POST("/purchases/returns/:id/admin-approve", purchaseHandler.AdminApprovePurchaseReturn)
			protected.POST("/purchases/returns/:id/reject", purchaseHandler.RejectPurchaseReturn)
			protected.POST("/purchases/returns/:id/ship", purchaseHandler.ShipPurchaseReturn)
			protected.POST("/purchases/returns/:id/pbf-confirm", purchaseHandler.PbfConfirmPurchaseReturn)
			protected.POST("/purchases/returns/:id/finalize", purchaseHandler.FinalizePurchaseReturn)
			protected.POST("/purchases/returns/:id/settle", purchaseHandler.SettlePurchaseReturn)
			protected.DELETE("/purchases/returns/:id", purchaseHandler.DeletePurchaseReturn)
			protected.GET("/purchases/returnable-items", purchaseHandler.GetReturnablePurchaseItems)
			protected.GET("/purchases/product-batches", purchaseHandler.GetProductBatchesForReturn)

			// Price History
			protected.GET("/purchases/price-history", purchaseHandler.GetPriceHistory)

			// Supplier Payments & BG/Cek
			protected.GET("/purchases/payments", purchaseHandler.GetSupplierPayments)
			protected.POST("/purchases/payments", purchaseHandler.CreateSupplierPayment)
			protected.DELETE("/purchases/payments/:id", purchaseHandler.DeleteSupplierPayment)
			protected.GET("/purchases/bg-checks", purchaseHandler.GetBGChecks)
			protected.PUT("/purchases/bg-checks/:id", purchaseHandler.UpdateBGCheckStatus)

			// Sales & POS
			protected.GET("/sales/orders", salesHandler.GetSalesOrders)
			protected.GET("/sales/orders/:id", salesHandler.GetSalesOrder)
			protected.POST("/sales/orders", salesHandler.CreateSalesOrder)
			protected.PUT("/sales/orders/:id", salesHandler.UpdateSalesOrder)
			protected.DELETE("/sales/orders/:id", salesHandler.DeleteSalesOrder)
			protected.POST("/sales/orders/:id/approve", salesHandler.ApproveSalesOrder)
			protected.PUT("/sales/orders/:id/approve", salesHandler.ApproveSalesOrder)
			protected.POST("/sales/orders/:id/process", salesHandler.ProcessSalesOrder)
			protected.POST("/sales/orders/:id/ship", salesHandler.ShipSalesOrder)
			protected.POST("/sales/orders/:id/receive", salesHandler.ReceiveSalesOrder)
			protected.POST("/sales/orders/:id/convert-to-invoice", salesHandler.ConvertSalesOrderToInvoice)
			protected.GET("/sales/orders/:id/print-data", salesHandler.GetSalesOrderPrintData)
			protected.POST("/sales/orders/:id/print", salesHandler.PrintSalesOrder)
			protected.GET("/sales/orders/:id/payment-history", salesHandler.GetSalesOrderPaymentHistory)

			protected.GET("/sales", salesHandler.GetSales)
			protected.GET("/sales/:id", salesHandler.GetSale)
			protected.GET("/sales/:id/print-data", salesHandler.GetSalePrintData)
			protected.POST("/sales/:id/print", salesHandler.PrintSaleInvoice)
			protected.GET("/sales/:id/payment-history", salesHandler.GetSalePaymentHistory)
			protected.POST("/sales", salesHandler.CreateSale)
			protected.PUT("/sales/:id", salesHandler.UpdateSale)
			protected.DELETE("/sales/:id", salesHandler.DeleteSale)
			protected.POST("/sales/:id/receive", salesHandler.ReceiveSale)
			protected.PUT("/sales/:id/receive", salesHandler.ReceiveSale)
			protected.POST("/sales/:id/ship", salesHandler.ShipSale)
			protected.PUT("/sales/:id/ship", salesHandler.ShipSale)

			// Sales Returns
			protected.GET("/sales/returns", salesHandler.GetSalesReturns)
			protected.GET("/sales/returns/:id", salesHandler.GetSalesReturn)
			protected.POST("/sales/returns", salesHandler.CreateSalesReturn)
			protected.POST("/sales/returns/:id/verify-warehouse", salesHandler.VerifyWarehouseSalesReturn)
			protected.POST("/sales/returns/:id/admin-approve", salesHandler.AdminApproveSalesReturn)
			protected.POST("/sales/returns/:id/admin-reject", salesHandler.AdminRejectSalesReturn)
			protected.POST("/sales/returns/:id/restock", salesHandler.RestockSalesReturn)
			protected.POST("/sales/returns/:id/finalize", salesHandler.FinalizeSalesReturn)
			protected.POST("/sales/returns/:id/settle", salesHandler.SettleSalesReturn)
			protected.DELETE("/sales/returns/:id", salesHandler.DeleteSalesReturn)
			protected.GET("/sales/returnable-items", salesHandler.GetReturnableSalesItems)
			protected.GET("/sales/product-batches", purchaseHandler.GetProductBatchesForReturn)

			// Sales Price History
			protected.GET("/sales/price-history", salesHandler.GetSalesPriceHistory)

			// Customer Payments & BG/Cek
			protected.GET("/sales/payments", salesHandler.GetCustomerPayments)
			protected.POST("/sales/payments", salesHandler.CreateCustomerPayment)
			protected.DELETE("/sales/payments/:id", salesHandler.DeleteCustomerPayment)
			protected.GET("/sales/bg-checks", salesHandler.GetCustomerBGChecks)
			protected.PUT("/sales/bg-checks/:id", salesHandler.UpdateCustomerBGCheckStatus)

			// Sales Commissions
			protected.GET("/sales/commissions", salesHandler.GetSalesCommissions)
			protected.POST("/sales/commissions", salesHandler.CreateSalesCommission)
			protected.DELETE("/sales/commissions/:id", salesHandler.DeleteSalesCommission)
			protected.GET("/sales/commissions/bg-checks", salesHandler.GetSalesCommissionBGChecks)
			protected.PUT("/sales/commissions/bg-checks/:id", salesHandler.UpdateSalesCommissionBGCheckStatus)

			// Deliveries
			protected.GET("/sales/deliveries", salesHandler.GetDeliveries)
			protected.POST("/sales/deliveries", salesHandler.CreateDelivery)
			protected.PUT("/sales/deliveries/:id", salesHandler.UpdateDelivery)

			// Customer Points
			protected.GET("/sales/points", salesHandler.GetCustomerPoints)
			protected.POST("/sales/points/fix", salesHandler.ProcessCustomerPointsFix)

			// Assembly / Production
			protected.GET("/assembly/boms", assemblyHandler.GetBOMs)
			protected.POST("/assembly/boms", assemblyHandler.CreateBOM)
			protected.GET("/assembly/orders", assemblyHandler.GetAssemblyOrders)
			protected.POST("/assembly/orders", assemblyHandler.CreateAssemblyOrder)
			protected.PUT("/assembly/orders/:id", assemblyHandler.UpdateAssemblyOrder)
			protected.DELETE("/assembly/orders/:id", assemblyHandler.DeleteAssemblyOrder)
			protected.GET("/assembly/processes", assemblyHandler.GetAssemblyProcesses)
			protected.POST("/assembly/processes", assemblyHandler.CreateAssemblyProcess)
			protected.PUT("/assembly/processes/:id", assemblyHandler.UpdateAssemblyProcess)
			protected.DELETE("/assembly/processes/:id", assemblyHandler.DeleteAssemblyProcess)
			protected.GET("/assembly/finished", assemblyHandler.GetAssemblyFinished)
			protected.POST("/assembly/finished", assemblyHandler.CreateAssemblyFinished)
			protected.PUT("/assembly/finished/:id", assemblyHandler.UpdateAssemblyFinished)
			protected.DELETE("/assembly/finished/:id", assemblyHandler.DeleteAssemblyFinished)

			// Accounting
			protected.GET("/accounting/accounts", accountingHandler.GetAccounts)
			protected.POST("/accounting/accounts", accountingHandler.CreateAccount)
			protected.PUT("/accounting/accounts/:id", accountingHandler.UpdateAccount)
			protected.DELETE("/accounting/accounts/:id", accountingHandler.DeleteAccount)
			protected.GET("/accounting/journals", accountingHandler.GetJournals)
			protected.POST("/accounting/journals/manual", accountingHandler.CreateManualJournal)
			protected.GET("/accounting/ledger", accountingHandler.GetGeneralLedger)
			protected.GET("/accounting/trial-balance", accountingHandler.GetTrialBalance)
			protected.GET("/accounting/profit-and-loss", accountingHandler.GetProfitAndLoss)
			protected.GET("/accounting/balance-sheet", accountingHandler.GetBalanceSheet)
			protected.GET("/accounting/fixed-assets", accountingHandler.GetFixedAssets)
			protected.POST("/accounting/fixed-assets", accountingHandler.CreateFixedAsset)
			protected.PUT("/accounting/fixed-assets/:id", accountingHandler.UpdateFixedAsset)
			protected.DELETE("/accounting/fixed-assets/:id", accountingHandler.DeleteFixedAsset)

			// Cash Transactions (Kas Masuk, Kas Keluar, Kas Transfer)
			protected.GET("/accounting/cash-transactions", accountingHandler.GetCashTransactions)
			protected.POST("/accounting/cash-transactions", accountingHandler.CreateCashTransaction)
			protected.DELETE("/accounting/cash-transactions/:id", accountingHandler.DeleteCashTransaction)

			// Deposits (Deposit Supplier, Deposit Pelanggan, Deposit Saldo)
			protected.GET("/accounting/deposits", accountingHandler.GetDeposits)
			protected.POST("/accounting/deposits", accountingHandler.CreateDeposit)
			protected.DELETE("/accounting/deposits/:id", accountingHandler.DeleteDeposit)
			protected.GET("/accounting/deposits/balance", accountingHandler.GetDepositBalances)

			// Assets Groups & Depreciation
			protected.GET("/accounting/assets/groups", accountingHandler.GetAssetGroups)
			protected.POST("/accounting/assets/groups", accountingHandler.CreateAssetGroup)
			protected.DELETE("/accounting/assets/groups/:id", accountingHandler.DeleteAssetGroup)
			protected.POST("/accounting/assets/depreciate", accountingHandler.ProcessAssetDepreciation)

			// Yearly Closing
			protected.POST("/accounting/yearly-closing", accountingHandler.YearlyClosing)

			// Account Settings & Audit Notes
			protected.GET("/accounting/account-settings", accountingHandler.GetAccountSettings)
			protected.POST("/accounting/account-settings", accountingHandler.UpdateAccountSetting)
			protected.POST("/accounting/account-settings/batch", accountingHandler.BatchUpdateAccountSettings)
			protected.GET("/accounting/audit-notes", accountingHandler.GetAuditNotes)
			protected.POST("/accounting/audit-notes", accountingHandler.CreateAuditNote)
			protected.PUT("/accounting/audit-notes/:id", accountingHandler.UpdateAuditNote)
			protected.DELETE("/accounting/audit-notes/:id", accountingHandler.DeleteAuditNote)

			// Initial Balances (Saldo Awal Perkiraan, Saldo Awal Hutang, Saldo Awal Piutang)
			protected.GET("/accounting/initial-balances", accountingHandler.GetInitialBalances)
			protected.POST("/accounting/initial-balances", accountingHandler.CreateInitialBalance)
			protected.POST("/accounting/initial-balances/batch-accounts", accountingHandler.BatchSaveAccountInitialBalances)
			protected.DELETE("/accounting/initial-balances/:id", accountingHandler.DeleteInitialBalance)

			// Reports & Exports
			protected.GET("/reports/sales/excel", reportHandler.ExportSalesReportExcel)
			protected.GET("/reports/inventory/excel", reportHandler.ExportInventoryReportExcel)
			protected.GET("/reports/invoices/:id/pdf", reportHandler.ExportInvoicePDF)

			// Settings, Numbering, Audit Logs, Integrations & System
			protected.GET("/settings/numbering", settingHandler.GetNumberingFormats)
			protected.PUT("/settings/numbering/:id", settingHandler.UpdateNumberingFormat)
			protected.GET("/settings/audit-logs", settingHandler.GetAuditLogs)
			protected.GET("/settings/groups/:group", settingHandler.GetGroupSettings)
			protected.PUT("/settings/groups/:group", settingHandler.UpdateGroupSettings)
			protected.POST("/settings/apply-margin-profit", settingHandler.ApplyMarginProfitToAllProducts)
			protected.POST("/products/apply-margin-profit", settingHandler.ApplyMarginProfitToAllProducts)
			protected.GET("/settings/open-modules", settingHandler.GetOpenModules)
			protected.DELETE("/settings/open-modules/:id", settingHandler.CloseOpenModule)
			protected.GET("/settings/database/stats", settingHandler.GetDatabaseStats)
			protected.POST("/settings/database/vacuum", settingHandler.VacuumDatabase)
			protected.GET("/settings/system-info", settingHandler.GetSystemInfo)

			// Document & PBF Compliance Attachments (Dual Mode Upload, Approval Workflow & Edit)
			protected.POST("/documents/upload", documentHandler.UploadDocument)
			protected.GET("/documents", documentHandler.GetDocuments)
			protected.PUT("/documents/:id", documentHandler.UpdateDocument)
			protected.PUT("/documents/:id/approval", documentHandler.ApproveDocument)
			protected.DELETE("/documents/:id", documentHandler.DeleteDocument)
			protected.GET("/documents/requirements", documentHandler.GetPbfRequirements)
		}
	}

	return r
}
