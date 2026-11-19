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
	{"Penjualan", "Modul Penjualan & Kasir : Bisa Jual di bawah Keuntungan Minimal (Aktif sesuai Pengaturan Umum : Tampil Konfirmasi Harga Jual lebih Kecil dari Harga Pokok)", false, false, false, false, false},
	{"Penjualan", "Modul Penjualan & Kasir : Bisa Jual di bawah Harga Pokok (Aktif sesuai Pengaturan Umum : Tampil Konfirmasi Harga Jual lebih Kecil dari Harga Pokok)", false, false, false, false, false},
	{"Penjualan", "Modul Kasir : Aktif Pending Kasir", false, false, false, false, false},
	{"Penjualan", "Kas Laci", false, false, true, false, false},
	{"Penjualan", "Kunci Tgl Modul Daftar Penjualan, Kasir & Tombol Laporan Daftar Kasir : Tanggal hanya bisa 1 hari", false, false, false, false, false},
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

	// 7. Laporan
	{"Laporan", "Daftar Item", false, false, false, false, false},
	{"Laporan", "Daftar Suplier", false, false, false, false, false},
	{"Laporan", "Daftar Pelanggan", false, false, false, false, false},
	{"Laporan", "Daftar Sales", false, false, false, false, false},
	{"Laporan", "Laporan Pesanan Pembelian", false, false, false, false, false},
	{"Laporan", "Laporan Pembelian", false, false, false, false, false},
	{"Laporan", "Laporan Retur Pembelian", false, false, false, false, false},
	{"Laporan", "Laporan Pembelian per Item", false, false, false, false, false},
	{"Laporan", "Laporan Pesanan Penjualan", false, false, false, false, false},
	{"Laporan", "Laporan Pesanan Penjualan Per Item", false, false, false, false, false},
	{"Laporan", "Laporan Penjualan", false, false, false, false, false},
	{"Laporan", "Laporan Retur Penjualan", false, false, false, false, false},
	{"Laporan", "Laporan Penjualan per Item", false, false, false, false, false},
	{"Laporan", "Laporan Retur Penjualan per Item", false, false, false, false, false},
	{"Laporan", "Laporan Penjualan per Supplier", false, false, false, false, false},
	{"Laporan", "Laporan Komisi Sales", false, false, false, false, false},
	{"Laporan", "Laporan Pembayaran Kartu Bayar", false, false, false, false, false},
	{"Laporan", "Laporan Grafik Penjualan Item Terbaik", false, false, false, false, false},
	{"Laporan", "Laporan Grafik Penjualan Harian", false, false, false, false, false},
	{"Laporan", "Laporan Grafik Penjualan Bulanan", false, false, false, false, false},
	{"Laporan", "Laporan Grafik Kedatangan Pelanggan", false, false, false, false, false},
	{"Laporan", "Laporan Penjualan Per Wilayah Pelanggan", false, false, false, false, false},
	{"Laporan", "Laporan Point Pelanggan", false, false, false, false, false},
	{"Laporan", "Laporan Pesanan Perakitan", false, false, false, false, false},
	{"Laporan", "Laporan Proses Perakitan", false, false, false, false, false},
	{"Laporan", "Laporan Proses Jadi", false, false, false, false, false},
	{"Laporan", "Laporan Proses Perakitan Per Item", false, false, false, false, false},
	{"Laporan", "Laporan Proses Jadi Perakitan Per Item", false, false, false, false, false},
	{"Laporan", "Laporan Hutang Beredar", false, false, false, false, false},
	{"Laporan", "Laporan Umur Hutang", false, false, false, false, false},
	{"Laporan", "Laporan Buku Bantu Hutang", false, false, false, false, false},
	{"Laporan", "Laporan Mutasi Hutang", false, false, false, false, false},
	{"Laporan", "Laporan Buku Hutang Per Transaksi", false, false, false, false, false},
	{"Laporan", "Laporan Pembayaran Hutang", false, false, false, false, false},
	{"Laporan", "Laporan Piutang Beredar", false, false, false, false, false},
	{"Laporan", "Laporan Piutang Per Sales", false, false, false, false, false},
	{"Laporan", "Laporan Piutang Per Wilayah", false, false, false, false, false},
	{"Laporan", "Laporan Umur Piutang", false, false, false, false, false},
	{"Laporan", "Laporan Buku Pembantu Piutang", false, false, false, false, false},
	{"Laporan", "Laporan Mutasi Piutang", false, false, false, false, false},
	{"Laporan", "Laporan Pembayaran Piutang", false, false, false, false, false},
	{"Laporan", "Laporan Kartu Stok", false, false, false, false, false},
	{"Laporan", "Laporan Item Masuk", false, false, false, false, false},
	{"Laporan", "Laporan Item Keluar", false, false, false, false, false},
	{"Laporan", "Laporan Transfer Item", false, false, false, false, false},
	{"Laporan", "Laporan Penyesuaian / Opname", false, false, false, false, false},
	{"Laporan", "Laporan Nilai Persediaan", false, false, false, false, false},
	{"Laporan", "Laporan Obat Kadaluarsa (ED)", false, false, false, false, false},
	{"Laporan", "Laporan Kas Masuk", false, false, false, false, false},
	{"Laporan", "Laporan Kas Keluar", false, false, false, false, false},
	{"Laporan", "Laporan Kas Transfer", false, false, false, false, false},
	{"Laporan", "Laporan Jurnal Umum", false, false, false, false, false},
	{"Laporan", "Laporan Buku Besar Akuntansi", false, false, false, false, false},
	{"Laporan", "Laporan Neraca Saldo", false, false, false, false, false},
	{"Laporan", "Laporan Laba Rugi", false, false, false, false, false},
	{"Laporan", "Laporan Neraca Standar", false, false, false, false, false},
	{"Laporan", "Laporan Arus Kas", false, false, false, false, false},
	{"Laporan", "Laporan Audit Trail BPOM", false, false, false, false, false},
	{"Laporan", "Laporan Log Aktivitas User", false, false, false, false, false},
	{"Laporan", "Laporan Ringkasan Eksekutif", false, false, false, false, false},

	// 8. Tampilan Menu
	{"Tampilan Menu", "Menu Master Data", false, false, false, false, false},
	{"Tampilan Menu", "Menu Pembelian", false, false, false, false, false},
	{"Tampilan Menu", "Menu Penjualan", false, false, false, false, false},
	{"Tampilan Menu", "Menu Perakitan", false, false, false, false, false},
	{"Tampilan Menu", "Menu Persediaan", false, false, false, false, false},
	{"Tampilan Menu", "Menu Akuntansi", false, false, false, false, false},
	{"Tampilan Menu", "Menu Laporan", false, false, false, false, false},
	{"Tampilan Menu", "Menu Pengaturan", false, false, false, false, false},
	{"Tampilan Menu", "Menu E-commerce", false, false, false, false, false},

	// 9. Pengaturan Lainnya
	{"Pengaturan Lainnya", "Pengaturan Umum", false, true, false, false, false},
	{"Pengaturan Lainnya", "Pengaturan Perusahaan", false, true, false, false, false},
	{"Pengaturan Lainnya", "Pengaturan Mini Printer", false, true, false, false, false},
	{"Pengaturan Lainnya", "Setting Nomor Transaksi", false, true, false, false, false},
	{"Pengaturan Lainnya", "Setting Nomor Master", false, true, false, false, false},
	{"Pengaturan Lainnya", "Log Aktivitas User", false, false, true, false, false},
	{"Pengaturan Lainnya", "Daftar Modul Terbuka", false, false, true, false, false},
	{"Pengaturan Lainnya", "Import Data Master & Item", true, false, false, false, false},
	{"Pengaturan Lainnya", "Pengaturan Database (Backup & Restore)", true, false, false, false, false},
	{"Pengaturan Lainnya", "Informasi Sistem & Lisensi", false, false, false, false, false},

	// 10. Pengaturan E-commerce
	{"Pengaturan E-commerce", "Koneksi Tokopedia", false, true, false, false, false},
	{"Pengaturan E-commerce", "Koneksi Shopee", false, true, false, false, false},
	{"Pengaturan E-commerce", "Koneksi TikTok Shop", false, true, false, false, false},
	{"Pengaturan E-commerce", "Koneksi Blibli", false, true, false, false, false},
	{"Pengaturan E-commerce", "Koneksi Lazada", false, true, false, false, false},
	{"Pengaturan E-commerce", "Sinkronisasi Stok Otomatis", false, true, false, false, false},
	{"Pengaturan E-commerce", "Sinkronisasi Pesanan Masuk", false, true, false, false, false},

	// 11. Notifikasi
	{"Notifikasi", "Notifikasi Stok Minimum Obat", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Obat Mendekati Expired (ED)", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Jatuh Tempo Pembayaran Hutang Supplier", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Jatuh Tempo Tagihan Piutang Pelanggan", false, false, false, false, false},
	{"Notifikasi", "Notifikasi Pesanan Penjualan Baru Masuk", false, false, false, false, false},
}

