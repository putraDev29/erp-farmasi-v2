# Aplikasi Mobile ERP Farmasi PBF (Flutter)

Aplikasi mobile berbasis Flutter yang terintegrasi secara langsung (*real-time*) dengan backend **Ketoko ERP Farmasi v2**. Aplikasi ini dirancang khusus untuk dua pengguna utama:
1. **Pelanggan PBF (Apotek / RS / Klinik)**: Melakukan registrasi akun, pendaftaran sarana legal CDOB BPOM beserta upload dokumen persyaratan, pencarian & pemesanan obat langsung (*Marketplace Order*), serta pelacakan pengiriman obat.
2. **Petugas Gudang Farmasi**: Portal operasional gudang untuk memverifikasi penerimaan barang fisik dari distributor/PBF (*Inbound Receiving*) dan memproses surat jalan pengiriman obat ke apotek pelanggan (*Outbound Shipping*).

---

## Fitur Utama

### 1. Portal Pelanggan (Customer Self-Service)
- **Registrasi Akun Mandiri**: Pendaftaran akun apotek/klinik langsung dari mobile app (`POST /auth/register-customer`) yang secara otomatis membuat entitas pelanggan dengan status `Menunggu Verifikasi`.
- **Form Registrasi Sarana & Kepatuhan CDOB BPOM**:
  - Tipe Fasilitas Farmasi (Apotek, Rumah Sakit, Klinik, PBF Lain).
  - NIB (Nomor Induk Berusaha), SIA / Izin Operasional, NPWP Badan Usaha.
  - Legalitas APJ: Nama APJ, No. SIPA APJ, Tanggal Masa Berlaku SIPA, No. STRA, No. Kontak APJ.
- **Unggah Dokumen Legalitas CDOB**:
  - Upload file (PDF / JPG / PNG) untuk NIB, SIA, NPWP, SIPA, STRA, dan Surat Penunjukan APJ.
  - Terintegrasi langsung dengan modul Kepatuhan Dokumen CDOB BPOM di Web ERP Admin.
- **Katalog Obat & Pemesanan Langsung (Marketplace)**:
  - Pencarian obat, filter kategori & dosis.
  - Pengecekan stok fisik obat secara real-time.
  - Keranjang belanja multi-item.
  - Checkout pemesanan obat dengan nomor Surat Pesanan (SP) resmi apotek.
  - Pesanan otomatis masuk ke menu **Penjualan Marketplace** di web ERP.
- **Tracking Pesanan & Konfirmasi Penerimaan**:
  - Melacak status pesanan: `Pending`, `Diproses`, `Dikirim`, `Selesai`.
  - Pelanggan dapat mengonfirmasi obat telah diterima secara aman di sarana farmasi.

### 2. Portal Petugas Gudang (Warehouse Portal)
Hanya memiliki 2 menu utama sesuai alur operasional gudang farmasi:
- **Daftar Pembelian (Penerimaan Barang PBF)**:
  - Melihat faktur pembelian yang menunggu verifikasi gudang (`MENUNGGU_GUDANG`).
  - Pencatatan fisik barang: input nomor batch pabrik (*batch number*), tanggal kedaluwarsa (*expiry date*), dan nomor Surat Jalan distributor/PBF.
  - Verifikasi penerimaan barang yang mengubah status menjadi `VERIFIKASI_GUDANG` untuk diteruskan ke verifikasi akhir Admin APJ.
- **Daftar Penjualan (Pengiriman Barang ke Pelanggan)**:
  - Melihat pesanan pelanggan yang telah disetujui Admin.
  - Penerbitan No. Surat Jalan Pengiriman Apotek (`SJ/YYYY/MM/...`).
  - Input nama kurir / armada pengiriman dan catatan pengiriman.
  - Tombol **Kirim Barang** yang memotong kartu stok fisik secara otomatis (*Mutasi Keluar*) dan mengubah status pesanan menjadi `SHIPPED` / `Dikirim`.

---

## Struktur Folder Project

