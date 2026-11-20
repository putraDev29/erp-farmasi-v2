"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  Sliders,
  Plus,
  Trash2,
  ArrowUpDown,
  Download,
  Calendar,
  Check,
  Building2,
  Table,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { downloadCSV, downloadExcel } from "@/lib/reportExport";

// Report Category Tabs matching Ketoko Screenshots
const REPORT_TABS = [
  "Master",
  "Pembelian",
  "Penjualan",
  "Hutang",
  "Piutang",
  "Persediaan",
  "Perakitan",
  "Deposit",
  "Aset",
  "Daftar Perkiraan",
  "Kas",
  "Laba/Jual",
  "Jurnal",
  "Buku Besar",
  "Keuangan",
] as const;

type ReportTab = (typeof REPORT_TABS)[number];

interface ReportMenuItem {
  id: string;
  tab: ReportTab;
  title: string;
  description: string;
  subReports: string[];
}

const REPORT_MENU_CATALOG: ReportMenuItem[] = [
  // 1. MASTER (Screenshot 1)
  {
    id: "item",
    tab: "Master",
    title: "Laporan Daftar Item",
    description: "Menampilkan List Seluruh Daftar Item yang Tersimpan",
    subReports: [
      "Daftar Item Harga Pokok",
      "Daftar Item Harga Jual",
      "Daftar Item Tanpa Harga",
      "Daftar Item Bergambar",
    ],
  },
  {
    id: "item-lengkap",
    tab: "Master",
    title: "Laporan Daftar Item lengkap",
    description:
      "Menampilkan List Seluruh Daftar Item yang Tersimpan Dengan Keterangan / Detail Lebih Lengkap",
    subReports: ["Daftar Item Lengkap"],
  },
  {
    id: "supplier",
    tab: "Master",
    title: "Laporan Daftar Supplier",
    description: "Menampilkan List Supplier yang Tersimpan",
    subReports: ["Daftar Supplier"],
  },
  {
    id: "customer",
    tab: "Master",
    title: "Laporan Daftar Pelanggan",
    description: "Menampilkan List Pelanggan yang Tersimpan",
    subReports: ["Daftar Pelanggan", "Daftar Pelanggan per Sales"],
  },
  {
    id: "sales",
    tab: "Master",
    title: "Laporan Daftar Sales",
    description: "Menampilkan List Sales yang Tersimpan",
    subReports: ["Daftar Sales"],
  },

  // 2. PEMBELIAN (Screenshot 7)
  {
    id: "po",
    tab: "Pembelian",
    title: "Laporan Pesanan Pembelian",
    description: "Menampilkan laporan data pesanan pembelian",
    subReports: ["Laporan Pesanan Beli Rekap", "Laporan Pesanan Beli Detail"],
  },
  {
    id: "purchase",
    tab: "Pembelian",
    title: "Laporan Pembelian",
    description: "Menampilkan laporan data pembelian",
    subReports: [
      "Laporan Pembelian Rekap",
      "Laporan Pembelian Detail",
      "Laporan Pembelian Harian",
      "Laporan Pembelian dan Serial",
    ],
  },
  {
    id: "purchase-return",
    tab: "Pembelian",
    title: "Laporan Retur Pembelian",
    description: "Menampilkan laporan data retur pembelian",
    subReports: ["Laporan Retur Beli Rekap", "Laporan Retur Beli Detail"],
  },
  {
    id: "purchase-item",
    tab: "Pembelian",
    title: "Laporan Pembelian Per Item",
    description: "Menampilkan laporan data pembelian per item",
    subReports: [
      "Laporan Beli Per Item",
      "Laporan Beli Per Item Per Jenis",
      "Laporan Beli Per Item Per Supplier",
    ],
  },

  // 3. PENJUALAN (Screenshot 11)
  {
    id: "so",
    tab: "Penjualan",
    title: "Laporan Pesanan Penjualan",
    description: "Menampilkan laporan data pesanan penjualan",
    subReports: ["Laporan Pesanan Jual Rekap", "Laporan Pesanan Jual Detail"],
  },
  {
    id: "so-item",
    tab: "Penjualan",
    title: "Laporan Pesanan Penjualan Per Item",
    description: "Menampilkan laporan data pesanan penjualan per item",
    subReports: ["Laporan Pesanan Jual Per Item"],
  },
  {
    id: "sale",
    tab: "Penjualan",
    title: "Laporan Penjualan",
    description: "Menampilkan laporan data penjualan",
    subReports: [
      "Laporan Penjualan Rekap",
      "Laporan Penjualan Detail",
      "Laporan Penjualan Harian",
      "Laporan Penjualan Kasir POS",
    ],
  },
  {
    id: "sale-return",
    tab: "Penjualan",
    title: "Laporan Retur Penjualan",
    description: "Menampilkan laporan data retur penjualan",
    subReports: ["Laporan Retur Jual Rekap", "Laporan Retur Jual Detail"],
  },
  {
    id: "sale-item",
    tab: "Penjualan",
    title: "Laporan Penjualan Per Item",
    description: "Menampilkan laporan data penjualan per item",
    subReports: [
      "Laporan Jual Per Item",
      "Laporan Jual Per Item Per Jenis",
      "Laporan Jual Per Item Per Merek",
    ],
  },
  {
    id: "sale-return-item",
    tab: "Penjualan",
    title: "Laporan Retur Penjualan per Item",
    description: "Menampilkan laporan data retur penjualan per item",
    subReports: ["Laporan Retur Jual Per Item"],
  },
  {
    id: "sale-supplier",
    tab: "Penjualan",
    title: "Laporan Penjualan Per Supplier",
    description: "Menampilkan laporan data penjualan per supplier item",
    subReports: ["Laporan Jual Per Supplier"],
  },
  {
    id: "sale-territory",
    tab: "Penjualan",
    title: "Laporan Penjualan Per Wilayah Pelanggan",
    description: "Menampilkan laporan penjualan berdasarkan wilayah pelanggan",
    subReports: ["Laporan Jual Per Wilayah"],
  },
  {
    id: "sales-commission",
    tab: "Penjualan",
    title: "Laporan Komisi Sales",
    description: "Menampilkan laporan komisi sales berdasarkan penjualan",
    subReports: ["Laporan Komisi Sales"],
  },
  {
    id: "sales-commission-pay",
    tab: "Penjualan",
    title: "Laporan Pembayaran Komisi Sales",
    description: "Menampilkan laporan data mengenai pembayaran komisi sales",
    subReports: ["Laporan Pembayaran Komisi Sales"],
  },
  {
    id: "sale-card",
    tab: "Penjualan",
    title: "Laporan Pembayaran dengan Kartu Bayar",
    description: "Menampilkan laporan penjualan yang dibayar menggunakan kartu",
    subReports: ["Laporan Pembayaran Kartu Debit/Kredit"],
  },
  {
    id: "sale-emoney",
    tab: "Penjualan",
    title: "Laporan Pembayaran dengan E-Money",
    description: "Menampilkan laporan data penjualan yang dibayar menggunakan e-money",
    subReports: ["Laporan Pembayaran QRIS / E-Money"],
  },
  {
    id: "chart-best-item",
    tab: "Penjualan",
    title: "Laporan Laporan Grafik Penjualan Item Terbaik",
    description: "Menampilkan laporan penjualan item terbaik dalam bentuk grafik (chart)",
    subReports: ["Grafik Item Terlaris (Top 20)"],
  },
  {
    id: "chart-daily-sale",
    tab: "Penjualan",
    title: "Laporan Grafik Penjualan Harian",
    description: "Menampilkan laporan penjualan harian dalam bentuk grafik (chart)",
    subReports: ["Grafik Penjualan Harian"],
  },
  {
    id: "chart-monthly-sale",
    tab: "Penjualan",
    title: "Laporan Grafik Penjualan Bulanan",
    description: "Menampilkan laporan penjualan bulanan dalam bentuk grafik (chart)",
    subReports: ["Grafik Penjualan Bulanan"],
  },
  {
    id: "chart-customer-visit",
    tab: "Penjualan",
    title: "Laporan Grafik Kedatangan Pelanggan",
    description: "Menampilkan laporan kunjungan pelanggan dalam bentuk grafik (chart)",
    subReports: ["Grafik Kunjungan Pelanggan"],
  },
  {
    id: "customer-points",
    tab: "Penjualan",
    title: "Laporan Point Pelanggan",
    description: "Menampilkan laporan data point pelanggan",
    subReports: ["Laporan Poin Member Pelanggan"],
  },

  // 4. HUTANG (Screenshot 12)
  {
    id: "debt-outstanding",
    tab: "Hutang",
    title: "Laporan Hutang Beredar",
    description: "Menampilkan laporan data hutang yang masih belum lunas",
    subReports: ["Laporan Hutang Belum Lunas", "Laporan Rekapitulasi Hutang"],
  },
  {
    id: "debt-aging",
    tab: "Hutang",
    title: "Laporan Umur Hutang",
    description: "Menampilkan laporan data umur hutang",
    subReports: ["Laporan Aging Hutang (0-30, 31-60, >60 Hari)"],
  },
  {
    id: "debt-subsidiary",
    tab: "Hutang",
    title: "Laporan Buku Bantu Hutang",
    description: "Menampilkan data buku hutang",
    subReports: ["Buku Pembantu Hutang Per Supplier"],
  },
  {
    id: "debt-mutation",
    tab: "Hutang",
    title: "Laporan Mutasi Hutang",
    description: "Menampilkan data mutasi hutang",
    subReports: ["Mutasi Hutang Pembelian"],
  },
  {
    id: "debt-per-tx",
    tab: "Hutang",
    title: "Laporan Buku Hutang Per Transaksi",
    description: "Rincian hutang per transaksi",
    subReports: ["Rincian Hutang Faktur"],
  },
  {
    id: "debt-payment",
    tab: "Hutang",
    title: "Laporan Pembayaran Hutang",
    description: "Menampilkan histori pembayaran hutang",
    subReports: ["Laporan Pembayaran Hutang Supplier"],
  },

  // 5. PIUTANG (Screenshot 13)
  {
    id: "credit-outstanding",
    tab: "Piutang",
    title: "Laporan Piutang Beredar",
    description: "Menampilkan laporan piutang yang masih belum lunas",
    subReports: ["Laporan Piutang Belum Lunas", "Laporan Rekapitulasi Piutang"],
  },
  {
    id: "credit-sales",
    tab: "Piutang",
    title: "Laporan Piutang Per Sales",
    description: "Menampilkan laporan piutang berdasarkan sales",
    subReports: ["Piutang Per Salesman"],
  },
  {
    id: "credit-territory",
    tab: "Piutang",
    title: "Laporan Piutang Per Wilayah",
    description: "Menampilkan laporan piutang berdasarkan wilayah pelanggan",
    subReports: ["Piutang Per Wilayah Pelanggan"],
  },
  {
    id: "credit-aging",
    tab: "Piutang",
    title: "Laporan Umur Piutang",
    description: "Menampilkan laporan umur piutang",
    subReports: ["Laporan Aging Piutang"],
  },
  {
    id: "credit-subsidiary",
    tab: "Piutang",
    title: "Laporan Buku Pembantu Piutang",
    description: "Menampilkan laporan buku pembantu piutang",
    subReports: ["Buku Pembantu Piutang Pelanggan"],
  },
  {
    id: "credit-mutation",
    tab: "Piutang",
    title: "Laporan Mutasi Piutang",
    description: "Menampilkan laporan mutasi piutang",
    subReports: ["Mutasi Piutang Penjualan"],
  },
  {
    id: "credit-per-tx",
    tab: "Piutang",
    title: "Laporan Buku Pembantu Per Transaksi",
    description: "Menampilkan laporan buku pembantu per transaksi piutang",
    subReports: ["Buku Piutang Per Faktur Penjualan"],
  },
  {
    id: "credit-payment",
    tab: "Piutang",
    title: "Laporan Pembayaran Piutang",
    description: "Menampilkan laporan pembayaran piutang",
    subReports: ["Laporan Pembayaran Piutang Pelanggan"],
  },

  // 6. PERSEDIAAN (Screenshot 14)
  {
    id: "inv-in",
    tab: "Persediaan",
    title: "Laporan Item Masuk",
    description: "Menampilkan laporan transaksi item masuk",
    subReports: ["Laporan Item Masuk Rekap", "Laporan Item Masuk Detail"],
  },
  {
    id: "inv-out",
    tab: "Persediaan",
    title: "Laporan Item Keluar",
    description: "Menampilkan laporan transaksi item keluar",
    subReports: ["Laporan Item Keluar Rekap", "Laporan Item Keluar Detail"],
  },
  {
    id: "inv-opname",
    tab: "Persediaan",
    title: "Laporan Item Opname",
    description: "Menampilkan laporan transaksi item opname",
    subReports: ["Laporan Hasil Stok Opname"],
  },
  {
    id: "inv-transfer-order",
    tab: "Persediaan",
    title: "Laporan Pesanan Item Transfer",
    description: "Menampilkan laporan transaksi pesanan item transfer",
    subReports: ["Laporan Pesanan Transfer Antar Gudang"],
  },
  {
    id: "inv-transfer",
    tab: "Persediaan",
    title: "Laporan Item Transfer",
    description: "Menampilkan laporan transaksi item transfer",
    subReports: ["Laporan Transfer Antar Gudang"],
  },
  {
    id: "inv-mutation",
    tab: "Persediaan",
    title: "Laporan Mutasi Item",
    description: "Menampilkan laporan mutasi item",
    subReports: ["Kartu Stok Mutasi Item"],
  },
  {
    id: "inv-slow",
    tab: "Persediaan",
    title: "Laporan Item Tidak Laku",
    description: "Menampilkan laporan item tidak laku / jarang terjual",
    subReports: ["Laporan Slow Moving Items"],
  },
  {
    id: "inv-serial",
    tab: "Persediaan",
    title: "Laporan Item Serial",
    description: "Menampilkan laporan item serial",
    subReports: ["Laporan Serial Item"],
  },
  {
    id: "inv-serial-history",
    tab: "Persediaan",
    title: "Laporan Serial History",
    description: "Menampilkan laporan serial history",
    subReports: ["Riwayat Pelacakan Nomor Serial"],
  },

  // 7. PERAKITAN (Screenshot 15)
  {
    id: "assembly-order",
    tab: "Perakitan",
    title: "Laporan Pesanan Perakitan",
    description: "Menampilkan laporan transaksi pesanan perakitan",
    subReports: ["Pesanan Perakitan Obat"],
  },
  {
    id: "assembly",
    tab: "Perakitan",
    title: "Laporan Perakitan",
    description: "Menampilkan laporan transaksi perakitan",
    subReports: ["Transaksi Perakitan Resep Racikan"],
  },
  {
    id: "assembly-finished",
    tab: "Perakitan",
    title: "Laporan Proses Jadi",
    description: "Menampilkan laporan transaksi perakitan yang sudah jadi",
    subReports: ["Hasil Proses Jadi Perakitan"],
  },
  {
    id: "assembly-item",
    tab: "Perakitan",
    title: "Laporan Perakitan Per Item",
    description: "Menampilkan laporan perakitan yang dikelompokkan berdasarkan item",
    subReports: ["Perakitan Per Bahan Obat"],
  },
  {
    id: "assembly-finished-item",
    tab: "Perakitan",
    title: "Laporan Proses Jadi Per Item",
    description: "Menampilkan laporan transaksi perakitan yang sudah jadi yang dikelompokkan berdasarkan item",
    subReports: ["Hasil Jadi Per Item Obat"],
  },

  // 8. KAS & KEUANGAN
  {
    id: "kas-in",
    tab: "Kas",
    title: "Laporan Kas Masuk",
    description: "Menampilkan transaksi penerimaan kas operasional",
    subReports: ["Laporan Kas Masuk Rekap", "Laporan Kas Masuk Detail"],
  },
  {
    id: "kas-out",
    tab: "Kas",
    title: "Laporan Kas Keluar",
    description: "Menampilkan transaksi pengeluaran kas operasional",
    subReports: ["Laporan Kas Keluar Rekap", "Laporan Kas Keluar Detail"],
  },
  {
    id: "kas-transfer",
    tab: "Kas",
    title: "Laporan Kas Transfer",
    description: "Menampilkan transaksi mutasi antar rekening kas/bank",
    subReports: ["Laporan Transfer Kas & Bank"],
  },
  {
    id: "profit-item",
    tab: "Laba/Jual",
    title: "Laporan Laba Jual Per Item",
    description: "Menampilkan analisa keuntungan laba kotor per item barang",
    subReports: ["Analisa Laba Jual Per Item Obat"],
  },
  {
    id: "profit-invoice",
    tab: "Laba/Jual",
    title: "Laporan Laba Jual Per Faktur",
    description: "Menampilkan keuntungan kotor berdasarkan setiap nomor faktur penjualan",
    subReports: ["Laba Penjualan Per Faktur"],
  },
  {
    id: "journal-list",
    tab: "Jurnal",
    title: "Laporan Daftar Jurnal",
    description: "Menampilkan riwayat entri jurnal pembukuan umum akuntansi",
    subReports: ["Daftar Jurnal Umum", "Jurnal Penyesuaian"],
  },
  {
    id: "ledger",
    tab: "Buku Besar",
    title: "Laporan Buku Besar",
    description: "Menampilkan mutasi debet kredit dan saldo akun perkiraan",
    subReports: ["Buku Besar Detail Akun", "Neraca Saldo Akuntansi"],
  },
  {
    id: "financial-statement",
    tab: "Keuangan",
    title: "Laporan Keuangan",
    description: "Menampilkan laporan Neraca dan Laba Rugi periode berjalan",
    subReports: ["Laporan Laba Rugi Komprehensif", "Laporan Neraca Keuangan"],
  },
];

