"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Warehouse as WarehouseIcon,
  Building
} from "lucide-react";
import { api } from "@/lib/api";
import { MasterToolbarButtons } from "@/components/common/MasterToolbarButtons";
import { TableSortSelect, sortTableData } from "@/components/common/TableSortSelect";

export default function WarehousesPage() {
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    code: "",
    name: "",
    function: "Utama",
    description: "",
    account_code: "1-2010 - PERSEDIAAN BARANG",
    address: "",
    phone: "",
    fax: "",
    whatsapp: "",
    email: "",
  });

  // Fetch Warehouses
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses", searchParam],
    queryFn: async () => {
      const res = await api.get(`/warehouses?all=true`);
      return res.data?.data || [];
    },
  });

  const selectedWh = warehouses.find((w: any) => w.id === selectedId);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (isEditing && payload.id) {
        return await api.put(`/warehouses/${payload.id}`, payload);
      }
      return await api.post("/warehouses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan gudang/departemen: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus gudang: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      code: "",
      name: "",
      function: "Utama",
      description: "",
      account_code: "1-2010 - PERSEDIAAN BARANG",
      address: "",
      phone: "",
      fax: "",
      whatsapp: "",
      email: "",
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (item?: any) => {
    const target = item || selectedWh;
    if (!target) {
      alert("Silakan pilih gudang/departemen terlebih dahulu.");
      return;
    }
    setFormData({
      id: target.id,
      code: target.code || "",
      name: target.name || "",
      function: target.function || "Utama",
      description: target.description || target.name || "",
      account_code: target.account_code || "1-2010 - PERSEDIAAN BARANG",
      address: target.address || "",
      phone: target.phone || "",
      fax: target.fax || "",
      whatsapp: target.whatsapp || "",
      email: target.email || "",
    });
    setSelectedId(target.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) {
      alert("Silakan pilih gudang yang ingin dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus gudang "${selectedWh?.name || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  // Filter in memory by keyword
  const filteredData = warehouses.filter((w: any) => {
    if (!searchParam) return true;
    const term = searchParam.toLowerCase();
    return (
      w.code?.toLowerCase().includes(term) ||
      w.name?.toLowerCase().includes(term) ||
      w.description?.toLowerCase().includes(term) ||
      w.address?.toLowerCase().includes(term)
    );
  });

  const sortedData = sortTableData(filteredData, sortOption, {
    getCode: (w: any) => w.code,
    getName: (w: any) => w.name,
    getDate: (w: any) => w.created_at,
  });
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
      <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-xs h-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition"
          title="Halaman Sebelumnya"
        >
          &lt;
        </button>
        <span className="px-3 h-full flex items-center font-medium">
          Hal {page}/{totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
          title="Halaman Berikutnya"
        >
          &gt;
        </button>
      </div>

      <MasterToolbarButtons
        onAdd={handleOpenAdd}
        onEdit={() => handleOpenEdit()}
        editDisabled={!selectedId}
        onDelete={handleDelete}
        deleteDisabled={!selectedId}
        onPrint={() => window.print()}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => window.history.back()}
          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">Dept./Gudang</h1>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-1.5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="text-slate-700 font-medium">Kata Kunci :</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchParam(keyword)}
            placeholder="Cari kode, nama gudang, keterangan..."
            className="flex-1 max-w-xs h-6 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
          <div className="w-56">
            <TableSortSelect
              value={sortOption}
              onChange={(val) => {
                setSortOption(val);
                setPage(1);
              }}
              compact
            />
          </div>
          <button
            onClick={() => setSearchParam(keyword)}
            className="h-6 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded flex items-center gap-1.5 shadow-xs transition text-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari</span>
          </button>
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded shadow-2xs overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">Aksi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kode</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Fungsi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[140px]">Keterangan</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[180px]">Akun</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[160px]">Alamat</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Telepon</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Fax</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Whatsapp</th>
                <th className="py-2 px-3 whitespace-nowrap">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data departemen / gudang...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Belum ada data departemen / gudang.
                  </td>
                </tr>
              ) : (
                paginatedData.map((w: any) => {
                  const isSelected = selectedId === w.id;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setSelectedId(w.id)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected ? "bg-sky-50/80 font-medium text-sky-950" : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(w);
                          }}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded transition"
                          title="Edit Gudang"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {w.code}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {w.function || "Utama"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-medium text-slate-800 whitespace-nowrap">
                        {w.description || w.name}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {w.account_code || "1-2010 - PERSEDIAAN BARANG"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 text-[11px] whitespace-nowrap">
                        {w.address || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {w.phone || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {w.fax || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {w.whatsapp || "-"}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 whitespace-nowrap">
                        {w.email || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Bottom Toolbar */}
      <div className="shrink-0 pt-0.5">{renderToolbar()}</div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditing ? "Edit Data Dept./Gudang" : "Tambah Dept./Gudang Baru"}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-200/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Kode Gudang / Dept <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: UTAMA / 02"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Fungsi</label>
                  <select
                    value={formData.function}
                    onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                    className="w-full h-8 px-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Utama">Utama</option>
                    <option value="Cabang">Cabang</option>
                    <option value="Gudang Transit">Gudang Transit</option>
                    <option value="Gudang Retur">Gudang Retur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama / Keterangan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value, name: e.target.value })}
                    placeholder="Contoh: APOTEK BERKAT / GUDANG"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Perkiraan Akun Persediaan</label>
                  <input
                    type="text"
                    value={formData.account_code}
                    onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    placeholder="1-2010 - PERSEDIAAN BARANG"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Alamat Gudang</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="JL. PURNAMA..."
                  className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0561-xxxxxx"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Fax</label>
                  <input
                    type="text"
                    value={formData.fax}
                    onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                    placeholder="Fax..."
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Whatsapp</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="apotikberkat@gmail.com"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
