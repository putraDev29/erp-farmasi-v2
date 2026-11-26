"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  RotateCcw,
  FileText,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

interface UnpaidSaleInvoice {
  id: string;
  invoice_no: string;
  date: string;
  due_date: string;
  total_amount?: number;
  remaining_amount: number;
}

interface SettleSalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReturn: any | null;
  unpaidInvoices: UnpaidSaleInvoice[];
  cashAccounts: any[];
  onSettled?: () => void;
}

export function SettleSalesReturnModal({
  isOpen,
  onClose,
  salesReturn,
  unpaidInvoices,
  cashAccounts,
  onSettled,
}: SettleSalesReturnModalProps) {
  const queryClient = useQueryClient();

  const [settlementType, setSettlementType] = useState<"POTONG_PIUTANG" | "KEMBALI_DANA_KAS">(
    "POTONG_PIUTANG"
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [debtSearch, setDebtSearch] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const returnAmount = Number(salesReturn?.total_amount) || 0;

  useEffect(() => {
    if (!isOpen || !salesReturn) return;
    setErrorMsg("");
    setNotes("");
    setDebtSearch("");
    setShowConfirmModal(false);

    const originId = salesReturn.sale_id ? String(salesReturn.sale_id) : "";
    const originInv = unpaidInvoices.find((inv) => String(inv.id) === originId);
    if (originInv && Number(originInv.remaining_amount) + 0.001 >= returnAmount) {
      setSettlementType("POTONG_PIUTANG");
      setSelectedInvoiceId(String(originInv.id));
    } else {
      const firstEligible = unpaidInvoices.find(
        (inv) => Number(inv.remaining_amount) + 0.001 >= returnAmount
      );
      if (firstEligible) {
        setSettlementType("POTONG_PIUTANG");
        setSelectedInvoiceId(String(firstEligible.id));
      } else {
        setSelectedInvoiceId("");
        setSettlementType(unpaidInvoices.length > 0 ? "POTONG_PIUTANG" : "KEMBALI_DANA_KAS");
      }
    }

    if (cashAccounts.length > 0 && !selectedCashAccountId) {
      setSelectedCashAccountId(String(cashAccounts[0].id));
    }
  }, [isOpen, salesReturn, unpaidInvoices, returnAmount, cashAccounts]);

  const selectedInvoice = useMemo(
    () => unpaidInvoices.find((inv) => String(inv.id) === String(selectedInvoiceId)) || null,
    [unpaidInvoices, selectedInvoiceId]
  );

  const selectedCashAccount = useMemo(
    () => cashAccounts.find((a) => String(a.id) === String(selectedCashAccountId)) || null,
    [cashAccounts, selectedCashAccountId]
  );

  const filteredInvoices = useMemo(() => {
    const q = debtSearch.trim().toLowerCase();
    if (!q) return unpaidInvoices;
    return unpaidInvoices.filter((inv) => inv.invoice_no.toLowerCase().includes(q));
  }, [unpaidInvoices, debtSearch]);

  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!salesReturn) throw new Error("Data retur penjualan tidak ditemukan");
      const payload: Record<string, any> = {
        settlement_type: settlementType,
        notes,
      };
      if (settlementType === "POTONG_PIUTANG") {
        payload.sale_id = selectedInvoiceId;
      } else {
        payload.cash_account_id = selectedCashAccountId;
      }
      const res = await api.post(`/sales/returns/${salesReturn.id}/settle`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-sales-items"] });
      queryClient.invalidateQueries({ queryKey: ["pending-sales-returns-settlement"] });
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      setShowConfirmModal(false);
      onSettled?.();
      onClose();
    },
    onError: (err: any) => {
      setShowConfirmModal(false);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Gagal memproses penyelesaian retur penjualan."
      );
    },
  });

  const handleRequestConfirm = () => {
    setErrorMsg("");
    if (settlementType === "POTONG_PIUTANG") {
      if (!selectedInvoiceId) {
        setErrorMsg("Silakan pilih faktur piutang yang akan dipotong.");
        return;
      }
      if (selectedInvoice && Number(selectedInvoice.remaining_amount) + 0.001 < returnAmount) {
        setErrorMsg(
          "Sisa piutang faktur yang dipilih lebih kecil dari nilai retur. Pilih faktur dengan sisa piutang lebih besar atau sama dengan nilai retur."
        );
        return;
      }
    } else if (!selectedCashAccountId) {
      setErrorMsg("Silakan pilih akun Kas / Bank sumber pengembalian dana.");
      return;
    }
    setShowConfirmModal(true);
  };

  if (!isOpen || !salesReturn) return null;

  const remainingAfterCut = selectedInvoice
    ? Math.max(0, Number(selectedInvoice.remaining_amount) - returnAmount)
    : 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">
                  Penyelesaian Keuangan Retur Penjualan: {salesReturn.return_no}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Pelanggan: {salesReturn.customer?.name || "-"} • Tanggal:{" "}
                  {formatDate(salesReturn.date)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3.5 overflow-y-auto text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-800 font-semibold block">
                  Total Nilai Retur Penjualan yang Akan Diselesaikan
                </span>
                <span className="text-[10px] text-amber-700">
                  {salesReturn.sale?.invoice_no
                    ? `Faktur Asal: ${salesReturn.sale.invoice_no}`
                    : "Retur Langsung (Mode 2)"}
                </span>
              </div>
              <span className="text-lg font-bold font-mono text-amber-900">
                {formatCurrency(returnAmount)}
              </span>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Pilihan 2 Metode */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                Pilih Metode Penyelesaian Keuangan Retur Penjualan:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSettlementType("POTONG_PIUTANG");
                    setErrorMsg("");
                  }}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-start gap-2.5 ${
                    settlementType === "POTONG_PIUTANG"
                      ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <FileText
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      settlementType === "POTONG_PIUTANG" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-800">Potong Piutang Usaha</div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                      Pilih faktur piutang pelanggan (sisa ≥ nilai retur) langsung dari daftar di
                      bawah.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettlementType("KEMBALI_DANA_KAS");
                    setErrorMsg("");
                  }}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-start gap-2.5 ${
                    settlementType === "KEMBALI_DANA_KAS"
                      ? "border-sky-500 bg-sky-50/80 ring-1 ring-sky-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Wallet
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      settlementType === "KEMBALI_DANA_KAS" ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-800">Pengembalian Dana Langsung</div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                      Dana retur dikembalikan langsung ke pelanggan dari akun Kas / Bank.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {settlementType === "POTONG_PIUTANG" ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Pilih Faktur Piutang yang Akan Dipotong
                    </span>
                    <span className="text-[10.5px] text-slate-500">
                      Klik baris faktur piutang dengan sisa ≥{" "}
                      <strong className="text-slate-700">{formatCurrency(returnAmount)}</strong>.
                    </span>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={debtSearch}
                      onChange={(e) => setDebtSearch(e.target.value)}
                      placeholder="Cari No. Transaksi..."
                      className="w-full h-7 pl-8 pr-2.5 border border-slate-300 rounded-md text-[11px] bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 w-8 text-center border-r border-slate-200">Pilih</th>
                        <th className="p-2 border-r border-slate-200">No. Transaksi</th>
                        <th className="p-2 border-r border-slate-200">Tanggal</th>
                        <th className="p-2 border-r border-slate-200">Jatuh Tempo</th>
                        <th className="p-2 border-r border-slate-200 text-right">Sisa Piutang</th>
                        <th className="p-2">Detail / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            {unpaidInvoices.length === 0
                              ? "Pelanggan ini belum memiliki faktur piutang yang belum lunas. Silakan pilih Pengembalian Dana Langsung."
                              : "Tidak ada faktur piutang yang sesuai dengan pencarian."}
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => {
                          const sisa = Number(inv.remaining_amount) || 0;
                          const eligible = sisa + 0.001 >= returnAmount;
                          const isCurrent = String(inv.id) === String(selectedInvoiceId);
                          const afterCut = Math.max(0, sisa - returnAmount);
                          return (
                            <tr
                              key={inv.id}
                              onClick={() => {
                                if (!eligible) return;
                                setSelectedInvoiceId(String(inv.id));
                                setErrorMsg("");
                              }}
                              className={`transition ${
                                !eligible
                                  ? "bg-slate-50/80 text-slate-400 cursor-not-allowed"
                                  : isCurrent
                                  ? "bg-emerald-50 font-semibold cursor-pointer ring-1 ring-inset ring-emerald-300"
                                  : "hover:bg-sky-50 cursor-pointer"
                              }`}
                            >
                              <td className="p-2 text-center border-r border-slate-100">
                                <input
                                  type="radio"
                                  name="selected_receivable_invoice"
                                  checked={isCurrent}
                                  disabled={!eligible}
                                  onChange={() => {
                                    if (!eligible) return;
                                    setSelectedInvoiceId(String(inv.id));
                                  }}
                                  className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-2 border-r border-slate-100 font-mono">
                                <span
                                  className={`font-bold ${
                                    eligible ? "text-slate-800" : "text-slate-400"
                                  }`}
                                >
                                  {inv.invoice_no}
                                </span>
                              </td>
                              <td className="p-2 border-r border-slate-100">{formatDate(inv.date)}</td>
                              <td className="p-2 border-r border-slate-100">
                                {formatDate(inv.due_date)}
                              </td>
                              <td
                                className={`p-2 border-r border-slate-100 text-right font-mono font-bold ${
                                  eligible ? "text-rose-700" : "text-slate-400"
                                }`}
                              >
                                {formatCurrency(sisa)}
                              </td>
                              <td className="p-2 text-[10.5px]">
                                {!eligible ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold text-[10px]">
                                    Sisa piutang &lt; nilai retur
                                  </span>
                                ) : afterCut <= 0.01 ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                    Pas — Langsung Lunas
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                    Sisa piutang: {formatCurrency(afterCut)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedInvoice && (
                  <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Faktur Terpilih: </span>
                      <strong className="font-mono text-emerald-700">
                        {selectedInvoice.invoice_no}
                      </strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        Sisa Piutang:{" "}
                        <strong className="font-mono text-rose-700">
                          {formatCurrency(selectedInvoice.remaining_amount)}
                        </strong>
                      </span>
                      <span>
                        Potongan:{" "}
                        <strong className="font-mono text-amber-700">
                          - {formatCurrency(returnAmount)}
                        </strong>
                      </span>
                      <span>
                        Sisa Akhir:{" "}
                        {remainingAfterCut <= 0.01 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Rp 0 (Langsung Lunas)
                          </span>
                        ) : (
                          <strong className="font-mono text-slate-900">
                            {formatCurrency(remainingAfterCut)}
                          </strong>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <label className="font-bold text-slate-800 block">
                  Pilih Akun Kas / Bank Sumber Dana Pengembalian ke Pelanggan:
                </label>
                <SearchableAccountSelect
                  accounts={cashAccounts}
                  value={selectedCashAccountId}
                  onChange={(val) => setSelectedCashAccountId(val)}
                  placeholder="-- Pilih Akun Kas / Bank --"
                />
                <p className="text-[10.5px] text-slate-500">
                  Dana sebesar <strong>{formatCurrency(returnAmount)}</strong> akan otomatis dicatat
                  sebagai Kas Keluar dari akun yang dipilih ke pelanggan.
                </p>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Catatan Penyelesaian (Opsional):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Nota kredit retur pelanggan / transfer refund..."
                className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={settleMutation.isPending}
              onClick={handleRequestConfirm}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {settleMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Proses Penyelesaian Retur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Persetujuan Penyelesaian Retur Penjualan */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm">Konfirmasi Persetujuan Penyelesaian</h4>
              </div>
              <button
                type="button"
                disabled={settleMutation.isPending}
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-slate-700">
              <p className="text-slate-600">
                Pastikan data penyelesaian keuangan retur penjualan di bawah ini sudah benar
                sebelum disetujui:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Retur:</span>
                  <strong className="font-mono text-slate-900">{salesReturn.return_no}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nilai Retur:</span>
                  <strong className="font-mono text-amber-800">
                    {formatCurrency(returnAmount)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode:</span>
                  <strong className="text-slate-900">
                    {settlementType === "POTONG_PIUTANG"
                      ? "Potong Piutang Usaha"
                      : "Pengembalian Dana Langsung"}
                  </strong>
                </div>
                {settlementType === "POTONG_PIUTANG" && selectedInvoice ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Faktur Dipotong:</span>
                      <strong className="font-mono text-emerald-700">
                        {selectedInvoice.invoice_no}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sisa Piutang Akhir:</span>
                      <strong className="font-mono text-slate-900">
                        {remainingAfterCut <= 0.01
                          ? "Rp 0 (Lunas)"
                          : formatCurrency(remainingAfterCut)}
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Akun Kas / Bank:</span>
                    <strong className="text-sky-700">
                      {selectedCashAccount
                        ? `${selectedCashAccount.code} - ${selectedCashAccount.name}`
                        : "-"}
                    </strong>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                Setelah disetujui, jurnal keuangan otomatis dicatat dan baris retur ini akan hilang
                dari daftar Bayar Piutang.
              </p>
            </div>

            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={settleMutation.isPending}
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={settleMutation.isPending}
                onClick={() => settleMutation.mutate()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {settleMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Ya, Setujui &amp; Proses</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
