package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedInitialData(db *gorm.DB) error {
	log.Println("[Database] Seeding initial master and accounting data...")

	// 1. Seed Company
	var company models.Company
	err := db.Where("code = ?", "CORP01").First(&company).Error
	if err != nil {
		company = models.Company{
			Code:      "CORP01",
			Name:      "PT Farmasi Medika Nusantara",
			TaxNumber: "01.234.567.8-901.000",
			Address:   "Jl. Farmasi Raya No. 128, Jakarta Pusat",
			Phone:     "021-5558899",
			Email:     "info@farmasimedika.co.id",
			Currency:  "IDR",
			IsActive:  true,
		}
		if err := db.Create(&company).Error; err != nil {
			return err
		}
		log.Println("[Seed] Company seeded: ", company.Name)
	}

	// 2. Seed Branch
	var branch models.Branch
	err = db.Where("company_id = ? AND code = ?", company.ID, "BR01").First(&branch).Error
	if err != nil {
		branch = models.Branch{
			CompanyID:    company.ID,
			Code:         "BR01",
			Name:         "Kantor & Apotek Pusat",
			Address:      "Jl. Farmasi Raya No. 128, Jakarta Pusat",
			Phone:        "021-5558899",
			IsHeadOffice: true,
			IsActive:     true,
		}
		if err := db.Create(&branch).Error; err != nil {
			return err
		}
		log.Println("[Seed] Branch seeded: ", branch.Name)
	}

	// 3. Seed Warehouses
	var wh1 models.Warehouse
	if err := db.Where("branch_id = ? AND code = ?", branch.ID, "WH01").First(&wh1).Error; err != nil {
		wh1 = models.Warehouse{
			BranchID: branch.ID,
			Code:     "WH01",
			Name:     "Gudang Utama Farmasi",
			Address:  "Lantai 1 Sayap Barat",
			Type:     "GENERAL",
			IsActive: true,
		}
		db.Create(&wh1)
	}

	var wh2 models.Warehouse
	if err := db.Where("branch_id = ? AND code = ?", branch.ID, "WH02").First(&wh2).Error; err != nil {
		wh2 = models.Warehouse{
			BranchID: branch.ID,
			Code:     "WH02",
			Name:     "Gudang Pendingin Cold Chain (2-8Â°C)",
			Address:  "Ruang Refrigerator Khusus",
			Type:     "COLD_CHAIN",
			IsActive: true,
		}
		db.Create(&wh2)
	}

	// 4. Seed Permissions
	perms := []struct {
		Name, Module, Desc string
	}{
		{"system:manage", "system", "Akses konfigurasi sistem penuh"},
		{"master:manage", "master", "Kelola master data produk, relasi, bank"},
		{"inventory:manage", "inventory", "Kelola stok, transfer, opname"},
		{"purchasing:manage", "purchasing", "Kelola pesanan dan pembelian"},
		{"sales:manage", "sales", "Kelola penjualan dan pesanan pelanggan"},
		{"pos:cashier", "pos", "Akses antarmuka kasir dan transaksi cepat"},
		{"assembly:manage", "assembly", "Kelola formula BOM dan perakitan obat"},
		{"accounting:manage", "accounting", "Kelola COA, jurnal, buku besar, aset"},
		{"reports:view", "reports", "Melihat dan mengekspor seluruh laporan"},
	}

	for _, p := range perms {
		var perm models.Permission
		if err := db.Where("name = ?", p.Name).First(&perm).Error; err != nil {
			perm = models.Permission{
				Name:        p.Name,
				Module:      p.Module,
				Description: p.Desc,
			}
			db.Create(&perm)
		}
	}

	// 5. Seed Roles
	var superAdminRole models.Role
	if err := db.Where("name = ?", "SuperAdmin").First(&superAdminRole).Error; err != nil {
		superAdminRole = models.Role{
			Name:        "SuperAdmin",
			Description: "Administrator tertinggi dengan semua hak akses",
			IsSystem:    true,
		}
		db.Create(&superAdminRole)
		var allPerms []models.Permission
		db.Find(&allPerms)
		db.Model(&superAdminRole).Association("Permissions").Replace(allPerms)
	}

	var cashierRole models.Role
	if err := db.Where("name = ?", "Kasir").First(&cashierRole).Error; err != nil {
		cashierRole = models.Role{
			Name:        "Kasir",
			Description: "Petugas Kasir Apotek & POS",
			IsSystem:    false,
		}
		db.Create(&cashierRole)
	}

	// 6. Seed SuperAdmin User
	var adminUser models.User
	if err := db.Where("username = ?", "admin").First(&adminUser).Error; err != nil {
		hashedPwd, _ := utils.HashPassword("admin123")
		adminUser = models.User{
			CompanyID:    company.ID,
			BranchID:     branch.ID,
			Username:     "admin",
			Email:        "admin@farmasi.local",
			PasswordHash: hashedPwd,
			FullName:     "Apoteker Utama (Super Administrator)",
			Phone:        "081234567890",
			IsActive:     true,
		}
		if err := db.Create(&adminUser).Error; err == nil {
			db.Model(&adminUser).Association("Roles").Append(&superAdminRole)
			log.Println("[Seed] Default SuperAdmin created: username=admin, password=admin123")
		}
	}

	// 7. Seed Numbering Formats
	numFormats := []struct {
		DocType, Prefix string
	}{
		{"PO", "PO"},
		{"PI", "PI"},
		{"PR", "PR"},
		{"SO", "SO"},
		{"SI", "INV"},
		{"SR", "SR"},
		{"JV", "JV"},
		{"ST", "TF"},
		{"OP", "OPN"},
		{"AO", "ASM"},
		{"PAY_IN", "CR"},
		{"PAY_OUT", "CD"},
	}

	for _, nf := range numFormats {
		var format models.NumberingFormat
		if err := db.Where("company_id = ? AND doc_type = ?", company.ID, nf.DocType).First(&format).Error; err != nil {
			format = models.NumberingFormat{
				CompanyID:     company.ID,
				DocType:       nf.DocType,
				Prefix:        nf.Prefix + "/",
				CounterLength: 5,
				CurrentNumber: 0,
				ResetPeriod:   "YEARLY",
			}
			db.Create(&format)
		}
	}

	// 8. Seed Chart of Accounts (COA)
	accounts := []struct {
		Code, Name, Type, Subtype, Normal string
		IsHeader                          bool
	}{
		{"1-0000", "ASET", "ASSET", "HEADER", "DEBIT", true},
		{"1-1000", "Aset Lancar", "ASSET", "HEADER", "DEBIT", true},
		{"1-1100", "Kas Kasir / Laci Kas", "ASSET", "CASH_BANK", "DEBIT", false},
		{"1-1110", "Kas Operasional", "ASSET", "CASH_BANK", "DEBIT", false},
		{"1-1120", "Bank BCA Operasional", "ASSET", "CASH_BANK", "DEBIT", false},
		{"1-1130", "Bank Mandiri Giro", "ASSET", "CASH_BANK", "DEBIT", false},
		{"1-1200", "Piutang Usaha", "ASSET", "RECEIVABLE", "DEBIT", false},
		{"1-1300", "Persediaan Obat & Barang Dagang", "ASSET", "INVENTORY", "DEBIT", false},
		{"1-1310", "Persediaan Bahan Baku Produksi", "ASSET", "INVENTORY", "DEBIT", false},
		{"1-2000", "Aset Tetap", "ASSET", "HEADER", "DEBIT", true},
		{"1-2100", "Peralatan & Chiller Medis", "ASSET", "FIXED_ASSET", "DEBIT", false},
		{"1-2199", "Akumulasi Penyusutan Peralatan", "ASSET", "FIXED_ASSET", "CREDIT", false},

		{"2-0000", "KEWAJIBAN", "LIABILITY", "HEADER", "CREDIT", true},
		{"2-1000", "KEWAJIBAN LANCAR", "LIABILITY", "HEADER", "CREDIT", true},
		{"2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT", false},
		{"2-1200", "Deposit / Uang Muka Pelanggan", "LIABILITY", "PAYABLE", "CREDIT", false},

		{"3-0000", "EKUITAS / MODAL", "EQUITY", "HEADER", "CREDIT", true},
		{"3-1000", "Modal Disetor", "EQUITY", "EQUITY", "CREDIT", false},
		{"3-2000", "Laba Ditahan", "EQUITY", "EQUITY", "CREDIT", false},
		{"3-3000", "Laba Tahun Berjalan", "EQUITY", "EQUITY", "CREDIT", false},

		{"4-0000", "PENDAPATAN", "REVENUE", "HEADER", "CREDIT", true},
		{"4-1000", "Pendapatan Penjualan Obat", "REVENUE", "SALES", "CREDIT", false},
		{"4-1100", "PENDAPATAN JUAL", "REVENUE", "SALES", "CREDIT", false},
		{"4-1200", "POTONGAN PENJUALAN", "REVENUE", "SALES", "DEBIT", false},
		{"4-1300", "RETUR PENJUALAN", "REVENUE", "SALES", "DEBIT", false},
		{"4-1400", "KERINGANAN PIUTANG", "REVENUE", "SALES", "DEBIT", false},
		{"4-2000", "Pendapatan Jasa Apotek / Resep", "REVENUE", "SALES", "CREDIT", false},
		{"4-9000", "Pendapatan Lain-lain", "REVENUE", "SALES", "CREDIT", false},

		{"5-0000", "BEBAN POKOK PENJUALAN (HPP)", "EXPENSE", "HEADER", "DEBIT", true},
		{"5-1000", "HPP Penjualan Obat", "EXPENSE", "COGS", "DEBIT", false},
		{"5-1100", "POTONGAN PEMBELIAN", "EXPENSE", "COGS", "CREDIT", false},
		{"5-1300", "HARGA POKOK PENJUALAN", "EXPENSE", "COGS", "DEBIT", false},
		{"5-2000", "Biaya Tenaga Kerja Perakitan", "EXPENSE", "COGS", "DEBIT", false},
		{"5-2100", "KERINGANAN HUTANG", "EXPENSE", "COGS", "CREDIT", false},

		{"6-0000", "BEBAN OPERASIONAL", "EXPENSE", "HEADER", "DEBIT", true},
		{"6-1000", "Beban Gaji & Tunjangan", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false},
		{"6-2000", "Beban Listrik, Air & Internet", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false},
		{"6-3000", "Beban Penyusutan Aset", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false},
		{"6-4000", "Beban Selisih Stok Opname", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false},
	}

	for _, acc := range accounts {
		var account models.Account
		if err := db.Where("company_id = ? AND code = ?", company.ID, acc.Code).First(&account).Error; err != nil {
			account = models.Account{
				CompanyID:     company.ID,
				Code:          acc.Code,
				Name:          acc.Name,
				Type:          acc.Type,
				Subtype:       acc.Subtype,
				NormalBalance: acc.Normal,
				IsHeader:      acc.IsHeader,
				IsActive:      true,
			}
			db.Create(&account)
		}
	}

	// 8b. Seed & Ensure Accounts for Discounts (POTONGAN PEMBELIAN, KERINGANAN HUTANG, POTONGAN PENJUALAN, KERINGANAN PIUTANG)
	EnsureDiscountAccounts(db)

	// 9. Seed Categories
	categories := []string{
		"ALKES", "ANTIBIOTIK", "BHP", "BIRU", "HIJAU", "KB/HORMON",
		"LAIN LAIN", "MERAH", "MERAH (ANTIBIOTIK)", "MKN", "MNM",
		"OBAT", "OBAT BEBAS", "OBAT HERBAL", "OBAT KHUSUS", "OOT", "OTC", "PREKURSOR", "PSIKOTROPIKA",
	}
	catMap := make(map[string]uuid.UUID)
	for _, cName := range categories {
		var cat models.Category
		if err := db.Where("company_id = ? AND (code = ? OR name = ?)", company.ID, cName, cName).First(&cat).Error; err != nil {
			cat = models.Category{
				CompanyID:   company.ID,
				Code:        cName,
				Name:        cName,
				Description: cName,
			}
			db.Create(&cat)
		}
		catMap[cName] = cat.ID
	}

	// 10. Seed Units
	units := []string{
		"AMPL", "AMPLOP", "BALL", "BK", "BKS", "BLISTER", "BOX", "BTL", "BUAH", "CAN", "CAPS",
		"CUP", "DUS", "EA", "GLS", "GRAM", "KAPL", "KEN", "KG", "KLG", "KLG KCL", "KTK", "KTK/KCL",
		"LSN", "PAC", "PAK", "PCS", "POT", "STRIP", "TAB",
	}
	unitMap := make(map[string]uuid.UUID)
	for _, uCode := range units {
		var unit models.Unit
		if err := db.Where("company_id = ? AND code = ?", company.ID, uCode).First(&unit).Error; err != nil {
			unit = models.Unit{
				CompanyID:   company.ID,
				Code:        uCode,
				Name:        uCode,
				Description: uCode,
			}
			db.Create(&unit)
		}
		unitMap[uCode] = unit.ID
	}

	// 11. Seed Brands
	brands := []string{
		"ABBOTT", "ACTAVIS", "ADITAMA", "AFI FARMA", "ANDALAN", "ANUGRAH ORIGINAL BIONATURA", "ANZON",
		"ARDHI JAYA", "ARMINDO", "ASPEN", "ASTELLAS", "ASTRAZENECA", "BALATIF", "BAYER", "BD", "BERLICO",
		"BERNOFARM", "BIMA MITRA FARMA", "BISTOS", "BOEHRINGER", "BRANDS", "BRAUN", "BUPA ANEKA", "CAPRI",
		"CENDO", "CITO", "CLUBROS FARMA", "DEXA", "GEA", "TERUMO", "REMEDI", "NIPRO SAFELET",
	}
	brandMap := make(map[string]uuid.UUID)
	for _, bName := range brands {
		var br models.Brand
		if err := db.Where("company_id = ? AND (code = ? OR name = ?)", company.ID, bName, bName).First(&br).Error; err != nil {
			br = models.Brand{
				CompanyID:   company.ID,
				Code:        bName,
				Name:        bName,
				Description: bName,
			}
			db.Create(&br)
		}
		brandMap[bName] = br.ID
	}

	// 12. Seed Products (with initial stock)
	var catObatBebas models.Category
	db.Where("company_id = ? AND code = ?", company.ID, "CAT01").First(&catObatBebas)

	prods := []struct {
		Code, Barcode, Name, Type string
		BaseUnitCode              string
		CatName, BrandName, Rack  string
		BuyPrice, AvgPrice, SellPrice float64
		InitialStock              float64
		Notes                     string
	}{
		{"ABBOCATH-0001", "8992001001", "ABBOCATH 18 G TERUMO", "BARANG", "PCS", "BHP", "TERUMO", "BHP", 8548.89, 7701.79, 12000, 6, ""},
		{"ABBOCATH-0002", "8992001002", "ABBOCATH 20 G TERUMO", "BARANG", "PCS", "BHP", "TERUMO", "BHP", 9404.00, 9404.00, 11000, 0, ""},
		{"ABBOCATH-0003", "8992001003", "ABBOCATH 24 G TERUMO", "BARANG", "PCS", "BHP", "TERUMO", "BHP", 9100.30, 9100.30, 11500, 0, ""},
		{"ABBOCATH-0005", "8992001005", "ABBOCATH NO 18 G - SERENITY", "BARANG", "PCS", "BHP", "SERENITY", "BHP", 4721.94, 4355.82, 6000, 0, ""},
		{"ABBOCATH-0006", "8992001006", "ABBOCATH NO 18 GEA", "BARANG", "PCS", "BHP", "GEA", "BHP", 3221.99, 3138.46, 4000, 0, ""},
		{"ABBOCATH-0007", "8992001007", "ABBOCATH NO 20 G GEA", "BARANG", "PCS", "BHP", "GEA", "BHP", 3501.99, 3154.95, 5000, 2, ""},
		{"ABBOCATH-0008", "8992001008", "ABBOCATH NO 22 G GEA", "BARANG", "PCS", "BHP", "GEA", "BHP", 3501.99, 3154.95, 4000, 7, ""},
		{"ABBOCATH-0010", "8992001010", "ABBOCATH NO 22 G TERUMO", "BARANG", "PCS", "BHP", "TERUMO", "BHP", 9100.30, 8548.89, 12000, 0, "1 BOX @50PCS"},
		{"ACARBOSE-0001", "8992002001", "ACARBOSE 100MG", "BARANG", "BOX", "MERAH", "DEXA", "RAK OBAT PATEN (KERAS)", 149850.00, 133987.50, 165000, 0, ""},
		{"ACARBOSE-0002", "8992002002", "ECLID 100MG", "BARANG", "TAB", "MERAH", "DEXA", "RAK OBAT PATEN (KERAS)", 2097.00, 2079.75, 3400, 0, ""},
		{"ACARBOSE-0003", "8992002003", "ECLID 50MG", "BARANG", "BOX", "MERAH", "DEXA", "RAK OBAT PATEN (KERAS)", 89000.00, 89000.00, 109500, 0, ""},
		{"ACARBOSE-0004", "8992002004", "ACARBOSE 50MG 10X10'S DEXA", "BARANG", "BOX", "MERAH", "DEXA", "RAK OBAT PATEN (KERAS)", 92136.70, 92136.66, 110002.01, 0.6, ""},
		{"OBT001", "899123456001", "Paracetamol 500mg (Strip 10s)", "BARANG", "STRIP", "Obat Bebas", "Kalbe Farma", "RAK-01", 4500, 4500, 7500, 150, ""},
		{"OBT002", "899123456002", "Amoxicillin 500mg Kaplet", "BARANG", "STRIP", "Obat Keras (G)", "Kalbe Farma", "RAK-02", 7500, 7500, 12000, 80, ""},
		{"OBT003", "899123456003", "Vitamin C 1000mg Effervescent (Tube)", "BARANG", "BTL", "Vitamin & Suplemen", "Kalbe Farma", "RAK-03", 32000, 32000, 45000, 50, ""},
		{"OBT004", "899123456004", "Minyak Kayu Putih 60ml", "BARANG", "BTL", "Obat Bebas", "Kalbe Farma", "RAK-04", 18500, 18500, 24000, 60, ""},
		{"OBT005", "899123456005", "Antasida Doen Tablet Kunyah", "BARANG", "STRIP", "Obat Bebas", "Kalbe Farma", "RAK-01", 3000, 3000, 5000, 200, ""},
		{"OBT006", "899123456006", "Kasa Steril 16x16 Box 10", "BARANG", "BOX", "Alat Kesehatan", "Kalbe Farma", "RAK-05", 12000, 12000, 17500, 40, ""},
		{"ASM001", "899123456999", "Paket P3K Apotek Lengkap", "RAKITAN_PROSES", "BOX", "Alat Kesehatan", "Kalbe Farma", "RAK-06", 45000, 45000, 75000, 10, ""},
	}

	for _, p := range prods {
		var prod models.Product
		if err := db.Where("company_id = ? AND code = ?", company.ID, p.Code).First(&prod).Error; err != nil {
			brandID := brandMap[p.BrandName]
			catID := catMap[p.CatName]
			unitID := unitMap[p.BaseUnitCode]
			prod = models.Product{
				CompanyID:     company.ID,
				Code:          p.Code,
				Barcode:       p.Barcode,
				Name:          p.Name,
				Type:          p.Type,
				CategoryID:    &catID,
				BrandID:       &brandID,
				BaseUnitID:    &unitID,
				Rack:          p.Rack,
				PurchasePrice: p.BuyPrice,
				SellingPrice:  p.SellPrice,
				MinStock:      5,
				MaxStock:      500,
				Description:   p.Notes,
				Notes:         p.Notes,
				SalesStatus:   "MASIH_DIJUAL",
				IsActive:      true,
			}
			if err := db.Create(&prod).Error; err == nil {
				// Create initial stock balance in WH01
				stock := models.StockBalance{
					WarehouseID:  wh1.ID,
					ProductID:    prod.ID,
					Qty:          p.InitialStock,
					ReservedQty:  0,
					AvailableQty: p.InitialStock,
					AvgCost:      p.AvgPrice,
				}
				db.Create(&stock)

				if p.InitialStock > 0 {
					movement := models.StockMovement{
						CompanyID:    company.ID,
						BranchID:     branch.ID,
						WarehouseID:  wh1.ID,
						ProductID:    prod.ID,
						DocType:      "OPENING",
						DocNo:        "OP-STK-001",
						MovementType: "IN",
						Qty:          p.InitialStock,
						CostPerUnit:  p.AvgPrice,
						TotalCost:    p.InitialStock * p.AvgPrice,
						BalanceAfter: p.InitialStock,
						Notes:        "Saldo Awal Persediaan Produk",
						CreatedBy:    adminUser.ID,
						CreatedAt:    time.Now(),
					}
					db.Create(&movement)
				}
			}
		}
	}

	// 13. Seed Suppliers (Matching Ketoko Web 2.0 Screenshot 3)
	sups := []struct {
		Code, Name, Address, City, Province, Phone, Contact, Notes string
	}{
		{"01", "CASH", "PTK", "PONTIANAK", "KALBAR", "", "", ""},
		{"CV.BINTANG LAUT", "CV.BINTANG LAUT", "JL.ADISUCIPTO KM 5,5 KOM PERGUDANGAN ADI SUCIPTO MANDIRI", "PONTIANAK", "KALBAR", "05616726403", "", ""},
		{"CV.CITRA ALKES", "CV.CITRA ALKES", "", "PONTIANAK", "KALBAR", "730434/7007790", "", ""},
		{"SP0062", "CV.INDO PRIMA", "JL.BUDI KARYA KOMP. PONTIANAK SQUARE BLOK B33-B46", "PONTIANAK", "KALBAR", "738137", "", ""},
		{"SP0068", "CV. MULYA ARTHARINDO SEJAHTERA", "", "PONTIANAK", "KALBAR", "", "", ""},
		{"CV.TERANG MAS UTAMA", "CV.TERANG MAS UTAMA", "PONTIANAK", "PONTIANAK", "KALBAR", "0852-4513-3332", "", "BCA 029..."},
		{"JAMU SEGAR", "JAMU SEGAR", "JL.NUSA INDAH", "PONTIANAK", "KALBAR", "", "081345653515", ""},
		{"KIMIA FARMA", "KIMIA FARMA", "Jl. Raya Kampung Kapur No.69 Kec Sungai Raya", "PONTIANAK", "KALBAR", "0561-6716121", "", "BCA 04..."},
		{"PT. ANUGERAH ARGON MEDICA", "PT. ANUGERAH ARGON MEDICA", "JL.ARTERI SUPADIO AHMAD YANI II NO.104-106 KTC ARANG LIMBUNG", "PONTIANAK", "KALIMANTAN BARAT", "(0561)72803011", "", ""},
		{"PT. ANUGRAH BUMI KHATULISTIWA", "PT. ANUGRAH BUMI KHATULISTIWA", "JL.DR.WAHIDIN SUDIRO HUSODO", "PONTIANAK", "KALBAR", "", "085252366800", ""},
		{"PT. BINA SAN PRIMA", "PT. BINA SAN PRIMA", "JL.JENDRAL A YANI NO 6", "PONTIANAK", "KALIMANTAN BARAT", "739699 / 739000", "", "BCA 17..."},
		{"PT. ENSEVAL PUTERA MEGATRADING", "PT. ENSEVAL PUTERA MEGATRADING", "JL. ARTERI SUPADIO, KOMP. PERGUDANGAN A. YANI", "PONTIANAK", "KALBAR", "777779/1500095", "id 1008106", "id 9299..."},
	}
	for _, s := range sups {
		var sup models.Supplier
		if err := db.Where("company_id = ? AND code = ?", company.ID, s.Code).First(&sup).Error; err != nil {
			sup = models.Supplier{
				CompanyID:         company.ID,
				Code:              s.Code,
				Name:              s.Name,
				Phone:             s.Phone,
				Email:             strings.ToLower(strings.ReplaceAll(s.Code, " ", "")) + "@distributor.co.id",
				Address:           s.Address,
				City:              s.City,
				Province:          s.Province,
				ContactPerson:     s.Contact,
				Notes:             s.Notes,
				TermOfPaymentDays: 30,
				IsActive:          true,
			}
			db.Create(&sup)
		}
	}

	// 14. Seed Customer Groups (Screenshot 6)
	groups := []struct {
		Code, Name string
		Discount   float64
		Level      int
	}{
		{"General", "GAK DIPAKAI", 0.00, 5},
		{"HARGA 1", "HARGA 1", 0.00, 1},
		{"HARGA 4", "HARGA 4", 0.00, 4},
	}
	for _, g := range groups {
		var grp models.CustomerGroup
		if err := db.Where("company_id = ? AND code = ?", company.ID, g.Code).First(&grp).Error; err != nil {
			grp = models.CustomerGroup{
				CompanyID:       company.ID,
				Code:            g.Code,
				Name:            g.Name,
				DiscountPercent: g.Discount,
				PriceLevel:      g.Level,
			}
			db.Create(&grp)
		}
	}

	// 15. Seed Territories & Sub Territories (Screenshot 7 & 8)
	var ter models.Territory
	if err := db.Where("company_id = ? AND code = ?", company.ID, "JBTB").First(&ter).Error; err != nil {
		ter = models.Territory{
			CompanyID: company.ID,
			Code:      "JBTB",
			Name:      "Jabotabek",
		}
		db.Create(&ter)
	}

	var ter2 models.Territory
	if err := db.Where("company_id = ? AND code = ?", company.ID, "PTK").First(&ter2).Error; err != nil {
		ter2 = models.Territory{
			CompanyID: company.ID,
			Code:      "PTK",
			Name:      "Pontianak",
		}
		db.Create(&ter2)
	}

	var subTer models.SubTerritory
	if err := db.Where("company_id = ? AND code = ?", company.ID, "PTK-KOTA").First(&subTer).Error; err != nil {
		subTer = models.SubTerritory{
			CompanyID:   company.ID,
			TerritoryID: &ter2.ID,
			Code:        "PTK-KOTA",
			Name:        "Pontianak Kota",
		}
		db.Create(&subTer)
	}

	// 16. Seed Customers (Screenshot 4)
	custs := []struct {
		Code, Name, Address, City, Province, Phone, Contact, Email string
		Orders, Total, Avg                                         float64
		LastVisit                                                  string
	}{
		{"AHENG", "AHENG", "", "PONTIANAK", "KALBAR", "", "", "", 29, 47196145.00, 1627453.28, "2024-11-14 15:47:21"},
		{"BD.MASSIANA", "BD.MASSIANA", "JL. MT. HARYONO GG.DAMAI RT012/RW002 KAPUAS KANAN HULU, SINTANG", "SINTANG", "KALBAR", "", "", "", 2, 1740800.00, 870400.00, "2024-08-15 12:01:23"},
		{"PL0015", "CASH", "", "PONTIANAK", "KALBAR", "", "", "", 35, 61754701.00, 1764420.03, "2024-11-01 16:54:45"},
		{"CASH", "CASH IDK", "", "PONTIANAK", "KALBAR", "", "", "", 226, 1259693517.73, 5573865.29, "2024-10-31 14:00:33"},
		{"PL0012", "DR.ANIQ LITHOFIAH, SP.PD", "JL.AHMAD YANI PEMANGKAT", "SAMBAS", "KALBAR", "", "", "", 1, 1572800.00, 1572800.00, "2024-08-19 16:57:27"},
		{"PL0005", "DR.ARIS SETIAWAN, M.Biomed", "DUSUN BADAU II DS.BADAU KEC.BADAU", "KAPUAS HULU", "KALBAR", "", "", "", 8, 24724200.00, 3090525.00, "2024-07-22 17:57:14"},
		{"PL0007", "DR.EGY SINURAYA", "PUSKESMAS BODOK", "SANGGAU", "KALBAR", "", "", "", 2, 1970500.00, 985250.00, "2024-07-29 11:14:51"},
		{"PL0011", "DR.FRANDY", "JL YOS SUDARSO NO.44C", "PONTIANAK", "KALBAR", "", "", "", 1, 9044700.00, 9044700.00, "2024-09-13 08:49:05"},
		{"PL0010", "DR.HELMIAN", "JL KHATULISTIWA, NO 224, SEBERANG BANK DANAMON SIANTAN", "PONTIANAK", "KALBAR", "", "", "", 1, 4424900.00, 4424900.00, "2024-08-07 14:17:17"},
		{"PL0009", "DR.ISMAWAN", "JL. LINTAS SELATAN KEDAMIN NO. 58 B PUTUSSIBAU", "KAPUAS HULU", "KALBAR", "", "", "", 1, 415000.00, 415000.00, "2024-08-02 14:40:12"},
		{"PL0006", "DR.M.MUHAMMAD NANDA", "SEPONTI JAYA", "KAYONG UTARA", "KALBAR", "", "", "", 4, 10523100.00, 2630775.00, "2024-10-26 11:34:45"},
		{"PL0008", "DR.RICKY WINATA", "JL. MOHAMMAD AMIN RUKO NO. 51 C SEMITAU HULU", "KAPUAS HULU", "KALBAR", "", "", "", 2, 3560700.00, 1780350.00, "2024-07-30 16:10:32"},
		{"KASIR", "KASIR", "", "PONTIANAK", "KALBAR", "", "", "", 247449, 9498063786.70, 38375.54, "2024-11-18 09:58:19"},
		{"PUSKESMAS DUSUN BESAR", "PUSKESMAS DUSUN BESAR KABUPATEN", "JL. PERAKIT JAYA-KAYO", "KAYONG UTARA", "KALBAR", "", "", "", 0, 0, 0, "2024-10-05 11:30:16"},
	}
	for _, c := range custs {
		var cust models.Customer
		if err := db.Where("company_id = ? AND code = ?", company.ID, c.Code).First(&cust).Error; err != nil {
			cust = models.Customer{
				CompanyID:         company.ID,
				Code:              c.Code,
				Name:              c.Name,
				Phone:             c.Phone,
				Email:             c.Email,
				Address:           c.Address,
				City:              c.City,
				Province:          c.Province,
				ContactPerson:     c.Contact,
				TotalOrders:       c.Orders,
				TotalSpent:        c.Total,
				AvgSpent:          c.Avg,
				LastVisit:         c.LastVisit,
				CreditLimit:       50000000,
				TermOfPaymentDays: 14,
				Points:            150,
				IsActive:          true,
			}
			db.Create(&cust)
		}
	}

	// 17. Seed Sales Representatives (Screenshot 5)
	sales := []struct {
		Code, Name, City, Province string
	}{
		{"BUNGA", "BUNGA", "PONTIANAK", "KALBAR"},
		{"SL0005", "DAYANTI", "PONTIANAK", "KALBAR"},
		{"ELDHA", "ELDHA", "PONTIANAK", "KALBAR"},
		{"MAYA", "MAYA", "PONTIANAK", "KALBAR"},
		{"NIWA", "NIWA", "PONTIANAK", "KALBAR"},
		{"OKTATERA", "OKTATERA", "PONTIANAK", "KALIMANTAN BARAT"},
		{"SEKAR", "SEKAR", "PONTIANAK", "KALIMANTAN BARAT"},
		{"YOPITA", "YOPITA", "PONTIANAK", "KALBAR"},
	}
	for _, sl := range sales {
		var rep models.SalesRepresentative
		if err := db.Where("company_id = ? AND code = ?", company.ID, sl.Code).First(&rep).Error; err != nil {
			rep = models.SalesRepresentative{
				CompanyID:      company.ID,
				Code:           sl.Code,
				Name:           sl.Name,
				City:           sl.City,
				Province:       sl.Province,
				CommissionRate: 2.5,
				IsActive:       true,
			}
			db.Create(&rep)
		}
	}

	// 18. Seed Point Pelanggan Setting (Screenshot 12)
	var ptSetting models.CustomerPointSetting
	if err := db.Where("company_id = ?", company.ID).First(&ptSetting).Error; err != nil {
		ptSetting = models.CustomerPointSetting{
			CompanyID:              company.ID,
			PointType:              "TIDAK_MEMAKAI",
			InvoiceMultipleAmount:  100000,
			CollectStartDate:       "2023-01-01",
			CollectEndDate:         "2026-12-31",
			RedeemStartDate:        "2023-01-01",
			RedeemEndDate:          "2026-12-31",
			GeneralCustomerName:    "KASIR",
			NonMemberEarnPoints:    false,
			PrintNoteDefault:       "Point Transaksi : [PNT], Periode penukaran Point dari [TTD] s/d [TTS]. Kumpulkan sebanyak banyaknya dapatkan hadiahnya.",
			PointRedeemValue:       100,
			PointValidityDays:      30,
			ShowClaimButtonInSales: false,
			PrintNoteVoucher:       "Nilai Point Nominal [PNT]. Tukarkan sebagai Voucher belanja, sampai tanggal [TBP]",
			PrintNoteGift:          "Point Transaksi : [PNT], Periode penukaran Point dari [TTD] s/d [TTS], Kumpulkan sebanyak banyaknya dapatkan hadiahnya, Total Point : [TOP]",
		}
		db.Create(&ptSetting)
	}

	// 19. Seed Banks (Screenshot 2)
	banks := []struct{ Code, Name string }{
		{"NOBU", "BANK NOBU"},
		{"BCA", "BANK CENTRAL ASIA"},
		{"MANDIRI", "BANK MANDIRI"},
		{"BNI", "BANK NEGARA INDONESIA"},
		{"BRI", "BANK RAKYAT INDONESIA"},
	}
	var primaryBankID *uuid.UUID
	for _, b := range banks {
		var bank models.Bank
		if err := db.Where("company_id = ? AND code = ?", company.ID, b.Code).First(&bank).Error; err != nil {
			bank = models.Bank{
				CompanyID:     company.ID,
				Code:          b.Code,
				Name:          b.Name,
				AccountNumber: "800-1234-567",
				AccountHolder: "PT Farmasi Medika Nusantara",
				BranchName:    "Pontianak",
				IsActive:      true,
			}
			db.Create(&bank)
		}
		if primaryBankID == nil {
			primaryBankID = &bank.ID
		}
	}

	// 20. Seed Variants (Screenshot 1)
	variants := []string{"Biru", "Cokelat", "Hijau", "Hitam", "Kuning", "L", "M", "Merah", "Putih", "S", "XL"}
	for _, vName := range variants {
		var vr models.Variant
		if err := db.Where("company_id = ? AND code = ?", company.ID, vName).First(&vr).Error; err != nil {
			vr = models.Variant{
				CompanyID:   company.ID,
				Code:        vName,
				Name:        vName,
				Description: vName,
				IsActive:    true,
			}
			db.Create(&vr)
		}
	}

	// 21. Seed E-Money (Screenshot 3)
	emoneys := []struct{ Code, Desc string }{
		{"NOBU", "NOBU"},
		{"BCA", "QRIS BCA"},
		{"GOPAY", "GOPAY MERCHANT"},
		{"OVO", "OVO MERCHANT"},
		{"DANA", "DANA QRIS"},
	}
	for _, em := range emoneys {
		var emItem models.EMoney
		if err := db.Where("company_id = ? AND code = ?", company.ID, em.Code).First(&emItem).Error; err != nil {
			emItem = models.EMoney{
				CompanyID:   company.ID,
				Code:        em.Code,
				Name:        em.Code,
				Description: em.Desc,
				IsActive:    true,
			}
			db.Create(&emItem)
		}
	}

	// 22. Seed Shipping Fees (Screenshot 4)
	shippingRates := []struct {
		Exp, From, To, Country, Notes string
		C1, C2, C3                   float64
	}{
		{"JNE", "Jakarta", "Surabaya", "Indonesia", "1 (Reg), 2 (Kilat), 3 (Express)", 15000, 18000, 25000},
		{"JNE", "Jakarta", "Semarang", "Indonesia", "1 (Reg), 2 (Yes), 3 (Express)", 16000, 20000, 25000},
		{"J&T", "Pontianak", "Kubu Raya", "Indonesia", "1 (EZ), 2 (Reg), 3 (Super)", 10000, 15000, 20000},
		{"SiCepat", "Pontianak", "Singkawang", "Indonesia", "1 (HALO), 2 (REG), 3 (BEST)", 12000, 18000, 24000},
	}
	for _, sr := range shippingRates {
		var fee models.ShippingFee
		if err := db.Where("company_id = ? AND expedition = ? AND from_city = ? AND to_city = ?", company.ID, sr.Exp, sr.From, sr.To).First(&fee).Error; err != nil {
			fee = models.ShippingFee{
				CompanyID:  company.ID,
				Expedition: sr.Exp,
				FromCity:   sr.From,
				ToCity:     sr.To,
				Country:    sr.Country,
				Cost1:      sr.C1,
				Cost2:      sr.C2,
				Cost3:      sr.C3,
				Notes:      sr.Notes,
			}
			db.Create(&fee)
		}
	}

	// 23. Seed Warehouses / Dept (Screenshot 5)
	whs := []struct {
		Code, Name, Func, Desc, Acc, Addr, Email string
	}{
		{"UTAMA", "Apotek Berkat Utama", "Utama", "APOTEK BERKAT", "1-2010 - PERSEDIAAN BARANG", "JL.PURNAMA", "apotikberkat@gmail.com"},
		{"02", "Gudang Farmasi 02", "Utama", "GUDANG", "1-2010 - PERSEDIAAN BARANG", "JL.PURNAMA", ""},
	}
	for _, w := range whs {
		var whItem models.Warehouse
		if err := db.Where("branch_id = ? AND code = ?", branch.ID, w.Code).First(&whItem).Error; err != nil {
			whItem = models.Warehouse{
				BranchID:    branch.ID,
				Code:        w.Code,
				Name:        w.Name,
				Function:    w.Func,
				Description: w.Desc,
				AccountCode: w.Acc,
				Address:     w.Addr,
				Email:       w.Email,
				Type:        "GENERAL",
				IsActive:    true,
			}
			db.Create(&whItem)
		} else {
			whItem.Function = w.Func
			whItem.Description = w.Desc
			whItem.AccountCode = w.Acc
			whItem.Address = w.Addr
			whItem.Email = w.Email
			db.Save(&whItem)
		}
	}

	// 24. Seed Payment Methods
	payMethods := []struct{ Code, Name, Type string }{
		{"CASH", "Tunai / Cash", "CASH"},
		{"BCA_TRF", "Transfer Bank BCA", "BANK_TRANSFER"},
		{"QRIS", "QRIS Statis/Dinamis", "QRIS"},
		{"EDC_DEBIT", "Kartu Debit EDC", "CARD"},
	}
	for _, pm := range payMethods {
		var payM models.PaymentMethod
		if err := db.Where("company_id = ? AND code = ?", company.ID, pm.Code).First(&payM).Error; err != nil {
			payM = models.PaymentMethod{
				CompanyID: company.ID,
				Code:      pm.Code,
				Name:      pm.Name,
				Type:      pm.Type,
				BankID:    primaryBankID,
				IsActive:  true,
			}
			db.Create(&payM)
		}
	}

	// 25. Seed Ketoko Accounting Master & Transactions
	SeedKetokoAccountingMaster(db, company.ID, branch.ID, adminUser.ID)

	// 26. Sync existing purchases & supplier payments to CashTransactions (Kas Keluar)
	SyncExistingPurchasesToCashTransactions(db)

	// 27. Seed Batch Number & Tanggal Kadaluarsa (ED) Farmasi
	SeedDrugExpiryDates(db)

	// 28. Seed Sample Sales if empty
	SeedSampleSales(db)

	// 29. Seed Comprehensive Activity Logs for all categories
	SeedActivityLogs(db, company.ID, adminUser.ID)

	log.Println("[Seed] All initial data seeded successfully!")
	return nil
}

