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
  ArrowUpDown,
  X,
  History,
  CheckCircle,
  Users,
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import MasterToolbarButtons from "@/components/common/MasterToolbarButtons";

export default function CustomersPage() {
  const queryClient = useQueryClient();

  // Filters & State
  const [keyword, setKeyword] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Row for toolbar
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    code: "",
    name: "",
    address: "",
    city: "",
    province: "",
    phone: "",
    contact_person: "",
    email: "",
    notes: "",
    credit_limit: 0,
    term_of_payment_days: 0,
  });

  // Fetch Customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", searchParam, sortBy, sortDir],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${encodeURIComponent(searchParam)}&sort_by=${sortBy}&sort_dir=${sortDir}`);
      return res.data?.data || [];
    },
  });

  // Selected customer object
  const selectedCustomer = customers.find((c: any) => c.id === selectedId);

  // Fetch Transaction History for selected customer
  const { data: salesHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["customer-history", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      try {
        const res = await api.get(`/sales?customer_id=${selectedId}`);
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    enabled: historyModalOpen && !!selectedId,
  });

  // Create / Update Customer
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (isEditing && payload.id) {
        return await api.put(`/customers/${payload.id}`, payload);
      }
      return await api.post("/customers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan data pelanggan: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Customer
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus pelanggan: " + (err.response?.data?.message || err.message));
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      code: "",
      name: "",
      address: "",
      city: "",
      province: "",
      phone: "",
      contact_person: "",
      email: "",
      notes: "",
      credit_limit: 0,
      term_of_payment_days: 0,
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (cust?: any) => {
    const target = cust || selectedCustomer;
    if (!target) {
      alert("Silakan pilih data pelanggan terlebih dahulu.");
      return;
    }
    setFormData({
      id: target.id,
      code: target.code || "",
      name: target.name || "",
      address: target.address || "",
      city: target.city || "",
      province: target.province || "",
      phone: target.phone || "",
      contact_person: target.contact_person || "",
      email: target.email || "",
      notes: target.notes || "",
      credit_limit: target.credit_limit || 0,
      term_of_payment_days: target.term_of_payment_days || 0,
    });
    setSelectedId(target.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) {
      alert("Silakan pilih baris pelanggan yang ingin dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${selectedCustomer?.name || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const handleOpenHistory = () => {
    if (!selectedId) {
      alert("Silakan pilih pelanggan terlebih dahulu untuk melihat history transaksi.");
      return;
    }
    setHistoryModalOpen(true);
  };

  const handleVerifyCustomer = () => {
    if (!selectedId) {
      alert("Silakan pilih pelanggan terlebih dahulu untuk diverifikasi.");
      return;
    }
    alert(`Pelanggan "${selectedCustomer?.name}" berhasil diverifikasi.`);
  };

  const handleSearch = () => {
    setSearchParam(keyword);
    setPage(1);
  };

  const toggleSortDir = () => {
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const formatNumber = (num: number) => {
    if (num === undefined || num === null) return "0.00";
    return Number(num).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));
  const paginatedData = customers.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = (withExtraActions = false) => (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-xs h-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2.5 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition rounded-l"
            title="Halaman Sebelumnya"
          >
            &lt;
          </button>
          <span className="px-3 h-full flex items-center font-semibold text-slate-700">
            Hal {page}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2.5 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition rounded-r"
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
          extraButtons={
            withExtraActions ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenHistory}
                  disabled={!selectedId}
                  className="h-6 px-3 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-40"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>History Transaksi</span>
                </button>

                <button
                  onClick={handleVerifyCustomer}
                  disabled={!selectedId}
                  className="h-6 px-3 border border-emerald-300 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-40"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verifikasi Pelanggan</span>
                </button>
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Page Header */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => window.history.back()}
          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">Daftar Pelanggan</h1>
      </div>

      {/* Filters Bar */}
      <div className="shrink-0 bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-1.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          {/* Kata Kunci */}
          <div className="md:col-span-5 flex items-center gap-2">
            <label className="w-24 shrink-0 text-slate-700 font-medium">Kata Kunci :</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Cari kode, nama, kota, alamat..."
              className="flex-1 h-6 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Urut Berdasar */}
          <div className="md:col-span-5 flex items-center gap-2">
            <label className="w-24 shrink-0 text-slate-700 font-medium">Urut Berdasar :</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 h-6 px-2 rounded border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name">Nama</option>
              <option value="code">Kode</option>
              <option value="total_spent">Total Belanja</option>
            </select>
            <button
              onClick={toggleSortDir}
              className="h-6 px-2.5 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center gap-1 transition"
              title="Ganti Urutan Naik/Turun"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase font-semibold">{sortDir}</span>
            </button>
          </div>

          {/* Cari Button */}
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={handleSearch}
              className="h-6 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded flex items-center gap-1.5 shadow-xs transition text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Toolbar with History & Verification */}
      <div className="shrink-0">{renderToolbar(true)}</div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded shadow-2xs overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">Aksi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kode</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[180px]">Nama</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[260px]">Alamat</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kota</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Provinsi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Telepon</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kontak</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Email</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-right">Jml Transaksi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-right">Total Belanja</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-right">Rata-Rata Belanja</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kunjungan Terakhir</th>
                <th className="py-2 px-3 whitespace-nowrap">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    Tidak ada data pelanggan ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((c: any) => {
                  const isSelected = selectedId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected ? "bg-sky-50/80 font-medium text-sky-950" : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(c);
                          }}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded transition"
                          title="Edit Pelanggan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {c.code}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-semibold text-slate-800 whitespace-nowrap">
                        {c.name}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 text-[11px]">
                        {c.address || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {c.city || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {c.province || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {c.phone || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                        {c.contact_person || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-500 whitespace-nowrap">
                        {c.email || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-[11px] whitespace-nowrap">
                        {c.total_orders !== undefined ? Number(c.total_orders).toLocaleString("id-ID") : "0.00"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {formatNumber(c.total_spent)}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatNumber(c.avg_spent)}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {c.last_visit || "-"}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                        {c.notes || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Bottom Toolbar */}
      <div className="shrink-0 pt-0.5">{renderToolbar(false)}</div>

      {/* Add / Edit Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditing ? "Edit Data Pelanggan" : "Tambah Pelanggan Baru"}
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
                    Kode Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: PL-001"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: DR. ISMAWAN"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Raya..."
                  className="w-full p-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kota</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Pontianak"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="Kalimantan Barat"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kontak Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Nama PIC"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plafon Kredit (Limit)</label>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jatuh Tempo (Hari)</label>
                  <input
                    type="number"
                    value={formData.term_of_payment_days}
                    onChange={(e) => setFormData({ ...formData, term_of_payment_days: Number(e.target.value) })}
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan khusus..."
                  className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
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

      {/* History Transaksi Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  History Transaksi: {selectedCustomer?.name} ({selectedCustomer?.code})
                </h2>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-200/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Transaksi:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedCustomer?.total_orders !== undefined ? Number(selectedCustomer.total_orders).toLocaleString("id-ID") : "0"} Kali
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Belanja:</span>
                  <span className="font-bold text-emerald-600 text-sm font-mono">
                    Rp {formatNumber(selectedCustomer?.total_spent)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kunjungan Terakhir:</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">
                    {selectedCustomer?.last_visit || "-"}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-200">No. Transaksi</th>
                      <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-right">Total Transaksi</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-right">Status</th>
                      <th className="py-2 px-3">Kasir / User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isHistoryLoading ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Memuat history transaksi...
                        </td>
                      </tr>
                    ) : salesHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Belum ada catatan faktur penjualan terperinci untuk pelanggan ini.
                        </td>
                      </tr>
                    ) : (
                      salesHistory.map((sh: any) => (
                        <tr key={sh.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 border-r border-slate-100 font-mono font-semibold text-slate-900">
                            {sh.invoice_no}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 text-slate-600">
                            {sh.date?.substring(0, 10)}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 text-right font-mono font-semibold text-emerald-600">
                            Rp {formatNumber(sh.total_amount)}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-100 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {sh.payment_status || "LUNAS"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {sh.user?.name || "Kasir"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
