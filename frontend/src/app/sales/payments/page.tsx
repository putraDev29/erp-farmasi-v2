"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  ChevronLeft as BackIcon,
  Printer,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { sortTableData } from "@/components/common/TableSortSelect";
import { RiwayatPembayaranSalesModal } from "@/components/sales/RiwayatPembayaranSalesModal";

export default function CustomerPaymentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters matching Ketoko Spec
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: payments = [], isLoading } = useQuery({
    queryKey: [
      "customer-payments",
      keyword,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api.get(`/sales/payments?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/sales/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menghapus pembayaran");
    },
  });

  const sortedPayments = sortTableData(payments, sortOption, {
    getCode: (p: any) => p.payment_no,
    getName: (p: any) => p.customer?.name || p.sales_invoice?.customer?.name,
    getDate: (p: any) => p.created_at || p.payment_date,
  });
  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const paginatedPayments = sortedPayments.slice((page - 1) * pageSize, page * pageSize);

  const renderToolbar = (isTop: boolean = false) => (
    <div className="flex items-center justify-between gap-1.5 py-1 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Pagination pill */}
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

        {/* Cari button */}
        {isTop && (
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["customer-payments"] })}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center gap-1 shadow-2xs font-semibold text-[11px]"
            title="Cari"
          >
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Cari</span>
          </button>
        )}

        {/* + Tambah button (Green) */}
        <button
          type="button"
          onClick={() => router.push("/sales/payments/new")}
          className="h-6 px-2.5 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          title="Bayar Piutang Baru"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Tambah</span>
        </button>

        {/* ✏️ Ubah button */}
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            if (selectedId) router.push("/sales/payments/new");
          }}
          className="h-6 px-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Pencil className="w-3 h-3 stroke-[2.5]" />
          <span>Ubah</span>
        </button>

        {/* 💵 Faktur / Bukti Pembayaran */}
        <button
          type="button"
          onClick={() => {
            if (!selectedId) {
              alert("Silakan pilih baris pembayaran piutang terlebih dahulu.");
              return;
            }
            setPrintModalOpen(true);
          }}
          disabled={!selectedId}
          className="h-6 px-2.5 bg-white hover:bg-emerald-50 border border-emerald-500 text-emerald-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40 cursor-pointer"
          title="Lihat Faktur Pembayaran Piutang"
        >
          <Printer className="w-3 h-3 text-emerald-600" />
          <span>Faktur Pembayaran</span>
        </button>

        {/* 🗑️ Hapus button */}
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={!selectedId}
          className="h-6 px-2.5 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-40"
        >
          <Trash2 className="w-3 h-3 stroke-[2.5]" />
          <span>Hapus</span>
        </button>

        {/* Import Data Excel button */}
        <button
          type="button"
          onClick={() => alert("Fitur Import Data Excel")}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Import Data Excel</span>
        </button>
      </div>

      <div className="text-[10.5px] text-slate-500 font-medium">
        Total: <strong className="text-slate-800">{payments.length}</strong> pembayaran ditemukan
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Daftar Pembayaran Piutang
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

      {/* 2. FILTER SECTION */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              placeholder="No Bukti / Pelanggan / Catatan"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 font-medium shadow-2xs truncate cursor-pointer"
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

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar(true)}</div>

      {/* 4. TABLE SECTION (10 Columns Matching Ketoko Spec) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center w-8">Aksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Cara Bayar</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2.5">User Ubah</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  Memuat data pembayaran piutang...
                </td>
              </tr>
            ) : paginatedPayments.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-20 text-slate-400">
                  Tidak ada data pembayaran piutang.
                </td>
              </tr>
            ) : (
              paginatedPayments.map((p: any) => {
                const isSelected = selectedId === p.id;

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(isSelected ? null : p.id)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2 border-r border-slate-100 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(p.id);
                            router.push("/sales/payments/new");
                          }}
                          className="text-sky-600 hover:text-sky-800 p-0.5"
                          title="Ubah"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(p.id);
                            setPrintModalOpen(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-800 p-0.5"
                          title="Lihat Faktur Pembayaran"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                      {p.payment_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {formatDate(p.date)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">
                      {p.payment_method}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {p.customer?.code || "CUST-001"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                      {p.customer?.name || "Pelanggan Umum"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-600">
                      {p.notes || "-"}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                      {p.user?.username || "ADMIN2"}
                    </td>
                    <td className="py-0.5 px-2.5 text-slate-400">
                      -
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR */}
      <div className="shrink-0 pt-0.5">{renderToolbar(false)}</div>

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 border text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Hapus Pembayaran Piutang</h3>
            <p className="text-slate-600 text-[11px]">
              Apakah Anda yakin ingin menghapus dokumen pembayaran piutang yang dipilih?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-6 px-3 border rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                className="h-6 px-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-[11px]"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CETAK BUKTI BAYAR & RIWAYAT */}
      {(() => {
        const selectedPayment = payments.find((p: any) => p.id === selectedId);
        return (
          <RiwayatPembayaranSalesModal
            isOpen={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            paymentId={selectedId}
            orderId={selectedPayment?.details?.find((d: any) => d.sales_order_id)?.sales_order_id}
            saleId={selectedPayment?.details?.find((d: any) => d.sale_id)?.sale_id}
          />
        );
      })()}
    </div>
  );
}
