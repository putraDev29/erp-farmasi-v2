"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Search,
  Save,
  Plus,
  Edit2,
  Trash2,
  Check,
  Undo2,
  X,
  Bell,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface RolePermission {
  id?: string;
  role_id: string;
  category: string;
  module: string;
  can_open: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  lock_transaction_number: boolean;
  lock_date: boolean;
}

interface ModuleSchema {
  canOpen?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  lockTx?: boolean;
  lockDate?: boolean;
}

const TABS = [
  "Master Data",
  "Pembelian",
  "Penjualan",
  "Perakitan",
  "Persediaan",
  "Akuntansi",
  "Laporan",
  "Tampilan Menu",
  "Pengaturan Lainnya",
  "Pengaturan E-commerce",
  "Notifikasi",
] as const;

type TabType = (typeof TABS)[number];

// Schema defining visible checkboxes matching Ketoko screenshots
const MODULE_SCHEMA: Record<string, ModuleSchema> = {
  // 1. Master Data (Image 5)
  "Item Baru": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Daftar Item": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Katalog Item": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Kartu Stok": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Supplier": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Pelanggan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Sales": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Satuan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Jenis": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Gudang": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Merek": { canOpen: true },
  "Ongkir": { canOpen: true },
  "Emoney": { canOpen: true },
  "Grup Pelanggan": { canOpen: true },
  "Wilayah dan Sub Wilayah": { canOpen: true },
  "Diskon Periode": { canOpen: true },
  "Periode Promosi": { canOpen: true },
  "User Bisa Ubah Satuan Item": { canOpen: true },
  "User Bisa Ubah Serial Item": { canOpen: true },
  "Periode Tebus Murah (Total Belanja)": { canOpen: true },

  // 2. Pembelian (Image 6)
  "Pesanan Pembelian": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Pembelian": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Bayar Hutang": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Retur Beli": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "History Harga Beli": { canOpen: true, lockTx: true },
  "Ubah Harga Jual saat Pembelian dan Pesanan Pembelian": { canOpen: true },
  "Tampil Harga Pokok pada Pencarian Item Pembelian": { canOpen: true },

  // 3. Penjualan (Image 9)
  "Pesanan Penjualan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Penjualan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Bayar Piutang": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Retur Jual": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Bayar Komisi Sales": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Cek Point": { canOpen: true, canDelete: true },
  "Modul Cek Point, Penjualan & Kasir : Aktif Ambil Point": { canOpen: true },
  "Aktif Potongan pada Pesanan Jual, Penjualan & Kasir": { canOpen: true },
  "Aktif Harga pada Pesanan Jual, Penjualan & Kasir": { canOpen: true },
  "History Harga Jual": { canOpen: true },
  "Modul Kasir : Bisa Cetak Laporan Kasir": { canOpen: true },
  "Modul Penjualan & Kasir : Bisa Jual di bawah Keuntungan Minimal (Aktif sesuai Pengaturan Umum : Tampil Konfirmasi Harga Jual lebih Kecil dari Harga Pokok)": { canOpen: true },
  "Modul Penjualan & Kasir : Bisa Jual di bawah Harga Pokok (Aktif sesuai Pengaturan Umum : Tampil Konfirmasi Harga Jual lebih Kecil dari Harga Pokok)": { canOpen: true },
  "Modul Kasir : Aktif Pending Kasir": { canOpen: true },
  "Kas Laci": { canOpen: true, canDelete: true },
  "Kunci Tgl Modul Daftar Penjualan, Kasir & Tombol Laporan Daftar Kasir : Tanggal hanya bisa 1 hari": { canOpen: true },
  "Modul Kasir : Aktif Pembayaran Kredit": { canOpen: true },
  "Bisa batal, menghapus detail item & transaksi pada Penjualan & Kasir": { canOpen: true },
  "Pesanan Marketplace": { canOpen: true, canEdit: true },
  "History Pesanan Marketplace": { canOpen: true },
  "Modul Pesanan Penjualan : Cetak Mengikuti Mode Printer pada Pengaturan Mini Printer": { canOpen: true },
  "Modul Kasir : Harus Cetak Struk/Nota (Simpan+Cetak)": { canOpen: true },
  "Terminal Harga": { canOpen: true },
  "Modul Kasir : Bisa menutup modul kasir (Desktop)": { canOpen: true },
  "Modul Kasir : Kunci Kolom Pelanggan": { canOpen: true },

  // 4. Perakitan (Image 7)
  "Pesanan Perakitan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Perakitan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Proses Jadi": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Perakitan : Dapat melihat data komponen item rakitan": { canOpen: true },

  // 5. Persediaan
  "Item Masuk": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Item Keluar": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Pesanan Transfer Item": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Transfer Item": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Saldo Awal Item": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Stok Opname": { canOpen: true, lockDate: true },
  "Tampil Harga Pokok pada Item Masuk": { canOpen: true },
  "Koreksi Nilai Persediaan": { canOpen: true, lockDate: true },

  // 6. Akuntansi
  "Perkiraan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Kas Masuk": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Kas Keluar": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Kas Transfer": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Jurnal": { canOpen: true, canCreate: true, canEdit: true, canDelete: true, lockTx: true, lockDate: true },
  "Buku Besar": { canOpen: true },
  "Deposit Supplier": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Deposit Pelanggan": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Deposit Saldo": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Daftar Aset": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Daftar Grup Aset": { canOpen: true, canCreate: true, canEdit: true, canDelete: true },
  "Proses Penyusutan": { canOpen: true, canCreate: true },
  "Proses Tahunan": { canOpen: true },
  "Saldo Awal Perkiraan": { canOpen: true, canEdit: true },
  "Saldo Awal Hutang": { canOpen: true, canEdit: true },
  "Saldo Awal Piutang": { canOpen: true, canEdit: true },
  "Setting Perkiraan": { canOpen: true, canEdit: true },

  // 9. Pengaturan Lainnya
  "Pengaturan Umum": { canOpen: true, canEdit: true },
  "Pengaturan Perusahaan": { canOpen: true, canEdit: true },
  "Setting Nomor": { canOpen: true, canEdit: true },
  "Mini Printer": { canOpen: true, canEdit: true },
  "Log Aktivitas User": { canOpen: true, canDelete: true },
  "Daftar Modul Terbuka": { canOpen: true, canDelete: true },
  "Import Data": { canOpen: true, canCreate: true },
  "Pengaturan Database": { canOpen: true, canEdit: true },
  "Informasi Sistem": { canOpen: true },
  "Pengaturan Tema": { canOpen: true, canEdit: true },

  // 10. Pengaturan E-commerce
  "Koneksi Tokopedia": { canOpen: true, canEdit: true },
  "Koneksi Shopee": { canOpen: true, canEdit: true },
  "Koneksi TikTok Shop": { canOpen: true, canEdit: true },
  "Koneksi Blibli": { canOpen: true, canEdit: true },
  "Koneksi Lazada": { canOpen: true, canEdit: true },
  "Sinkronisasi Stok Otomatis": { canOpen: true, canEdit: true },
  "Sinkronisasi Pesanan Masuk": { canOpen: true, canEdit: true },
};