func SeedDrugExpiryDates(db *gorm.DB) {
	now := time.Now()
	type DrugExpirySeed struct {
		Code        string
		BatchNumber string
		DaysOffset  int
	}

		seeds := []DrugExpirySeed{
		// 1. Sudah Kadaluarsa (Expired)
		{"ABBOCATH-0001", "BATCH-ABC-2025-01", -8},
		{"ACARBOSE-0001", "BATCH-ACR-2025-09", -15},

		// 2. Kritis <= 1 Minggu (1-7 Hari) -> Pemicu Popup Peringatan Dashboard
		{"OBT001", "BATCH-PCT-2026-X1", 3},  // Paracetamol 500mg: ED 3 hari lagi!
		{"OBT005", "BATCH-ATD-2026-04", 5},  // Antasida Doen: ED 5 hari lagi!
		{"ABBOCATH-0002", "BATCH-ABB-2026-KRT1", 3},
		{"ABBOCATH-0003", "BATCH-ABB-2026-KRT2", 4},
		{"ABBOCATH-0007", "BATCH-ABB-2026-W1", 6},

		// 3. <= 2 Minggu (8-14 Hari)
		{"OBT002", "BATCH-AMX-2026-08", 11}, // Amoxicillin: ED 11 hari lagi!
		{"ACARBOSE-0002", "BATCH-ECL-2026-10", 11},

		// 4. <= 30 Hari (15-30 Hari)
		{"OBT003", "BATCH-VIT-2026-11", 22}, // Vitamin C: ED 22 hari lagi!
		{"ABBOCATH-0008", "BATCH-ABB-2026-08", 24},

		// 5. <= 2 Bulan (31-60 Hari)
		{"OBT004", "BATCH-MKP-2026-12", 45}, // Minyak Kayu Putih: ED 45 hari lagi!
		{"ABBOCATH-0010", "BATCH-ABB-2026-B2", 42},
		{"ACARBOSE-0003", "BATCH-ECL-2026-50", 52},

		// 6. <= 3 Bulan (61-90 Hari)
		{"OBT006", "BATCH-KAS-2026-03", 75}, // Kasa Steril: ED 75 hari lagi!
		{"ACARBOSE-0004", "BATCH-ACR-2026-04", 78},

		// 7. Aman / Jauh (> 90 Hari)
		{"ITM-0008", "BATCH-BTD-2027-01", 240},
		{"ASM001", "BATCH-P3K-2027-01", 365},
		{"ABBOCATH-0006", "BATCH-ABB-2027-06", 450},
	}

	for _, s := range seeds {
		expDate := now.AddDate(0, 0, s.DaysOffset)
		db.Model(&models.Product{}).Where("code = ?", s.Code).Updates(map[string]interface{}{
			"batch_number": s.BatchNumber,
			"expired_date": expDate,
		})

		var prod models.Product
		if err := db.Where("code = ?", s.Code).First(&prod).Error; err == nil {
			db.Model(&models.StockBalance{}).Where("product_id = ?", prod.ID).Updates(map[string]interface{}{
				"batch_number": s.BatchNumber,
				"expired_date": expDate,
			})

			// Seed ProductBatch for FEFO fulfillment
			var balances []models.StockBalance
			db.Where("product_id = ?", prod.ID).Find(&balances)
			for _, bal := range balances {
				var count int64
				db.Model(&models.ProductBatch{}).Where("warehouse_id = ? AND product_id = ? AND batch_number = ?", bal.WarehouseID, prod.ID, s.BatchNumber).Count(&count)
				if count == 0 {
					db.Create(&models.ProductBatch{
						CompanyID:   prod.CompanyID,
						BranchID:    bal.WarehouseID, // default branch fallback
						WarehouseID: bal.WarehouseID,
						ProductID:   prod.ID,
						BatchNumber: s.BatchNumber,
						ExpiredDate: expDate,
						InitialQty:  bal.Qty,
						CurrentQty:  bal.AvailableQty,
						CostPrice:   bal.AvgCost,
						DocNo:       "SEED-BATCH",
					})
				}
			}
		}
	}
	log.Println("[Seed] Farmasi Drug Expiry dates & Batch numbers initialized!")
}

