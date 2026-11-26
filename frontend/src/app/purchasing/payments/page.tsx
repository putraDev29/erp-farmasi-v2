"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Building,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { sortTableData } from "@/components/common/TableSortSelect";
import { BuktiPembayaranModal } from "@/components/purchasing/BuktiPembayaranModal";

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters state matching Screenshot 6
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Pagination
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ["supplier-payments", keyword, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api.get(`/purchases/payments?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const sortedPayments = sortTableData(payments, sortOption, {
    getCode: (p: any) => p.payment_no,
    getName: (p: any) => p.supplier?.name,
    getDate: (p: any) => p.created_at || p.payment_date,
  });
  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPayments.slice(start, start + pageSize);
  }, [sortedPayments, page, pageSize]);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/purchases/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus pembayaran");
    },
  });

  const selectedPayment = payments.find((p: any) => p.id === selectedId);

  // Render Toolbars matching Screenshot 6
  const renderToolbar = (isTop: boolean) => (
    <div className="flex flex-wrap items-center justify-between gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {/* Pagination Controls */}
        <div className="inline-flex items-center border border-slate-300 rounded bg-white text-xs text-slate-700 shadow-2xs h-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-r border-slate-200 transition rounded-l"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold px-2.5 h-full flex items-center text-xs text-slate-700">
            Hal {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition rounded-r"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* [🔍 Cari] Button (Top Only) */}
        {isTop && (
          <button
            type="button"
            onClick={() => refetch()}
            className="h-6 px-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <Search className="w-3 h-3" />
            <span>Cari</span>
          </button>
        )}

        {/* [+ Tambah (Green)] */}
        <button
          type="button"
          onClick={() => router.push("/purchasing/payments/new")}
          className="h-6 px-2.5 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Bayar Hutang Baru"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
          <span>Tambah</span>
        </button>

        {/* [✏️ Ubah (Blue)] */}
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            if (selectedId) router.push("/purchasing/payments/new");
          }}
          className="h-6 px-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Ubah Pembayaran"
        >
          <Pencil className="w-3 h-3" />
          <span>Ubah</span>
        </button>

        {/* [🗑️ Hapus (Red)] */}
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => setDeleteConfirmOpen(true)}
          className="h-6 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Hapus Pembayaran"
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus</span>
        </button>

        {/* [Import Data Excel] (Bottom Only) */}
        {!isTop && (
          <button
            type="button"
            onClick={() => setExcelImportOpen(true)}
            className="h-6 px-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            <span>Import Data Excel</span>
          </button>
        )}
      </div>

      <div className="text-[10.5px] text-slate-500 font-medium">
        Total: <strong className="text-slate-800">{payments.length}</strong> pembayaran ditemukan
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. HEADER BAR */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-1">
        <div>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-teal-500 rounded-xs inline-block" />
            Daftar Pembayaran Hutang
          </h1>
        </div>
      </div>

      {/* 2. FILTER SECTION (Matching Screenshot 6) */}
      <div className="shrink-0 bg-white p-2 rounded-lg shadow-2xs border border-slate-200 space-y-1.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 text-xs">
          {/* Kata Kunci */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              placeholder="No Bukti / Supplier / Catatan"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Tanggal Dari */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Tanggal Sampai */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Urut Berdasar */}
          <div>
            <label className="block text-slate-600 font-semibold text-[11px] mb-0.5">Urut Berdasar :</label>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-teal-500 font-medium shadow-2xs truncate cursor-pointer"
            >
              <option value="created_at_desc">1. Urutan sesuai waktu input paling atas</option>
              <option value="code_asc">2. Kode (A - Z)</option>
              <option value="code_desc">3. Kode (Z - A)</option>
              <option value="name_asc">4. Nama (A - Z)</option>
              <option value="name_desc">5. Nama (Z - A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR (< Hal 1/X >, [🔍], [+], [✏️], [🗑️]) */}
      <div className="shrink-0">{renderToolbar(true)}</div>

      {/* 4. TABLE VIEW (10 Columns Matching Screenshot 6) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6.5 text-[10.5px]">
            <tr>
              <th className="py-0.5 px-2 w-8 text-center border-r border-slate-200">Aksi</th>
              <th className="py-0.5 px-2 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2 border-r border-slate-200">No Faktur Supplier</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Cara Bayar</th>
              <th className="py-0.5 px-1.5 border-r border-slate-200">Kode Supplier</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Nama Supplier</th>
              <th className="py-0.5 px-2 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2 text-right border-r border-slate-200">Total</th>
              <th className="py-0.5 px-2 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2">User Ubah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-slate-400">
                  Memuat data pembayaran hutang...
                </td>
              </tr>
            ) : paginatedPayments.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-slate-400">
                  Tidak ada data pembayaran hutang.
                </td>
              </tr>
            ) : (
              paginatedPayments.map((p: any) => {
                const isSelected = selectedId === p.id;
                const pbfInvoices = (p.details || [])
                  .map((d: any) => d.purchase?.pbf_invoice_no)
                  .filter(Boolean);
                const pbfInvoiceText =
                  pbfInvoices.length > 0
                    ? Array.from(new Set(pbfInvoices)).join(", ")
                    : "-";
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`cursor-pointer transition-colors h-6.5 border-b border-slate-100 ${
                      isSelected
                        ? "bg-teal-50/70 font-semibold text-slate-900"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <td className="py-0.5 px-2 text-center border-r border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(p.id);
                          setPrintModalOpen(true);
                        }}
                        className="text-teal-600 hover:text-teal-800 inline-flex items-center"
                        title="Lihat Bukti"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-0.5 px-2 font-mono font-medium text-slate-800 border-r border-slate-100">
                      {p.payment_no}
                    </td>
                    <td className="py-0.5 px-2 font-mono text-slate-700 border-r border-slate-100">
                      {pbfInvoiceText}
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {formatDate(p.date)}
                    </td>
                    <td className="py-0.5 px-2 border-r border-slate-100">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-800">
                        {p.payment_method === "CEK_BG"
                          ? `BG/Cek (${p.check_no || "-"})`
                          : p.payment_method}
                      </span>
                    </td>
                    <td className="py-0.5 px-1.5 font-mono text-slate-500 border-r border-slate-100">
                      {p.supplier?.code || "-"}
                    </td>
                    <td className="py-0.5 px-2 font-medium text-slate-800 border-r border-slate-100">
                      {p.supplier?.name || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-slate-500 max-w-xs truncate border-r border-slate-100">
                      {p.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono font-bold text-teal-700 border-r border-slate-100">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="py-0.5 px-2 text-slate-600 border-r border-slate-100">
                      {p.user?.full_name || p.user?.username || "Admin"}
                    </td>
                    <td className="py-0.5 px-2 text-slate-400">
                      {p.modifier?.full_name || p.modifier?.username || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR (< Hal 1/X >, [+], [✏️], [🗑️], [Import Data Excel]) */}
      <div className="shrink-0 pt-0.5">{renderToolbar(false)}</div>

      {/* 6. MODAL KONFIRMASI HAPUS */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-800">Hapus Pembayaran Hutang?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Yakin ingin menghapus pembayaran <strong>{selectedPayment?.payment_no}</strong>? Sisa hutang faktur terkait akan dikembalikan ke posisi semula.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3 h-6 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                className="px-3 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CETAK BUKTI BAYAR & RIWAYAT */}
      <BuktiPembayaranModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        paymentId={selectedId}
        orderId={selectedPayment?.details?.find((d: any) => d.purchase_order_id)?.purchase_order_id}
        purchaseId={selectedPayment?.details?.find((d: any) => d.purchase_id)?.purchase_id}
      />

      {/* 8. MODAL IMPORT EXCEL */}
      {excelImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Import Data Pembayaran Excel
              </h3>
              <button
                type="button"
                onClick={() => setExcelImportOpen(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Unggah berkas spreadsheet Excel (.xlsx / .csv) yang berisi rekap pembayaran hutang supplier.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded p-4 text-center hover:border-teal-500 transition cursor-pointer bg-slate-50">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-600 font-semibold">Pilih file Excel atau drag ke sini</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Format: .XLSX, .XLS, .CSV (Maks. 5MB)</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExcelImportOpen(false)}
                className="px-3 h-6 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  alert("Fitur upload template excel pembayaran hutang siap digunakan.");
                  setExcelImportOpen(false);
                }}
                className="px-4 h-6 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold"
              >
                Upload & Proses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
