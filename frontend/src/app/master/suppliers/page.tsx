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
  Truck,
  Building2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import MasterToolbarButtons from "@/components/common/MasterToolbarButtons";
import PbfDocumentUpload from "@/components/common/PbfDocumentUpload";

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  // Filters & State
  const [keyword, setKeyword] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected item for toolbar actions
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalTargetId, setDocModalTargetId] = useState<string | null>(null);
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
    is_pbf: false,
    pbf_license_no: "",
    pbf_license_expiry_date: "",
    cdob_license_no: "",
    cdob_license_expiry_date: "",
    apj_name: "",
    apj_sipa_no: "",
    apj_sipa_expiry_date: "",
    npwp: "",
    pbf_type: "PBF Pusat",
  });

  // Fetch Suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", searchParam, sortBy, sortDir],
    queryFn: async () => {
      const res = await api.get(`/suppliers?search=${encodeURIComponent(searchParam)}&sort_by=${sortBy}&sort_dir=${sortDir}`);
      return res.data?.data || [];
    },
  });

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (isEditing && payload.id) {
        return await api.put(`/suppliers/${payload.id}`, payload);
      }
      return await api.post("/suppliers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan data supplier: " + (err.response?.data?.message || err.message));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setSelectedId(null);
    },
    onError: (err: any) => {
      alert("Gagal menghapus supplier: " + (err.response?.data?.message || err.message));
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
      is_pbf: false,
      pbf_license_no: "",
      pbf_license_expiry_date: "",
      cdob_license_no: "",
      cdob_license_expiry_date: "",
      apj_name: "",
      apj_sipa_no: "",
      apj_sipa_expiry_date: "",
      npwp: "",
      pbf_type: "PBF Pusat",
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (sup?: any) => {
    const target = sup || suppliers.find((s: any) => s.id === selectedId);
    if (!target) {
      alert("Silakan pilih baris supplier terlebih dahulu.");
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
      is_pbf: Boolean(target.is_pbf),
      pbf_license_no: target.pbf_license_no || "",
      pbf_license_expiry_date: target.pbf_license_expiry_date ? target.pbf_license_expiry_date.split("T")[0] : "",
      cdob_license_no: target.cdob_license_no || "",
      cdob_license_expiry_date: target.cdob_license_expiry_date ? target.cdob_license_expiry_date.split("T")[0] : "",
      apj_name: target.apj_name || "",
      apj_sipa_no: target.apj_sipa_no || "",
      apj_sipa_expiry_date: target.apj_sipa_expiry_date ? target.apj_sipa_expiry_date.split("T")[0] : "",
      npwp: target.npwp || "",
      pbf_type: target.pbf_type || "PBF Pusat",
    });
    setSelectedId(target.id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) {
      alert("Silakan pilih baris supplier yang ingin dihapus.");
      return;
    }
    const sup = suppliers.find((s: any) => s.id === selectedId);
    if (confirm(`Apakah Anda yakin ingin menghapus supplier "${sup?.name || selectedId}"?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const handleSearch = () => {
    setSearchParam(keyword);
    setPage(1);
  };

  const toggleSortDir = () => {
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(suppliers.length / pageSize));
  const paginatedData = suppliers.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = () => (
    <div className="flex items-center gap-2 py-1">
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
      />

      <button
        type="button"
        onClick={() => {
          if (!selectedId) {
            alert("Silakan pilih baris supplier terlebih dahulu.");
            return;
          }
          setDocModalTargetId(selectedId);
          setIsDocModalOpen(true);
        }}
        disabled={!selectedId}
        className="h-6 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        title="Upload / Kelola Berkas Legalitas PBF (Izin Usaha, CDOB, SIPA APJ)"
      >
        <span>📎</span>
        <span>Dokumen PBF</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Page Title Breadcrumb Header */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => window.history.back()}
          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">Daftar Supplier</h1>
      </div>

      {/* Filter Bar */}
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
              placeholder="Cari nama, kode, kota, alamat..."
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
              <option value="city">Kota</option>
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

      {/* Top Toolbar */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded shadow-2xs overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center border-r border-slate-200">Aksi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kode</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[200px]">Nama</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[260px]">Alamat</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kota</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Provinsi</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Telepon</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kontak</th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Email</th>
                <th className="py-2 px-3 whitespace-nowrap min-w-[150px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data supplier...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada data supplier ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s: any) => {
                  const isSelected = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`cursor-pointer transition border-b border-slate-100 ${
                        isSelected ? "bg-sky-50/80 font-medium text-sky-950" : "hover:bg-slate-50/80 text-slate-800"
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(s);
                          }}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded transition"
                          title="Edit Supplier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                        {s.code}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 font-semibold text-slate-800">
                        {s.name}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 text-[11px]">
                        {s.address || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {s.city || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {s.province || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {s.phone || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                        {s.contact_person || "-"}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-100 text-slate-500 whitespace-nowrap">
                        {s.email || "-"}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                        {s.notes || "-"}
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

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditing ? "Edit Data Supplier" : "Tambah Supplier Baru"}
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
                    Kode Supplier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: SUP-001"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nama Supplier / Distributor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: PT. Kimia Farma"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Raya Komp..."
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
                  <label className="block text-slate-700 font-semibold mb-1">Telepon / No. HP</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0561-xxxxxx"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kontak Person (PIC)</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Nama PIC / Sales"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@distributor.co.id"
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Keterangan / Rekening</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="BCA 029... a/n PT ..."
                    className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* PBF Compliance Section */}
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                    <input
                      type="checkbox"
                      checked={formData.is_pbf}
                      onChange={(e) => setFormData({ ...formData, is_pbf: e.target.checked })}
                      className="w-4 h-4 text-[#00c875] rounded focus:ring-emerald-500"
                    />
                    <span>Supplier ini adalah Pedagang Besar Farmasi (PBF)</span>
                  </label>
                  {formData.is_pbf && isEditing && formData.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocModalTargetId(formData.id);
                        setIsDocModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold rounded text-[11px] shadow-2xs"
                    >
                      📎 Upload Izin PBF & CDOB
                    </button>
                  )}
                </div>

                {formData.is_pbf && (
                  <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Tipe PBF :</label>
                        <select
                          value={formData.pbf_type}
                          onChange={(e) => setFormData({ ...formData, pbf_type: e.target.value })}
                          className="w-full h-8 px-2 rounded border border-slate-300 bg-white text-xs"
                        >
                          <option value="PBF Pusat">PBF Pusat</option>
                          <option value="PBF Cabang">PBF Cabang</option>
                          <option value="PAKF (Penyalur Alkes)">PAKF (Penyalur Alat Kesehatan)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">NPWP Perusahaan :</label>
                        <input
                          type="text"
                          value={formData.npwp}
                          onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                          placeholder="00.000.000.0-000.000"
                          className="w-full h-8 px-3 rounded border border-slate-300 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">No. Izin PBF :</label>
                        <input
                          type="text"
                          value={formData.pbf_license_no}
                          onChange={(e) => setFormData({ ...formData, pbf_license_no: e.target.value })}
                          placeholder="No. Izin PBF Kemenkes"
                          className="w-full h-8 px-3 rounded border border-slate-300 text-xs font-mono mb-1.5"
                        />
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Tgl Expired Izin PBF :</label>
                        <input
                          type="date"
                          value={formData.pbf_license_expiry_date}
                          onChange={(e) => setFormData({ ...formData, pbf_license_expiry_date: e.target.value })}
                          className="w-full h-8 px-2 rounded border border-slate-300 text-xs bg-white text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">No. Sertifikat CDOB :</label>
                        <input
                          type="text"
                          value={formData.cdob_license_no}
                          onChange={(e) => setFormData({ ...formData, cdob_license_no: e.target.value })}
                          placeholder="No. Sertifikat CDOB BPOM"
                          className="w-full h-8 px-3 rounded border border-slate-300 text-xs font-mono mb-1.5"
                        />
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Tgl Expired Sertifikat CDOB :</label>
                        <input
                          type="date"
                          value={formData.cdob_license_expiry_date}
                          onChange={(e) => setFormData({ ...formData, cdob_license_expiry_date: e.target.value })}
                          className="w-full h-8 px-2 rounded border border-slate-300 text-xs bg-white text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Nama APJ (Apoteker Penanggung Jawab) :</label>
                        <input
                          type="text"
                          value={formData.apj_name}
                          onChange={(e) => setFormData({ ...formData, apj_name: e.target.value })}
                          placeholder="apt. ..."
                          className="w-full h-8 px-3 rounded border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">No. SIPA APJ :</label>
                        <input
                          type="text"
                          value={formData.apj_sipa_no}
                          onChange={(e) => setFormData({ ...formData, apj_sipa_no: e.target.value })}
                          placeholder="No. SIPA APJ PBF"
                          className="w-full h-8 px-3 rounded border border-slate-300 text-xs font-mono mb-1.5"
                        />
                        <label className="block text-slate-700 font-semibold mb-1 text-[11px]">Tgl Expired SIPA APJ :</label>
                        <input
                          type="date"
                          value={formData.apj_sipa_expiry_date}
                          onChange={(e) => setFormData({ ...formData, apj_sipa_expiry_date: e.target.value })}
                          className="w-full h-8 px-2 rounded border border-slate-300 text-xs bg-white text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
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

      {/* PBF LEGAL DOCUMENTS MODAL (Dual Mode Upload) */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span>📎</span>
                <span>Berkas Legalitas PBF & Sertifikat CDOB Supplier</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <PbfDocumentUpload
                entityType="supplier"
                entityId={docModalTargetId || selectedId || ""}
                title="Dokumen Legalitas Distributor PBF"
                subtitle="Unggah Izin Usaha PBF Kemenkes, Sertifikat CDOB BPOM, dan SIPA Apoteker Penanggung Jawab"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="h-7 px-4 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-xs shadow-2xs transition"
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