export default function RolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Selected State
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("Master Data");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [roleFormName, setRoleFormName] = useState<string>("");
  const [roleFormDesc, setRoleFormDesc] = useState<string>("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Local permissions matrix for live checkbox toggling before save
  const [permissionsState, setPermissionsState] = useState<RolePermission[]>([]);

  // 1. Fetch Roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get("/roles");
      return res.data?.data || [];
    },
  });

  // Default select first role (prefer ADMINISTRATOR)
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      const adminRole = roles.find((r) => r.name.toUpperCase() === "ADMINISTRATOR") || roles[0];
      setSelectedRoleId(adminRole.id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  // 2. Fetch Permissions for Selected Role
  const { data: permissionsData = [], isLoading: isLoadingPermissions } = useQuery<RolePermission[]>({
    queryKey: ["role-permissions", selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return [];
      const res = await api.get(`/roles/${selectedRoleId}/permissions`);
      return res.data?.data || [];
    },
    enabled: !!selectedRoleId,
  });

  // Sync to local state whenever fresh permissions are loaded
  useEffect(() => {
    if (permissionsData) {
      setPermissionsState(permissionsData);
    }
  }, [permissionsData]);

  // Reset pagination when switching tabs
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
  }, [activeTab]);

  // 3. Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      return await api.post("/roles", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsModalOpen(false);
      setRoleFormName("");
      setRoleFormDesc("");
      const newRole = res.data?.data;
      if (newRole?.id) {
        setSelectedRoleId(newRole.id);
      }
      showToast("success", "Kelompok akses baru berhasil ditambahkan!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal membuat kelompok akses");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; description: string }) => {
      return await api.put(`/roles/${payload.id}`, { name: payload.name, description: payload.description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsModalOpen(false);
      setRoleFormName("");
      setRoleFormDesc("");
      showToast("success", "Nama kelompok akses berhasil diperbarui!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal memperbarui kelompok akses");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedRoleId("");
      showToast("success", "Kelompok akses berhasil dihapus!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menghapus kelompok akses");
    },
  });

  const savePermissionsMutation = useMutation({
    mutationFn: async (payload: RolePermission[]) => {
      return await api.put(`/roles/${selectedRoleId}/permissions`, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", selectedRoleId] });
      setPermissionsState(res.data?.data || []);
      showToast("success", "Hak akses modul berhasil disimpan!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menyimpan hak akses");
    },
  });

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle Single Permission Checkbox
  const handleToggle = (
    moduleName: string,
    field: "can_open" | "can_create" | "can_edit" | "can_delete" | "lock_transaction_number" | "lock_date"
  ) => {
    setPermissionsState((prev) =>
      prev.map((item) => {
        if (item.category === activeTab && item.module === moduleName) {
          return { ...item, [field]: !item[field] };
        }
        return item;
      })
    );
  };

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setRoleFormName("");
    setRoleFormDesc("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!selectedRole) return;
    setModalMode("edit");
    setRoleFormName(selectedRole.name);
    setRoleFormDesc(selectedRole.description || "");
    setIsModalOpen(true);
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    if (selectedRole.is_system || selectedRole.name.toUpperCase() === "ADMINISTRATOR") {
      showToast("error", "Kelompok akses sistem (ADMINISTRATOR) tidak dapat dihapus!");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus kelompok akses "${selectedRole.name}"?`)) {
      deleteRoleMutation.mutate(selectedRole.id);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      showToast("error", "Nama kelompok tidak boleh kosong");
      return;
    }
    if (modalMode === "create") {
      createRoleMutation.mutate({ name: roleFormName.trim(), description: roleFormDesc.trim() });
    } else if (modalMode === "edit" && selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, name: roleFormName.trim(), description: roleFormDesc.trim() });
    }
  };

  // Filter items for current active tab
  const currentTabItems = useMemo(() => {
    return permissionsState.filter((p) => p.category === activeTab);
  }, [permissionsState, activeTab]);

  // Apply search query if typed
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentTabItems;
    const q = searchQuery.toLowerCase();
    return currentTabItems.filter((p) => p.module.toLowerCase().includes(q));
  }, [currentTabItems, searchQuery]);

  // Dynamic Page Size matching Ketoko screenshot pagination (Image 5 & 9)
  const pageSize = useMemo(() => {
    if (activeTab === "Penjualan" || activeTab === "Laporan") return 20;
    return 10;
  }, [activeTab]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Determine column layout for this tab
  const isTransactionTab = ["Pembelian", "Penjualan", "Perakitan", "Persediaan", "Akuntansi"].includes(activeTab);
  const isOnlyOpenTab = activeTab === "Laporan" || activeTab === "Tampilan Menu" || activeTab === "Notifikasi";

  const displayName = user?.full_name?.split(" ")[0] || user?.username || "ADMIN2";
  const companyTitle = user?.company?.name ? `${user.company.name.toUpperCase()} [UTAMA]` : "APOTEK BERKAT PURNAMA [UTAMA]";

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {/* 1. TOP HEADER BAR (Sesuai Gambar 5, 6, 7) */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
            title="Kembali"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-sm text-slate-800">Kelompok Akses User</h1>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="font-bold text-slate-700 tracking-tight">{companyTitle}</span>
          <div className="relative cursor-pointer">
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full leading-none py-0.5">
              33
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span>{displayName.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* TOAST ALERT */}
      {notification && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {notification.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden">
        {/* 2. TOP FORM PANEL: ROLE SELECTOR & ACTION BUTTONS (Sesuai Gambar 5) */}
        <div className="bg-white rounded border border-slate-300 p-2.5 shadow-2xs shrink-0 space-y-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kelompok :</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500 transition"
              disabled={isLoadingRoles}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* ACTION BUTTON ROW (Warna & icon persis Ketoko) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Cari */}
            <button
              type="button"
              onClick={() => setShowSearchBox(!showSearchBox)}
              className="h-7 px-3 bg-[#0ea5e9] hover:bg-[#0284c7] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>

            {/* Simpan */}
            <button
              type="button"
              onClick={() => savePermissionsMutation.mutate(permissionsState)}
              disabled={savePermissionsMutation.isPending}
              className="h-7 px-3 bg-[#10b981] hover:bg-[#059669] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              {savePermissionsMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Simpan</span>
            </button>

            {/* + Kelompok Baru */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="h-7 px-3 bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Kelompok Baru</span>
            </button>

            {/* Edit Kelompok */}
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="h-7 px-3 bg-[#38bdf8] hover:bg-[#0ea5e9] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Kelompok</span>
            </button>

            {/* Hapus Kelompok */}
            <button
              type="button"
              onClick={handleDeleteRole}
              disabled={deleteRoleMutation.isPending}
              className="h-7 px-3 bg-[#f43f5e] hover:bg-[#e11d48] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Kelompok</span>
            </button>

            {/* Search Input Box */}
            {showSearchBox && (
              <div className="ml-auto flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Cari nama modul..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 px-2 text-xs border border-cyan-400 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 w-48"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. TABS CONTAINER */}
        <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          {/* TAB BAR (11 Tabs persis Ketoko) */}
          <div className="flex items-center overflow-x-auto border-b border-slate-300 bg-slate-50 shrink-0 scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap border-r border-slate-300 transition-colors ${
                    isActive
                      ? "bg-white text-cyan-700 border-b-2 border-b-cyan-500 font-bold -mb-px"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* TABLE CONTAINER */}
          <div className="flex-1 min-h-0 overflow-auto">
            {isLoadingPermissions ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                <span>Memuat hak akses modul...</span>
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200">Modul</th>
                    <th className="py-2 px-3 w-16 text-center border-r border-slate-200">Buka</th>
                    {!isOnlyOpenTab && (
                      <>
                        <th className="py-2 px-3 w-16 text-center border-r border-slate-200">Baru</th>
                        <th className="py-2 px-3 w-16 text-center border-r border-slate-200">Ubah</th>
                        <th className="py-2 px-3 w-16 text-center border-r border-slate-200">Hapus</th>
                      </>
                    )}
                    {isTransactionTab && (
                      <>
                        <th className="py-2 px-3 w-28 text-center border-r border-slate-200">Kunci No Transaksi</th>
                        <th className="py-2 px-3 w-24 text-center">Kunci Tanggal</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada modul ditemukan pada kelompok ini.
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((item) => {
                      const schema = MODULE_SCHEMA[item.module] || { canOpen: true };

                      return (
                        <tr key={item.module} className="hover:bg-slate-50 transition">
                          <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700 font-medium">
                            {item.module}
                          </td>

                          {/* BUKA (Always rendered for modules) */}
                          <td className="py-1.5 px-3 text-center border-r border-slate-200">
                            {schema.canOpen !== false ? (
                              <input
                                type="checkbox"
                                checked={item.can_open}
                                onChange={() => handleToggle(item.module, "can_open")}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                            ) : null}
                          </td>

                          {/* BARU, UBAH, HAPUS */}
                          {!isOnlyOpenTab && (
                            <>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200">
                                {schema.canCreate ? (
                                  <input
                                    type="checkbox"
                                    checked={item.can_create}
                                    onChange={() => handleToggle(item.module, "can_create")}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                ) : null}
                              </td>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200">
                                {schema.canEdit ? (
                                  <input
                                    type="checkbox"
                                    checked={item.can_edit}
                                    onChange={() => handleToggle(item.module, "can_edit")}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                ) : null}
                              </td>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200">
                                {schema.canDelete ? (
                                  <input
                                    type="checkbox"
                                    checked={item.can_delete}
                                    onChange={() => handleToggle(item.module, "can_delete")}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                ) : null}
                              </td>
                            </>
                          )}

                          {/* KUNCI NO TRANSAKSI & KUNCI TANGGAL */}
                          {isTransactionTab && (
                            <>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200">
                                {schema.lockTx ? (
                                  <input
                                    type="checkbox"
                                    checked={item.lock_transaction_number}
                                    onChange={() => handleToggle(item.module, "lock_transaction_number")}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                ) : null}
                              </td>
                              <td className="py-1.5 px-3 text-center">
                                {schema.lockDate ? (
                                  <input
                                    type="checkbox"
                                    checked={item.lock_date}
                                    onChange={() => handleToggle(item.module, "lock_date")}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                                  />
                                ) : null}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* 4. PAGINATION FOOTER (Sesuai Gambar 5 & 9) */}
          <div className="h-8 px-4 border-t border-slate-200 bg-white flex items-center justify-end gap-1 shrink-0">
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

      {/* 5. MODAL: TAMBAH / EDIT KELOMPOK AKSES (Persis Gambar 8 Popup Ketoko) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-400 w-full max-w-sm overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-2 border-b border-slate-300 flex items-center justify-between bg-white">
              <h3 className="font-bold text-xs text-slate-800">
                {modalMode === "create" ? "Tambah Kelompok Akses" : "Edit Kelompok Akses"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-3.5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Kelompok:
                </label>
                <input
                  type="text"
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  className="w-full h-7 px-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                  autoFocus
                  required
                />
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                  className="h-7 px-3 bg-white hover:bg-emerald-50 border border-emerald-600 text-emerald-700 font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-50 text-[11px]"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                  <span>Simpan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-7 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded flex items-center justify-center gap-1.5 transition text-[11px]"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kembali</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
