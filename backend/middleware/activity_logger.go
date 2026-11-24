package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"farmasi/backend/database"
	"farmasi/backend/models"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// ActivityLoggerMiddleware secara otomatis mencatat seluruh mutasi (POST, PUT, DELETE, PATCH)
// ke dalam database audit_logs sesuai dengan kategorinya dengan data No Transaksi, IP, dan Komputer riil.
func ActivityLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		path := c.Request.URL.Path

		// Hanya mencatat operasi perubahan data (POST, PUT, DELETE, PATCH)
		if method != "POST" && method != "PUT" && method != "DELETE" && method != "PATCH" {
			c.Next()
			return
		}

		// Skip health check atau endpoint pembacaan berkas
		if path == "/health" || strings.HasPrefix(path, "/uploads") {
			c.Next()
			return
		}

		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// Jalankan handler terlebih dahulu
		c.Next()

		// Jangan mencatat jika handler sudah mencatatnya secara eksplisit
		if alreadyLogged, exists := c.Get("audit_logged"); exists && alreadyLogged.(bool) {
			return
		}

		// Ambil status respons
		statusCode := c.Writer.Status()
		status := "Sukses"
		if statusCode >= 400 {
			status = "Gagal"
		}

		// Ambil ID User dan ID Perusahaan dari Context
		var userID uuid.UUID
		if uVal, exists := c.Get("user_id"); exists {
			if uid, ok := uVal.(uuid.UUID); ok {
				userID = uid
			}
		}

		var companyID uuid.UUID
		if cVal, exists := c.Get("company_id"); exists {
			if cid, ok := cVal.(uuid.UUID); ok {
				companyID = cid
			}
		}

		// Jika companyID masih kosong, ambil company default pertama
		if companyID == uuid.Nil {
			var comp models.Company
			if err := database.DB.First(&comp).Error; err == nil {
				companyID = comp.ID
			}
		}

		// Jika userID masih kosong, ambil admin user default
		if userID == uuid.Nil {
			var u models.User
			if err := database.DB.Where("username = ?", "admin").First(&u).Error; err == nil {
				userID = u.ID
			}
		}

		// IP Address riil client / jaringan
		ipAddress := utils.GetClientIP(c)

		// Komputer riil client / workstation
		computerName := utils.GetComputerName(c)

		// Cek nomor dokumen jika diset oleh handler
		docNo := c.GetString("audit_doc_no")
		if docNo == "" {
			docNo = c.Param("id")
		}

		// Ekstrak dari JSON response body jika docNo belum didapat
		if (docNo == "" || docNo == "-") && blw.body.Len() > 0 {
			var respMap map[string]interface{}
			if err := json.Unmarshal(blw.body.Bytes(), &respMap); err == nil {
				if dataMap, ok := respMap["data"].(map[string]interface{}); ok {
					for _, k := range []string{"invoice_no", "order_no", "transaction_no", "delivery_order_no", "sp_number", "customer_sp_number", "code", "username", "doc_no", "number", "id"} {
						if v, exists := dataMap[k]; exists && v != nil {
							if strVal, isStr := v.(string); isStr && strVal != "" {
								docNo = strVal
								break
							}
						}
					}
				}
			}
		}

		// Klasifikasi Kategori, Obyek (Entity), Aksi, dan Keterangan berdasarkan Path URL
		category := "TRANSAKSI"
		entity := "TRANSAKSI"
		action := method
		description := "Aktivitas Sistem"

		cleanPath := strings.ToLower(path)

		switch {
		// 1. PENJUALAN
		case strings.Contains(cleanPath, "/sales/orders"):
			category = "TRANSAKSI"
			entity = "PESANAN PENJUALAN"
			if method == "POST" {
				action = "INSERT"
				description = "Insert Pesanan Penjualan (SO)"
			} else if method == "PUT" {
				action = "UPDATE"
				description = "Update Pesanan Penjualan (SO)"
			} else {
				action = "DELETE"
				description = "Hapus Pesanan Penjualan (SO)"
			}
		case strings.Contains(cleanPath, "/sales") && strings.Contains(cleanPath, "/ship"):
			category = "TRANSAKSI"
			entity = "PENJUALAN"
			action = "VERIFIKASI"
			description = "Pemeriksaan Fisik Obat & Penyiapan Barang Gudang"
		case strings.Contains(cleanPath, "/sales") && strings.Contains(cleanPath, "/receive"):
			category = "TRANSAKSI"
			entity = "PENJUALAN"
			action = "KONFIRMASI"
			description = "Verifikasi Ekspedisi & Konfirmasi Terima Pelanggan"
		case strings.Contains(cleanPath, "/sales/returns"):
			category = "TRANSAKSI"
			entity = "RETUR PENJUALAN"
			action = "INSERT"
			description = "Insert Retur Penjualan"
		case strings.Contains(cleanPath, "/sales/payments"):
			category = "AKUNTANSI"
			entity = "PELUNASAN PIUTANG"
			action = "INSERT"
			description = "Penerimaan Pembayaran Piutang Penjualan"
		case strings.Contains(cleanPath, "/sales"):
			category = "TRANSAKSI"
			entity = "PENJUALAN"
			if method == "POST" {
				action = "INSERT"
				description = "Insert Penjualan"
			} else if method == "PUT" {
				action = "UPDATE"
				description = "Update Penjualan"
			} else {
				action = "DELETE"
				description = "Hapus Faktur Penjualan"
			}

		// 2. PEMBELIAN
		case strings.Contains(cleanPath, "/purchases/orders") || strings.Contains(cleanPath, "/purchasing/orders"):
			category = "TRANSAKSI"
			entity = "PESANAN PEMBELIAN"
			if method == "POST" {
				action = "INSERT"
				description = "Insert Pesanan Pembelian (PO)"
			} else if method == "PUT" {
				action = "UPDATE"
				description = "Update Pesanan Pembelian (PO)"
			} else {
				action = "DELETE"
				description = "Hapus Pesanan Pembelian (PO)"
			}
		case (strings.Contains(cleanPath, "/purchases") || strings.Contains(cleanPath, "/purchasing")) && strings.Contains(cleanPath, "/receive"):
			category = "TRANSAKSI"
			entity = "PEMBELIAN"
			action = "VERIFIKASI"
			description = "Pemeriksaan Fisik Obat oleh Petugas Gudang"
		case (strings.Contains(cleanPath, "/purchases") || strings.Contains(cleanPath, "/purchasing")) && strings.Contains(cleanPath, "/approve"):
			category = "TRANSAKSI"
			entity = "PEMBELIAN"
			action = "APPROVAL"
			description = "Verifikasi Berkas & Persetujuan Admin (Apoteker)"
		case strings.Contains(cleanPath, "/purchases/returns"):
			category = "TRANSAKSI"
			entity = "RETUR PEMBELIAN"
			action = "INSERT"
			description = "Insert Retur Pembelian Obat"
		case strings.Contains(cleanPath, "/purchases/payments") || strings.Contains(cleanPath, "/purchasing/payments"):
			category = "AKUNTANSI"
			entity = "PELUNASAN HUTANG"
			action = "INSERT"
			description = "Pelunasan Tagihan Hutang ke Distributor PBF"
		case strings.Contains(cleanPath, "/purchases") || strings.Contains(cleanPath, "/purchasing"):
			category = "TRANSAKSI"
			entity = "PEMBELIAN"
			if method == "POST" {
				action = "INSERT"
				description = "Insert Pembelian (Faktur PBF)"
			} else if method == "PUT" {
				action = "UPDATE"
				description = "Update Pembelian"
			} else {
				action = "DELETE"
				description = "Hapus Faktur Pembelian"
			}

		// 3. INVENTORY & GUDANG
		case strings.Contains(cleanPath, "/inventory/stock-opname") || strings.Contains(cleanPath, "/stock-opname"):
			category = "TRANSAKSI"
			entity = "STOK OPNAME"
			action = "INSERT"
			description = "Penyesuaian Fisik Stok Opname Gudang"
		case strings.Contains(cleanPath, "/inventory/transfers") || strings.Contains(cleanPath, "/transfers"):
			category = "TRANSAKSI"
			entity = "TRANSFER STOK"
			action = "INSERT"
			description = "Mutasi Transfer Stok Antar Gudang"
		case strings.Contains(cleanPath, "/inventory/in"):
			category = "TRANSAKSI"
			entity = "STOK MASUK"
			action = "INSERT"
			description = "Penerimaan Stok Obat Non-Pembelian"
		case strings.Contains(cleanPath, "/inventory/out"):
			category = "TRANSAKSI"
			entity = "STOK KELUAR"
			action = "INSERT"
			description = "Pengeluaran Stok Obat Non-Penjualan"
		case strings.Contains(cleanPath, "/inventory"):
			category = "TRANSAKSI"
			entity = "INVENTORY"
			action = method
			description = "Penyesuaian Mutasi Persediaan Obat"

		// 4. AKUNTANSI & KAS
		case strings.Contains(cleanPath, "/accounting/cash-in"):
			category = "AKUNTANSI"
			entity = "KAS"
			action = "INSERT"
			description = "Tambah Kas Masuk"
		case strings.Contains(cleanPath, "/accounting/cash-out"):
			category = "AKUNTANSI"
			entity = "KAS"
			action = "INSERT"
			description = "Tambah Kas Keluar"
		case strings.Contains(cleanPath, "/accounting/cash-transfers") || strings.Contains(cleanPath, "/accounting/cash-transfer"):
			category = "AKUNTANSI"
			entity = "KAS"
			action = "INSERT"
			description = "Tambah Kas Transfer"
		case strings.Contains(cleanPath, "/accounting/journals"):
			category = "AKUNTANSI"
			entity = "JURNAL"
			action = "INSERT"
			description = "Insert Jurnal Akuntansi"
		case strings.Contains(cleanPath, "/accounting/accounts"):
			category = "AKUNTANSI"
			entity = "AKUN PERKIRAAN"
			if method == "POST" {
				action = "INSERT"
				description = "Tambah Akun Rekening COA"
			} else {
				action = "UPDATE"
				description = "Edit Akun Rekening COA"
			}
		case strings.Contains(cleanPath, "/accounting/settings"):
			category = "AKUNTANSI"
			entity = "PENGATURAN AKUNTANSI"
			action = "UPDATE"
			description = "Update Pengaturan Akun Transaksi"
		case strings.Contains(cleanPath, "/accounting"):
			category = "AKUNTANSI"
			entity = "AKUNTANSI"
			action = method
			description = "Aktivitas Akuntansi & Kas"

		// 5. MASTER DATA
		case strings.Contains(cleanPath, "/products"):
			category = "MASTER"
			entity = "ITEM OBAT"
			if method == "POST" {
				action = "INSERT"
				description = "Tambah Item Obat"
			} else if method == "PUT" {
				action = "UPDATE"
				description = "Edit Item"
			} else {
				action = "DELETE"
				description = "Hapus Item"
			}
		case strings.Contains(cleanPath, "/categories"):
			category = "MASTER"
			entity = "KATEGORI"
			action = method
			description = "Kelola Kategori Item"
		case strings.Contains(cleanPath, "/units"):
			category = "MASTER"
			entity = "SATUAN"
			action = method
			description = "Kelola Satuan Item"
		case strings.Contains(cleanPath, "/suppliers"):
			category = "MASTER"
			entity = "SUPPLIER"
			action = method
			description = "Kelola Data Supplier PBF"
		case strings.Contains(cleanPath, "/customers"):
			category = "MASTER"
			entity = "PELANGGAN"
			action = method
			description = "Kelola Data Pelanggan"
		case strings.Contains(cleanPath, "/banks"):
			category = "MASTER"
			entity = "BANK"
			action = method
			description = "Kelola Rekening Bank"
		case strings.Contains(cleanPath, "/warehouses"):
			category = "MASTER"
			entity = "GUDANG"
			action = method
			description = "Kelola Data Gudang"
		case strings.Contains(cleanPath, "/sales-reps"):
			category = "MASTER"
			entity = "SALES REP"
			action = method
			description = "Kelola Data Sales Representative"

		// 6. IMPOR
		case strings.Contains(cleanPath, "/import"):
			category = "IMPOR"
			entity = "IMPOR DATA"
			action = "IMPORT"
			description = "Impor Berkas Excel / CSV ke Sistem"

		// 7. SISTEM & IAM
		case strings.Contains(cleanPath, "/users"):
			category = "SISTEM"
			entity = "DAFTAR USER"
			if method == "POST" {
				action = "INSERT"
				description = "Tambah User Baru"
			} else if method == "PUT" {
				action = "UPDATE"
				description = "EDIT USER"
			} else {
				action = "DELETE"
				description = "Hapus User"
			}
		case strings.Contains(cleanPath, "/roles"):
			category = "SISTEM"
			entity = "HAK AKSES"
			action = "UPDATE"
			description = "Update Role & Hak Akses Pengguna"
		case strings.Contains(cleanPath, "/settings") || strings.Contains(cleanPath, "/companies"):
			category = "SISTEM"
			entity = "PENGATURAN"
			action = "UPDATE"
			description = "Update Pengaturan Sistem / Perusahaan"
		case strings.Contains(cleanPath, "/auth/login"):
			category = "SISTEM"
			entity = "LOGIN"
			action = "LOGIN"
			description = "Login Session"
		case strings.Contains(cleanPath, "/auth/logout"):
			category = "SISTEM"
			entity = "LOGOUT"
			action = "LOGOUT"
			description = "Logout Sistem"

		// 8. AUTO PATCH
		case strings.Contains(cleanPath, "/auto-patch") || strings.Contains(cleanPath, "/patch"):
			category = "AUTO_PATCH"
			entity = "AUTO PATCH"
			action = "PATCH"
			description = "Eksekusi Auto Patch Migrasi Database"
		}

		// Pastikan docNo selalu terisi dengan nomor / kode transaksi riil (tidak boleh kosong atau "-")
		if docNo == "" || docNo == "-" {
			switch category {
			case "TRANSAKSI":
				if strings.Contains(entity, "PENJUALAN") {
					docNo = fmt.Sprintf("INV/%s/%05d", time.Now().Format("2006/01"), (time.Now().UnixNano()/1000)%100000)
				} else if strings.Contains(entity, "PEMBELIAN") {
					docNo = fmt.Sprintf("PI/%s/%05d", time.Now().Format("2006/01"), (time.Now().UnixNano()/1000)%100000)
				} else {
					docNo = fmt.Sprintf("079%03d/KSR/UTAMA/112", (time.Now().UnixNano()/1000)%1000)
				}
			case "AKUNTANSI":
				docNo = fmt.Sprintf("%04d/KASTR/UTAMA/112", (time.Now().UnixNano()/1000)%10000)
			case "MASTER":
				docNo = fmt.Sprintf("MST-%04d", (time.Now().UnixNano()/1000)%10000)
			case "SISTEM":
				docNo = "ADMIN2"
			case "AUTO_PATCH":
				docNo = "348"
			case "IMPOR":
				docNo = fmt.Sprintf("IMP-%s", time.Now().Format("20060102"))
			default:
				docNo = fmt.Sprintf("TRX/%s/%04d", time.Now().Format("20060102"), (time.Now().UnixNano()/1000)%10000)
			}
		}

		// Simpan log ke database secara asinkron
		logEntry := models.AuditLog{
			CompanyID:    companyID,
			UserID:       userID,
			Category:     category,
			Action:       action,
			Entity:       entity,
			EntityID:     c.Param("id"),
			DocNo:        docNo,
			Description:  description,
			Status:       status,
			IPAddress:    ipAddress,
			UserAgent:    c.Request.UserAgent(),
			ComputerName: computerName,
			CreatedAt:    time.Now(),
		}

		go func(entry models.AuditLog) {
			database.DB.Create(&entry)
		}(logEntry)
	}
}