func SyncExistingPurchasesToCashTransactions(db *gorm.DB) {
	var purchases []models.Purchase
	if err := db.Where("paid_amount > 0 AND deleted_at IS NULL").Find(&purchases).Error; err == nil {
		for _, p := range purchases {
			var kasAcc models.Account
			if errKas := db.Where("company_id = ? AND code = '1-1121'", p.CompanyID).First(&kasAcc).Error; errKas != nil {
				if errK2 := db.Where("company_id = ? AND code = '1-1110'", p.CompanyID).First(&kasAcc).Error; errK2 != nil {
					db.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", p.CompanyID).First(&kasAcc)
				}
			}

			var persediaanAcc models.Account
			_ = db.Where("company_id = ? AND code = '1-1300'", p.CompanyID).First(&persediaanAcc).Error

			var supplier models.Supplier
			supplierName := ""
			if errSupp := db.First(&supplier, p.SupplierID).Error; errSupp == nil {
				supplierName = supplier.Name
			}

			desc := fmt.Sprintf("Pembayaran Tunai Pembelian Faktur %s (%s)", p.InvoiceNo, supplierName)

			// Update or create CashTransaction
			var existingCashTrx models.CashTransaction
			descPattern := "%" + p.InvoiceNo + "%"
			if errFind := db.Where("company_id = ? AND type = 'OUT' AND description LIKE ?", p.CompanyID, descPattern).First(&existingCashTrx).Error; errFind == nil {
				existingCashTrx.AccountID = kasAcc.ID
				existingCashTrx.Amount = p.PaidAmount
				db.Save(&existingCashTrx)
			} else {
				var totalKASO int64
				db.Model(&models.CashTransaction{}).Where("company_id = ? AND type = 'OUT'", p.CompanyID).Count(&totalKASO)
				mmyy := p.Date.Format("0106")
				docNo := fmt.Sprintf("%04d/KASO/UTAMA/%s", totalKASO+1, mmyy)

				cashTrx := models.CashTransaction{
					CompanyID:      p.CompanyID,
					BranchID:       p.BranchID,
					TrxNo:          docNo,
					Date:           p.Date,
					Type:           "OUT",
					AccountID:      kasAcc.ID,
					Amount:         p.PaidAmount,
					PayeeRecipient: supplierName,
					Description:    desc,
					CreatedBy:      p.CreatedBy,
				}
				if persediaanAcc.ID != uuid.Nil {
					cashTrx.OppositeAccID = &persediaanAcc.ID
				}
				if errCreate := db.Create(&cashTrx).Error; errCreate == nil {
					if persediaanAcc.ID != uuid.Nil {
						db.Create(&models.CashTransactionItem{
							TransactionID: cashTrx.ID,
							AccountID:     persediaanAcc.ID,
							Amount:        p.PaidAmount,
							Notes:         desc,
						})
					}
					log.Printf("[Sync] Created CashTransaction %s for Purchase %s (Paid: Rp %.2f)", docNo, p.InvoiceNo, p.PaidAmount)
				}
			}

			// Synchronize Double-Entry Journal to KAS BESAR (1-1121)
			var j models.Journal
			if errJ := db.Where("company_id = ? AND ref_type = 'PURCHASE' AND ref_no = ?", p.CompanyID, p.InvoiceNo).First(&j).Error; errJ == nil {
				var kasKecilAcc models.Account
				_ = db.Where("company_id = ? AND code = '1-1110'", p.CompanyID).First(&kasKecilAcc)
				if kasKecilAcc.ID != uuid.Nil && kasAcc.ID != uuid.Nil {
					db.Model(&models.JournalEntry{}).Where("journal_id = ? AND account_id = ?", j.ID, kasKecilAcc.ID).Update("account_id", kasAcc.ID)
				}
			}
		}
	}

	var payments []models.SupplierPayment
	if err := db.Where("deleted_at IS NULL").Find(&payments).Error; err == nil {
		for _, pay := range payments {
			var count int64
			descPattern := "%" + pay.PaymentNo + "%"
			db.Model(&models.CashTransaction{}).Where("company_id = ? AND type = 'OUT' AND (trx_no = ? OR description LIKE ?)", pay.CompanyID, pay.PaymentNo, descPattern).Count(&count)
			if count == 0 {
				var kasAcc models.Account
				creditCode := "1-1110"
				if pay.PaymentMethod != "TUNAI" && pay.PaymentMethod != "CASH" {
					creditCode = "1-1131"
				}
				if errKas := db.Where("company_id = ? AND code = ?", pay.CompanyID, creditCode).First(&kasAcc).Error; errKas != nil {
					db.Where("company_id = ? AND subtype = 'CASH_BANK' AND is_header = false", pay.CompanyID).First(&kasAcc)
				}

				var utangAcc models.Account
				_ = db.Where("company_id = ? AND code = '2-1100'", pay.CompanyID).First(&utangAcc).Error

				var supplier models.Supplier
				supplierName := ""
				if errSupp := db.First(&supplier, pay.SupplierID).Error; errSupp == nil {
					supplierName = supplier.Name
				}

				desc := fmt.Sprintf("Pembayaran Utang Faktur ke %s (%s)", supplierName, pay.PaymentNo)

				var totalKASO int64
				db.Model(&models.CashTransaction{}).Where("company_id = ? AND type = 'OUT'", pay.CompanyID).Count(&totalKASO)
				mmyy := pay.Date.Format("0106")
				docNo := fmt.Sprintf("%04d/KASO/UTAMA/%s", totalKASO+1, mmyy)

				cashTrx := models.CashTransaction{
					CompanyID:      pay.CompanyID,
					BranchID:       pay.BranchID,
					TrxNo:          docNo,
					Date:           pay.Date,
					Type:           "OUT",
					AccountID:      kasAcc.ID,
					Amount:         pay.TotalAmount,
					PayeeRecipient: supplierName,
					Description:    desc,
					CreatedBy:      pay.CreatedBy,
				}
				if utangAcc.ID != uuid.Nil {
					cashTrx.OppositeAccID = &utangAcc.ID
				}
				if errCreate := db.Create(&cashTrx).Error; errCreate == nil {
					if utangAcc.ID != uuid.Nil {
						db.Create(&models.CashTransactionItem{
							TransactionID: cashTrx.ID,
							AccountID:     utangAcc.ID,
							Amount:        pay.TotalAmount,
							Notes:         desc,
						})
					}
					log.Printf("[Sync] Created CashTransaction %s for Supplier Payment %s (Paid: Rp %.2f)", docNo, pay.PaymentNo, pay.TotalAmount)
				}
			}
		}
	}
}


