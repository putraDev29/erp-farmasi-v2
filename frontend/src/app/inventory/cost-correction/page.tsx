"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Save,
  Lightbulb,
  X,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import ItemSearchModal from "@/components/inventory/ItemSearchModal";
import SearchableAccountSelect from "@/components/common/SearchableAccountSelect";

export default function CostCorrectionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Timestamp matching Screenshot 4
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [accountCode, setAccountCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [barcode, setBarcode] = useState("");

  // Item states
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [stockReport, setStockReport] = useState<number>(0);
  const [valueReport, setValueReport] = useState<number>(0);
  const [correctionValue, setCorrectionValue] = useState<number>(0);
  const [diffValue, setDiffValue] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Modals & UI toggle
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [showHistoryTable, setShowHistoryTable] = useState(false);

  // Queries
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounts");
      return res.data?.data || [];
    },
  });

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Recalculate difference
  useEffect(() => {
    setDiffValue(correctionValue - valueReport);
  }, [correctionValue, valueReport]);

  const handleSelectItem = (prod: any) => {
    if (!prod) return;
    setSelectedProduct(prod);
    setItemCode(prod.code || "");
    setItemName(prod.name || "");
    setItemUnit(prod.base_unit?.name || prod.unit_name || "PCS");

    const stock = Number(prod.stock || 0);
    const purchasePrice = Number(prod.purchase_price || 0);
    const val = stock * purchasePrice;

    setStockReport(stock);
    setValueReport(val);
    setCorrectionValue(val);
    setDiffValue(0);
  };

  const handleBarcodeKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcode.trim()) {
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(barcode.trim())}`);
        const items = res.data?.data?.items || res.data?.data || [];
        if (items.length > 0) {
          handleSelectItem(items[0]);
        } else {
          alert(`Item dengan barcode "${barcode}" tidak ditemukan.`);
        }
      } catch {
        alert("Gagal mencari barcode.");
      }
    }
  };

  // Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error("Pilih item terlebih dahulu");
      return await api.put(`/products/${selectedProduct.id}`, {
        ...selectedProduct,
        purchase_price: stockReport > 0 ? correctionValue / stockReport : correctionValue,
        notes: notes || "Penyesuaian Nilai Akhir Mutasi",
      });
    },
    onSuccess: () => {
      alert("Koreksi nilai persediaan berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      // Reset form
      setSelectedProduct(null);
      setItemCode("");
      setItemName("");
      setItemUnit("");
      setStockReport(0);
      setValueReport(0);
      setCorrectionValue(0);
      setDiffValue(0);
      setNotes("");
      setBarcode("");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan koreksi nilai: " + (err.response?.data?.message || err.message));
    },
  });

  return (
    <div className="bg-white border border-slate-200 rounded p-2 flex flex-col h-full min-h-0 text-xs select-none gap-2">
      {/* 1. Header: [< Koreksi Nilai Persediaan Akhir Mutasi Item] + User Profile */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1.5 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            Koreksi Nilai Persediaan Akhir Mutasi Item
          </h1>
        </div>

        {/* User context badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold">
          <span className="text-slate-700">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[9px]">
            33
          </span>
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold text-[10px]">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* 2. Informasi Box matching Screenshot 4 */}
      <div className="bg-slate-50 border border-slate-300 rounded p-2 text-[11px] space-y-1 text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span>INFORMASI :</span>
        </div>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1 leading-relaxed text-[10.5px]">
          <li>
            Fitur ini berfungsi untuk menghilangkan &quot;Nilai Menggantung&quot; pada laporan mutasi di mana stok barang sudah habis (0), namun masih memiliki sisa nilai.
          </li>
          <li>
            Gunakan fitur ini hanya jika pada Laporan Mutasi muncul angka nilai persediaan padahal stok fisik dan sistem sudah 0.
          </li>
          <li>
            Sistem akan membuat record penyesuaian dan jurnal. Nilai ini akan terakumulasi di Laporan Mutasi untuk menyeimbangkan saldo akhir menjadi 0.
          </li>
          <li>
            Jika laporan mutasi Anda sudah benar, dilarang menjalankan fitur ini karena akan memunculkan nilai penyesuaian yang tidak perlu.
          </li>
        </ol>
      </div>

      {/* 3. Form Fields matching Screenshot 4 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 text-[11px] max-w-4xl pr-1">
        {/* Tanggal : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Tanggal :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {formDate}
          </div>
        </div>

        {/* Kode Akun : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Kode Akun :</label>
          <SearchableAccountSelect
            accounts={accounts}
            value={accountCode}
            onChange={(val, item) => setAccountCode(item ? `${item.code || item.account_code} - ${item.name || item.account_name}` : val)}
            placeholder="Select / Cari Kode Akun..."
          />
        </div>

        {/* Gudang : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Gudang :</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Kode Item & Barcode (Side-by-Side matching Screenshot 4) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-600 font-medium mb-0.5">Kode Item :</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Pilih atau cari kode item..."
                className="flex-1 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setIsItemModalOpen(true)}
                className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
                title="Cari Item"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-0.5">Barcode :</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Scan barcode..."
              className="w-full h-6 px-2 border border-dashed border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        {/* Nama Item : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Nama Item :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 text-[11px]">
            {itemName || "-"}
          </div>
        </div>

        {/* Satuan : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Satuan :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 text-[11px]">
            {itemUnit || "-"}
          </div>
        </div>

        {/* Stok Akhir Laporan : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Stok Akhir Laporan :</label>
          <div className="w-full h-6 px-2 flex items-center justify-end border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {stockReport.toFixed(2)}
          </div>
        </div>

        {/* Nilai Laporan : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Nilai Laporan :</label>
          <div className="w-full h-6 px-2 flex items-center justify-end border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {valueReport.toFixed(2)}
          </div>
        </div>

        {/* Nilai Koreksi : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Nilai Koreksi :</label>
          <input
            type="number"
            step="any"
            value={correctionValue}
            onChange={(e) => setCorrectionValue(parseFloat(e.target.value) || 0)}
            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-right font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Nilai Selisih : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Nilai Selisih :</label>
          <div
            className={`w-full h-6 px-2 flex items-center justify-end border border-dashed border-slate-300 rounded bg-white font-mono font-bold text-[11px] ${
              diffValue > 0
                ? "text-emerald-700"
                : diffValue < 0
                ? "text-rose-600"
                : "text-slate-700"
            }`}
          >
            {diffValue.toFixed(2)}
          </div>
        </div>

        {/* Keterangan : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Keterangan :</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan koreksi nilai..."
            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* 4. Action Buttons matching Screenshot 4: [💾 Simpan] [🔍 Tampil] */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!selectedProduct || saveMutation.isPending}
          className={`h-6 px-3 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 border ${
            selectedProduct
              ? "bg-[#00c875] hover:bg-[#00b066] text-white border-transparent"
              : "bg-white text-slate-400 border-slate-300 cursor-not-allowed"
          }`}
          title="Simpan Koreksi Nilai Persediaan"
        >
          <Save className="w-3 h-3" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryTable((prev) => !prev)}
          className={`h-6 px-2.5 border rounded text-[11px] font-medium inline-flex items-center gap-1 shadow-2xs transition ${
            showHistoryTable
              ? "bg-sky-50 text-sky-800 border-sky-400 font-bold"
              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
          }`}
          title="Tampilkan Riwayat Koreksi"
        >
          <Search className="w-3 h-3 text-sky-600" />
          <span>Tampil</span>
        </button>
      </div>

      {/* Optional History Preview */}
      {showHistoryTable && (
        <div className="mt-2 border border-slate-300 rounded overflow-hidden flex flex-col bg-white">
          <div className="bg-slate-100 px-2 py-1 font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center text-[11px]">
            <span>Histori Penyesuaian Nilai Akhir Mutasi</span>
            <button
              onClick={() => setShowHistoryTable(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 text-center text-slate-400 text-[11px]">
            Belum ada record penyesuaian nilai mutasi menggantung.
          </div>
        </div>
      )}

      {/* ITEM SEARCH MODAL */}
      <ItemSearchModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={(items: any[]) => {
          if (items && items.length > 0) {
            handleSelectItem(items[0]);
          }
          setIsItemModalOpen(false);
        }}
      />
    </div>
  );
}
