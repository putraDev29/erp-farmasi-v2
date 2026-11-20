"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Save,
  Undo2,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

const PAGE_SIZE = 15;

export default function UsersPage() {
  const queryClient = useQueryClient();

  // Search & Pagination & Selection
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields (Screenshot 6)
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [namaUser, setNamaUser] = useState("");
  const [email, setEmail] = useState("");
  const [kelompokUser, setKelompokUser] = useState("");
  const [loginGudangDept, setLoginGudangDept] = useState("terbatas");
  const [aktifPeriodeLogin, setAktifPeriodeLogin] = useState(false);
  const [jamDari, setJamDari] = useState("08:00");
  const [jamSampai, setJamSampai] = useState("21:00");
  const [aksesGudang, setAksesGudang] = useState("[Semua Gudang]");
  const [loginDenganShift, setLoginDenganShift] = useState(false);
  const [deviceIdWa, setDeviceIdWa] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data?.data || [];
    },
  });

  // 2. Fetch Roles (Kelompok User)
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get("/roles");
      return res.data?.data || [];
    },
  });

  // 3. Fetch Warehouses & Branches
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await api.get("/branches");
      return res.data?.data || [];
    },
  });

  // Selected User Object
  const selectedUser = useMemo(() => {
    return users.find((u: any) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/users", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      resetForm();
      showToast("success", "Data user berhasil disimpan!");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal membuat user baru");
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
      showToast("success", "Data user berhasil diperbarui!");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui data user");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUserId(null);
      showToast("success", "User berhasil dihapus!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menghapus user");
    },
  });

  const resetForm = () => {
    setUserId("");
    setPassword("");
    setNamaUser("");
    setEmail("");
    setKelompokUser(roles[0]?.id || "");
    setLoginGudangDept("terbatas");
    setAktifPeriodeLogin(false);
    setJamDari("08:00");
    setJamSampai("21:00");
    setAksesGudang("[Semua Gudang]");
    setLoginDenganShift(false);
    setDeviceIdWa("");
    setErrorMsg(null);
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    resetForm();
    if (roles.length > 0) setKelompokUser(roles[0].id);
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedUser) {
      showToast("error", "Pilih user yang ingin diedit terlebih dahulu.");
      return;
    }
    setModalMode("edit");
    setErrorMsg(null);
    setUserId(selectedUser.username || "");
    setPassword("");
    setNamaUser(selectedUser.full_name || "");
    setEmail(selectedUser.email || "");
    const userRoleId = selectedUser.roles?.[0]?.id || roles[0]?.id || "";
    setKelompokUser(userRoleId);
    setLoginGudangDept("terbatas");
    setAktifPeriodeLogin(Boolean(selectedUser.login_period_active));
    setJamDari(selectedUser.login_period_from || "08:00");
    setJamSampai(selectedUser.login_period_to || "21:00");
    setAksesGudang(selectedUser.warehouse_access_type || "[Semua Gudang]");
    setLoginDenganShift(Boolean(selectedUser.login_with_shift));
    setDeviceIdWa(selectedUser.wa_device_id || "");
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedUser) {
      showToast("error", "Pilih user yang ingin dihapus terlebih dahulu.");
      return;
    }
    if (selectedUser.username === "admin") {
      showToast("error", "User admin sistem tidak dapat dihapus!");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus user "${selectedUser.username}" (${selectedUser.full_name})?`)) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setErrorMsg("User ID wajib diisi");
      return;
    }
    if (!namaUser.trim()) {
      setErrorMsg("Nama User wajib diisi");
      return;
    }

    const defaultBranchId = branches[0]?.id || "00000000-0000-0000-0000-000000000000";

    const payload: any = {
      username: userId.trim(),
      full_name: namaUser.trim(),
      email: email.trim() || `${userId.trim().toLowerCase()}@apotek.local`,
      branch_id: defaultBranchId,
      role_ids: kelompokUser ? [kelompokUser] : [],
      login_period_active: aktifPeriodeLogin,
      login_period_from: jamDari,
      login_period_to: jamSampai,
      login_with_shift: loginDenganShift,
      wa_device_id: deviceIdWa,
      warehouse_access_type: aksesGudang,
    };

    if (modalMode === "create") {
      if (!password) {
        setErrorMsg("Password wajib diisi untuk user baru");
        return;
      }
      payload.password = password;
      createMutation.mutate(payload);
    } else if (modalMode === "edit" && selectedUser) {
      if (password) {
        payload.password = password;
      }
      updateMutation.mutate({ id: selectedUser.id, payload });
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
      {/* Toast Alert */}
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
          <h1 className="font-semibold text-sm text-slate-800">Daftar User</h1>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden">
        {/* TOOLBAR (Sesuai Gambar 5: < Hal 1/1 > | + | ✏️ | 🗑️) */}
        <div className="bg-white rounded border border-slate-300 p-2 shadow-2xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Pagination Controls */}
            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-slate-50">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border-x border-slate-200">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* + Button */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center shadow-2xs active:scale-95 transition"
              title="Tambah Data User (+)"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* ✏️ Edit Button */}
            <button
              type="button"
              onClick={handleOpenEdit}
              disabled={!selectedUserId}
              className="w-7 h-7 bg-sky-500 hover:bg-sky-600 text-white rounded flex items-center justify-center shadow-2xs active:scale-95 transition disabled:opacity-40"
              title="Edit Data User"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* 🗑️ Delete Button */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedUserId || deleteMutation.isPending}
              className="w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded flex items-center justify-center shadow-2xs active:scale-95 transition disabled:opacity-40"
              title="Hapus Data User"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500">
            Total User: <span className="text-emerald-700 font-bold">{users.length}</span>
          </div>
        </div>

        {/* USERS TABLE (Sesuai Gambar 5: User ID | Nama User | Kantor/Gudang | Akses) */}
        <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200 w-36">User ID</th>
                  <th className="py-2 px-3 border-r border-slate-200">Nama User</th>
                  <th className="py-2 px-3 border-r border-slate-200">Kantor/Gudang</th>
                  <th className="py-2 px-3">Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                      <span>Memuat data user...</span>
                    </td>
                  </tr>
                ) : pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Belum ada data user.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u: any) => {
                    const isSelected = selectedUserId === u.id;
                    const roleName = u.roles?.[0]?.name || "ADMINISTRATOR";
                    const branchName = u.branch?.name || "[Semua Kantor/Gudang]";

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        onDoubleClick={handleOpenEdit}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-sky-100 text-sky-950 font-semibold"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <td className="py-2 px-3 font-mono border-r border-slate-200">
                          {u.username}
                        </td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-200">
                          {u.full_name}
                        </td>
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                          {branchName}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          {roleName}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: TAMBAH / EDIT DATA USER (Persis Screenshot 6) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-400 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Title Bar */}
            <div className="px-4 py-2 border-b border-slate-300 flex items-center justify-between bg-white">
              <h3 className="font-bold text-xs text-slate-800">
                {modalMode === "create" ? "Tambah Data User" : "Edit Data User"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold leading-none p-1"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mx-4 mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-2.5">
              {/* User ID */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">User ID :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Contoh: kasir1"
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                    disabled={modalMode === "edit"}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Password :</label>
                <div className="col-span-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === "edit" ? "(Kosongkan jika tidak diubah)" : "Minimal 6 karakter"}
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                  />
                </div>
              </div>

              {/* Nama User */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Nama User :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    value={namaUser}
                    onChange={(e) => setNamaUser(e.target.value)}
                    placeholder="Nama Lengkap Petugas"
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                  />
                </div>
              </div>

              {/* E-Mail */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">E-Mail :</label>
                <div className="col-span-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@apotek.com"
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Kelompok User */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Kelompok User :</label>
                <div className="col-span-2">
                  <select
                    value={kelompokUser}
                    onChange={(e) => setKelompokUser(e.target.value)}
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Login Gudang/Dept */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Login Gudang/Dept :</label>
                <div className="col-span-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      checked={loginGudangDept === "terbatas"}
                      onChange={() => setLoginGudangDept("terbatas")}
                      className="text-emerald-600"
                    />
                    <span>Terbatas dari hak akses user</span>
                  </label>
                </div>
              </div>

              {/* Periode Login */}
              <div className="grid grid-cols-3 items-start gap-2 pt-1 border-t border-slate-200">
                <label className="text-[11px] font-semibold text-slate-700 pt-1">Periode Login :</label>
                <div className="col-span-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aktifPeriodeLogin}
                      onChange={(e) => setAktifPeriodeLogin(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">Aktif Periode Login</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600">Jam Dari :</span>
                      <input
                        type="time"
                        value={jamDari}
                        onChange={(e) => setJamDari(e.target.value)}
                        disabled={!aktifPeriodeLogin}
                        className="h-7 px-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600">Jam Sampai :</span>
                      <input
                        type="time"
                        value={jamSampai}
                        onChange={(e) => setJamSampai(e.target.value)}
                        disabled={!aktifPeriodeLogin}
                        className="h-7 px-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Akses Gudang */}
              <div className="grid grid-cols-3 items-center gap-2 pt-1">
                <label className="text-[11px] font-semibold text-slate-700">Akses Gudang :</label>
                <div className="col-span-2">
                  <select
                    value={aksesGudang}
                    onChange={(e) => setAksesGudang(e.target.value)}
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="[Semua Gudang]">[Semua Gudang]</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Login Dengan Shift */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Login Dengan Shift :</label>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loginDenganShift}
                      onChange={(e) => setLoginDenganShift(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 font-medium">Saat login tampil pilihan shift</span>
                  </label>
                </div>
              </div>

              {/* Device Id WA */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700 leading-tight">
                  Device Id (Notifikasi Kirim Nota ke WA) :
                </label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={deviceIdWa}
                    onChange={(e) => setDeviceIdWa(e.target.value)}
                    placeholder="Opsional - ID Device WhatsApp Gateway"
                    className="w-full h-7 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-7 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded flex items-center gap-1 transition text-[11px]"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Batal</span>
                </button>

                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50 text-[11px]"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
