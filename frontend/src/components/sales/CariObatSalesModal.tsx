"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Package,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

interface CariObatSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  saleType?: "APOTEK" | "PBF"; // APOTEK: retail sale, PBF: wholesale B2B distributor sale
  warehouseId?: string;
}

export const CariObatSalesModal: React.FC<CariObatSalesModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  saleType = "APOTEK",
  warehouseId,
}) => {
  // Filters matching Ketoko Spec (Image 2)
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState(warehouseId || "all");
  const [selectedDrugClass, setSelectedDrugClass] = useState("Semua");
  const [selectedBrand, setSelectedBrand] = useState("Semua");
  const [rackFilter, setRackFilter] = useState("");
  const [itemChoice, setItemChoice] = useState("Semua Data");
  const [distributionFilter, setDistributionFilter] = useState<string>(
    saleType === "APOTEK" ? "APOTEK_ELIGIBLE" : "ALL"
  );
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected item row & info modal
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Queries for dropdown filters
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Query products with pagination & filters
  const { data: resultData, isLoading, refetch } = useQuery({
    queryKey: [
      "cari-obat-sales-modal",
      keyword,
      selectedWarehouse,
      selectedDrugClass,
      selectedBrand,
      rackFilter,
      itemChoice,
      distributionFilter,
      sortBy,
      sortDir,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      if (keyword) params.append("search", keyword);
      if (selectedWarehouse && selectedWarehouse !== "all") {
        params.append("warehouse_id", selectedWarehouse);
      }
      if (selectedBrand && selectedBrand !== "Semua") {
        params.append("brand_id", selectedBrand);
      }
      if (rackFilter) {
        params.append("rack", rackFilter);
      }
      if (selectedDrugClass && selectedDrugClass !== "Semua") {
        params.append("drug_classification", selectedDrugClass);
      }

      // Pharmacy vs PBF Filter
      if (distributionFilter === "APOTEK_ELIGIBLE") {
        params.append("target_facility", "apotek");
      } else if (distributionFilter === "PBF_ONLY") {
        params.append("distribution_channel", "PBF_ONLY");
      } else if (distributionFilter === "ALL_CHANNEL") {
        params.append("distribution_channel", "ALL");
      }

      // Stock choice
      if (itemChoice === "Ada Stok") {
        params.append("in_stock", "true");
      } else if (itemChoice === "Dibawah Stok Minimum") {
        params.append("low_stock", "true");
      }

      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/products?${params.toString()}`);
      return res.data?.data || { items: [], total: 0 };
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const rawItems = resultData?.items || [];
  const items =
    itemChoice === "Ada Stok"
      ? rawItems.filter((it: any) => (it.total_stock || 0) > 0)
      : itemChoice === "Stok Habis"
      ? rawItems.filter((it: any) => (it.total_stock || 0) <= 0)
      : rawItems;

  const total = resultData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleChoose = (item: any) => {
    if (!item) return;
    // Check regulatory restriction: if transaction is APOTEK, PBF_ONLY items cannot be sold!
    if (saleType === "APOTEK" && (item.distribution_channel === "PBF_ONLY" || item.is_sold_in_pharmacy === false)) {
      alert(
        `PERINGATAN REGULASI BPOM!\nObat "${item.name}" bertanda KHUSUS PBF / RUMAH SAKIT.\nSesuai CDOB BPOM, obat ini tidak diizinkan untuk dijual bebas di Apotek retail.`
      );
      return;
    }
    onSelect(item);
    onClose();
  };

  const handleToggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const formatClassification = (cls?: string) => {
    if (!cls) return "Obat Bebas";
    switch (cls) {
      case "OBAT_BEBAS":
        return "Obat Bebas";
      case "OBAT_BEBAS_TERBATAS":
        return "Obat Bebas Terbatas";
      case "OBAT_KERAS":
        return "Obat Keras";
      case "PSIKOTROPIKA":
        return "Psikotropika";
      case "NARKOTIKA":
        return "Narkotika";
      case "PREKURSOR":
        return "Prekursor";
      case "OOT":
        return "OOT (Obat Tertentu)";
      case "ALKES":
        return "Alkes";
      default:
        return cls;
    }
  };

  // Render navigation toolbar (Hal, Pilih, Informasi) matching Image 2
  const renderNavToolbar = (isBottom = false) => (
    <div className="flex items-center justify-between text-[11px] py-1">
      <div className="flex items-center gap-1.5">
        {/* Pagination Pill */}
        <div className="inline-flex items-center border border-slate-300 rounded bg-white text-slate-700 h-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold px-2.5 h-full flex items-center text-[11px]">
            Hal {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tombol Pilih (Light Green Button matching Image 2: #a6e5b5) */}
        <button
          type="button"
          disabled={!selectedProduct}
          onClick={() => handleChoose(selectedProduct)}
          className="h-6 px-3 bg-[#a6e5b5] hover:bg-[#8ee0a1] text-emerald-950 font-bold border border-emerald-300 rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>Pilih...</span>
        </button>

        {/* Tombol Informasi (Cyan Button matching Image 2: #a5f3fc) */}
        <button
          type="button"
          disabled={!selectedProduct}
          onClick={() => selectedProduct && setInfoModalOpen(true)}
          className="h-6 px-3 bg-[#a5f3fc] hover:bg-[#67e8f9] text-cyan-950 font-bold border border-cyan-300 rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Informasi</span>
        </button>
      </div>

      {!isBottom ? (
        <span className="text-slate-600 font-semibold text-[11px]">
          Total data yang ditemukan : <strong>{total}</strong>
        </span>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="h-6 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] transition shadow-2xs"
        >
          Tutup
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Title Bar matching Image 2 */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Cari Item...</h2>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                saleType === "PBF"
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
              }`}
            >
              Mode Penjualan: {saleType === "PBF" ? "PBF / B2B Grosir" : "Apotek Retail"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Container (Row 1 & Row 2 matching Image 2) */}
        <div className="p-3 bg-white border-b border-slate-300 space-y-2 shrink-0">
          {/* ROW 1: Kata Kunci | Dept/Gudang | Jenis | Merek | Rak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-[11px] items-center">
            {/* Kata Kunci */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Kata Kunci :</label>
              <input
                type="text"
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refetch()}
                placeholder="Cari kode, barcode, nama..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>

            {/* Dept/Gudang */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Dept/Gudang :</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-medium"
              >
                <option value="all">UTAMA - APOTEK BERKAT</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Jenis (Golongan Obat) */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Jenis :</label>
              <select
                value={selectedDrugClass}
                onChange={(e) => setSelectedDrugClass(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="Semua">Semua</option>
                <option value="OBAT_BEBAS">Obat Bebas</option>
                <option value="OBAT_BEBAS_TERBATAS">Obat Bebas Terbatas</option>
                <option value="OBAT_KERAS">Obat Keras (Resep)</option>
                <option value="PSIKOTROPIKA">Psikotropika</option>
                <option value="NARKOTIKA">Narkotika</option>
                <option value="PREKURSOR">Prekursor Farmasi</option>
                <option value="OOT">Obat Tertentu (OOT)</option>
                <option value="ALKES">Alkes &amp; BHP</option>
              </select>
            </div>

            {/* Merek */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Merek :</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="Semua">Semua</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rak */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Rak :</label>
              <input
                type="text"
                value={rackFilter}
                onChange={(e) => setRackFilter(e.target.value)}
                placeholder="Lokasi Rak..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          </div>

          {/* ROW 2: Pilihan Item | Filter Saluran PBF vs Apotek | Urut Berdasar | Button Cari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-[11px] items-center">
            {/* Pilihan Item */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">Pilihan Item :</label>
              <select
                value={itemChoice}
                onChange={(e) => setItemChoice(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-medium"
              >
                <option value="Semua Data">Semua Data</option>
                <option value="Ada Stok">Hanya yang Ada Stok</option>
                <option value="Stok Habis">Stok Habis</option>
                <option value="Dibawah Stok Minimum">Dibawah Stok Minimum</option>
              </select>
            </div>

            {/* Filter Khusus Saluran: Obat PBF vs Apotek Retail */}
            <div className="md:col-span-3">
              <label className="block text-slate-700 font-semibold mb-0.5">
                Filter Saluran Obat :
              </label>
              <select
                value={distributionFilter}
                onChange={(e) => setDistributionFilter(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white font-semibold"
              >
                <option value="ALL">Semua Item (Apotek &amp; PBF)</option>
                <option value="APOTEK_ELIGIBLE">Khusus Obat Apotek Retail (Resep/OTC)</option>
                <option value="PBF_ONLY">Khusus PBF / Rumah Sakit (B2B)</option>
              </select>
            </div>

            {/* Urut Berdasar & Sort Dir */}
            <div className="md:col-span-4">
              <label className="block text-slate-700 font-semibold mb-0.5">Urut Berdasar :</label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                >
                  <option value="code">Kode Item</option>
                  <option value="name">Nama Item</option>
                  <option value="stock">Stok Fisik</option>
                  <option value="selling_price">Harga Jual</option>
                  <option value="drug_classification">Jenis / Golongan</option>
                </select>
                <button
                  type="button"
                  onClick={handleToggleSort}
                  className="h-6 w-6 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 text-slate-600 shrink-0"
                  title={`Urutan: ${sortDir.toUpperCase()}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tombol Cari (Sky Blue Button matching Image 2) */}
            <div className="md:col-span-2 flex items-end pt-3">
              <button
                type="button"
                onClick={() => refetch()}
                className="w-full h-7 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Cari</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Control Bar (Pilih, Informasi, Hal) matching Image 2 */}
        <div className="px-3 bg-slate-50 border-b border-slate-200 shrink-0">
          {renderNavToolbar(false)}
        </div>

        {/* Table Container (12 Columns matching Image 2 adapted for Penjualan) */}
        <div className="flex-1 min-h-0 bg-white overflow-auto">
          <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
              <tr>
                <th className="py-0.5 px-2 border-r border-slate-200 text-center w-8">
                  <Check className="w-3 h-3 mx-auto text-slate-400" />
                </th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Item</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Barcode</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">SKU</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200 min-w-[200px]">Nama Item</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Stok Fisik</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Satuan</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Jenis</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Merek</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200">Rak</th>
                <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Harga Jual</th>
                <th className="py-0.5 px-2.5 text-right">Harga Grosir/PBF</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400">
                    Memuat data master obat &amp; barang...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-400">
                    Tidak ada item yang ditemukan sesuai filter.
                  </td>
                </tr>
              ) : (
                items.map((prod: any) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  const unitName = prod.base_unit?.name || prod.unit_name || "Pcs / Buah";
                  const brandName = prod.brand?.name || "-";
                  const rackName = prod.rack || prod.storage_location || "-";
                  const isPbfOnly = prod.distribution_channel === "PBF_ONLY" || prod.is_sold_in_pharmacy === false;

                  return (
                    <tr
                      key={prod.id}
                      onClick={() => setSelectedProduct(prod)}
                      onDoubleClick={() => handleChoose(prod)}
                      className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                        isSelected
                          ? "bg-sky-100/90 text-sky-950 font-medium"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Radio column */}
                      <td className="py-0.5 px-2 border-r border-slate-100 text-center">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border mx-auto flex items-center justify-center ${
                            isSelected
                              ? "border-sky-600 bg-sky-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </td>

                      {/* Kode Item */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-slate-800">
                        {prod.code}
                      </td>

                      {/* Barcode */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                        {prod.barcode || "-"}
                      </td>

                      {/* SKU */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-400">
                        {prod.sku || "-"}
                      </td>

                      {/* Nama Item */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.name}</span>
                          {isPbfOnly && (
                            <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">
                              Khusus PBF/RS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stok Fisik */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-mono font-semibold text-slate-800">
                        {(prod.total_stock || 0).toFixed(2)}
                      </td>

                      {/* Satuan */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                        {unitName}
                      </td>

                      {/* Jenis / Golongan Obat */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                        {formatClassification(prod.drug_classification)}
                      </td>

                      {/* Merek */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-700">
                        {brandName}
                      </td>

                      {/* Rak */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                        {rackName}
                      </td>

                      {/* Harga Jual (Apotek) */}
                      <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-semibold text-emerald-700">
                        {formatCurrency(prod.selling_price || 0)}
                      </td>

                      {/* Harga Grosir / PBF */}
                      <td className="py-0.5 px-2.5 text-right font-semibold text-blue-700">
                        {formatCurrency(prod.wholesale_price || (prod.selling_price ? prod.selling_price * 0.95 : 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Control Bar (Pilih, Informasi, Hal, Tutup) matching Image 2 */}
        <div className="px-3 bg-slate-50 border-t border-slate-200 shrink-0">
          {renderNavToolbar(true)}
        </div>
      </div>

      {/* POPUP INFORMASI DETAIL ITEM OBAT */}
      {infoModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Informasi Lengkap Item Obat</span>
              </span>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Kode Item :</span>
                <span className="font-mono font-bold text-slate-800">{selectedProduct.code}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Nama Obat / Barang :</span>
                <span className="font-bold text-slate-900 text-right">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Nomor Izin Edar (NIE BPOM) :</span>
                <span className="font-semibold text-emerald-700">{selectedProduct.bpom_number || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Golongan Obat :</span>
                <span className="font-semibold">{formatClassification(selectedProduct.drug_classification)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Saluran Distribusi (CDOB) :</span>
                <span className="font-bold text-blue-700">
                  {selectedProduct.distribution_channel === "PBF_ONLY"
                    ? "Khusus PBF & Rumah Sakit"
                    : "Diizinkan Dijual di Apotek Retail"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Stok Tersedia :</span>
                <span className="font-mono font-bold text-slate-900">
                  {(selectedProduct.total_stock || 0).toFixed(2)} {selectedProduct.base_unit?.name || "Pcs"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Harga Jual Apotek (Retail) :</span>
                <span className="font-bold text-emerald-700">{formatCurrency(selectedProduct.selling_price || 0)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Harga Grosir / PBF :</span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(selectedProduct.wholesale_price || (selectedProduct.selling_price ? selectedProduct.selling_price * 0.95 : 0))}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Merek / Pabrikan :</span>
                <span>{selectedProduct.brand?.name || "-"}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Lokasi Rak Penyimpanan :</span>
                <span>{selectedProduct.rack || selectedProduct.storage_location || "-"}</span>
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setInfoModalOpen(false);
                  handleChoose(selectedProduct);
                }}
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded text-xs transition"
              >
                Pilih Obat Ini
              </button>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="h-7 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