func SeedSampleSales(db *gorm.DB) {
	var salesCount int64
	db.Model(&models.Sale{}).Count(&salesCount)
	if salesCount > 0 {
		return
	}

	var company models.Company
	if err := db.First(&company).Error; err != nil {
		return
	}
	var branch models.Branch
	if err := db.Where("company_id = ?", company.ID).First(&branch).Error; err != nil {
		return
	}
	var warehouse models.Warehouse
	if err := db.Where("branch_id = ?", branch.ID).First(&warehouse).Error; err != nil {
		return
	}
	var adminUser models.User
	if err := db.Where("company_id = ?", company.ID).First(&adminUser).Error; err != nil {
		return
	}
	var customers []models.Customer
	db.Where("company_id = ?", company.ID).Find(&customers)
	if len(customers) == 0 {
		return
	}

	var prods []models.Product
	db.Where("company_id = ?", company.ID).Find(&prods)
	if len(prods) == 0 {
		return
	}

	prodMap := make(map[string]models.Product)
	for _, p := range prods {
		prodMap[p.Code] = p
	}

	now := time.Now()

	type SampleSaleData struct {
		InvoiceNo     string
		Date          time.Time
		CustomerIndex int
		Type          string
		Items         []struct {
			Code string
			Qty  float64
		}
	}

	salesData := []SampleSaleData{
		{
			InvoiceNo:     "POS/2026/11/00001",
			Date:          now.Add(-2 * time.Hour),
			CustomerIndex: 0,
			Type:          "POS",
			Items: []struct {
				Code string
				Qty  float64
			}{
				{"OBT001", 3},
				{"OBT005", 2},
				{"OBT004", 1},
			},
		},
		{
			InvoiceNo:     "POS/2026/11/00002",
			Date:          now.Add(-26 * time.Hour),
			CustomerIndex: 1 % len(customers),
			Type:          "POS",
			Items: []struct {
				Code string
				Qty  float64
			}{
				{"OBT002", 2},
				{"OBT003", 1},
			},
		},
		{
			InvoiceNo:     "POS/2026/11/00003",
			Date:          now.Add(-50 * time.Hour),
			CustomerIndex: 2 % len(customers),
			Type:          "POS",
			Items: []struct {
				Code string
				Qty  float64
			}{
				{"OBT001", 5},
				{"OBT006", 1},
			},
		},
		{
			InvoiceNo:     "SI/2026/11/00001",
			Date:          now.Add(-74 * time.Hour),
			CustomerIndex: 3 % len(customers),
			Type:          "BACKOFFICE",
			Items: []struct {
				Code string
				Qty  float64
			}{
				{"ASM001", 1},
				{"OBT003", 2},
			},
		},
		{
			InvoiceNo:     "POS/2026/10/00001",
			Date:          now.AddDate(0, -1, -5),
			CustomerIndex: 0,
			Type:          "POS",
			Items: []struct {
				Code string
				Qty  float64
			}{
				{"OBT001", 10},
				{"OBT002", 5},
			},
		},
		{
			InvoiceNo:     "POS/2026/09/00001",
			Date:          now.AddDate(0, -2, -10),
			CustomerIndex: 1 % len(customers),
			Type:          "POS",
			Items: []struct {
				Code string
				Qty  float64
			}{
				{"OBT003", 4},
				{"OBT004", 3},
			},
		},
	}

	for _, sd := range salesData {
		var subtotal float64
		var saleItems []models.SaleItem

		for _, it := range sd.Items {
			p, ok := prodMap[it.Code]
			if !ok {
				p = prods[0]
			}
			unitID := uuid.Nil
			if p.BaseUnitID != nil {
				unitID = *p.BaseUnitID
			}
			tot := it.Qty * p.SellingPrice
			subtotal += tot
			saleItems = append(saleItems, models.SaleItem{
				ProductID:   p.ID,
				UnitID:      unitID,
				Qty:         it.Qty,
				UnitPrice:   p.SellingPrice,
				CostPrice:   p.PurchasePrice,
				TotalAmount: tot,
			})
		}

		tax := subtotal * 0.11
		total := subtotal + tax
		cust := customers[sd.CustomerIndex]

		sale := models.Sale{
			CompanyID:       company.ID,
			BranchID:        branch.ID,
			WarehouseID:     warehouse.ID,
			CustomerID:      cust.ID,
			InvoiceNo:       sd.InvoiceNo,
			Date:            sd.Date,
			DueDate:         sd.Date,
			Type:            sd.Type,
			Status:          "POSTED",
			PaymentStatus:   "PAID",
			Subtotal:        subtotal,
			TaxPercent:      11,
			TaxAmount:       tax,
			TotalAmount:     total,
			PaidAmount:      total,
			RemainingAmount: 0,
			Notes:           "Transaksi Penjualan Apotek Farmasi",
			CreatedBy:      adminUser.ID,
		}

		if err := db.Create(&sale).Error; err == nil {
			for i := range saleItems {
				saleItems[i].SaleID = sale.ID
				db.Create(&saleItems[i])
			}
			db.Create(&models.SalePayment{
				SaleID: sale.ID,
				Method: "CASH",
				Amount: total,
			})
		}
	}
	log.Println("[Seed] Sample Sales transactions seeded successfully!")
}

