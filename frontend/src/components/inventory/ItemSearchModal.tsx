"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

interface ItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedItems: any[]) => void;
}

export default function ItemSearchModal({
  isOpen,
  onClose,
  onSelect,
}: ItemSearchModalProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [shelf, setShelf] = useState("");
  const [sortBy, setSortBy] = useState("Kode Item");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: productsData, isLoading } = useQuery({
    queryKey: [
      "products-modal-search",
      keyword,
      selectedCategory,
      selectedBrand,
      shelf,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (selectedCategory && selectedCategory !== "all") params.append("category_id", selectedCategory);
      if (selectedBrand && selectedBrand !== "all") params.append("brand_id", selectedBrand);
      params.append("page_size", "200");

      const res = await api.get(`/products?${params.toString()}`);
      return res.data?.data?.items || [];
    },
    enabled: isOpen,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
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

  if (!isOpen) return null;

  const products = productsData || [];
  const filteredProducts = products.filter((p: any) => {
    if (shelf && !p.rack?.toLowerCase().includes(shelf.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginated = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirmSelect = () => {
    const selected = filteredProducts.filter((p: any) => selectedIds[p.id]);
    if (selected.length === 0 && paginated.length > 0) {
      // If none explicitly checked, pick current highlighted row
      return;
    }
    onSelect(selected);
    onClose();
  };

  const renderPaginationToolbar = () => (
    <div className="flex items-center justify-between py-1 text-[11px]">
      <div className="flex items-center gap-1.5">
        <div className="inline-flex items-center border border-slate-300 rounded bg-white text-[11px] text-slate-700 h-6">
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

        <button
          type="button"
          onClick={handleConfirmSelect}
          className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>Pilih...</span>
        </button>

        <button
          type="button"
          className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        >
          <span>= Informasi</span>
        </button>
      </div>

      <div className="text-[11px] text-slate-600 font-medium">
        Total data yang ditemukan : <span className="font-bold text-slate-800">{filteredProducts.length.toLocaleString("id-ID")}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-2 sm:p-4 select-none">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-300 overflow-hidden text-[11px]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-300">
          <h2 className="text-xs font-bold text-slate-800">Cari Item...</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Filter Box (Matching Screenshot 6) */}
        <div className="p-2 border-b border-slate-200 bg-white space-y-1.5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Kode / nama item..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Dept/Gudang :</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">UTAMA - APOTEK BERKAT</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Jenis :</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Semua</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Merek :</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Semua</option>
                {brands.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Rak :</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                placeholder="Lokasi rak..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Pilihan Item :</label>
              <select
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Semua Data">Semua Data</option>
                <option value="Stok Tersedia">Stok Tersedia</option>
                <option value="Stok Habis">Stok Habis</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Kode Item">Kode Item</option>
                  <option value="Nama Item">Nama Item</option>
                  <option value="Harga">Harga</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="h-6 w-7 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-100 bg-white"
                  title="Arah Urutan"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            </div>
            <div>
              <button
                type="button"
                className="h-6 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded text-[11px] inline-flex items-center gap-1 font-semibold"
              >
                <Search className="w-3 h-3" />
                <span>Cari</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Toolbar */}
        <div className="px-3">
          {renderPaginationToolbar()}
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto px-3 border-t border-b border-slate-300 min-h-[300px]">
          <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold shadow-2xs">
              <tr>
                <th className="py-1 px-2 border-r border-slate-200 text-center w-8">✓</th>
                <th className="py-1 px-2 border-r border-slate-200">Kode Item</th>
                <th className="py-1 px-2 border-r border-slate-200">Barcode</th>
                <th className="py-1 px-2 border-r border-slate-200">SKU</th>
                <th className="py-1 px-2 border-r border-slate-200">Nama Item</th>
                <th className="py-1 px-2 border-r border-slate-200 text-right">Stok Fisik</th>
                <th className="py-1 px-2 border-r border-slate-200 text-center">Satuan</th>
                <th className="py-1 px-2 border-r border-slate-200">Jenis</th>
                <th className="py-1 px-2 border-r border-slate-200">Merek</th>
                <th className="py-1 px-2 border-r border-slate-200">Rak</th>
                <th className="py-1 px-2 border-r border-slate-200 text-right">Harga Jual</th>
                <th className="py-1 px-2">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Memuat daftar item...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center text-slate-400">
                    Tidak ada item yang sesuai filter
                  </td>
                </tr>
              ) : (
                paginated.map((p: any) => {
                  const isChecked = !!selectedIds[p.id];
                  return (
                    <tr
                      key={p.id}
                      onClick={() => toggleSelect(p.id)}
                      className={`border-b border-slate-200 cursor-pointer transition ${
                        isChecked ? "bg-amber-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-1 px-2 border-r border-slate-200 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-medium text-slate-800">
                        {p.code}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                        {p.barcode || "-"}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                        {p.sku || "-"}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-medium text-slate-800">
                        {p.name}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right text-slate-700">
                        {(p.current_stock ?? p.stock ?? 0).toFixed(2)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-center text-slate-600">
                        {p.unit_name || p.unit?.name || "PCS"}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                        {p.category?.name || "BHP"}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                        {p.brand?.name || "-"}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-slate-600">
                        {p.rack || "BHP"}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right text-slate-800 font-medium">
                        {formatCurrency(p.sale_price || 0)}
                      </td>
                      <td className="py-1 px-2 text-slate-600 max-w-xs truncate">
                        {p.description || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Toolbar */}
        <div className="px-3 pb-2 pt-1 bg-white">
          {renderPaginationToolbar()}
        </div>
      </div>
    </div>
  );
}