// EnsureDefaultRolePermissions creates default module permissions for a role
func EnsureDefaultRolePermissions(roleID uuid.UUID, roleName string) []models.RoleModulePermission {
	var count int64
	database.DB.Model(&models.RoleModulePermission{}).Where("role_id = ?", roleID).Count(&count)
	if count > 0 {
		var list []models.RoleModulePermission
		database.DB.Where("role_id = ?", roleID).Order("category ASC, id ASC").Find(&list)
		return list
	}

	isAdmin := strings.ToUpper(roleName) == "ADMINISTRATOR" || strings.ToUpper(roleName) == "SUPERADMIN"
	isKasir := strings.ToUpper(roleName) == "KASIR"

	var perms []models.RoleModulePermission
	for _, def := range DefaultModules {
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
			// Kasir default access: Penjualan, Kasir, Cek Point, Pelanggan, etc.
			if def.Category == "Penjualan" {
				p.CanOpen = true
				if def.Module == "Penjualan" || def.Module == "Pesanan Penjualan" {
					p.CanCreate = true
					p.CanEdit = true
				}
			} else if def.Category == "Master Data" && (def.Module == "Daftar Item" || def.Module == "Pelanggan" || def.Module == "Kartu Stok") {
				p.CanOpen = true
			} else if def.Category == "Laporan" && (def.Module == "Laporan Penjualan" || def.Module == "Laporan Grafik Penjualan Harian") {
				p.CanOpen = true
			} else if def.Category == "Tampilan Menu" {
				if def.Module == "Menu Penjualan" || def.Module == "Menu Master Data" || def.Module == "Menu Laporan" {
					p.CanOpen = true
				}
			}
		}

		perms = append(perms, p)
	}

	if len(perms) > 0 {
		database.DB.Create(&perms)
	}
	return perms
}
