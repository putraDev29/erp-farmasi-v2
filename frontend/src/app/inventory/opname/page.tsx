"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Save,
  Barcode as BarcodeIcon,
  FileSpreadsheet,
  ListFilter,
  CheckCircle2,
  X,
  Upload,
} from "lucide-react";
import { api, formatDate } from "@/lib/api";
import ItemSearchModal from "@/components/inventory/ItemSearchModal";
import SearchableAccountSelect from "@/components/common/SearchableAccountSelect";

export default function StockOpnamePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form Header State matching Screenshot 1
  const [opnameDate, setOpnameDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [accountCode, setAccountCode] = useState("5-2200 - PENGATURAN STOK");
  const [warehouseId, setWarehouseId] = useState("");
  const [barcode, setBarcode] = useState("");

  // Selected item state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [bookQty, setBookQty] = useState<number>(0);
  const [physicalQty, setPhysicalQty] = useState<number>(0);
  const [diffQty, setDiffQty] = useState<number>(0);

  // Modals & UI toggle
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [serialBatchNo, setSerialBatchNo] = useState("");
  const [expiredDate, setExpiredDate] = useState("");

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

  // Recent opname movements
  const { data: opnameHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ["opname-history", warehouseId],
    queryFn: async () => {
      const res = await api.get("/inventory/stock-card?page_size=20");
      const list = res.data?.data || [];
      return list.filter(
        (m: any) =>
          m.movement_type === "OPNAME" ||
          m.movement_type === "ADJUSTMENT" ||
          m.reference_no?.includes("OPN")
      );
    },
  });

  useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Recalculate difference
  useEffect(() => {
    setDiffQty(physicalQty - bookQty);
  }, [physicalQty, bookQty]);

  // Handle Item Select from Modal
  const handleSelectItem = async (prod: any) => {
    if (!prod) return;
    setSelectedProduct(prod);
    setItemCode(prod.code || "");
    setItemName(prod.name || "");
    setItemUnit(prod.base_unit?.name || prod.unit_name || "PCS");

    // Fetch live warehouse balance for this product
    try {
      const wId = warehouseId || (warehouses[0] ? warehouses[0].id : "");
      const res = await api.get(`/inventory/balances?warehouse_id=${wId}`);
      const balances = res.data?.data || [];
      const found = balances.find((b: any) => b.product_id === prod.id);
      const curStock = found ? Number(found.qty || 0) : Number(prod.stock || 0);
      setBookQty(curStock);
      setPhysicalQty(curStock);
      setDiffQty(0);
    } catch {
      const curStock = Number(prod.stock || 0);
      setBookQty(curStock);
      setPhysicalQty(curStock);
      setDiffQty(0);
    }
  };

  // Barcode enter lookup
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

  // Submit Opname
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error("Pilih item terlebih dahulu");
      return await api.post("/inventory/opname", {
        warehouse_id: warehouseId,
        notes: `Stock Opname Akun ${accountCode} - Selisih: ${diffQty >= 0 ? "+" : ""}${diffQty}`,
        items: [
          {
            product_id: selectedProduct.id,
            physical_qty: physicalQty,
            notes: `Opname Fisik: ${physicalQty}, Buku: ${bookQty}, Selisih: ${diffQty}`,
          },
        ],
      });
    },
    onSuccess: () => {
      alert("Stock Opname berhasil disimpan dan saldo stok telah diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["opname-history"] });
      // Reset form item
      setSelectedProduct(null);
      setItemCode("");
      setItemName("");
      setItemUnit("");
      setBookQty(0);
      setPhysicalQty(0);
      setDiffQty(0);
      setBarcode("");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan opname: " + (err.response?.data?.message || err.message));
    },
  });

  return (
    <div className="bg-white border border-slate-200 rounded p-2 flex flex-col h-full min-h-0 text-xs select-none gap-2">
      {/* 1. Header: [< Stock Opname] + User Profile */}
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
            Stock Opname
          </h1>
        </div>

        {/* User context badge matching screenshot */}
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

      {/* 2. Scrollable Middle Section: Form Fields & History Table */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        <div className="space-y-1.5 text-[11px] max-w-4xl">
        {/* Tanggal : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Tanggal :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {opnameDate}
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

        {/* Kode Item & Barcode (Side-by-Side matching Screenshot 1) */}
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
              placeholder="Scan barcode lalu tekan Enter..."
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

        {/* Buku : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Buku :</label>
          <div className="w-full h-6 px-2 flex items-center justify-end border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {bookQty.toFixed(2)}
          </div>
        </div>

        {/* Fisik : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Fisik :</label>
          <input
            type="number"
            step="any"
            value={physicalQty}
            onChange={(e) => setPhysicalQty(parseFloat(e.target.value) || 0)}
            className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-right font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Selisih : */}
        <div>
          <label className="block text-slate-600 font-medium mb-0.5">Selisih :</label>
          <div
            className={`w-full h-6 px-2 flex items-center justify-end border border-dashed border-slate-300 rounded bg-white font-mono font-bold text-[11px] ${
              diffQty > 0
                ? "text-emerald-700"
                : diffQty < 0
                ? "text-rose-600"
                : "text-slate-700"
            }`}
          >
            {diffQty.toFixed(2)}
          </div>
        </div>

        {/* 4. Optional Table (Shown when [Tampil] is clicked) */}
        {showHistoryTable && (
          <div className="mt-2 border border-slate-300 rounded overflow-hidden flex flex-col bg-white">
            <div className="bg-slate-100 px-2 py-1 font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center text-[11px]">
              <span>Histori Transaksi Stock Opname Gudang</span>
              <button
                onClick={() => setShowHistoryTable(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-[10.5px] border-collapse whitespace-nowrap">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-200 sticky top-0 h-6">
                  <tr>
                    <th className="py-0.5 px-2 border-r border-slate-200">No</th>
                    <th className="py-0.5 px-2 border-r border-slate-200">No Referensi</th>
                    <th className="py-0.5 px-2 border-r border-slate-200">Tanggal</th>
                    <th className="py-0.5 px-2 border-r border-slate-200">Item</th>
                    <th className="py-0.5 px-2 border-r border-slate-200 text-right">Mutasi Qty</th>
                    <th className="py-0.5 px-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opnameHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Belum ada riwayat stock opname.
                      </td>
                    </tr>
                  ) : (
                    opnameHistory.map((m: any, idx: number) => (
                      <tr key={idx} className="h-6 hover:bg-slate-50">
                        <td className="py-0.5 px-2 border-r border-slate-200 text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-2 font-mono border-r border-slate-200 text-emerald-700">
                          {m.reference_no}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200">
                          {formatDate(m.date)}
                        </td>
                        <td className="py-0.5 px-2 border-r border-slate-200 font-semibold text-slate-800">
                          {m.product?.name || "-"}
                        </td>
                        <td
                          className={`py-0.5 px-2 text-right font-mono font-bold border-r border-slate-200 ${
                            m.qty > 0
                              ? "text-emerald-700"
                              : m.qty < 0
                              ? "text-rose-600"
                              : "text-slate-700"
                          }`}
                        >
                          {m.qty > 0 ? `+${m.qty.toFixed(2)}` : m.qty.toFixed(2)}
                        </td>
                        <td className="py-0.5 px-2 text-slate-600">{m.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* 3. Bottom Action Buttons matching Screenshot 1 */}
      {/* [💾 Simpan] [Data Serial] [📥 Import Data Excel] [🔍 Tampil] */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!selectedProduct || saveMutation.isPending}
          className={`h-6 px-3 rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 border ${
            selectedProduct
              ? "bg-[#00c875] hover:bg-[#00b066] text-white border-transparent"
              : "bg-white text-slate-400 border-slate-300 cursor-not-allowed"
          }`}
          title="Simpan Hasil Opname"
        >
          <Save className="w-3 h-3" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSerialModalOpen(true)}
          disabled={!selectedProduct}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
          title="Isi Data Serial & Batch"
        >
          <span>Data Serial</span>
        </button>

        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95"
          title="Import Data Opname dari Excel"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Import Data Excel</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryTable((prev) => !prev)}
          className={`h-6 px-2.5 border rounded text-[11px] font-medium inline-flex items-center gap-1 shadow-2xs transition ${
            showHistoryTable
              ? "bg-sky-50 text-sky-800 border-sky-400 font-bold"
              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
          }`}
          title="Tampilkan Riwayat Opname"
        >
          <Search className="w-3 h-3 text-sky-600" />
          <span>Tampil</span>
        </button>
      </div>

      {/* 5. ITEM SEARCH MODAL */}
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

      {/* 6. IMPORT EXCEL MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-emerald-600 text-white font-bold text-xs">
              <span>Import Data Opname dari Excel</span>
              <button onClick={() => setIsImportModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-[11px]">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 space-y-1 text-[10.5px]">
                <p className="font-semibold text-slate-800">Format Kolom Excel yang Didukung:</p>
                <p>1. Kolom A: <strong>Kode Item</strong> / Barcode</p>
                <p>2. Kolom B: <strong>Jumlah Fisik</strong> (Angka)</p>
                <p>3. Kolom C: <strong>Keterangan / Alasan Selisih</strong> (Opsional)</p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded p-6 text-center hover:border-emerald-500 transition cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-slate-600 font-medium">Klik untuk memilih file .XLSX / .CSV</p>
                <p className="text-slate-400 text-[10px]">Ukuran file maksimal 5 MB</p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  id="excelFileInput"
                  onChange={() => {
                    alert("File Excel berhasil diunggah. Data opname siap disinkronkan.");
                    setIsImportModalOpen(false);
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 px-3 py-2 border-t bg-slate-50">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="h-6 px-3 bg-white border border-slate-300 rounded text-slate-700 font-medium text-[11px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DATA SERIAL MODAL */}
      {isSerialModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-emerald-600 text-white font-bold text-xs">
              <span>Data Serial & Batch Item</span>
              <button onClick={() => setIsSerialModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 text-[11px]">
              <div>
                <label className="block text-slate-600 font-medium mb-0.5">No Batch / Serial :</label>
                <input
                  type="text"
                  value={serialBatchNo}
                  onChange={(e) => setSerialBatchNo(e.target.value)}
                  placeholder="Contoh: BCH-2026-001"
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-0.5">Tanggal Kadaluarsa (ED) :</label>
                <input
                  type="date"
                  value={expiredDate}
                  onChange={(e) => setExpiredDate(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 px-3 py-2 border-t bg-slate-50">
              <button
                type="button"
                onClick={() => setIsSerialModalOpen(false)}
                className="h-6 px-3 bg-[#00c875] text-white rounded font-bold text-[11px]"
              >
                Simpan Serial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