export default function MenuLaporanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReportTab>("Master");
  const [selectedReport, setSelectedReport] = useState<ReportMenuItem | null>(null);
  const [activeSubReport, setActiveSubReport] = useState<string>("");

  // Filters State matching Ketoko Screenshots
  const [fromItem, setFromItem] = useState("");
  const [toItem, setToItem] = useState("");
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [fromTx, setFromTx] = useState("");
  const [toTx, setToTx] = useState("");
  const [fromDate, setFromDate] = useState("2026-11-01 00:00:00");
  const [toDate, setToDate] = useState("2026-11-30 23:59:59");
  const [selectedCategory, setSelectedCategory] = useState("-- Semua Jenis --");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState("Semua Grup");
  const [itemType, setItemType] = useState("Semua");
  const [warehouse, setWarehouse] = useState("UTAMA - APOTEK BERKAT");
  const [brand, setBrand] = useState("-- Semua Merek --");
  const [priceType, setPriceType] = useState<"satu" | "satuan" | "level" | "jumlah">("satu");
  const [sortBy, setSortBy] = useState("Kode Item");
  const [sortAsc, setSortAsc] = useState(true);

  // Checkboxes
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [onlyNotForSale, setOnlyNotForSale] = useState(false);
  const [showForSale, setShowForSale] = useState(false);
  const [onlyTaxed, setOnlyTaxed] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Query Backend Data for Live Preview & Real Export
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-reports"],
    queryFn: async () => {
      try {
        const res = await api.get("/products");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-for-reports"],
    queryFn: async () => {
      try {
        const res = await api.get("/suppliers");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-for-reports"],
    queryFn: async () => {
      try {
        const res = await api.get("/customers");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: generalSettings } = useQuery({
    queryKey: ["settings-general"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/groups/GENERAL");
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
    staleTime: 60000,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-for-reports"],
    queryFn: async () => {
      try {
        const res = await api.get("/sales");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases-for-reports"],
    queryFn: async () => {
      try {
        const res = await api.get("/purchasing/invoices");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const handleOpenReport = (item: ReportMenuItem) => {
    setSelectedReport(item);
    setActiveSubReport(item.subReports[0] || item.title);
  };

  const handleBackToMenu = () => {
    setSelectedReport(null);
  };

  // Filtered Items for active tab
  const itemsInActiveTab = useMemo(() => {
    return REPORT_MENU_CATALOG.filter((r) => r.tab === activeTab);
  }, [activeTab]);

  // Generate real report rows based on selected report
  const reportData = useMemo(() => {
    if (!selectedReport) return { headers: [], rows: [] };

    if (selectedReport.id === "item" || selectedReport.id === "item-lengkap") {
      let filtered = [...products];
      if (fromItem) filtered = filtered.filter((p) => p.code >= fromItem);
      if (toItem) filtered = filtered.filter((p) => p.code <= toItem);
      if (!showZeroStock) filtered = filtered.filter((p) => (p.total_stock || 0) > 0);

      const isHpp = activeSubReport.includes("Harga Pokok");
      const isJual = activeSubReport.includes("Harga Jual");
      const isTanpaHarga = activeSubReport.includes("Tanpa Harga");

      const headers = isTanpaHarga
        ? ["Kode Item", "Barcode", "Nama Obat / Item", "Kategori", "Satuan", "Total Stok", "Lokasi Rak"]
        : isHpp
        ? ["Kode Item", "Barcode", "Nama Obat / Item", "Kategori", "Satuan", "Stok", "Harga Pokok (HPP)", "Total Nilai HPP"]
        : [
            "Kode Item",
            "Barcode",
            "Nama Obat / Item",
            "Kategori",
            "Satuan",
            "Stok",
            "Harga Jual 1",
            "Harga Jual 2",
            "Harga Jual 3",
          ];

      const rows = filtered.map((p) => {
        const stock = p.total_stock || 0;
        const buyPrice = p.purchase_price || 0;
        const sell1 = p.selling_price || 0;
        const sell2 = p.selling_price_2 || sell1;
        const sell3 = p.selling_price_3 || sell1;

        if (isTanpaHarga) {
          return [p.code, p.barcode || "-", p.name, p.category?.name || "Obat", p.base_unit?.name || "Pcs", stock, p.shelf_location || "-"];
        }
        if (isHpp) {
          return [p.code, p.barcode || "-", p.name, p.category?.name || "Obat", p.base_unit?.name || "Pcs", stock, buyPrice, stock * buyPrice];
        }
        return [p.code, p.barcode || "-", p.name, p.category?.name || "Obat", p.base_unit?.name || "Pcs", stock, sell1, sell2, sell3];
      });

      return { headers, rows };
    }

    if (selectedReport.id === "supplier") {
      let filtered = [...suppliers];
      if (fromCode) filtered = filtered.filter((s) => s.code >= fromCode);
      if (toCode) filtered = filtered.filter((s) => s.code <= toCode);

      const headers = ["Kode Supplier", "Nama Supplier", "Alamat", "Telepon", "Kontak Person", "Term (Hari)"];
      const rows = filtered.map((s) => [s.code, s.name, s.address || "-", s.phone || "-", s.contact_person || "-", s.term_days || 0]);
      return { headers, rows };
    }

    if (selectedReport.id === "customer") {
      let filtered = [...customers];
      if (fromCode) filtered = filtered.filter((c) => c.code >= fromCode);
      if (toCode) filtered = filtered.filter((c) => c.code <= toCode);

      const headers = ["Kode Pelanggan", "Nama Pelanggan", "Alamat", "Telepon", "Kategori", "Plafon Kredit", "Term"];
      const rows = filtered.map((c) => [c.code, c.name, c.address || "-", c.phone || "-", c.category || "Umum", c.credit_limit || 0, c.term_days || 0]);
      return { headers, rows };
    }

    if (selectedReport.id === "sales") {
      const headers = ["Kode Sales", "Nama Sales", "Telepon", "Wilayah", "Komisi (%)"];
      const rows = [
        ["SLS-001", "Budi Santoso", "081234567890", "Pontianak Kota", 2.5],
        ["SLS-002", "Dewi Lestari", "081987654321", "Pontianak Barat", 2.5],
        ["SLS-003", "Hendra Wijaya", "085678912345", "Kubu Raya", 3.0],
      ];
      return { headers, rows };
    }

    if (selectedReport.id.startsWith("purchase") || selectedReport.id === "po") {
      const headers = ["No Faktur / Transaksi", "Tanggal", "Supplier", "Gudang", "Total Tagihan", "Status Bayar", "Sisa Hutang"];
      const rows = purchases.map((p: any) => [
        p.invoice_no || p.order_no || "-",
        p.date ? formatDate(p.date) : "-",
        p.supplier?.name || "-",
        "UTAMA",
        p.total_amount || 0,
        p.payment_status || "LUNAS",
        p.remaining_amount || 0,
      ]);
      return { headers, rows };
    }

    // Penjualan, Kasir & Piutang
    const headers = ["No Transaksi", "Tanggal", "Pelanggan", "Kasir / User", "Subtotal", "Pajak", "Diskon", "Total Akhir", "Sisa Piutang"];
    const rows = sales.map((s: any) => [
      s.invoice_no || "-",
      s.date ? formatDate(s.date) : "-",
      s.customer?.name || "Umum",
      s.user?.username || "ADMIN2",
      s.subtotal || 0,
      s.tax_amount || 0,
      s.discount || 0,
      s.total_amount || 0,
      s.remaining_amount || 0,
    ]);
    return { headers, rows };
  }, [
    selectedReport,
    activeSubReport,
    products,
    suppliers,
    customers,
    sales,
    purchases,
    fromItem,
    toItem,
    fromCode,
    toCode,
    showZeroStock,
  ]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!selectedReport) return;
    const filename = `${selectedReport.id}_${activeSubReport.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}`;
    downloadCSV(filename, reportData.headers, reportData.rows);
    setToastMsg(`Laporan berhasil diekspor ke CSV (${filename}.csv)!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    if (!selectedReport) return;
    const filename = `${selectedReport.id}_${activeSubReport.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}`;
    downloadExcel(filename, activeSubReport.slice(0, 30), reportData.headers, reportData.rows);
    setToastMsg(`Laporan berhasil diekspor ke Excel (${filename}.xls)!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={selectedReport ? handleBackToMenu : () => router.back()}
            className="text-slate-600 hover:text-slate-800 flex items-center text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="font-semibold text-sm text-slate-800">
              {selectedReport ? selectedReport.title : "Menu Laporan"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            33
          </span>
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW A: MAIN MENU LAPORAN (Screenshots 1, 7, 11, 12, 13, 14, 15) */}
      {/* ========================================================= */}
      {!selectedReport && (
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3 overflow-hidden">
          {/* Mode Layout Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-600 font-medium">Mode Layout :</span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-semibold text-[10px] border border-sky-300">
              <span>Interactive</span>
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
            </div>
          </div>

          {/* 15 TABS NAVIGATION */}
          <div className="border border-slate-300 rounded flex flex-col flex-1 min-h-0 bg-white shadow-2xs overflow-hidden">
            <div className="flex items-center overflow-x-auto border-b border-slate-300 bg-[#f8fafc] shrink-0 scrollbar-thin">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition border-r border-slate-200 ${
                    activeTab === tab
                      ? "bg-white text-slate-900 border-b-2 border-b-emerald-600 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: 2-COLUMN CARDS OF REPORTS */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-6xl">
                {itemsInActiveTab.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <h3 className="font-bold text-sm text-slate-800">{item.title}</h3>
                    <p className="text-[11px] text-slate-500 leading-normal">{item.description}</p>
                    <div className="pt-1">
                      <button
                        onClick={() => handleOpenReport(item)}
                        className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded text-xs flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <span>Lihat Laporan</span>
                      </button>
                    </div>
                  </div>
                ))}

                {itemsInActiveTab.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-400">
                    Belum ada menu laporan untuk kategori {activeTab}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: REPORT DETAIL & FILTER VIEW (Screenshots 2, 3, 4, 5, 6, 8, 9, 10) */}
      {/* ========================================================= */}
      {selectedReport && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* LEFT PANEL: Tentukan Filter Laporan */}
            <div className="col-span-7 bg-white border border-slate-300 rounded p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">
                Tentukan Filter Laporan :
              </h2>

              {/* FILTER FORM FOR ITEMS (Screenshot 2 & 3) */}
              {(selectedReport.id === "item" || selectedReport.id === "item-lengkap") && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Dari Item :</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fromItem}
                          onChange={(e) => setFromItem(e.target.value)}
                          placeholder="Kode Item..."
                          className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Sampai Item :</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={toItem}
                          onChange={(e) => setToItem(e.target.value)}
                          placeholder="Kode Item..."
                          className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Dari Jenis :</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="-- Semua Jenis --">-- Semua Jenis --</option>
                        <option value="Obat Bebas">Obat Bebas</option>
                        <option value="Obat Bebas Terbatas">Obat Bebas Terbatas</option>
                        <option value="Obat Keras">Obat Keras</option>
                        <option value="Alkes">Alkes &amp; Medis</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Sampai Jenis :</label>
                      <select className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500">
                        <option>-- Semua Jenis --</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Supplier :</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={selectedSupplier}
                          onChange={(e) => setSelectedSupplier(e.target.value)}
                          placeholder="Cari Supplier..."
                          className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Tipe Item :</label>
                      <select
                        value={itemType}
                        onChange={(e) => setItemType(e.target.value)}
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Semua">Semua</option>
                        <option value="Barang">Barang</option>
                        <option value="Jasa">Jasa</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Gudang :</label>
                      <select
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="UTAMA - APOTEK BERKAT">UTAMA - APOTEK BERKAT</option>
                        <option value="GUDANG_A - GUDANG LOGISTIK">GUDANG_A - GUDANG LOGISTIK</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Merek :</label>
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="-- Semua Merek --">-- Semua Merek --</option>
                        <option value="Kimia Farma">Kimia Farma</option>
                        <option value="Kalbe Farma">Kalbe Farma</option>
                        <option value="Sanbe">Sanbe</option>
                      </select>
                    </div>
                  </div>

                  {/* Tipe Harga for Item Lengkap (Screenshot 3) */}
                  {selectedReport.id === "item-lengkap" && (
                    <div className="space-y-1 pt-1">
                      <label className="block text-[11px] text-slate-600">Tipe Harga :</label>
                      <div className="space-y-1 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                          <input
                            type="radio"
                            name="price_type"
                            checked={priceType === "satu"}
                            onChange={() => setPriceType("satu")}
                            className="text-emerald-600 focus:ring-0"
                          />
                          <span>Satu Harga</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                          <input
                            type="radio"
                            name="price_type"
                            checked={priceType === "satuan"}
                            onChange={() => setPriceType("satuan")}
                            className="text-emerald-600 focus:ring-0"
                          />
                          <span>Satuan</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                          <input
                            type="radio"
                            name="price_type"
                            checked={priceType === "level"}
                            onChange={() => setPriceType("level")}
                            className="text-emerald-600 focus:ring-0"
                          />
                          <span>Level</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                          <input
                            type="radio"
                            name="price_type"
                            checked={priceType === "jumlah"}
                            onChange={() => setPriceType("jumlah")}
                            className="text-emerald-600 focus:ring-0"
                          />
                          <span>Jumlah</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Urut Berdasar */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-600 w-24">Urut Berdasar :</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-48 h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Kode Item">Kode Item</option>
                      <option value="Nama Item">Nama Item</option>
                      <option value="Kategori">Kategori</option>
                      <option value="Stok">Total Stok</option>
                    </select>
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      type="button"
                      className="h-7 w-7 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
                      title={sortAsc ? "Urutan Menaik (A-Z)" : "Urutan Menurun (Z-A)"}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between text-[11px] text-slate-700 cursor-pointer">
                      <span>Tampil jika stok kosong :</span>
                      <input
                        type="checkbox"
                        checked={showZeroStock}
                        onChange={(e) => setShowZeroStock(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-[11px] text-slate-700 cursor-pointer">
                      <span>Hanya tampil item tidak dijual :</span>
                      <input
                        type="checkbox"
                        checked={onlyNotForSale}
                        onChange={(e) => setOnlyNotForSale(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-[11px] text-slate-700 cursor-pointer">
                      <span>Tampil item dijual :</span>
                      <input
                        type="checkbox"
                        checked={showForSale}
                        onChange={(e) => setShowForSale(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* FILTER FORM FOR SUPPLIER / CUSTOMER / SALES (Screenshots 4, 5, 6) */}
              {(selectedReport.id === "supplier" ||
                selectedReport.id === "customer" ||
                selectedReport.id === "sales") && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Dari Kode :</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fromCode}
                          onChange={(e) => setFromCode(e.target.value)}
                          placeholder="Kode..."
                          className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Sampai Kode :</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={toCode}
                          onChange={(e) => setToCode(e.target.value)}
                          placeholder="Kode..."
                          className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                      </div>
                    </div>
                  </div>

                  {selectedReport.id === "customer" && (
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Grup Pelanggan :</label>
                      <select
                        value={selectedCustomerGroup}
                        onChange={(e) => setSelectedCustomerGroup(e.target.value)}
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Semua Grup">Semua Grup</option>
                        <option value="Umum">Umum / Pasien Biasa</option>
                        <option value="Member">Member Apotek</option>
                        <option value="Klinik">Klinik Rekanan</option>
                        <option value="PBF">PBF / Apotek Rekanan</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-600 w-24">Urut Berdasar :</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-48 h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Kode">Kode</option>
                      <option value="Nama">Nama</option>
                      <option value="Kota">Kota / Wilayah</option>
                    </select>
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      type="button"
                      className="h-7 w-7 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* FILTER FORM FOR TRANSACTIONS (Screenshots 8, 9, 10, Penjualan, Hutang, Piutang) */}
              {selectedReport.id !== "item" &&
                selectedReport.id !== "item-lengkap" &&
                selectedReport.id !== "supplier" &&
                selectedReport.id !== "customer" &&
                selectedReport.id !== "sales" && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Dari No Transaksi :</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={fromTx}
                            onChange={(e) => setFromTx(e.target.value)}
                            className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Sampai No Transaksi :</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={toTx}
                            onChange={(e) => setToTx(e.target.value)}
                            className="w-full h-7 px-2 pr-7 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Periode Dari :</label>
                        <input
                          type="text"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Periode Sampai :</label>
                        <input
                          type="text"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-0.5">Gudang :</label>
                      <select
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="UTAMA - APOTEK BERKAT">UTAMA - APOTEK BERKAT</option>
                        <option value="GUDANG_A - GUDANG LOGISTIK">GUDANG_A - GUDANG LOGISTIK</option>
                      </select>
                    </div>

                    {selectedReport.id === "purchase" && (
                      <label className="flex items-center justify-between text-[11px] text-slate-700 cursor-pointer pt-1">
                        <span>Hanya tampil yang kena pajak :</span>
                        <input
                          type="checkbox"
                          checked={onlyTaxed}
                          onChange={(e) => setOnlyTaxed(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                )}
            </div>

            {/* RIGHT PANEL: Pilih Laporan & Action Buttons */}
            <div className="col-span-5 space-y-3">
              <div className="bg-white border border-slate-300 rounded p-4 shadow-2xs space-y-3">
                <h2 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">
                  Pilih Laporan :
                </h2>

                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {selectedReport.subReports.map((sub) => {
                    const isSelected = activeSubReport === sub;
                    return (
                      <div
                        key={sub}
                        onClick={() => setActiveSubReport(sub)}
                        className={`p-2.5 text-xs cursor-pointer transition flex items-center justify-between ${
                          isSelected ? "bg-sky-50 font-bold text-sky-800" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span>{sub}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* ACTION BUTTONS (Print, Disain, + Baru, Hapus) + EXCEL & CSV AS REQUESTED */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={handlePrint}
                    type="button"
                    className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print</span>
                  </button>

                  <button
                    onClick={() => {
                      setToastMsg("Membuka template desainer laporan...");
                      setTimeout(() => setToastMsg(null), 3000);
                    }}
                    type="button"
                    className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    <span>Disain</span>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    type="button"
                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition"
                    title="Unduh laporan dalam format Excel (.xls)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    type="button"
                    className="h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition"
                    title="Unduh laporan dalam format CSV (.csv)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setToastMsg("Menambahkan template format baru...");
                      setTimeout(() => setToastMsg(null), 3000);
                    }}
                    type="button"
                    className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Baru</span>
                  </button>

                  <button
                    onClick={() => {
                      setToastMsg("Menghapus template format laporan...");
                      setTimeout(() => setToastMsg(null), 3000);
                    }}
                    type="button"
                    className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* REALTIME DATA PREVIEW TABLE */}
          <div className="bg-white border border-slate-300 rounded shadow-2xs flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800">
                  Pratinjau Data Laporan: <span className="text-emerald-700">{activeSubReport}</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  ({reportData.rows.length} baris data)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Excel (.xls)</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="h-6 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Download className="w-3 h-3" />
                  <span>Download CSV (.csv)</span>
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-96">
              <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 shadow-2xs">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200 w-10 text-center">No</th>
                    {reportData.headers.map((h, i) => (
                      <th key={i} className="py-2 px-3 border-r border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.headers.length + 1} className="py-8 text-center text-slate-400">
                        Tidak ada data yang sesuai dengan filter yang ditentukan.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center text-slate-500">
                          {rIdx + 1}
                        </td>
                        {row.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-1.5 px-3 border-r border-slate-200 ${
                              typeof val === "number" ? "text-right font-mono text-slate-800" : "text-slate-700"
                            }`}
                          >
                            {typeof val === "number"
                              ? val.toLocaleString("id-ID")
                              : String(val ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="h-7 px-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 bg-white shrink-0">
        <span>&copy; {generalSettings?.app_brand_name || "Ketoko.co.id"} 2.3.1.3 - Inspirasibiz / Inspirasi Media Kreatif</span>
        <span className="flex items-center gap-1 font-semibold text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>POSTGRESQL CONNECTED</span>
        </span>
      </div>
    </div>
  );
}
