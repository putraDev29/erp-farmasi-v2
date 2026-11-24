"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Settings as ProcessIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import ItemSearchModal from "@/components/inventory/ItemSearchModal";
import { sortTableData } from "@/components/common/TableSortSelect";

export default function StockMinimumPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Screenshot 2 (2 Rows)
  const [itemFrom, setItemFrom] = useState("");
  const [itemTo, setItemTo] = useState("");
  const [selectedType, setSelectedType] = useState("-- Semua Jenis --");
  const [selectedBrand, setSelectedBrand] = useState("-- Semua Merek --");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [warehouseId, setWarehouseId] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemTarget, setItemTarget] = useState<"from" | "to">("from");
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Queries
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data?.data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands");
      return res.data?.data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data?.data || [];
    },
  });

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["stock-minimum-products"],
    queryFn: async () => {
      const res = await api.get("/products?page_size=500");
      return res.data?.data?.items || res.data?.data || [];
    },
  });

  // Set default warehouse
  React.useEffect(() => {
    if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter Item Dari - Item Sampai (by Code)
    if (itemFrom) {
      list = list.filter((p: any) => (p.code || "").localeCompare(itemFrom) >= 0);
    }
    if (itemTo) {
      list = list.filter((p: any) => (p.code || "").localeCompare(itemTo) <= 0);
    }

    // Filter Jenis / Kategori
    if (selectedType !== "-- Semua Jenis --") {
      list = list.filter(
        (p: any) => p.category?.name === selectedType || p.category_id === selectedType
      );
    }

    // Filter Merek
    if (selectedBrand !== "-- Semua Merek --") {
      list = list.filter(
        (p: any) => p.brand?.name === selectedBrand || p.brand_id === selectedBrand
      );
    }

    // Filter Supplier
    if (selectedSupplier) {
      list = list.filter(
        (p: any) =>
          p.supplier?.name === selectedSupplier ||
          p.supplier?.code === selectedSupplier ||
          p.supplier_id === selectedSupplier
      );
    }

    // Sort
    return sortTableData(list, sortOption, {
      getCode: (p: any) => p.code,
      getName: (p: any) => p.name,
      getDate: (p: any) => p.created_at,
    });
  }, [
    products,
    itemFrom,
    itemTo,
    selectedType,
    selectedBrand,
    selectedSupplier,
    sortOption,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginated = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenItemSearch = (target: "from" | "to") => {
    setItemTarget(target);
    setIsItemModalOpen(true);
  };

  const renderPaginationToolbar = () => (
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
          Hal {filteredProducts.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || filteredProducts.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPage(1);
          refetch();
        }}
        className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95"
        title="Proses Filter Data"
      >
        <ProcessIcon className="w-3 h-3 animate-spin-hover" />
        <span>Proses</span>
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
        title="Cetak Laporan Stok Minimum"
      >
        <Printer className="w-3 h-3 text-slate-600" />
        <span>Cetak</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. Header: [< Stock Minimum] + User Context */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Stock Minimum
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {/* 2. Filter Section matching Screenshot 2 (2 Rows) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-2xs">
        {/* ROW 1: Item Dari | Item Sampai | Jenis | Merek */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Item Dari :</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={itemFrom}
                onChange={(e) => setItemFrom(e.target.value)}
                placeholder="Kode item..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => handleOpenItemSearch("from")}
                className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Item Sampai :</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={itemTo}
                onChange={(e) => setItemTo(e.target.value)}
                placeholder="Kode item..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => handleOpenItemSearch("to")}
                className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Jenis :</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="-- Semua Jenis --">-- Semua Jenis --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.name}>
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
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="-- Semua Merek --">-- Semua Merek --</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Supplier | Urut Berdasar | Dept/Gudang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Supplier :</label>
            <div className="flex gap-1">
              <input
                type="text"
                readOnly
                value={selectedSupplier}
                placeholder="Select..."
                onClick={() => setIsSupplierModalOpen(true)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white cursor-pointer hover:border-sky-500 truncate"
              />
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 font-medium shadow-2xs truncate cursor-pointer"
            >
              <option value="created_at_desc">1. Urutan sesuai waktu input paling atas</option>
              <option value="code_asc">2. Kode (A - Z)</option>
              <option value="code_desc">3. Kode (Z - A)</option>
              <option value="name_asc">4. Nama (A - Z)</option>
              <option value="name_desc">5. Nama (Z - A)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-600 font-semibold mb-0.5">Dept/Gudang :</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500"
            >
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Top Toolbar: Pagination + [⚙️ Proses] + [🖨️ Cetak] */}
      <div className="shrink-0">{renderPaginationToolbar()}</div>

      {/* 4. Table matching Screenshot 2 (7 Columns) */}
      {/* Kode Item | Nama Item | Satuan | Merek | Stok | Stok Min | Supplier */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Item</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama Item</th>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center">Satuan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Merek</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Stok</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Stok Min</th>
              <th className="py-0.5 px-2.5">Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  Memuat data stok minimum...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              paginated.map((p: any) => {
                const stock = Number(p.stock || 0);
                const minStock = Number(p.min_stock || 0);
                const isUnder = stock < minStock && minStock > 0;

                return (
                  <tr
                    key={p.id}
                    className={`h-6 transition hover:bg-slate-50 ${
                      isUnder ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <td className="py-0.5 px-2.5 font-mono border-r border-slate-200">
                      {p.code}
                    </td>
                    <td className="py-0.5 px-2.5 font-semibold text-slate-800 border-r border-slate-200 max-w-[280px] truncate">
                      {p.name}
                    </td>
                    <td className="py-0.5 px-2 text-center text-slate-600 border-r border-slate-200">
                      {p.base_unit?.name || p.unit_name || "PCS"}
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-600 border-r border-slate-200">
                      {p.brand?.name || "-"}
                    </td>
                    <td
                      className={`py-0.5 px-2.5 text-right font-mono font-medium border-r border-slate-200 ${
                        stock <= 0 ? "text-rose-700 font-bold" : "text-slate-800"
                      }`}
                    >
                      {stock.toFixed(2)}
                    </td>
                    <td className="py-0.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                      {minStock.toFixed(2)}
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-600 truncate max-w-[180px]">
                      {p.supplier?.name || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Toolbar matching Screenshot 2 */}
      <div className="shrink-0 pt-0.5">
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
            Hal {filteredProducts.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || filteredProducts.length === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. ITEM SEARCH MODAL */}
      <ItemSearchModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSelect={(items: any[]) => {
          if (items && items.length > 0) {
            if (itemTarget === "from") {
              setItemFrom(items[0].code || "");
            } else {
              setItemTo(items[0].code || "");
            }
          }
          setIsItemModalOpen(false);
        }}
      />

      {/* 2. SUPPLIER SEARCH MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-emerald-600 text-white font-bold text-xs">
              <span>Pilih Supplier</span>
              <button onClick={() => setIsSupplierModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto divide-y divide-slate-100 text-[11px]">
              <div
                onClick={() => {
                  setSelectedSupplier("");
                  setIsSupplierModalOpen(false);
                }}
                className="p-1.5 hover:bg-slate-50 cursor-pointer font-semibold text-slate-700"
              >
                -- Semua Supplier --
              </div>
              {suppliers.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSupplier(s.name);
                    setIsSupplierModalOpen(false);
                  }}
                  className="p-1.5 hover:bg-sky-50 cursor-pointer text-slate-800 flex justify-between"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="font-mono text-slate-500 text-[10px]">{s.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