```text
mobile/
├── analysis_options.yaml
├── pubspec.yaml
├── README.md
└── lib/
    ├── main.dart                          # Inisialisasi provider & tema
    ├── config/
    │   ├── api_config.dart                # Konfigurasi endpoint & URL server (emulator/device)
    │   └── app_theme.dart                 # Skema warna Emerald Ketoko ERP Farmasi
    ├── models/
    │   ├── user_model.dart                # Model akun & role
    │   ├── customer_model.dart            # Model pelanggan & legalitas CDOB
    │   ├── product_model.dart             # Model master item & stok fisik
    │   ├── cart_item_model.dart           # Model item keranjang
    │   ├── sales_order_model.dart         # Model pesanan penjualan & status alur
    │   ├── purchase_model.dart            # Model faktur pembelian & penerimaan
    │   └── document_model.dart            # Model arsip berkas CDOB
    ├── services/
    │   ├── api_client.dart                # HTTP client, auth bearer token, multipart upload
    │   ├── auth_service.dart              # Login, register customer, get current user
    │   ├── product_service.dart           # Get catalog & live stock
    │   ├── customer_service.dart          # Update data usaha & legalitas
    │   ├── order_service.dart             # Create marketplace order, get order list
    │   ├── warehouse_service.dart         # Receive purchase invoice & ship sales orders
    │   └── document_service.dart          # Get customer docs & upload multipart
    ├── providers/
    │   ├── auth_provider.dart             # Session state & role check (isGudang / isPelanggan)
    │   ├── cart_provider.dart             # Keranjang belanja state & kalkulasi subtotal
    │   ├── catalog_provider.dart          # State obat & search filter
    │   └── warehouse_provider.dart        # State inbound purchase & outbound shipment
    ├── widgets/
    │   ├── custom_button.dart             # Button konsisten sesuai UI
    │   ├── custom_text_field.dart          # Input field form
    │   ├── product_card.dart              # Card obat katalog
    │   └── status_badge.dart              # Badge status alur farmasi (disetujui, dikirim, dll)
    └── screens/
        ├── splash_screen.dart             # Auto-routing berdasarkan session & role
        ├── auth/
        │   ├── login_screen.dart          # Login pelanggan & gudang
        │   └── register_screen.dart       # Registrasi pelanggan baru
        ├── customer/
        │   ├── customer_main_screen.dart  # Bottom navigation portal pelanggan
        │   ├── catalog_screen.dart        # Katalog obat & tambah keranjang
        │   ├── cart_screen.dart           # Keranjang & ringkasan belanja
        │   ├── checkout_order_screen.dart # Form checkout & nomor SP apotek
        │   ├── order_history_screen.dart  # Riwayat & status pesanan
        │   ├── order_detail_screen.dart   # Detail pesanan & konfirmasi terima
        │   ├── business_registration_screen.dart # Form registrasi sarana & legalitas CDOB
        │   └── document_upload_screen.dart       # Unggah berkas NIB, SIA, NPWP, SIPA, STRA
        └── warehouse/
            ├── warehouse_main_screen.dart        # Tab navigation portal gudang (2 menu)
            ├── purchase_receive_list_screen.dart # List faktur pembelian menunggu terima
            ├── purchase_receive_detail_screen.dart# Verifikasi fisik, batch, ED, SJ PBF
            ├── sales_shipment_list_screen.dart    # List pesanan siap kirim
            └── sales_shipment_detail_screen.dart  # Form surat jalan, kurir & tombol kirim
```

---

## Petunjuk Menjalankan Aplikasi

### 1. Prasyarat
- Pastikan Flutter SDK (>= 3.0.0) sudah terpasang di komputer pengembang.
- Backend Go ERP Farmasi aktif berjalan di port `8080` (`http://localhost:8080`).

### 2. Instalasi Dependensi
Jalankan perintah berikut di folder `mobile/`:
```bash
cd mobile
flutter pub get
```

### 3. Konfigurasi Alamat Host API (`lib/config/api_config.dart`)
Sesuaikan base URL API dengan target pengujian:
- **Android Emulator**: Gunakan `http://10.0.2.2:8080/api/v1` (sudah disetel secara otomatis di `ApiConfig.baseUrl`).
- **iOS Simulator / Desktop**: Gunakan `http://localhost:8080/api/v1`.
- **Perangkat Fisik HP (WiFi LAN yang sama)**:
  Ganti `baseUrl` di `lib/config/api_config.dart` dengan alamat IP lokal komputer host Anda, misalnya:
  ```dart
  static const String baseUrl = 'http://192.168.1.100:8080/api/v1';
  ```

### 4. Menjalankan Aplikasi
```bash
# Menjalankan di perangkat emulator / USB terhubung:
flutter run
```

---

## Akun Pengujian Siap Pakai

| Peran | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Pelanggan Apotek** | `apotek_mitra` | `password123` | Otomatis masuk ke Portal Pelanggan (Katalog Obat, Keranjang, Registrasi Usaha & Upload Berkas CDOB). Anda juga dapat mendaftar akun baru lewat tombol Registrasi di aplikasi. |
| **Petugas Gudang** | `gudang` | `password123` | Otomatis masuk ke Portal Gudang dengan 2 menu: **Penerimaan Pembelian** dan **Pengiriman Penjualan**. |
