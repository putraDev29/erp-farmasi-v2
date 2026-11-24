"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Camera,
  Printer,
  ExternalLink,
  RotateCcw,
  Calendar,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  Package,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { BarcodeScannerModal } from "@/components/common/BarcodeScannerModal";

export default function StockCardPage() {
  const router = useRouter();
  const [productCodeInput, setProductCodeInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [warehouseID, setWarehouseID] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("11"); // November default
  const [selectedYear, setSelectedYear] = useState("2026");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const months = [
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  // Fetch all products for selector / auto-complete
  const { data: products = [] } = useQuery({
    queryKey: ["all-products-for-stock-card"],
    queryFn: async () => {
      const res = await api.get("/products?page_size=200");
      return res.data?.data?.items || [];
    },
  });

  // Set default product if none selected
  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
      setProductCodeInput(products[0].code);
    }
  }, [products, selectedProduct]);

  // Set default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseID) {
      setWarehouseID(warehouses[0].id);
    }
  }, [warehouses, warehouseID]);

  // Stock movements query
  const { data: movements = [], isLoading, refetch } = useQuery({
    queryKey: ["stock-movements", selectedProduct?.id, warehouseID, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      let url = `/inventory/stock-card?product_id=${selectedProduct.id}`;
      if (warehouseID) url += `&warehouse_id=${warehouseID}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
    enabled: Boolean(selectedProduct?.id),
  });

  // Calculate totals
  let totalMasuk = 0;
  let totalKeluar = 0;
  let saldoAwal = 0;
  movements.forEach((m: any) => {
    if (m.movement_type === "IN") {
      totalMasuk += Number(m.qty || 0);
    } else if (m.movement_type === "OUT") {
      totalKeluar += Number(m.qty || 0);
    }
  });
  const saldoAkhir = (selectedProduct?.total_stock ?? 0) || totalMasuk - totalKeluar;

  // Handle scanned barcode from HP Camera or hardware scanner
  const handleBarcodeScanned = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toLowerCase();
    const match = products.find(
      (p: any) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
        (p.code && p.code.toLowerCase() === cleanCode) ||
        (p.sku && p.sku.toLowerCase() === cleanCode) ||
        p.name.toLowerCase().includes(cleanCode)
    );

    if (match) {
      setSelectedProduct(match);
      setProductCodeInput(match.code);
    } else {
      setProductCodeInput(scannedCode);
      alert(`Item dengan barcode "${scannedCode}" tidak ditemukan.`);
    }
  };

  // Find product by typed code on Enter
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleBarcodeScanned(productCodeInput);
  };

  const handleRowClick = async (m: any) => {
    if (m.purchase_id) {
      router.push(`/purchasing/invoices/${m.purchase_id}/edit`);
      return;
    }
    if (m.doc_type === "PURCHASE" || (m.doc_no && m.doc_no.startsWith("PI/"))) {
      try {
        const res = await api.get(`/purchases?search=${encodeURIComponent(m.doc_no)}`);
        const purchases = res.data?.data || [];
        const match = purchases.find((p: any) => p.invoice_no === m.doc_no) || purchases[0];
        if (match?.id) {
          router.push(`/purchasing/invoices/${match.id}/edit`);
          return;
        }
      } catch (e) {
        console.error("Gagal membuka faktur pembelian:", e);
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Top Filter Form Card matching Screenshot 1 */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2.5 shadow-2xs space-y-1.5">
        {/* ROW 1: Kode Item + Scan + Keterangan + Gudang */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Kode Item with Search & Camera Scan buttons */}
          <div className="md:col-span-4">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Kode Item :
            </label>
            <form onSubmit={handleCodeSubmit} className="flex items-center gap-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productCodeInput}
                  onChange={(e) => setProductCodeInput(e.target.value)}
                  placeholder="Ketik / scan kode item..."
                  className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 font-mono font-medium focus:outline-none focus:border-sky-500 bg-white"
                />
              </div>

              {/* [🔍] Item Picker button */}
              <button
                type="button"
                onClick={() => setIsItemPickerOpen(true)}
                className="w-6 h-6 flex items-center justify-center border border-slate-300 hover:bg-slate-100 rounded text-slate-600 transition"
                title="Pilih Item dari Daftar"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* [📷] Camera Scan HP / Barcode Scanner button */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="h-6 px-2 bg-[#6b21a8] hover:bg-[#581c87] text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition shrink-0"
                title="Scan Barcode via Kamera HP / Alat Scanner"
              >
                <Camera className="w-3 h-3" />
                <span className="hidden sm:inline">Scan Barcode</span>
              </button>
            </form>
          </div>

          {/* Keterangan (Readonly item name) */}
          <div className="md:col-span-4">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Keterangan :
            </label>
            <input
              type="text"
              readOnly
              value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.base_unit?.code || "PCS"})` : "-"}
              className="w-full h-6 px-2 py-0 border border-slate-200 rounded text-[11px] text-slate-700 bg-slate-50 font-medium focus:outline-none truncate"
            />
          </div>

          {/* Gudang */}
          <div className="md:col-span-4">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Gudang :
            </label>
            <select
              value={warehouseID}
              onChange={(e) => setWarehouseID(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
            >
              <option value="">Semua Gudang</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name.toUpperCase()} [{w.code}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Periode | Tahun | Buttons Proses, Cetak, Buka Transaksi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end pt-1">
          {/* Periode Bulan */}
          <div className="md:col-span-3">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Periode :
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun */}
          <div className="md:col-span-2">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Tahun :
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
            />
          </div>

          {/* Buttons matching screenshot: [Proses] [Cetak] [Buka Transaksi] */}
          <div className="md:col-span-7 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <span>Proses</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-6 px-2.5 bg-[#9faab5] hover:bg-[#8e9aa5] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Printer className="w-3 h-3 stroke-[2.4]" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedProduct) {
                  window.open(`/inventory/transfers?product_id=${selectedProduct.id}`, "_blank");
                }
              }}
              className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-semibold text-[11px] shadow-2xs transition active:scale-95 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 text-slate-600" />
              <span>Buka Transaksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded shadow-2xs overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">No Transaksi</th>
                <th className="py-2 px-3 border-r border-slate-300">No. Batch</th>
                <th className="py-2 px-3 border-r border-slate-300">Expired Date</th>
                <th className="py-2 px-3 border-r border-slate-300">Kantor</th>
                <th className="py-2 px-3 border-r border-slate-300">Tanggal</th>
                <th className="py-2 px-3 border-r border-slate-300">Tipe</th>
                <th className="py-2 px-3 border-r border-slate-300 min-w-[200px]">Keterangan</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Masuk</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Keluar</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right">Saldo</th>
                <th className="py-2 px-3">Supplier/Pelanggan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Memuat kartu stok...</span>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-slate-400 font-medium">
                    No data
                  </td>
                </tr>
              ) : (
                movements.map((m: any, idx: number) => {
                  const qtyIn = m.movement_type === "IN" ? m.qty : 0;
                  const qtyOut = m.movement_type === "OUT" ? m.qty : 0;
                  const isPurchase =
                    Boolean(m.purchase_id) ||
                    m.doc_type === "PURCHASE" ||
                    (m.doc_no && m.doc_no.startsWith("PI/"));
                  return (
                    <tr
                      key={m.id || idx}
                      onClick={() => handleRowClick(m)}
                      className={`border-b border-slate-200 transition-colors ${
                        isPurchase
                          ? "cursor-pointer hover:bg-sky-50/80"
                          : "hover:bg-slate-50"
                      }`}
                      title={
                        isPurchase
                          ? "Klik untuk membuka / edit faktur pembelian"
                          : undefined
                      }
                    >
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              isPurchase
                                ? "text-blue-600 underline font-semibold hover:text-blue-800"
                                : ""
                            }
                          >
                            {m.doc_no}
                          </span>
                          {isPurchase && (
                            <ExternalLink className="w-3 h-3 text-blue-500 opacity-70" />
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono font-semibold text-slate-700">
                        {m.batch_number || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-700">
                        {m.expired_date ? formatDate(m.expired_date) : "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">
                        {m.branch?.name || "UTAMA"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600 font-mono">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-700">
                        {m.doc_type}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                        {m.notes || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-semibold text-emerald-700">
                        {qtyIn > 0 ? qtyIn.toFixed(2) : "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-semibold text-rose-700">
                        {qtyOut > 0 ? qtyOut.toFixed(2) : "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                        {Number(m.balance_after || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600">
                        {m.notes?.includes("SUP") ? "Supplier" : m.notes?.includes("CUST") ? "Pelanggan" : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary Boxes matching Screenshot 1 */}
        <div className="shrink-0 p-2 bg-slate-50/80 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-600 font-sans font-medium">Total Masuk :</span>
              <span className="font-bold text-emerald-700">{totalMasuk.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-sans font-medium">Total Keluar :</span>
              <span className="font-bold text-rose-700">{totalKeluar.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-600 font-sans font-medium">Saldo Awal :</span>
              <span className="font-bold text-slate-700">{saldoAwal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-sans font-medium">Saldo Akhir :</span>
              <span className="font-bold text-sky-700 text-sm">{saldoAkhir.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal with Camera HP / USB Scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Barcode Kartu Stok (Kamera HP / Scanner)"
      />

      {/* Item Picker Modal when clicking Search */}
      {isItemPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 text-sm">Pilih Produk / Obat</span>
              <button
                type="button"
                onClick={() => setIsItemPickerOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Cari kode atau nama item..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-sky-500 bg-white"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
              {products
                .filter(
                  (p: any) =>
                    p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    p.code.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    (p.barcode && p.barcode.includes(pickerSearch))
                )
                .map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductCodeInput(p.code);
                      setIsItemPickerOpen(false);
                    }}
                    className="p-2 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-800">{p.code}</span>
                      <p className="text-slate-900 font-medium">{p.name}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Stok: {(p.total_stock ?? 0).toFixed(2)} {p.base_unit?.code || "PCS"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