// EnsureDiscountAccounts guarantees the presence of POTONGAN PEMBELIAN, KERINGANAN HUTANG, POTONGAN PENJUALAN, and KERINGANAN PIUTANG accounts
func EnsureDiscountAccounts(db *gorm.DB) {
	var companies []models.Company
	db.Find(&companies)

	for _, comp := range companies {
		// 1. Akun POTONGAN PEMBELIAN (5-1100)
		var pHeader models.Account
		_ = db.Where("company_id = ? AND code = '5-0000'", comp.ID).First(&pHeader).Error
		var pParentID *uuid.UUID
		if pHeader.ID != uuid.Nil {
			pParentID = &pHeader.ID
		}

		var accPurchDisc models.Account
		if err := db.Where("company_id = ? AND code = '5-1100'", comp.ID).First(&accPurchDisc).Error; err != nil {
			accPurchDisc = models.Account{
				CompanyID:     comp.ID,
				Code:          "5-1100",
				Name:          "POTONGAN PEMBELIAN",
				Type:          "EXPENSE",
				Subtype:       "COGS",
				NormalBalance: "CREDIT",
				ParentID:      pParentID,
				IsHeader:      false,
				IsActive:      true,
			}
			db.Create(&accPurchDisc)
		} else if accPurchDisc.Name != "POTONGAN PEMBELIAN" {
			db.Model(&accPurchDisc).Update("name", "POTONGAN PEMBELIAN")
		}

		// 2. Akun KERINGANAN HUTANG (5-2100)
		var accKeringananHutang models.Account
		if err := db.Where("company_id = ? AND code = '5-2100'", comp.ID).First(&accKeringananHutang).Error; err != nil {
			accKeringananHutang = models.Account{
				CompanyID:     comp.ID,
				Code:          "5-2100",
				Name:          "KERINGANAN HUTANG",
				Type:          "EXPENSE",
				Subtype:       "COGS",
				NormalBalance: "CREDIT",
				ParentID:      pParentID,
				IsHeader:      false,
				IsActive:      true,
			}
			db.Create(&accKeringananHutang)
		} else if accKeringananHutang.Name != "KERINGANAN HUTANG" {
			db.Model(&accKeringananHutang).Update("name", "KERINGANAN HUTANG")
		}

		// 3. Akun POTONGAN PENJUALAN (4-1200)
		var sHeader models.Account
		_ = db.Where("company_id = ? AND code = '4-0000'", comp.ID).First(&sHeader).Error
		var sParentID *uuid.UUID
		if sHeader.ID != uuid.Nil {
			sParentID = &sHeader.ID
		}

		var accSalesDisc models.Account
		if err := db.Where("company_id = ? AND code = '4-1200'", comp.ID).First(&accSalesDisc).Error; err != nil {
			accSalesDisc = models.Account{
				CompanyID:     comp.ID,
				Code:          "4-1200",
				Name:          "POTONGAN PENJUALAN",
				Type:          "REVENUE",
				Subtype:       "SALES",
				NormalBalance: "DEBIT",
				ParentID:      sParentID,
				IsHeader:      false,
				IsActive:      true,
			}
			db.Create(&accSalesDisc)
		} else if accSalesDisc.Name != "POTONGAN PENJUALAN" {
			db.Model(&accSalesDisc).Update("name", "POTONGAN PENJUALAN")
		}

		// 4. Akun KERINGANAN PIUTANG (4-1400)
		var accKeringananPiutang models.Account
		if err := db.Where("company_id = ? AND code = '4-1400'", comp.ID).First(&accKeringananPiutang).Error; err != nil {
			accKeringananPiutang = models.Account{
				CompanyID:     comp.ID,
				Code:          "4-1400",
				Name:          "KERINGANAN PIUTANG",
				Type:          "REVENUE",
				Subtype:       "SALES",
				NormalBalance: "DEBIT",
				ParentID:      sParentID,
				IsHeader:      false,
				IsActive:      true,
			}
			db.Create(&accKeringananPiutang)
		} else if accKeringananPiutang.Name != "KERINGANAN PIUTANG" {
			db.Model(&accKeringananPiutang).Update("name", "KERINGANAN PIUTANG")
		}

		// Update / Seed default account_settings
		upsertSetting := func(key string, accID uuid.UUID, desc string) {
			var s models.AccountSetting
			if err := db.Where("company_id = ? AND key = ?", comp.ID, key).First(&s).Error; err != nil {
				db.Create(&models.AccountSetting{
					CompanyID:   comp.ID,
					Key:         key,
					AccountID:   accID,
					Description: desc,
				})
			} else {
				db.Model(&s).Updates(map[string]interface{}{
					"account_id":  accID,
					"description": desc,
				})
			}
		}

		if accPurchDisc.ID != uuid.Nil {
			upsertSetting("purch_price_discount", accPurchDisc.ID, "Akun Potongan Pembelian (POTONGAN PEMBELIAN)")
		}
		if accKeringananHutang.ID != uuid.Nil {
			upsertSetting("purch_discount", accKeringananHutang.ID, "Akun Keringanan Hutang (KERINGANAN HUTANG)")
			upsertSetting("ap_discount", accKeringananHutang.ID, "Akun Potongan Hutang (KERINGANAN HUTANG)")
		}
		if accSalesDisc.ID != uuid.Nil {
			upsertSetting("sales_price_discount", accSalesDisc.ID, "Akun Potongan Penjualan (POTONGAN PENJUALAN)")
		}
		if accKeringananPiutang.ID != uuid.Nil {
			upsertSetting("sales_discount", accKeringananPiutang.ID, "Akun Keringanan Piutang (KERINGANAN PIUTANG)")
			upsertSetting("ar_discount", accKeringananPiutang.ID, "Akun Potongan Piutang (KERINGANAN PIUTANG)")
		}
	}
}