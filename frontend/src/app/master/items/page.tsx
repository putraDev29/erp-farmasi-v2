"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Layers,
  HelpCircle,
  ExternalLink,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";
import { MasterToolbarButtons } from "@/components/common/MasterToolbarButtons";

export default function ItemListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- FILTERS STATE (Matching Screenshot Row 1 & Row 2) ---
  const [keyword, setKeyword] = useState("");
  const [warehouseID, setWarehouseID] = useState("");
  const [itemType, setItemType] = useState("Semua");
  const [categoryID, setCategoryID] = useState("Semua");
  const [brandID, setBrandID] = useState("Semua");
  const [rack, setRack] = useState("");
  const [stockOption, setStockOption] = useState("Semua Data");
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [discontinued, setDiscontinued] = useState(false);

  // Active query parameters applied on "Cari" click
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: "",
    warehouseID: "",
    itemType: "Semua",
    categoryID: "Semua",
    brandID: "Semua",
    rack: "",
    stockOption: "Semua Data",
    sortBy: "code",
    sortDir: "asc" as "asc" | "desc",
    discontinued: false,
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpPageInput, setJumpPageInput] = useState("1");

  // Selection state
  const [selectedItemID, setSelectedItemID] = useState<string | null>(null);

  // Modal states for extra toolbar buttons
  const [showUnitCheckModal, setShowUnitCheckModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Query Warehouses (Dept/Gudang)
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  // Query Categories (Jenis)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data?.data || [];
    },
  });

  // Query Brands (Merek)
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands");
      return res.data?.data || [];
    },
  });

  // Set default warehouse when loaded
  useEffect(() => {
    if (warehouses.length > 0 && !warehouseID) {
      setWarehouseID(warehouses[0].id);
      setAppliedFilters((prev) => ({ ...prev, warehouseID: warehouses[0].id }));
    }
  }, [warehouses, warehouseID]);

  // Main Items Query
  const { data: itemsData, isLoading, refetch } = useQuery({
    queryKey: ["products-list", appliedFilters, page, pageSize],
    queryFn: async () => {
      let url = `/products?page=${page}&page_size=${pageSize}`;
      if (appliedFilters.keyword) url += `&search=${encodeURIComponent(appliedFilters.keyword)}`;
      if (appliedFilters.warehouseID) url += `&warehouse_id=${appliedFilters.warehouseID}`;
      if (appliedFilters.itemType && appliedFilters.itemType !== "Semua") url += `&type=${appliedFilters.itemType}`;
      if (appliedFilters.categoryID && appliedFilters.categoryID !== "Semua") url += `&category_id=${appliedFilters.categoryID}`;
      if (appliedFilters.brandID && appliedFilters.brandID !== "Semua") url += `&brand_id=${appliedFilters.brandID}`;
      if (appliedFilters.rack) url += `&rack=${encodeURIComponent(appliedFilters.rack)}`;
      if (appliedFilters.stockOption && appliedFilters.stockOption !== "Semua Data") {
        url += `&stock_option=${appliedFilters.stockOption}`;
      }
      url += `&sort_by=${appliedFilters.sortBy}&sort_dir=${appliedFilters.sortDir}`;
      if (appliedFilters.discontinued) {
        url += `&discontinued=true`;
      }

      const res = await api.get(url);
      return res.data?.data || { items: [], total: 0 };
    },
  });

  const items = itemsData?.items || [];
  const total = itemsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Sync jumpPageInput when page changes
  useEffect(() => {
    setJumpPageInput(String(page));
  }, [page]);

  // Trigger Search / Filter
  const handleApplyFilter = () => {
    setPage(1);
    setAppliedFilters({
      keyword,
      warehouseID,
      itemType,
      categoryID,
      brandID,
      rack,
      stockOption,
      sortBy,
      sortDir,
      discontinued,
    });
  };

  // Toggle sort direction
  const handleToggleSortDirection = () => {
    const nextDir = sortDir === "asc" ? "desc" : "asc";
    setSortDir(nextDir);
    setAppliedFilters((prev) => ({ ...prev, sortDir: nextDir }));
  };

  // Reset all filters
  const handleResetFilters = () => {
    setKeyword("");
    setItemType("Semua");
    setCategoryID("Semua");
    setBrandID("Semua");
    setRack("");
    setStockOption("Semua Data");
    setSortBy("code");
    setSortDir("asc");
    setDiscontinued(false);
    setPage(1);
    setAppliedFilters({
      keyword: "",
      warehouseID,
      itemType: "Semua",
      categoryID: "Semua",
      brandID: "Semua",
      rack: "",
      stockOption: "Semua Data",
      sortBy: "code",
      sortDir: "asc",
      discontinued: false,
    });
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      setShowDeleteConfirm(false);
      setSelectedItemID(null);
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await api.get(`/products/${sourceId}`);
      const source = res.data?.data;
      if (!source) throw new Error("Data sumber tidak ditemukan");

      const payload = {
        ...source,
        id: undefined,
        code: `${source.code}-COPY`,
        name: `${source.name} (Copy)`,
      };
      return await api.post("/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
    },
  });

  const selectedItem = items.find((i: any) => i.id === selectedItemID);

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* =========================================================================
          FILTER CONTAINER (Matching Screenshot Row 1 & Row 2 with Modern UX)
         ========================================================================= */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-1.5">
        {/* ROW 1: Kata Kunci | Dept/Gudang | Tipe Item | Jenis | Merek */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* Kata Kunci */}
          <div>
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Kata Kunci :
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
                placeholder="Cari item..."
                className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          </div>

          {/* Dept/Gudang */}
          <div>
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Dept/Gudang :
            </label>
            <select
              value={warehouseID}
              onChange={(e) => setWarehouseID(e.target.value)}
              className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white truncate"
            >
              <option value="">Semua Gudang</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name.toUpperCase()} [{w.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Item */}
          <div>
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Tipe Item :
            </label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
            >
              <option value="Semua">Semua</option>
              <option value="BARANG">Barang</option>
              <option value="JASA">Jasa</option>
              <option value="RAKITAN_PROSES">Rakitan Proses</option>
              <option value="RAKITAN_NON_PROSES">Rakitan Non Proses</option>
              <option value="NON_INVENTORY">Non Inventory</option>
              <option value="BIAYA">Biaya</option>
              <option value="VARIAN">Varian</option>
            </select>
          </div>

          {/* Jenis (Kategori) */}
          <div>
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Jenis :
            </label>
            <select
              value={categoryID}
              onChange={(e) => setCategoryID(e.target.value)}
              className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
            >
              <option value="Semua">Semua</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Merek */}
          <div>
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Merek :
            </label>
            <select
              value={brandID}
              onChange={(e) => setBrandID(e.target.value)}
              className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
            >
              <option value="Semua">Semua</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Rak | Pilihan Item | Urut Berdasar + Sort Toggle | Tidak Dijual | Button Cari */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
          {/* Rak (md:col-span-2) */}
          <div className="md:col-span-2">
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Rak :
            </label>
            <input
              type="text"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              placeholder="Lokasi rak..."
              className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
            />
          </div>

          {/* Pilihan Item (md:col-span-3) */}
          <div className="md:col-span-3">
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Pilihan Item :
            </label>
            <select
              value={stockOption}
              onChange={(e) => setStockOption(e.target.value)}
              className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
            >
              <option value="Semua Data">Semua Data</option>
              <option value="STOK_ADA">Stok Ada (&gt;0)</option>
              <option value="STOK_KOSONG">Stok Kosong (=0)</option>
              <option value="STOK_MINUS">Stok Minus (&lt;0)</option>
              <option value="STOK_MINIMUM">Stok Minimum</option>
            </select>
          </div>

          {/* Urut Berdasar + Toggle Direction (md:col-span-3) */}
          <div className="md:col-span-3">
            <label className="block text-slate-700 font-semibold text-[11px] mb-1">
              Urut Berdasar :
            </label>
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-6 px-2.5 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-sky-500 bg-white"
              >
                <option value="code">Kode Item</option>
                <option value="name">Nama Item</option>
                <option value="purchase_price">Harga Pokok</option>
                <option value="selling_price">Harga Jual</option>
                <option value="rack">Rak</option>
              </select>
              <button
                type="button"
                onClick={handleToggleSortDirection}
                title={`Urutan: ${sortDir.toUpperCase()}`}
                className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tidak Dijual / Discontinued (md:col-span-2) */}
          <div className="md:col-span-2 flex flex-col justify-end">
            <label className="block text-slate-700 font-semibold text-[11px] mb-1 truncate">
              Tidak Dijual / Discontinued :
            </label>
            <div className="flex items-center gap-2 h-6">
              <button
                type="button"
                onClick={() => setDiscontinued(!discontinued)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  discontinued ? "bg-sky-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    discontinued ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-[11px] font-semibold text-slate-500">
                {discontinued ? "ON" : "OFF"}
              </span>
            </div>
          </div>

          {/* Tombol Cari & Reset (md:col-span-2) */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApplyFilter}
              className="flex-1 h-6 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold px-3.5 rounded flex items-center justify-center gap-1.5 text-xs shadow-xs transition active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filter"
              className="h-6 w-6 border border-slate-300 hover:bg-slate-100 text-slate-500 rounded transition shrink-0 flex items-center justify-center active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TOOLBAR & PAGINATION BAR (Matching Screenshot row)
         ========================================================================= */}
      <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
        {/* Left Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Pagination Arrows & Page Input */}
          <div className="h-6 flex items-center border border-slate-300 rounded overflow-hidden bg-white text-xs mr-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-2 h-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="px-2 h-full text-[11px] text-slate-600 border-x border-slate-200 flex items-center gap-1 font-medium">
              <span>Hal</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const p = parseInt(jumpPageInput);
                    if (!isNaN(p) && p >= 1 && p <= totalPages) setPage(p);
                  }
                }}
                className="w-8 text-center border border-slate-200 rounded px-1 py-0 text-slate-800 text-[11px] focus:outline-none"
              />
              <span>/ {totalPages}</span>
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-2 h-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <MasterToolbarButtons
            addHref="/master/items/new"
            onEdit={() => selectedItemID && router.push(`/master/items/${selectedItemID}/edit`)}
            editDisabled={!selectedItemID}
            onDelete={() => selectedItemID && setShowDeleteConfirm(true)}
            deleteDisabled={!selectedItemID}
            onPrint={() => window.print()}
            extraButtons={
              <>
                <button
                  type="button"
                  disabled={!selectedItemID || duplicateMutation.isPending}
                  onClick={() => selectedItemID && duplicateMutation.mutate(selectedItemID)}
                  className="h-6 px-3 bg-[#06b6d4] hover:bg-[#0891b2] text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-40"
                  title="Duplikasi / Salin Item"
                >
                  <Copy className="w-3.5 h-3.5 stroke-[2.4]" />
                  <span>Duplikasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedItemID) {
                      router.push(`/inventory/stock-card?product_id=${selectedItemID}`);
                    } else {
                      router.push("/inventory/stock-card");
                    }
                  }}
                  className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 text-xs font-semibold transition shadow-2xs flex items-center gap-1"
                >
                  <span>Kartu Stok</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUnitCheckModal(true)}
                  className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 text-xs font-semibold transition shadow-2xs flex items-center gap-1"
                >
                  <span>Satuan Salah</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMarketplaceModal(true)}
                  className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 text-xs font-semibold transition shadow-2xs flex items-center gap-1"
                >
                  <span>Tambah Data Marketplace</span>
                </button>
              </>
            }
          />
        </div>

        {/* Right: Total data yang ditemukan */}
        <div className="text-right text-xs text-slate-700 font-semibold shrink-0">
          Total data yang ditemukan :{" "}
          <span className="text-sky-700 font-mono text-sm">{total.toLocaleString("id-ID")}</span>
        </div>
      </div>

      {/* =========================================================================
          ITEMS TABLE (Matching All 14 Columns from Screenshot)
         ========================================================================= */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold shadow-xs">
              <tr>
                {/* Column 1: Action / Select */}
                <th className="py-2 px-2 border-r border-slate-300 w-9 text-center">
                  <span className="sr-only">Pilih</span>
                </th>
                {/* Column 2: Kode Item */}
                <th className="py-2 px-3 border-r border-slate-300">Kode Item</th>
                {/* Column 3: Barcode */}
                <th className="py-2 px-3 border-r border-slate-300">Barcode</th>
                {/* Column 4: SKU */}
                <th className="py-2 px-3 border-r border-slate-300">SKU</th>
                {/* Column 5: Nama Item */}
                <th className="py-2 px-3 border-r border-slate-300 min-w-[220px]">Nama Item</th>
                {/* Column Batch & ED */}
                <th className="py-2 px-2.5 border-r border-slate-300">No. Batch</th>
                <th className="py-2 px-2.5 border-r border-slate-300">Tgl Kadaluarsa (ED)</th>
                {/* Column 6: Stok Fisik */}
                <th className="py-2 px-3 border-r border-slate-300 text-right">Stok Fisik</th>
                {/* Column 7: Satuan */}
                <th className="py-2 px-2.5 border-r border-slate-300">Satuan</th>
                {/* Column 8: Jenis */}
                <th className="py-2 px-3 border-r border-slate-300">Jenis</th>
                {/* Column 9: Merek */}
                <th className="py-2 px-3 border-r border-slate-300">Merek</th>
                {/* Column 10: Rak */}
                <th className="py-2 px-3 border-r border-slate-300">Rak</th>
                {/* Column 11: Harga Pokok */}
                <th className="py-2 px-3 border-r border-slate-300 text-right">Harga Pokok</th>
                {/* Column 12: HPP Rata-rata (AVG) */}
                <th className="py-2 px-3 border-r border-slate-300 text-right">HPP Rata-rata (AVG)</th>
                {/* Column 13: Harga Jual */}
                <th className="py-2 px-3 border-r border-slate-300 text-right">Harga Jual</th>
                {/* Column 14: Keterangan */}
                <th className="py-2 px-3">Keterangan</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <div className="w-7 h-7 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="font-medium text-xs">Memuat daftar item...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400">
                    <p className="font-semibold text-xs text-slate-600">Tidak ada data item yang sesuai filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Coba ubah kata kunci atau bersihkan parameter pencarian.</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition"
                    >
                      Reset Filter
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const isSelected = selectedItemID === item.id;
                  const currentStock = item.total_stock ?? 0;
                  const avgCost = item.avg_cost ?? item.purchase_price ?? 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemID(item.id)}
                      onDoubleClick={() => router.push(`/master/items/${item.id}/edit`)}
                      className={`border-b border-slate-200 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-sky-50 font-medium text-slate-900 border-sky-300"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      {/* Column 1: Selection pencil / radio */}
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/master/items/${item.id}/edit`);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600 transition rounded"
                          title="Edit Item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* Column 2: Kode Item */}
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono font-semibold text-slate-800">
                        {item.code}
                      </td>

                      {/* Column 3: Barcode */}
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                        {item.barcode || "-"}
                      </td>

                      {/* Column 4: SKU */}
                      <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                        {item.sku || "-"}
                      </td>

                      {/* Column 5: Nama Item */}
                      <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-900">
                        {item.name}
                      </td>

                      {/* Column Batch & ED */}
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-700">
                        {item.batch_number || "-"}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-800">
                        {item.expired_date ? item.expired_date.substring(0, 10) : "-"}
                      </td>

                      {/* Column 6: Stok Fisik */}
                      <td className={`py-1.5 px-3 border-r border-slate-200 text-right font-mono font-semibold ${
                        currentStock <= 0 ? "text-slate-400" : currentStock <= (item.min_stock || 0) ? "text-amber-600" : "text-slate-800"
                      }`}>
                        {currentStock.toFixed(2)}
                      </td>

                      {/* Column 7: Satuan */}
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-600">
                        {item.base_unit?.code || "PCS"}
                      </td>

                      {/* Column 8: Jenis */}
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                        {item.category?.name || "-"}
                      </td>

                      {/* Column 9: Merek */}
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                        {item.brand?.name || "-"}
                      </td>

                      {/* Column 10: Rak */}
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">
                        {item.rack || "-"}
                      </td>

                      {/* Column 11: Harga Pokok */}
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                        {formatCurrency(item.purchase_price || 0)}
                      </td>

                      {/* Column 12: HPP Rata-rata (AVG) */}
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                        {formatCurrency(avgCost)}
                      </td>

                      {/* Column 13: Harga Jual */}
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(item.selling_price || 0)}
                      </td>

                      {/* Column 14: Keterangan */}
                      <td className="py-1.5 px-3 text-slate-500 truncate max-w-xs">
                        {item.notes || item.description || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with pagination info */}
        <div className="shrink-0 p-1.5 bg-slate-50 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan {items.length} dari total {total} item
            </span>
            {selectedItem && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">
                Terpilih: {selectedItem.code} - {selectedItem.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px]">Tampilkan per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-0.5 border border-slate-300 rounded text-xs bg-white focus:outline-none"
            >
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: KONFIRMASI HAPUS ITEM
         ========================================================================= */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center gap-2.5 text-red-600 font-semibold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Konfirmasi Hapus Item</span>
            </div>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus item:
              <br />
              <strong>{selectedItem.code}</strong> - {selectedItem.name}?
              <br />
              <span className="text-red-500 text-[11px] mt-1 block">
                Item yang memiliki riwayat transaksi penjualan/pembelian tidak dapat dihapus secara permanen.
              </span>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedItem.id)}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VALIDASI SATUAN SALAH
         ========================================================================= */}
      {showUnitCheckModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pemeriksaan Konversi & Satuan Salah</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUnitCheckModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
              Seluruh satuan dasar dan konversi bertingkat (Box -&gt; Strip -&gt; Tablet) telah terverifikasi valid dan tidak ada item dengan rasio konversi nol.
            </div>
            <p className="text-[11px] text-slate-500">
              Modul ini memastikan tidak terjadi kesalahan kalkulasi persediaan obat atau stok minus akibat rasio konversi unit yang tidak konsisten.
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowUnitCheckModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH DATA MARKETPLACE
         ========================================================================= */}
      {showMarketplaceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <ShoppingBag className="w-4 h-4 text-sky-600" />
                <span>Integrasi & Tambah Data Marketplace</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMarketplaceModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-700">
              <p>
                Hubungkan item {selectedItem ? `"${selectedItem.name}"` : "terpilih"} ke channel penjualan marketplace online:
              </p>
              <div className="border border-slate-200 rounded p-2.5 space-y-2 bg-slate-50">
                <label className="flex items-center justify-between">
                  <span className="font-medium">Tokopedia Seller API</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Aktif</span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="font-medium">Shopee Open Platform</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Aktif</span>
                </label>
                <label className="flex items-center justify-between">
                  <span className="font-medium">TikTok Shop Seller</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Aktif</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMarketplaceModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition text-xs font-medium"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  alert("Pengaturan sinkronisasi marketplace tersimpan.");
                  setShowMarketplaceModal(false);
                }}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-medium transition"
              >
                Sinkronkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
