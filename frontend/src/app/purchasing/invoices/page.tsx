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
  FileText,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import MasterToolbarButtons from "@/components/common/MasterToolbarButtons";

export default function PurchaseInvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters state matching Screenshot 3 & 4
  const [keyword, setKeyword] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [sortBy, setSortBy] = useState("Tanggal");
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
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: [
      "purchases",
      keyword,
      selectedWarehouse,
      startDate,
      endDate,
      paymentStatus,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (keyword) params.append("search", keyword);
      if (selectedWarehouse && selectedWarehouse !== "all")
        params.append("warehouse_id", selectedWarehouse);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (paymentStatus && paymentStatus !== "all")
        params.append("payment_status", paymentStatus);
      params.append("sort_by", sortBy);
      params.append("sort_dir", sortDir);

      const res = await api.get(`/purchases?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(purchases.length / pageSize));
  const paginatedPurchases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return purchases.slice(start, start + pageSize);
  }, [purchases, page, pageSize]);

  // Selected item detail
  const selectedInvoice = useMemo(() => {
    return purchases.find((p: any) => p.id === selectedId) || null;
  }, [purchases, selectedId]);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/purchases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      setDeleteConfirmOpen(false);
      setSelectedId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus Faktur Pembelian");
    },
  });

  const renderToolbar = () => (
    <div className="flex items-center gap-1.5 py-1">
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
          Hal {purchases.length === 0 ? "1 / 0" : `${page} / ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || purchases.length === 0}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 h-full hover:bg-slate-100 disabled:opacity-40 border-l border-slate-200 transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["purchases"] })}
        className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 text-sky-600 rounded flex items-center justify-center shadow-2xs"
        title="Cari"
      >
        <Search className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => router.push("/purchasing/invoices/new")}
        className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded flex items-center justify-center shadow-2xs transition active:scale-95"
        title="Tambah Pembelian Baru"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
      </button>

      <button
        type="button"
        onClick={() => selectedId && router.push(`/purchasing/invoices/${selectedId}/edit`)}
        disabled={!selectedId}
        className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white font-bold rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Ubah Pembelian"
      >
        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => setDeleteConfirmOpen(true)}
        disabled={!selectedId}
        className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white font-bold rounded flex items-center justify-center shadow-2xs transition disabled:opacity-40"
        title="Hapus Pembelian"
      >
        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER BAR matching Screenshot 1 */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Daftar Pembelian
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

      {/* 2. FILTER SECTION matching Screenshot 1 */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 space-y-1.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Kata Kunci :</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari transaksi / supplier..."
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Dept/Gudang :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">UTAMA - APOTEK BERKAT</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Status Bayar :</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="UNPAID">Belum Lunas (Kredit)</option>
              <option value="PARTIAL">Sebagian</option>
              <option value="PAID">Lunas</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
            <input
              type="text"
              value={startDate || "01/11/2026 00:00:00"}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
            <input
              type="text"
              value={endDate || "30/11/2026 23:59:59"}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Urut Berdasar :</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Tanggal">Tanggal</option>
                <option value="No Transaksi">No Transaksi</option>
                <option value="Supplier">Supplier</option>
                <option value="Total">Total</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="h-6 w-7 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-100 bg-white"
                title="Arah Urutan"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOP TOOLBAR */}
      <div className="shrink-0">{renderToolbar()}</div>

      {/* 4. MAIN DATA TABLE (Matching Ketoko Screenshot 1) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold sticky top-0 z-10 shadow-2xs">
            <tr>
              <th className="py-1 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-1 px-2.5 border-r border-slate-200">No Faktur</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-1 px-2.5 border-r border-slate-200">
                <div className="flex items-center justify-between">
                  <span>Dept/Gudang</span>
                  <span className="text-[10px]">↑</span>
                </div>
              </th>
              <th className="py-1 px-2.5 border-r border-slate-200">Kode Supplier</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-center">Pajak</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right">Terbayar</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right">Sisa Utang</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-center">Status Bayar</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-1 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-1 px-2.5 border-r border-slate-200">User Ubah</th>
              <th className="py-1 px-2.5">Komputer</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-400">
                  Memuat data pembelian...
                </td>
              </tr>
            ) : paginatedPurchases.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-24 text-center text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              paginatedPurchases.map((p: any) => {
                const isSelected = selectedId === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(isSelected ? null : p.id)}
                    onDoubleClick={() => router.push(`/purchasing/invoices/${p.id}/edit`)}
                    className={`border-b border-slate-200 cursor-pointer transition ${
                      isSelected ? "bg-amber-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {p.invoice_no}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-mono text-slate-600">
                      {p.purchase_order?.order_no || p.invoice_no || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {formatDate(p.date)}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {p.warehouse?.name || "UTAMA"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {p.supplier?.code || p.supplier?.name || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {p.supplier?.name || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-center text-slate-600">
                      {p.tax_percent > 0 ? "Exclude" : "Non"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right font-mono font-semibold text-slate-900">
                      {Number(p.total_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right font-mono font-medium text-emerald-700">
                      {Number(p.paid_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right font-mono font-medium text-rose-600">
                      {Number(p.remaining_amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-center">
                      {p.remaining_amount <= 0 && p.total_amount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Lunas
                        </span>
                      ) : p.paid_amount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Sebagian
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Belum Lunas
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600 max-w-xs truncate">
                      {p.notes || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {p.user?.full_name || p.user?.username || "MAYA"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                      {p.modifier?.full_name || p.modifier?.username || "-"}
                    </td>
                    <td className="py-1 px-2.5 text-slate-600">
                      {p.computer_name || "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKJE1P)"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM TOOLBAR (Pinned) */}
      <div className="shrink-0 pt-0.5">{renderToolbar()}</div>

      {/* 5. DELETE CONFIRMATION DIALOG */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden text-xs">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-slate-800 text-sm">Hapus Faktur Pembelian?</h3>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Apakah Anda yakin ingin menghapus faktur pembelian ini? Tindakan ini tidak dapat
                dibatalkan.
              </p>
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3 py-1 border border-slate-300 rounded text-slate-600 hover:bg-white text-[11px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedId) deleteMutation.mutate(selectedId);
                }}
                disabled={deleteMutation.isPending}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-[11px] disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRINT INVOICE MODAL */}
      {printModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                Cetak Faktur: {selectedInvoice.invoice_no}
              </span>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 font-sans text-slate-800">
              <div className="border-b pb-2 flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-sm text-slate-900">APOTEK BERKAT PURNAMA</h2>
                  <p className="text-[10px] text-slate-500">Jl. Farmasi Raya No. 128, Jakarta Pusat</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700">FAKTUR PEMBELIAN</div>
                  <div className="font-mono text-[11px]">{selectedInvoice.invoice_no}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Supplier:</span>{" "}
                  <strong>{selectedInvoice.supplier?.name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Tanggal:</span>{" "}
                  {formatDate(selectedInvoice.date)}
                </div>
                <div>
                  <span className="text-slate-500">Gudang:</span>{" "}
                  {selectedInvoice.warehouse?.name}
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Jatuh Tempo:</span>{" "}
                  {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : "-"}
                </div>
              </div>

              <table className="w-full text-[10.5px] border-collapse mt-2">
                <thead className="bg-slate-100 border-y border-slate-300 font-bold">
                  <tr>
                    <th className="py-1 px-2 text-left">Nama Barang</th>
                    <th className="py-1 px-2 text-right">Qty</th>
                    <th className="py-1 px-2 text-center">Satuan</th>
                    <th className="py-1 px-2 text-right">Harga</th>
                    <th className="py-1 px-2 text-right">Pot %</th>
                    <th className="py-1 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((it: any, idx: number) => (
                    <tr key={idx} className="h-5.5">
                      <td className="py-1 px-2">{it.product?.name || "-"}</td>
                      <td className="py-1 px-2 text-right font-mono">{Number(it.qty).toFixed(2)}</td>
                      <td className="py-1 px-2 text-center">{it.unit?.name || "-"}</td>
                      <td className="py-1 px-2 text-right font-mono">{formatCurrency(it.unit_price)}</td>
                      <td className="py-1 px-2 text-right font-mono">{Number(it.discount || 0).toFixed(2)}</td>
                      <td className="py-1 px-2 text-right font-mono font-semibold">
                        {formatCurrency(it.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-300 pt-2 flex justify-between font-mono font-bold text-xs">
                <span>TOTAL AKHIR:</span>
                <span className="text-emerald-700">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="px-3 py-1 border border-slate-300 rounded text-slate-600 text-xs hover:bg-white"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs flex items-center gap-1 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
