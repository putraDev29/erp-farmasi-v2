"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Users,
  ShieldCheck,
  Building,
  Key,
  Loader2,
} from "lucide-react";
import { api, formatDate } from "@/lib/api";

const PAGE_SIZE = 15;

export default function UsersPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchID, setBranchID] = useState("");
  const [selectedRoleID, setSelectedRoleID] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      if (roleFilter) params.append("role_id", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      const res = await api.get(`/users?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // 2. Fetch Roles
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get("/roles");
      return res.data?.data || [];
    },
  });

  // 3. Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await api.get("/branches");
      return res.data?.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/users", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      resetForm();
      showToast("success", "Pengguna baru berhasil ditambahkan!");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal membuat pengguna");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      resetForm();
      showToast("success", "Data pengguna berhasil diperbarui!");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui pengguna");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast("success", "Pengguna berhasil dihapus!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menghapus pengguna");
    },
  });

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
    setBranchID(branches[0]?.id || "");
    setSelectedRoleID(roles[0]?.id || "");
    setIsActive(true);
    setErrorMsg(null);
    setEditingUserId(null);
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    resetForm();
    if (branches.length > 0) setBranchID(branches[0].id);
    if (roles.length > 0) setSelectedRoleID(roles[0].id);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: any) => {
    setModalMode("edit");
    setEditingUserId(u.id);
    setUsername(u.username);
    setEmail(u.email);
    setPassword("");
    setFullName(u.full_name);
    setPhone(u.phone || "");
    setBranchID(u.branch_id || (branches[0]?.id || ""));
    setSelectedRoleID(u.roles?.[0]?.id || (roles[0]?.id || ""));
    setIsActive(u.is_active);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleDelete = (u: any) => {
    if (u.username === "admin") {
      showToast("error", "Akun super administrator utama tidak dapat dihapus!");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus pengguna "${u.full_name}" (${u.username})?`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === "create") {
      createMutation.mutate({
        username,
        email,
        password,
        full_name: fullName,
        phone,
        branch_id: branchID,
        role_ids: selectedRoleID ? [selectedRoleID] : [],
      });
    } else if (modalMode === "edit" && editingUserId) {
      const payload: any = {
        full_name: fullName,
        phone,
        branch_id: branchID,
        is_active: isActive,
        role_ids: selectedRoleID ? [selectedRoleID] : [],
      };
      if (password.trim()) {
        payload.password = password.trim();
      }
      updateMutation.mutate({ id: editingUserId, payload });
    }
  };

  // Pagination slice
  const totalPages = Math.ceil(users.length / PAGE_SIZE) || 1;
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Daftar Pengguna Sistem (Users)</h1>
        </div>
        <button
          onClick={handleOpenCreate}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden">
        {/* FILTER & SEARCH BAR */}
        <div className="bg-white rounded border border-slate-300 p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Cari nama, username, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Semua Kelompok Akses</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Total Pengguna: <span className="text-emerald-700 font-bold">{users.length}</span>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200">Nama Lengkap</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Username</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Email &amp; No. HP</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Kelompok Akses (Role)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Cabang Tugas</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Login Terakhir</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                      <span>Memuat data pengguna...</span>
                    </td>
                  </tr>
                ) : pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {u.full_name}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">
                        {u.username}
                      </td>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                        <div>{u.email}</div>
                        {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {u.roles?.map((r: any) => r.name).join(", ") || "User"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                        {u.branch?.name || "Semua Cabang"}
                      </td>
                      <td className="py-2 px-3 text-slate-500 border-r border-slate-200">
                        {u.last_login_at ? formatDate(u.last_login_at) : "Belum pernah"}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Pengguna"
                            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.username !== "admin" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              title="Hapus Pengguna"
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="h-8 px-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">
              Menampilkan {pagedUsers.length} dari {users.length} data
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-semibold border transition ${
                    currentPage === page
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT USER */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-xs text-slate-800">
                {modalMode === "create" ? "Tambah Pengguna Baru" : "Edit Data Pengguna"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Lengkap Apoteker / Kasir"
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kasir1"
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {modalMode === "create" ? "Password *" : "Ganti Password (Opsional)"}
                  </label>
                  <input
                    type="password"
                    required={modalMode === "create"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === "create" ? "••••••••" : "Biarkan kosong jika tetap"}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === "edit"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@apotek.co.id"
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    No. Handphone / WA
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kelompok Akses (Role) *
                  </label>
                  <select
                    value={selectedRoleID}
                    onChange={(e) => setSelectedRoleID(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Penugasan Cabang
                  </label>
                  <select
                    value={branchID}
                    onChange={(e) => setBranchID(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {modalMode === "edit" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-semibold text-slate-700">
                    Status Akun Aktif (Dapat Login)
                  </label>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="h-8 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{modalMode === "create" ? "Buat Pengguna" : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
