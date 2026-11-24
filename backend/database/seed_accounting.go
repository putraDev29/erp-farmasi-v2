package database

import (
	"fmt"
	"log"
	"time"

	"farmasi/backend/models"
	"farmasi/backend/services"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SeedKetokoAccountingMaster populates the Ketoko Chart of Accounts and realistic linked transactions
func SeedKetokoAccountingMaster(db *gorm.DB, companyID, branchID, userID uuid.UUID) {
	log.Println("[Seed] Synchronizing Ketoko Chart of Accounts and linked real transactions...")

	// 1. Chart of Accounts Definitions
	coaList := []struct {
		Code, Name, Type, Subtype, Normal string
		IsHeader                          bool
		ParentCode                        string
	}{
		// 1. AKTIVA
		{"1-0000", "AKTIVA", "ASSET", "HEADER", "DEBIT", true, ""},
		{"1-1000", "AKTIVA LANCAR", "ASSET", "HEADER", "DEBIT", true, "1-0000"},
		{"1-1100", "KAS & BANK", "ASSET", "HEADER", "DEBIT", true, "1-1000"},
		{"1-1110", "KAS KECIL", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1120", "Bank BCA Operasional", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1121", "KAS BESAR", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1130", "BANK NOBU KARYABARU", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1131", "BANK BCA", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1132", "QRIS BCA", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1140", "KAS BIAYA PROMOSI", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1141", "KAS DEPOSIT", "ASSET", "CASH_BANK", "DEBIT", false, "1-1100"},
		{"1-1142", "PIUTANG CABANG", "ASSET", "RECEIVABLE", "DEBIT", false, "1-1100"},
		{"1-1200", "PIUTANG", "ASSET", "HEADER", "DEBIT", true, "1-1000"},
		{"1-1210", "PIUTANG USAHA", "ASSET", "RECEIVABLE", "DEBIT", false, "1-1200"},
		{"1-1211", "PIUTANG KONSINYASI", "ASSET", "RECEIVABLE", "DEBIT", false, "1-1200"},
		{"1-1212", "PIUTANG PPN", "ASSET", "RECEIVABLE", "DEBIT", false, "1-1200"},
		{"1-1220", "PIUTANG KARTU KREDIT", "ASSET", "RECEIVABLE", "DEBIT", false, "1-1200"},
		{"1-122X01", "PIUTANG E-MONEY", "ASSET", "RECEIVABLE", "DEBIT", false, "1-1200"},
		{"1-1400", "PAJAK PEMBELIAN", "ASSET", "HEADER", "DEBIT", true, "1-1000"},
		{"1-1410", "PPN MASUKAN", "ASSET", "TAX", "DEBIT", false, "1-1400"},
		{"1-1421", "PAJAK DIBAYAR DIMUKA", "ASSET", "TAX", "DEBIT", false, "1-1400"},
		{"1-2000", "PERSEDIAAN", "ASSET", "HEADER", "DEBIT", true, "1-1000"},
		{"1-2010", "PERSEDIAAN BARANG", "ASSET", "INVENTORY", "DEBIT", false, "1-2000"},
		{"1-2030", "APOTEK BERKAT PURNAMA", "ASSET", "INVENTORY", "DEBIT", false, "1-2000"},
		{"1-2035", "CABANG B", "ASSET", "INVENTORY", "DEBIT", false, "1-2000"},
		{"1-2040", "CABANG C", "ASSET", "INVENTORY", "DEBIT", false, "1-2000"},
		{"1-2390", "POTONGAN BELI DAN BIAYA LAIN", "ASSET", "INVENTORY", "DEBIT", false, "1-2000"},
		{"1-3000", "PERAKITAN", "ASSET", "HEADER", "DEBIT", true, "1-1000"},
		{"1-3010", "PERSEDIAAN BARANG DALAM PROSES", "ASSET", "INVENTORY", "DEBIT", false, "1-3000"},
		{"1-4000", "KONSINYASI KELUAR", "ASSET", "HEADER", "DEBIT", true, "1-1000"},
		{"1-4010", "BARANG-BARANG KONSINYASI", "ASSET", "INVENTORY", "DEBIT", false, "1-4000"},
		{"1-9101", "DANA DEPOSIT DI SUPLIER", "ASSET", "DEPOSIT", "DEBIT", false, "1-1000"},

		// 2. KEWAJIBAN
		{"2-0000", "KEWAJIBAN", "LIABILITY", "HEADER", "CREDIT", true, ""},
		{"2-1000", "KEWAJIBAN LANCAR", "LIABILITY", "HEADER", "CREDIT", true, "2-0000"},
		{"2-1100", "HUTANG USAHA", "LIABILITY", "PAYABLE", "CREDIT", false, "2-1000"},
		{"2-1300", "HUTANG SALES", "LIABILITY", "PAYABLE", "CREDIT", false, "2-1000"},
		{"2-3101", "DEPOSIT PELANGGAN", "LIABILITY", "DEPOSIT", "CREDIT", false, "2-1000"},
		{"2-4110", "PPN KELUARAN", "LIABILITY", "TAX", "CREDIT", false, "2-1000"},

		// 3. MODAL
		{"3-0000", "MODAL", "EQUITY", "HEADER", "CREDIT", true, ""},
		{"3-1000", "MODAL PEMILIK", "EQUITY", "EQUITY", "CREDIT", false, "3-0000"},
		{"3-2000", "LABA DITAHAN", "EQUITY", "EQUITY", "CREDIT", false, "3-0000"},
		{"3-3000", "LABA TAHUN BERJALAN", "EQUITY", "EQUITY", "CREDIT", false, "3-0000"},

		// 4. PENDAPATAN
		{"4-0000", "PENDAPATAN", "REVENUE", "HEADER", "CREDIT", true, ""},
		{"4-1100", "PENDAPATAN JUAL", "REVENUE", "SALES", "CREDIT", false, "4-0000"},
		{"4-1200", "POTONGAN PENJUALAN", "REVENUE", "SALES", "DEBIT", false, "4-0000"},
		{"4-1300", "RETUR PENJUALAN", "REVENUE", "SALES", "DEBIT", false, "4-0000"},
		{"4-1400", "KERINGANAN PIUTANG", "REVENUE", "SALES", "DEBIT", false, "4-0000"},

		// 5. HPP
		{"5-0000", "HPP", "EXPENSE", "HEADER", "DEBIT", true, ""},
		{"5-1100", "POTONGAN PEMBELIAN", "EXPENSE", "COGS", "CREDIT", false, "5-0000"},
		{"5-1300", "HARGA POKOK PENJUALAN", "EXPENSE", "COGS", "DEBIT", false, "5-0000"},
		{"5-2100", "KERINGANAN HUTANG", "EXPENSE", "COGS", "CREDIT", false, "5-0000"},
		{"5-2200", "PENGATURAN STOK / SELISIH OPNAME", "EXPENSE", "COGS", "DEBIT", false, "5-0000"},

		// 6. BIAYA
		{"6-0000", "BIAYA", "EXPENSE", "HEADER", "DEBIT", true, ""},
		{"6-1000", "BIAYA OPERASIONAL", "EXPENSE", "HEADER", "DEBIT", true, "6-0000"},
		{"6-1100", "BIAYA GAJI", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false, "6-1000"},
		{"6-1200", "BIAYA LISTRIK & AIR", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false, "6-1000"},
		{"6-1300", "BIAYA SEWA", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false, "6-1000"},
		{"6-3020", "BIAYA KOMISI", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false, "6-1000"},
		{"6-3100", "BIAYA PENYUSUTAN", "EXPENSE", "OPERATING_EXPENSE", "DEBIT", false, "6-1000"},

		// 7. PENDAPATAN LAIN
		{"7-0000", "PENDAPATAN LAIN", "REVENUE", "HEADER", "CREDIT", true, ""},
		{"7-1000", "PENDAPATAN BUNGA", "REVENUE", "OTHER_INCOME", "CREDIT", false, "7-0000"},
		{"7-1100", "PENDAPATAN LAIN-LAIN", "REVENUE", "OTHER_INCOME", "CREDIT", false, "7-0000"},

		// 8. BIAYA LAIN
		{"8-0000", "BIAYA LAIN", "EXPENSE", "HEADER", "DEBIT", true, ""},
		{"8-1000", "BIAYA ADMINISTRASI BANK", "EXPENSE", "OTHER_EXPENSE", "DEBIT", false, "8-0000"},
		{"8-1100", "BIAYA LAIN-LAIN", "EXPENSE", "OTHER_EXPENSE", "DEBIT", false, "8-0000"},
	}

	accMap := make(map[string]uuid.UUID)
	var existingAccounts []models.Account
	db.Where("company_id = ?", companyID).Find(&existingAccounts)
	for _, a := range existingAccounts {
		accMap[a.Code] = a.ID
	}

	for _, item := range coaList {
		var acc models.Account
		err := db.Where("company_id = ? AND code = ?", companyID, item.Code).First(&acc).Error
		if err != nil {
			acc = models.Account{
				CompanyID:     companyID,
				Code:          item.Code,
				Name:          item.Name,
				Type:          item.Type,
				Subtype:       item.Subtype,
				NormalBalance: item.Normal,
				IsHeader:      item.IsHeader,
				IsActive:      true,
			}
			db.Create(&acc)
		} else {
			// Update name & flags to match Ketoko spec
			acc.Name = item.Name
			acc.IsHeader = item.IsHeader
			acc.Type = item.Type
			acc.Subtype = item.Subtype
			acc.NormalBalance = item.Normal
			db.Save(&acc)
		}
		accMap[item.Code] = acc.ID
	}

	// Link parent IDs
	for _, item := range coaList {
		if item.ParentCode != "" {
			if parentID, ok := accMap[item.ParentCode]; ok {
				db.Model(&models.Account{}).Where("id = ?", accMap[item.Code]).Update("parent_id", parentID)
			}
		}
	}

	// 1b. Seed Opening Balances (Saldo Awal Akuntansi Indonesia - SAK / PSAK)
	// Sesuai aturan akuntansi Indonesia: Saldo Kas & Bank tidak boleh minus / negatif.
	// Bisnis harus memiliki modal awal kas sebelum dapat mengeluarkan uang.
	tOpening, _ := time.Parse("2006-01-02 15:04:05", "2026-11-01 00:00:00")
	saEntries := []struct {
		Code   string
		Debit  float64
		Credit float64
		Desc   string
	}{
		{"1-1121", 50000000.00, 0, "Saldo Awal Kas Besar"},
		{"1-1110", 10000000.00, 0, "Saldo Awal Kas Kecil / Kasir"},
		{"1-1120", 25000000.00, 0, "Saldo Awal Bank BCA Operasional"},
		{"1-1131", 50000000.00, 0, "Saldo Awal Bank BCA"},
		{"1-1132", 10000000.00, 0, "Saldo Awal Kas QRIS BCA & EDC"},
		{"1-2010", 150000000.00, 0, "Saldo Awal Persediaan Barang Dagang"},
		{"3-1000", 0, 295000000.00, "Saldo Awal Modal Pemilik Usaha"},
	}

	var existingSA models.Journal
	if err := db.Where("company_id = ? AND doc_no = ?", companyID, "0001/SA/UTAMA/1126").First(&existingSA).Error; err != nil {
		saJournal := models.Journal{
			CompanyID:   companyID,
			BranchID:    branchID,
			DocNo:       "0001/SA/UTAMA/1126",
			Date:        tOpening,
			RefType:     "INITIAL_BALANCE",
			RefNo:       "0001/SA/UTAMA/1126",
			Description: "Saldo Awal Kas, Bank, Persediaan & Modal Pemilik",
			Status:      "POSTED",
			TotalDebit:  295000000.00,
			TotalCredit: 295000000.00,
			CreatedBy:   userID,
		}
		db.Create(&saJournal)

		for _, se := range saEntries {
			if aID, ok := accMap[se.Code]; ok {
				db.Create(&models.JournalEntry{
					JournalID:   saJournal.ID,
					AccountID:   aID,
					Debit:       se.Debit,
					Credit:      se.Credit,
					Description: se.Desc,
				})

				db.Where("company_id = ? AND account_id = ? AND type = 'ACCOUNT'", companyID, aID).
					Assign(models.InitialBalanceEntry{
						CompanyID: companyID,
						BranchID:  branchID,
						Type:      "ACCOUNT",
						AccountID: &aID,
						Date:      tOpening,
						Debit:     se.Debit,
						Credit:    se.Credit,
					}).FirstOrCreate(&models.InitialBalanceEntry{})
			}
		}
	} else {
		// Ensure all opening balance accounts are present and synced in existing SA journal
		existingSA.TotalDebit = 295000000.00
		existingSA.TotalCredit = 295000000.00
		db.Save(&existingSA)
		for _, se := range saEntries {
			if aID, ok := accMap[se.Code]; ok {
				var exEntry models.JournalEntry
				if err := db.Where("journal_id = ? AND account_id = ?", existingSA.ID, aID).First(&exEntry).Error; err != nil {
					db.Create(&models.JournalEntry{
						JournalID:   existingSA.ID,
						AccountID:   aID,
						Debit:       se.Debit,
						Credit:      se.Credit,
						Description: se.Desc,
					})
				} else {
					exEntry.Debit = se.Debit
					exEntry.Credit = se.Credit
					db.Save(&exEntry)
				}

				db.Where("company_id = ? AND account_id = ? AND type = 'ACCOUNT'", companyID, aID).
					Assign(models.InitialBalanceEntry{
						CompanyID: companyID,
						BranchID:  branchID,
						Type:      "ACCOUNT",
						AccountID: &aID,
						Date:      tOpening,
						Debit:     se.Debit,
						Credit:    se.Credit,
					}).FirstOrCreate(&models.InitialBalanceEntry{})
			}
		}
	}

	// 2. Seed Real Linked Kas Transfer Transactions (Screenshot 8)
	type KasTrfSeed struct {
		TrxNo, Notes string
		Date         time.Time
		FromCode     string
		ToCode       string
		Amount       float64
	}

	tBase, _ := time.Parse("2006-01-02 15:04:05", "2026-11-18 14:13:26")
	transferData := []KasTrfSeed{
		{"1179/KASTR/UTAMA/1126", "setoran cash shift pagi niwa", tBase, "1-1110", "1-1121", 4677500.00},
		{"1176/KASTR/UTAMA/1126", "SETORAN QRIS TGL 17", tBase.Add(-7 * time.Hour), "1-1132", "1-1131", 2519370.00},
		{"1175/KASTR/UTAMA/1126", "SETORAN EDC TGL 17", tBase.Add(-8 * time.Hour), "1-1132", "1-1131", 495000.00},
		{"1178/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE ELDHA", tBase.Add(-17 * time.Hour), "1-1110", "1-1121", 1465200.00},
		{"1177/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE NIWA", tBase.Add(-18 * time.Hour), "1-1110", "1-1121", 2383600.00},
		{"1173/KASTR/UTAMA/1126", "SETORAN CASH SHIFT PAGI MAYA", tBase.Add(-24 * time.Hour), "1-1110", "1-1121", 3996830.00},
		{"1174/KASTR/UTAMA/1126", "setoran qris tgl 16", tBase.Add(-31 * time.Hour), "1-1132", "1-1131", 3706200.00},
		{"1172/KASTR/UTAMA/1126", "setoran cash shift sore eldha", tBase.Add(-41 * time.Hour), "1-1110", "1-1121", 1945600.00},
		{"1171/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE MAYA", tBase.Add(-42 * time.Hour), "1-1110", "1-1121", 2182400.00},
		{"1170/KASTR/UTAMA/1126", "setoran cash shift pagi niwa", tBase.Add(-48 * time.Hour), "1-1110", "1-1121", 4503100.00},
		{"1169/KASTR/UTAMA/1126", "kas besar transfer bca tgl 16", tBase.Add(-50 * time.Hour), "1-1121", "1-1131", 5400000.00},
		{"1166/KASTR/UTAMA/1126", "setoran edc tgl 15", tBase.Add(-55 * time.Hour), "1-1132", "1-1131", 1200500.00},
		{"1164/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE MAYA", tBase.Add(-65 * time.Hour), "1-1110", "1-1121", 2147500.00},
		{"1163/KASTR/UTAMA/1126", "SETORAN CASH SHIFT PAGI SORE ELDHA", tBase.Add(-70 * time.Hour), "1-1110", "1-1121", 6110700.00},
		{"1168/KASTR/UTAMA/1126", "kas besar transfer bca tgl 15", tBase.Add(-77 * time.Hour), "1-1121", "1-1131", 30000000.00},
		{"1167/KASTR/UTAMA/1126", "setoran qris tgl 14", tBase.Add(-79 * time.Hour), "1-1132", "1-1131", 1426000.00},
		{"1165/KASTR/UTAMA/1126", "setoran edc tgl 14", tBase.Add(-80 * time.Hour), "1-1132", "1-1131", 132000.00},
		{"1162/KASTR/UTAMA/1126", "setoran cash shift sore eldha", tBase.Add(-90 * time.Hour), "1-1110", "1-1121", 2082100.00},
		{"1161/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE MAYA", tBase.Add(-91 * time.Hour), "1-1110", "1-1121", 6993900.00},
		{"1160/KASTR/UTAMA/1126", "setoran shift pagi niwa", tBase.Add(-96 * time.Hour), "1-1110", "1-1121", 3945900.00},
		{"1157/KASTR/UTAMA/1126", "SETORAN QRIS TGL 13", tBase.Add(-103 * time.Hour), "1-1132", "1-1131", 2862200.00},
		{"1156/KASTR/UTAMA/1126", "SETORAN EDC TGL 13", tBase.Add(-104 * time.Hour), "1-1132", "1-1131", 157500.00},
		{"1159/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE ELDHA", tBase.Add(-113 * time.Hour), "1-1110", "1-1121", 2018300.00},
		{"1158/KASTR/UTAMA/1126", "SETORAN CASH SHIFT SORE NIWA", tBase.Add(-114 * time.Hour), "1-1110", "1-1121", 2127700.00},
		{"1155/KASTR/UTAMA/1126", "SETORAN CASH SHIFT PAGI DEVI", tBase.Add(-120 * time.Hour), "1-1110", "1-1121", 3863300.00},
		{"1154/KASTR/UTAMA/1126", "SETORAN QRIS TGL 12", tBase.Add(-127 * time.Hour), "1-1132", "1-1131", 3203800.00},
		{"1153/KASTR/UTAMA/1126", "SETORAN EDC TGL 12", tBase.Add(-128 * time.Hour), "1-1132", "1-1131", 149500.00},
		{"1152/KASTR/UTAMA/1126", "SETORAN CASH SHIFT PAGI-SORE MAYA", tBase.Add(-137 * time.Hour), "1-1110", "1-1121", 5941200.00},
	}

	for _, tr := range transferData {
		srcID := accMap[tr.FromCode]
		tgtID := accMap[tr.ToCode]

		// If from kasir (1-1110), ensure cash sales receipt was received before the shift deposit
		if tr.FromCode == "1-1110" {
			salesDocNo := "SLS-" + tr.TrxNo
			var existSales models.Journal
			if err := db.Where("company_id = ? AND doc_no = ?", companyID, salesDocNo).First(&existSales).Error; err != nil {
				salesJrn := models.Journal{
					CompanyID:   companyID,
					BranchID:    branchID,
					DocNo:       salesDocNo,
					Date:        tr.Date.Add(-5 * time.Minute),
					RefType:     "CASH_SALES",
					RefNo:       salesDocNo,
					Description: "Penerimaan Kas Penjualan Kasir - " + tr.Notes,
					Status:      "POSTED",
					TotalDebit:  tr.Amount,
					TotalCredit: tr.Amount,
					CreatedBy:   userID,
				}
				db.Create(&salesJrn)
				db.Create(&models.JournalEntry{
					JournalID:   salesJrn.ID,
					AccountID:   srcID,
					Debit:       tr.Amount,
					Credit:      0,
					Description: "Penerimaan Kas Penjualan Kasir",
				})
				db.Create(&models.JournalEntry{
					JournalID:   salesJrn.ID,
					AccountID:   accMap["4-1000"],
					Debit:       0,
					Credit:      tr.Amount,
					Description: "Pendapatan Penjualan Kasir",
				})
			}
		}

		// If from QRIS / EDC (1-1132), ensure QRIS customer sales payment was received before the bank deposit
		if tr.FromCode == "1-1132" {
			qrisDocNo := "QRIS-" + tr.TrxNo
			var existQRIS models.Journal
			if err := db.Where("company_id = ? AND doc_no = ?", companyID, qrisDocNo).First(&existQRIS).Error; err != nil {
				qrisJrn := models.Journal{
					CompanyID:   companyID,
					BranchID:    branchID,
					DocNo:       qrisDocNo,
					Date:        tr.Date.Add(-5 * time.Minute),
					RefType:     "CASH_SALES",
					RefNo:       qrisDocNo,
					Description: "Penerimaan Settlement Non-Tunai QRIS/EDC - " + tr.Notes,
					Status:      "POSTED",
					TotalDebit:  tr.Amount,
					TotalCredit: tr.Amount,
					CreatedBy:   userID,
				}
				db.Create(&qrisJrn)
				db.Create(&models.JournalEntry{
					JournalID:   qrisJrn.ID,
					AccountID:   srcID,
					Debit:       tr.Amount,
					Credit:      0,
					Description: "Penerimaan QRIS/EDC Kasir",
				})
				db.Create(&models.JournalEntry{
					JournalID:   qrisJrn.ID,
					AccountID:   accMap["4-1000"],
					Debit:       0,
					Credit:      tr.Amount,
					Description: "Pendapatan Penjualan QRIS/EDC",
				})
			}
		}

		var existing models.CashTransaction
		if err := db.Where("company_id = ? AND trx_no = ?", companyID, tr.TrxNo).First(&existing).Error; err != nil {

			// Create balanced Journal
			jrn := models.Journal{
				CompanyID:   companyID,
				BranchID:    branchID,
				DocNo:       tr.TrxNo,
				Date:        tr.Date,
				RefType:     "CASH_TRANSFER",
				RefNo:       tr.TrxNo,
				Description: tr.Notes,
				Status:      "POSTED",
				TotalDebit:  tr.Amount,
				TotalCredit: tr.Amount,
				CreatedBy:   userID,
			}
			db.Create(&jrn)

			// Entries: Debit Target Account, Credit Source Account
			db.Create(&models.JournalEntry{
				JournalID:   jrn.ID,
				AccountID:   tgtID,
				Debit:       tr.Amount,
				Credit:      0,
				Description: tr.Notes,
			})
			db.Create(&models.JournalEntry{
				JournalID:   jrn.ID,
				AccountID:   srcID,
				Debit:       0,
				Credit:      tr.Amount,
				Description: tr.Notes,
			})

			// Record Cash Transaction
			cashTrx := models.CashTransaction{
				CompanyID:       companyID,
				BranchID:        branchID,
				TrxNo:           tr.TrxNo,
				Date:            tr.Date,
				Type:            "TRANSFER",
				AccountID:       srcID,
				TargetAccountID: &tgtID,
				Amount:          tr.Amount,
				Description:     tr.Notes,
				JournalID:       &jrn.ID,
				CreatedBy:       userID,
			}
			db.Create(&cashTrx)
		}
	}

	// 3. Seed Real Linked Kas Keluar Transactions (Screenshot 9)
	type KasOutSeed struct {
		TrxNo, Notes string
		Date         time.Time
		SourceCode   string
		ExpenseCode  string
		Amount       float64
	}

	outData := []KasOutSeed{
		{"0427/KASO/UTAMA/1126", "insentif hdl niwa dan devi tgl 16", tBase.Add(-2 * time.Hour), "1-1121", "6-3020", 25000.00},
		{"0426/KASO/UTAMA/1126", "cuci ac tgl 18", tBase.Add(-3 * time.Hour), "1-1121", "6-1200", 75000.00},
		{"0424/KASO/UTAMA/1126", "jaga malam november", tBase.Add(-24 * time.Hour), "1-1121", "6-1100", 80000.00},
		{"0425/KASO/UTAMA/1126", "insentif hdl niwa tgl 16", tBase.Add(-48 * time.Hour), "1-1121", "6-3020", 12900.00},
		{"0423/KASO/UTAMA/1126", "POTONGAN EDC TGL 14", tBase.Add(-100 * time.Hour), "1-1131", "8-1000", 236.25},
		{"0419/KASO/UTAMA/1126", "INSENTIF HDL ELDHA TGL 13", tBase.Add(-115 * time.Hour), "1-1121", "6-3020", 10000.00},
		{"0422/KASO/UTAMA/1126", "POTONGAN EDC TGL 13", tBase.Add(-125 * time.Hour), "1-1131", "8-1000", 224.25},
		{"0418/KASO/UTAMA/1126", "INSENTIF HDL MAYA TGL 12", tBase.Add(-140 * time.Hour), "1-1121", "6-3020", 25800.00},
		{"0421/KASO/UTAMA/1126", "POTONGAN EDC TGL 12", tBase.Add(-148 * time.Hour), "1-1131", "8-1000", 343.50},
		{"0417/KASO/UTAMA/1126", "POTONGAN QRIS TGL 11", tBase.Add(-168 * time.Hour), "1-1131", "8-1000", 4871.70},
		{"0416/KASO/UTAMA/1126", "WIFI NOVEMBER", tBase.Add(-169 * time.Hour), "1-1131", "6-1200", 388500.00},
		{"0415/KASO/UTAMA/1126", "PDAM NOVEMBER", tBase.Add(-170 * time.Hour), "1-1131", "6-1200", 81700.00},
		{"0420/KASO/UTAMA/1126", "PLN NOVEMBER", tBase.Add(-175 * time.Hour), "1-1131", "6-1200", 997620.00},
		{"0414/KASO/UTAMA/1126", "POTONGAN EDC TGL 10", tBase.Add(-190 * time.Hour), "1-1131", "8-1000", 12350.00},
		{"0413/KASO/UTAMA/1126", "POTONGAN EDC TGL 10", tBase.Add(-191 * time.Hour), "1-1131", "8-1000", 2907.17},
		{"0408/KASO/UTAMA/1126", "PENGELUARAN APOTEK TGL 9-10", tBase.Add(-215 * time.Hour), "1-1121", "6-1000", 48000.00},
		{"0409/KASO/UTAMA/1126", "INSENTIF HDL MAYA TGL 9", tBase.Add(-216 * time.Hour), "1-1121", "6-3020", 12900.00},
		{"0412/KASO/UTAMA/1126", "POTONGAN QRIS TGL 7", tBase.Add(-265 * time.Hour), "1-1131", "8-1000", 1992.00},
		{"0407/KASO/UTAMA/1126", "PENGELUARAN APOTEK TGL 7", tBase.Add(-266 * time.Hour), "1-1121", "6-1000", 124000.00},
		{"0411/KASO/UTAMA/1126", "POTONGAN QRIS TGL 5", tBase.Add(-313 * time.Hour), "1-1131", "8-1000", 1572.30},
		{"0410/KASO/UTAMA/1126", "BIAYA ADMIN TGL 4", tBase.Add(-337 * time.Hour), "1-1131", "8-1000", 30000.00},
		{"0406/KASO/UTAMA/1126", "POTONGAN BCA EDC TGL 3", tBase.Add(-361 * time.Hour), "1-1131", "8-1000", 5700.00},
		{"0405/KASO/UTAMA/1126", "potongaN QRIS TGL 3", tBase.Add(-362 * time.Hour), "1-1131", "8-1000", 2368.80},
		{"0402/KASO/UTAMA/1126", "pengeluaran apotek tgl 3", tBase.Add(-365 * time.Hour), "1-1121", "6-1000", 30000.00},
		{"0401/KASO/UTAMA/1126", "insentif hdl maya", tBase.Add(-385 * time.Hour), "1-1121", "6-3020", 12900.00},
		{"0399/KASO/UTAMA/1126", "gaji karyawan tgl 1", tBase.Add(-408 * time.Hour), "1-1131", "6-1100", 15620648.00},
		{"0404/KASO/UTAMA/1126", "potongan edc tgl 2", tBase.Add(-387 * time.Hour), "1-1131", "8-1000", 741.00},
		{"0400/KASO/UTAMA/1126", "sewa gedung september tgl 1", tBase.Add(-410 * time.Hour), "1-1131", "6-1300", 3000000.00},
	}

	for _, out := range outData {
		var existing models.CashTransaction
		if err := db.Where("company_id = ? AND trx_no = ?", companyID, out.TrxNo).First(&existing).Error; err != nil {
			srcID := accMap[out.SourceCode]
			expID := accMap[out.ExpenseCode]

			jrn := models.Journal{
				CompanyID:   companyID,
				BranchID:    branchID,
				DocNo:       out.TrxNo,
				Date:        out.Date,
				RefType:     "CASH_OUT",
				RefNo:       out.TrxNo,
				Description: out.Notes,
				Status:      "POSTED",
				TotalDebit:  out.Amount,
				TotalCredit: out.Amount,
				CreatedBy:   userID,
			}
			db.Create(&jrn)

			db.Create(&models.JournalEntry{
				JournalID:   jrn.ID,
				AccountID:   expID,
				Debit:       out.Amount,
				Credit:      0,
				Description: out.Notes,
			})
			db.Create(&models.JournalEntry{
				JournalID:   jrn.ID,
				AccountID:   srcID,
				Debit:       0,
				Credit:      out.Amount,
				Description: out.Notes,
			})

			cashTrx := models.CashTransaction{
				CompanyID:     companyID,
				BranchID:      branchID,
				TrxNo:         out.TrxNo,
				Date:          out.Date,
				Type:          "OUT",
				AccountID:     srcID,
				OppositeAccID: &expID,
				Amount:        out.Amount,
				Description:   out.Notes,
				JournalID:     &jrn.ID,
				CreatedBy:     userID,
			}
			db.Create(&cashTrx)
		}
	}

	// 4. Seed Real Linked Kasir Sales Journals (Screenshot 5)
	type RealJournalSeed struct {
		DocNo string
		Date  string
		Lines []struct {
			Code   string
			Debit  float64
			Credit float64
		}
	}

	salesJournals := []RealJournalSeed{
		{
			DocNo: "079108/KSR/UTAMA/1126",
			Date:  "2026-11-18 19:48:33",
			Lines: []struct {
				Code   string
				Debit  float64
				Credit float64
			}{
				{"5-1300", 13547.00, 0.00},
				{"1-2010", 0.00, 13547.00},
				{"4-1100", 0.00, 15765.77},
				{"2-4110", 0.00, 1734.23},
				{"1-1110", 17500.00, 0.00},
				{"6-3020", 43.75, 0.00},
				{"2-1300", 0.00, 43.75},
			},
		},
		{
			DocNo: "079107/KSR/UTAMA/1126",
			Date:  "2026-11-18 19:46:55",
			Lines: []struct {
				Code   string
				Debit  float64
				Credit float64
			}{
				{"5-1300", 4753.41, 0.00},
				{"1-2010", 0.00, 4753.41},
				{"4-1100", 0.00, 6306.31},
				{"2-4110", 0.00, 693.69},
				{"1-1110", 7000.00, 0.00},
				{"6-3020", 17.50, 0.00},
				{"2-1300", 0.00, 17.50},
			},
		},
		{
			DocNo: "079106/KSR/UTAMA/1126",
			Date:  "2026-11-18 19:43:58",
			Lines: []struct {
				Code   string
				Debit  float64
				Credit float64
			}{
				{"5-1300", 8120.00, 0.00},
				{"1-2010", 0.00, 8120.00},
				{"4-1100", 0.00, 10810.81},
				{"2-4110", 0.00, 1189.19},
				{"1-1110", 12000.00, 0.00},
				{"6-3020", 30.00, 0.00},
				{"2-1300", 0.00, 30.00},
			},
		},
	}

	for _, sj := range salesJournals {
		var existing models.Journal
		if err := db.Where("company_id = ? AND doc_no = ?", companyID, sj.DocNo).First(&existing).Error; err != nil {
			jDate, _ := time.Parse("2006-01-02 15:04:05", sj.Date)
			var totDeb, totCred float64
			for _, l := range sj.Lines {
				totDeb += l.Debit
				totCred += l.Credit
			}

			jrn := models.Journal{
				CompanyID:   companyID,
				BranchID:    branchID,
				DocNo:       sj.DocNo,
				Date:        jDate,
				RefType:     "SALE",
				RefNo:       sj.DocNo,
				Description: fmt.Sprintf("Penjualan Kasir %s", sj.DocNo),
				Status:      "POSTED",
				TotalDebit:  totDeb,
				TotalCredit: totCred,
				CreatedBy:   userID,
			}
			db.Create(&jrn)

			for _, l := range sj.Lines {
				accID := accMap[l.Code]
				db.Create(&models.JournalEntry{
					JournalID:   jrn.ID,
					AccountID:   accID,
					Debit:       l.Debit,
					Credit:      l.Credit,
					Description: fmt.Sprintf("Penjualan Kasir %s", sj.DocNo),
				})
			}
		}
	}

	_ = services.SyncAllAccountBalances(db, companyID)

	log.Println("[Seed] Ketoko Chart of Accounts and real linked transactions successfully synced!")
}
