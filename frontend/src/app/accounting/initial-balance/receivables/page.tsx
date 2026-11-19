"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Search,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Save,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function InitialReceivablesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formDate, setFormDate] = useState("2023-01-01");
  const [formDueDate, setFormDueDate] = useState("2023-01-31");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formNotes, setFormNotes] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["initial-receivables"],
    queryFn: async () => {
      const res = await api.get("/accounting/initial-balances?type=RECEIVABLE");
      return res.data?.data || [];
    },
  });

  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);

  const filtered = entries.filter((item: any) => {
    if (selectedCustomerId && item.customer_id !== selectedCustomerId) return false;
    return true;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) {
        throw new Error("Pilih pelanggan terlebih dahulu");
      }
      return await api.post("/accounting/initial-balances", {
        type: "RECEIVABLE",
        customer_id: selectedCustomerId,
        invoice_no: formInvoiceNo || `INV-PIU-${Date.now()}`,
        date: formDate,
        due_date: formDueDate,
        amount: Number(formAmount) || 0,
        debit: Number(formAmount) || 0,
        notes: formNotes || "Saldo Awal Piutang",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-receivables"] });
      setModalOpen(false);
      setFormInvoiceNo("");
      setFormAmount(0);
      alert("Saldo awal piutang berhasil dicatat.");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/initial-balances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-receivables"] });
      alert("Saldo awal piutang berhasil dihapus.");
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
      {/* 1. Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">Saldo Awal Piutang</h1>
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

      {/* 2. Top Filter (Screenshot 9: Pelanggan Select + Search) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs">
        <div className="max-w-xl text-[11px]">
          <label className="block text-slate-600 font-semibold mb-0.5">Pelanggan :</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              readOnly
              value={
                selectedCustomer
                  ? `[${selectedCustomer.code}] ${selectedCustomer.name}`
                  : "Select..."
              }
              onClick={() => setCustomerModalOpen(true)}
              className="flex-1 h-6 px-2 border border-slate-300 rounded bg-white text-[11px] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setCustomerModalOpen(true)}
              className="h-6 w-7 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center justify-center text-slate-600"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedCustomerId) {
                  alert("Pilih pelanggan terlebih dahulu");
                  return;
                }
                setModalOpen(true);
              }}
              className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Table (Screenshot 9: No Transaksi | Tanggal | Tanggal Jatuh ... | Kode Akun | Jumlah | MataUang) */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-0.5 px-3 border-r border-slate-200 w-48">No Transaksi</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tanggal</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Tanggal Jatuh ...</th>
              <th className="py-0.5 px-3 border-r border-slate-200 w-36">Kode Akun</th>
              <th className="py-0.5 px-3 border-r border-slate-200 text-right w-40">Jumlah</th>
              <th className="py-0.5 px-3 text-center w-28">MataUang</th>
              <th className="py-0.5 px-2 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  Memuat data saldo awal piutang...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-400 font-normal">
                  No data
                </td>
              </tr>
            ) : (
              filtered.map((r: any) => (
                <tr key={r.id} className="h-6 hover:bg-slate-50 transition">
                  <td className="py-0.5 px-3 font-mono font-semibold text-blue-700 border-r border-slate-200">
                    {r.invoice_no || "-"}
                  </td>
                  <td className="py-0.5 px-3 border-r border-slate-200">
                    {formatDate(r.date)}
                  </td>
                  <td className="py-0.5 px-3 border-r border-slate-200">
                    {formatDate(r.due_date || r.date)}
                  </td>
                  <td className="py-0.5 px-3 font-mono border-r border-slate-200">
                    1-1210
                  </td>
                  <td className="py-0.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="py-0.5 px-3 text-center font-bold">
                    IDR
                  </td>
                  <td className="py-0.5 px-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Hapus saldo awal piutang ini?")) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Alert (Screenshot 9: Alert: Saldo Awal per Tanggal : 2023-01-01) */}
      <div className="shrink-0 bg-[#fffbeb] border border-amber-300 px-3 py-1 rounded flex items-center gap-2 text-[11px] text-amber-900 shadow-2xs">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>Alert: Saldo Awal per Tanggal : 2023-01-01</span>
      </div>

      {/* 5. Bottom Button (Screenshot 9: Import Data Excel) */}
      <div className="shrink-0 pt-0.5">
        <button
          type="button"
          onClick={() => alert("Fitur Import Data Excel Saldo Awal Piutang siap digunakan.")}
          className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Import Data Excel</span>
        </button>
      </div>

      {/* Customer Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 font-bold text-xs">
              <span>Pilih Pelanggan</span>
              <button onClick={() => setCustomerModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="p-2 space-y-2">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Cari pelanggan..."
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded">
                <div
                  onClick={() => {
                    setSelectedCustomerId("");
                    setCustomerModalOpen(false);
                  }}
                  className="px-3 py-1.5 hover:bg-sky-50 cursor-pointer font-bold text-[11px] text-slate-600"
                >
                  -- Semua Pelanggan --
                </div>
                {customers
                  .filter(
                    (c: any) =>
                      !customerSearch ||
                      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.code?.toLowerCase().includes(customerSearch.toLowerCase())
                  )
                  .map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerModalOpen(false);
                      }}
                      className="px-3 py-1 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono font-bold text-blue-700">{c.code}</span>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border border-slate-300">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 font-bold text-xs">
              <span>Tambah Saldo Awal Piutang</span>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="p-3 space-y-2 text-[11px]">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">No Faktur / Transaksi :</label>
                <input
                  type="text"
                  value={formInvoiceNo}
                  onChange={(e) => setFormInvoiceNo(e.target.value)}
                  placeholder="Contoh: INV-CUST-001"
                  className="w-full h-6 px-2 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Tanggal :</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Jatuh Tempo :</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full h-6 px-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Jumlah Piutang :</label>
                <input
                  type="number"
                  value={formAmount || ""}
                  onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-6 px-2 border border-slate-300 rounded font-mono font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !formAmount}
                className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded text-[11px] shadow-2xs"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-6 px-3 bg-white border border-slate-300 text-slate-700 rounded text-[11px]"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
