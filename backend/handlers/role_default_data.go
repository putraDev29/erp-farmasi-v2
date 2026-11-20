package handlers

import (
	"strings"

	"farmasi/backend/database"
	"farmasi/backend/models"

	"github.com/google/uuid"
)

type DefaultModuleDef struct {
	Category              string
	Module                string
	HasCreate             bool
	HasEdit               bool
	HasDelete             bool
	HasLockTx             bool
	HasLockDate           bool
}

var DefaultModules = []DefaultModuleDef{
	// 1. Master Data
	{"Master Data", "Item Baru", true, true, true, false, false},
	{"Master Data", "Daftar Item", true, true, true, false, false},
	{"Master Data", "Katalog Item", true, true, true, false, false},
	{"Master Data", "Kartu Stok", true, true, true, false, false},
	{"Master Data", "Supplier", true, true, true, false, false},
	{"Master Data", "Pelanggan", true, true, true, false, false},
	{"Master Data", "Sales", true, true, true, false, false},
	{"Master Data", "Satuan", true, true, true, false, false},
	{"Master Data", "Jenis", true, true, true, false, false},
	{"Master Data", "Gudang", true, true, true, false, false},
	{"Master Data", "Merek", true, true, true, false, false},
	{"Master Data", "Ongkir", true, true, true, false, false},
	{"Master Data", "Emoney", true, true, true, false, false},
	{"Master Data", "Grup Pelanggan", true, true, true, false, false},
	{"Master Data", "Wilayah dan Sub Wilayah", true, true, true, false, false},
	{"Master Data", "Diskon Periode", true, true, true, false, false},
	{"Master Data", "Periode Promosi", true, true, true, false, false},
	{"Master Data", "User Bisa Ubah Satuan Item", false, false, false, false, false},
	{"Master Data", "User Bisa Ubah Serial Item", false, false, false, false, false},
	{"Master Data", "Periode Tebus Murah (Total Belanja)", true, true, true, false, false},

	// 2. Pembelian
	{"Pembelian", "Pesanan Pembelian", true, true, true, true, true},
	{"Pembelian", "Pembelian", true, true, true, true, true},
	{"Pembelian", "Bayar Hutang", true, true, true, true, true},
	{"Pembelian", "Retur Beli", true, true, true, true, true},
	{"Pembelian", "History Harga Beli", true, true, true, true, true},
	{"Pembelian", "Ubah Harga Jual saat Pembelian dan Pesanan Pembelian", false, false, false, false, false},
	{"Pembelian", "Tampil Harga Pokok pada Pencarian Item Pembelian", false, false, false, false, false},

	// 3. Penjualan
	{"Penjualan", "Pesanan Penjualan", true, true, true, true, true},
	{"Penjualan", "Penjualan", true, true, true, true, true},
	{"Penjualan", "Bayar Piutang", true, true, true, true, true},
	{"Penjualan", "Retur Jual", true, true, true, true, true},
	{"Penjualan", "Bayar Komisi Sales", true, true, true, true, true},
	{"Penjualan", "Cek Point", false, false, true, false, false},
	{"Penjualan", "Modul Cek Point, Penjualan & Kasir : Aktif Ambil Point", false, false, false, false, false},
	{"Penjualan", "Aktif Potongan pada Pesanan Jual, Penjualan & Kasir", false, false, false, false, false},
	{"Penjualan", "Aktif Harga pada Pesanan Jual, Penjualan & Kasir", false, false, false, false, false},
	{"Penjualan", "History Harga Jual", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Bisa Cetak Laporan Kasir", false, false, false, false, false},
	{"Penjualan", "Bisa Jual di bawah Keuntungan Minimal (Sesuai Pengaturan Umum)", false, false, false, false, false},
	{"Penjualan", "Bisa Jual di bawah Harga Pokok (Sesuai Pengaturan Umum)", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Aktif Pending Kasir", false, false, false, false, false},
	{"Penjualan", "Kas Laci", false, false, true, false, false},
	{"Penjualan", "Kunci Tanggal Penjualan & Kasir (Hanya 1 Hari)", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Aktif Pembayaran Kredit", false, false, false, false, false},
	{"Penjualan", "Bisa batal, menghapus detail item & transaksi pada Penjualan & Kasir", false, false, false, false, false},
	{"Penjualan", "Pesanan Marketplace", false, true, false, false, false},
	{"Penjualan", "History Pesanan Marketplace", false, false, false, false, false},
	{"Penjualan", "Modul Pesanan Penjualan : Cetak Mengikuti Mode Printer pada Pengaturan Mini Printer", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Harus Cetak Struk/Nota (Simpan+Cetak)", false, false, false, false, false},
	{"Penjualan", "Terminal Harga", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Bisa menutup modul kasir (Desktop)", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Kunci Kolom Pelanggan", false, false, false, false, false},

	// 4. Perakitan
	{"Perakitan", "Pesanan Perakitan", true, true, true, true, true},
	{"Perakitan", "Perakitan", true, true, true, true, true},
	{"Perakitan", "Proses Jadi", true, true, true, true, true},
	{"Perakitan", "Perakitan : Dapat melihat data komponen item rakitan", false, false, false, false, false},

	// 5. Persediaan
	{"Persediaan", "Item Masuk", true, true, true, true, true},
	{"Persediaan", "Item Keluar", true, true, true, true, true},
	{"Persediaan", "Pesanan Transfer Item", true, true, true, true, true},
	{"Persediaan", "Transfer Item", true, true, true, true, true},
	{"Persediaan", "Saldo Awal Item", true, true, true, false, false},
	{"Persediaan", "Stok Opname", false, false, false, false, true},
	{"Persediaan", "Tampil Harga Pokok pada Item Masuk", false, false, false, false, false},
	{"Persediaan", "Koreksi Nilai Persediaan", false, false, false, false, true},

	// 6. Akuntansi
	{"Akuntansi", "Perkiraan", true, true, true, true, true},
	{"Akuntansi", "Kas Masuk", true, true, true, true, true},
	{"Akuntansi", "Kas Keluar", true, true, true, true, true},
	{"Akuntansi", "Kas Transfer", true, true, true, true, true},
	{"Akuntansi", "Deposit Pelanggan", true, true, true, true, true},
	{"Akuntansi", "Deposit Supplier", true, true, true, true, true},
	{"Akuntansi", "Deposit Saldo", false, false, false, false, false},
	{"Akuntansi", "Jurnal", true, true, true, true, true},
	{"Akuntansi", "Buku Besar", false, false, false, false, false},
	{"Akuntansi", "Saldo Awal Akuntansi", false, false, false, false, false},
	{"Akuntansi", "Setting Akun", false, false, false, false, false},
	{"Akuntansi", "Proses Tahun", false, false, false, false, false},
	{"Akuntansi", "Proses Penyusutan", false, false, true, false, true},
	{"Akuntansi", "Grup Aset", false, false, false, false, false},
	{"Akuntansi", "Data Aset", true, true, true, false, false},
	{"Akuntansi", "Modul Kas : Tidak dapat mengeluarkan Kas jika saldo kurang/minus", false, false, false, false, false},
	{"Akuntansi", "Catatan Transaksi", true, true, true, false, false},

	// 7. Laporan (Screenshots 1 & 3)
	{"Laporan", "Laporan Buku Piutang Per Transaksi", false, false, false, false, false},
	{"Laporan", "Laporan Pembayaran Piutang", false, false, false, false, false},
	{"Laporan", "Laporan Item Masuk", false, false, false, false, false},
	{"Laporan", "Laporan Item Keluar", false, false, false, false, false},
	{"Laporan", "Laporan Item Opname", false, false, false, false, false},
	{"Laporan", "Laporan Item Transfer", false, false, false, false, false},
	{"Laporan", "Laporan Mutasi Item", false, false, false, false, false},
	{"Laporan", "Laporan Item Tidak Laku", false, false, false, false, false},
	{"Laporan", "Laporan Pesanan Item Transfer", false, false, false, false, false},
	{"Laporan", "Laporan Item Serial", false, false, false, false, false},
	{"Laporan", "Laporan Serial History", false, false, false, false, false},
	{"Laporan", "Daftar Perkiraan", false, false, false, false, false},
	{"Laporan", "Laporan Kas Masuk", false, false, false, false, false},
	{"Laporan", "Laporan Kas Keluar", false, false, false, false, false},
	{"Laporan", "Laporan Kas Transfer", false, false, false, false, false},
	{"Laporan", "Laporan Deposit Pelanggan", false, false, false, false, false},
	{"Laporan", "Laporan Deposit Supplier", false, false, false, false, false},
	{"Laporan", "Laporan Laba Jual", false, false, false, false, false},
	{"Laporan", "Laporan Analisa Laba Jual", false, false, false, false, false},
	{"Laporan", "Laporan Daftar Jurnal", false, false, false, false, false},
	{"Laporan", "Laporan Jurnal Tidak Seimbang", false, false, false, false, false},
	{"Laporan", "Laporan Buku Besar", false, false, false, false, false},
	{"Laporan", "Laporan Neraca Saldo", false, false, false, false, false},
	{"Laporan", "Laporan Neraca Lajur", false, false, false, false, false},
	{"Laporan", "Laporan Neraca", false, false, false, false, false},
	{"Laporan", "Laporan Laba/Rugi", false, false, false, false, false},
	{"Laporan", "Laporan Laba/Rugi YTD", false, false, false, false, false},
	{"Laporan", "Laporan Daftar Aset", false, false, false, false, false},
	{"Laporan", "Laporan Penyusutan", false, false, false, false, false},
	{"Laporan", "Laporan Grafik Kas", false, false, false, false, false},

	// 8. Tampilan Menu (Screenshot 4)
	{"Tampilan Menu", "Tampil Menu Master", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Pembelian", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Penjualan", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Perakitan", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Persediaan", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Akuntansi", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Laporan", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Pengaturan", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Menu Pengaturan E-commerce", false, false, false, false, false},
	{"Tampilan Menu", "Tampil Grafik Pada Dashboard", false, false, false, false, false},
	{"Tampilan Menu", "Langsung Tampil Modul Kasir", false, false, false, false, false},
	{"Tampilan Menu", "Langsung Tampil Terminal Harga", false, false, false, false, false},

	// 9. Pengaturan Lainnya (Screenshot 8)
	{"Pengaturan Lainnya", "Kunci Ubah Akun Transaksi", false, false, false, false, false},
	{"Pengaturan Lainnya", "User Manajemen", false, false, true, false, false},
	{"Pengaturan Lainnya", "Data Perusahaan", false, false, false, false, false},
	{"Pengaturan Lainnya", "Pengaturan Umum", false, false, false, false, false},
	{"Pengaturan Lainnya", "Pengaturan Nomor Transaksi dan Master", false, false, false, false, false},
	{"Pengaturan Lainnya", "Import Data", false, false, false, false, false},
	{"Pengaturan Lainnya", "Tampil Stok pada Semua modul Pencarian Item", false, false, false, false, false},
	{"Pengaturan Lainnya", "Restore Database", false, false, false, false, false},
	{"Pengaturan Lainnya", "Stok Minimum", false, false, false, false, false},
	{"Pengaturan Lainnya", "User Bisa Akses Dept/Gudang Lain", false, false, false, false, false},
	{"Pengaturan Lainnya", "Akses Log Aktivitas", false, false, true, false, false},
	{"Pengaturan Lainnya", "Akses Tombol Buka Transaksi", false, false, false, false, false},
	{"Pengaturan Lainnya", "Akses Daftar Modul Terbuka", false, false, true, false, false},
	{"Pengaturan Lainnya", "Setting Payment Gateway (E-Money)", false, false, false, false, false},
	{"Pengaturan Lainnya", "Setting PPOB (Pulsa, Listrik, dan lainnya)", false, false, false, false, false},
	{"Pengaturan Lainnya", "Setting Marketplace (Omnichannel)", false, false, false, false, false},
	{"Pengaturan Lainnya", "Setting API Sistem", false, false, false, false, false},
	{"Pengaturan Lainnya", "Riwayat Serial", false, false, false, false, false},

	// 10. Pengaturan E-commerce (Screenshot 9)
	{"Pengaturan E-commerce", "Share Info", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Content", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Banner", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Top Collection", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Label", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Special Product", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Blog", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Kategori", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Special Merek", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Service", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Item", false, false, false, false, false},
	{"Pengaturan E-commerce", "Share Subscriber", false, false, false, false, false},

	// 11. Notifikasi (Screenshot 2)
	{"Notifikasi", "Notifikasi Pembelian", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Hutang", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Order Jual", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Jual", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Piutang", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Kas Masuk", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Kas Keluar", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Verifikasi Pelanggan", false, false, false, false, false},
}

// EnsureDefaultRolePermissions creates default module permissions for a role
func EnsureDefaultRolePermissions(roleID uuid.UUID, roleName string) []models.RoleModulePermission {
	var existing []models.RoleModulePermission
	database.DB.Where("role_id = ?", roleID).Find(&existing)

	existingMap := make(map[string]bool)
	for _, p := range existing {
		existingMap[p.Category+"::"+p.Module] = true
	}

	isAdmin := strings.ToUpper(roleName) == "ADMINISTRATOR" || strings.ToUpper(roleName) == "SUPERADMIN"
	isKasir := strings.ToUpper(roleName) == "KASIR"

	var missing []models.RoleModulePermission
	for _, def := range DefaultModules {
		key := def.Category + "::" + def.Module
		if !existingMap[key] {
			p := models.RoleModulePermission{
				RoleID:   roleID,
				Category: def.Category,
				Module:   def.Module,
			}
			if isAdmin {
				p.CanOpen = true
				p.CanCreate = def.HasCreate
				p.CanEdit = def.HasEdit
				p.CanDelete = def.HasDelete
				p.LockTransactionNumber = def.HasLockTx
				p.LockDate = def.HasLockDate
			} else if isKasir {
				if def.Category == "Penjualan" {
					p.CanOpen = true
					if def.Module == "Penjualan" || def.Module == "Pesanan Penjualan" {
						p.CanCreate = true
						p.CanEdit = true
					}
				} else if def.Category == "Master Data" && (def.Module == "Daftar Item" || def.Module == "Pelanggan" || def.Module == "Kartu Stok") {
					p.CanOpen = true
				} else if def.Category == "Laporan" && (def.Module == "Laporan Laba Jual" || def.Module == "Laporan Mutasi Item") {
					p.CanOpen = true
				} else if def.Category == "Tampilan Menu" {
					if def.Module == "Tampil Menu Penjualan" || def.Module == "Tampil Menu Master" || def.Module == "Tampil Menu Laporan" {
						p.CanOpen = true
					}
				}
			}
			missing = append(missing, p)
		}
	}

	if len(missing) > 0 {
		database.DB.Create(&missing)
	}

	var finalList []models.RoleModulePermission
	database.DB.Where("role_id = ?", roleID).Order("category ASC, id ASC").Find(&finalList)
	return finalList
}
