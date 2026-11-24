"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  Save,
  Printer,
  CreditCard,
  Banknote,
  AlertCircle,
  Check,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { CariPelangganModal } from "@/components/sales/CariPelangganModal";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

interface DebtRow {
  id: string;
  source_type: "SALE" | "SALES_ORDER";
  sale_id?: string;
  sales_order_id?: string;
  invoice_no: string;
  date: string;
  due_date: string;
  remaining_amount: number;
  discount: number;
  total: number;
  is_pay: boolean;
  pay_amount: number;
}

const formatRupiahNumber = (val: number): string => {
  if (!val && val !== 0) return "";
  return Math.round(val).toLocaleString("id-ID");
};

const parseRupiahNumber = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^0-9,-]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

const EMPTY_ACCOUNTS: any[] = [];
const EMPTY_BANKS: any[] = [];

export default function NewCustomerPaymentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Header State matching Bayar Hutang Baru Layout
  const [paymentNo, setPaymentNo] = useState("Auto");
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [checkNo, setCheckNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("TUNAI");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [isLunas, setIsLunas] = useState(true);

  // Rows state
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Queries: Cash & Bank Accounts (Real Operational Accounts)
  const { data: cashAccounts = EMPTY_ACCOUNTS } = useQuery({
    queryKey: ["cash-bank-accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      const list = res.data?.data || [];
      return list.filter(
        (a: any) =>
          !a.is_header &&
          (a.subtype === "CASH_BANK" || (a.code && a.code.startsWith("1-11")))
      );
    },
  });

  const { data: banks = EMPTY_BANKS } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const res = await api.get("/banks");
      return res.data?.data || [];
    },
  });

  useEffect(() => {
    if (cashAccounts.length > 0 && !selectedAccountId) {
      // Default to BCA account if present, else first cash/bank account
      const bca = cashAccounts.find(
        (a: any) =>
          a.code === "1-1131" ||
          a.code === "1-1120" ||
          a.name?.toUpperCase().includes("BCA")
      );
      setSelectedAccountId(bca ? bca.id : cashAccounts[0].id);
    }
  }, [cashAccounts, selectedAccountId]);

  // Fetch Unpaid Invoices when customer changes (Hanya Faktur Penjualan, SO tidak masuk piutang)
  const { data: unpaidItems, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["unpaid-sales-items", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
    queryFn: async () => {
      const salesRes = await api.get(`/sales?customer_id=${selectedCustomer.id}&has_debt=true`);

      const sList = (salesRes.data?.data || []).filter(
        (p: any) =>
          String(p.customer_id) === String(selectedCustomer.id) &&
          Number(p.remaining_amount) > 0
      );

      const mappedSales: DebtRow[] = sList.map((inv: any) => {
        const sisa = Number(inv.remaining_amount) || 0;
        return {
          id: "sale-" + inv.id,
          source_type: "SALE",
          sale_id: inv.id,
          invoice_no: inv.invoice_no,
          date: inv.date,
          due_date: inv.due_date || inv.date,
          remaining_amount: sisa,
          discount: 0,
          total: sisa,
          is_pay: false,
          pay_amount: 0,
        };
      });

      return mappedSales;
    },
  });

  // Populate rows from unpaid items safely without infinite render cycles
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setRows((prev) => (prev.length > 0 ? [] : prev));
      setSelectedRowIndex((prev) => (prev !== null ? null : prev));
      return;
    }

    if (unpaidItems && unpaidItems.length > 0) {
      setRows(unpaidItems);
      setSelectedRowIndex(0);
    } else {
      setRows((prev) => (prev.length > 0 ? [] : prev));
      setSelectedRowIndex((prev) => (prev !== null ? null : prev));
    }
  }, [selectedCustomer?.id, unpaidItems]);

  // Handle Pay All or Pay Row (Fill Full Payment)
  const handleAutoPaySelectedRow = () => {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      if (selectedRowIndex !== null && copy[selectedRowIndex]) {
        const target = copy[selectedRowIndex];
        const maxPay = Math.max(0, target.remaining_amount - target.discount);
        copy[selectedRowIndex] = {
          ...target,
          is_pay: true,
          pay_amount: maxPay,
          total: maxPay,
        };
      } else {
        return copy.map((r) => {
          const maxPay = Math.max(0, r.remaining_amount - r.discount);
          return {
            ...r,
            is_pay: true,
            pay_amount: maxPay,
            total: maxPay,
          };
        });
      }
      return copy;
    });
  };

  const handleRowDiscountChange = (index: number, disc: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const r = copy[index];
      const newDisc = Math.max(0, disc);
      const afterDisc = Math.max(0, r.remaining_amount - newDisc);
      const newPay = r.is_pay ? afterDisc : Math.min(r.pay_amount, afterDisc);
      copy[index] = {
        ...r,
        discount: newDisc,
        total: afterDisc,
        pay_amount: newPay,
      };
      return copy;
    });
  };

  const handleRowPayAmountChange = (index: number, amount: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const r = copy[index];
      const maxPay = Math.max(0, r.remaining_amount - r.discount);
      const safeAmount = Math.min(amount, maxPay);
      copy[index] = {
        ...r,
        pay_amount: safeAmount,
        is_pay: safeAmount > 0,
      };
      return copy;
    });
  };

  const handleToggleRowPay = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const r = copy[index];
      const maxPay = Math.max(0, r.remaining_amount - r.discount);
      const willPay = !r.is_pay;
      copy[index] = {
        ...r,
        is_pay: willPay,
        pay_amount: willPay ? maxPay : 0,
      };
      return copy;
    });
  };

  const handleDeleteSelectedRow = () => {
    if (selectedRowIndex === null || !rows[selectedRowIndex]) return;
    setRows((prev) => prev.filter((_, i) => i !== selectedRowIndex));
    setSelectedRowIndex(null);
  };

  // Totals
  const totalDiscount = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.is_pay ? Number(r.discount) || 0 : 0), 0);
  }, [rows]);

  const totalPayment = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.is_pay ? Number(r.pay_amount) || 0 : 0), 0);
  }, [rows]);

  // Reset form (+ Tambah)
  const handleResetForm = () => {
    if (totalPayment > 0 && !confirm("Kosongkan form untuk membuat penerimaan pembayaran baru?")) {
      return;
    }
    setPaymentNo("Auto");
    setSelectedCustomer(null);
    setCheckNo("");
    setNotes("");
    setRows([]);
    setSelectedRowIndex(null);
  };

  // Mutation to save payment
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer?.id) {
        throw new Error("Pilih pelanggan terlebih dahulu.");
      }
      const activeRows = rows.filter((r) => r.is_pay && (r.pay_amount > 0 || Number(r.discount) > 0));
      if (activeRows.length === 0) {
        throw new Error("Pilih setidaknya satu faktur piutang yang akan dibayar.");
      }

      const linkedBank = banks.find((b: any) => b.account_id === selectedAccountId);

      const payload = {
        customer_id: selectedCustomer.id,
        account_id: selectedAccountId || undefined,
        bank_id: linkedBank?.id || undefined,
        payment_method: paymentMethod,
        bg_check_no: checkNo,
        notes: notes || "Penerimaan Pelunasan Piutang",
        allocations: activeRows.map((r) => ({
          source_type: r.source_type,
          sale_id: r.sale_id || undefined,
          sales_order_id: r.sales_order_id || undefined,
          amount_paid: r.pay_amount,
          discount: Number(r.discount) || 0,
        })),
      };

      return await api.post("/sales/payments", payload);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      alert(
        `Pembayaran Piutang berhasil disimpan dengan No: ${
          res.data?.data?.payment_no || "PI-OK"
        }`
      );
      router.push("/sales/payments");
    },
    onError: (err: any) => {
      alert("Gagal mencatat penerimaan pembayaran: " + (err.response?.data?.message || err.message));
    },
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 flex flex-col h-full min-h-0 text-xs select-none gap-1 overflow-y-auto md:overflow-hidden">
      {/* 1. Header: [< Bayar Piutang Baru] + Context */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-1 gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/sales/payments")}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition flex items-center gap-1"
            title="Kembali ke Daftar Pembayaran"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-700 hover:underline">
              Daftar Pembayaran
            </span>
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            Bayar Piutang Baru
          </h1>
        </div>

        {/* User context badge */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[9px]">
            33
          </span>
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold text-[10px]">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* 2. Top Header Form matching Bayar Hutang (2 Rows) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 shrink-0 bg-slate-50/40 p-1 rounded border border-slate-200/80 text-[11px]">
        {/* ROW 1: No Transaksi (col-3) | Tanggal (col-3) | Pelanggan (col-4) | Nomor (col-2) */}
        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            No Transaksi :
          </label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {paymentNo}
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Tanggal :</label>
          <div className="w-full h-6 px-2 flex items-center border border-dashed border-slate-300 rounded bg-white text-slate-800 font-mono text-[11px]">
            {paymentDate}
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Pelanggan :</label>
          <div className="flex gap-1">
            <div
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex-1 h-6 px-2 flex items-center border border-slate-300 rounded bg-white text-slate-800 text-[11px] cursor-pointer hover:border-sky-500 truncate"
            >
              {selectedCustomer ? (
                <span className="font-semibold text-slate-900">
                  {selectedCustomer.code} - {selectedCustomer.name}
                </span>
              ) : (
                <span className="text-slate-400">Select...</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="h-6 w-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"
              title="Cari Pelanggan"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">Nomor :</label>
          <input
            type="text"
            value={checkNo}
            onChange={(e) => setCheckNo(e.target.value)}
            placeholder="No Cek/BG/Bukti..."
            className="w-full h-6 px-2 py-0 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        {/* ROW 2: Cara Bayar (col-6) | Kode Akun (col-6) */}
        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            Cara Bayar :
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="TUNAI">Tunai</option>
            <option value="TRANSFER">Transfer Bank</option>
            <option value="CEK_BG">BG / Cek</option>
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="block text-slate-600 text-[10px] mb-0.5 font-medium">
            Kode Akun :
          </label>
          <SearchableAccountSelect
            accounts={cashAccounts}
            value={selectedAccountId}
            onChange={(val) => setSelectedAccountId(val)}
            placeholder="-- Pilih / Cari Akun Kas / Bank --"
          />
        </div>
      </div>

      {/* 3. Main Debt Allocation Table */}
      {/* Columns: No Baris | No Transaksi | Tanggal | Tanggal JT | Sisa | Pot | Total | Bayar | Jml Bayar */}
      <div className="flex-1 border border-slate-300 rounded bg-white overflow-hidden flex flex-col min-h-[220px]">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 whitespace-nowrap">
              <tr>
                <th className="py-1 px-1.5 text-center w-12 border-r border-slate-200">No Baris</th>
                <th className="py-1 px-2 border-r border-slate-200">No Transaksi</th>
                <th className="py-1 px-2 border-r border-slate-200">Tanggal</th>
                <th className="py-1 px-2 border-r border-slate-200">Tanggal JT</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Sisa</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Pot</th>
                <th className="py-1 px-2 text-right border-r border-slate-200">Total</th>
                <th className="py-1 px-1.5 text-center w-12 border-r border-slate-200">Bayar</th>
                <th className="py-1 px-2 text-right">Jml Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {isLoadingInvoices ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    Memuat daftar faktur piutang pelanggan...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    {selectedCustomer
                      ? "Tidak ada tagihan piutang yang belum lunas untuk pelanggan ini."
                      : "Pilih Pelanggan di atas untuk menampilkan daftar tagihan piutang."}
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const isSelected = selectedRowIndex === idx;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRowIndex(idx)}
                      className={`cursor-pointer transition hover:bg-sky-50/60 ${
                        isSelected ? "bg-sky-100/70 font-semibold text-sky-900" : ""
                      }`}
                    >
                      <td className="py-1 px-1.5 text-center text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold mr-1 bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Faktur
                        </span>
                        <span className="font-mono font-medium">{r.invoice_no}</span>
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200 text-slate-600">
                        {formatDate(r.date)}
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap border-r border-slate-200 text-slate-600">
                        {formatDate(r.due_date)}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">
                        {formatCurrency(r.remaining_amount)}
                      </td>
                      <td className="py-0.5 px-1 text-right border-r border-slate-200">
                        <input
                          type="text"
                          value={r.discount ? formatRupiahNumber(r.discount) : ""}
                          placeholder="0"
                          onChange={(e) =>
                            handleRowDiscountChange(idx, parseRupiahNumber(e.target.value))
                          }
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.stopPropagation()}
                          className="w-20 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono bg-white focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-medium border-r border-slate-200">
                        {formatCurrency(r.total)}
                      </td>
                      <td className="py-1 px-1.5 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={r.is_pay}
                          onChange={() => handleToggleRowPay(idx)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-0.5 px-1 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="text"
                            value={r.pay_amount ? formatRupiahNumber(r.pay_amount) : ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleRowPayAmountChange(idx, parseRupiahNumber(e.target.value))
                            }
                            onFocus={(e) => e.target.select()}
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 h-5 px-1 py-0 border border-slate-300 rounded text-right text-[11px] font-mono font-bold text-emerald-700 bg-white focus:outline-none focus:border-sky-500"
                          />
                          {r.pay_amount >= r.total && r.total > 0 ? (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Langsung Lunas
                            </span>
                          ) : r.pay_amount > 0 ? (
                            <span
                              className="inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                              title={`Sisa: ${formatCurrency(r.total - r.pay_amount)}`}
                            >
                              Belum Lunas (Sisa: {formatCurrency(r.total - r.pay_amount)})
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9.5px] text-slate-400">
                              Belum Dibayar
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Under Table Actions: [💵 Bayar Penuh] [🗑️ Hapus Detail] */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0 py-0.5">
        <button
          type="button"
          onClick={handleAutoPaySelectedRow}
          disabled={rows.length === 0}
          className="h-6 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Isi Bayar Lunas Baris Terpilih / Semua Baris"
        >
          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bayar Penuh</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteSelectedRow}
          disabled={selectedRowIndex === null}
          className="h-6 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40"
          title="Hapus Baris dari Daftar Pembayaran"
        >
          <Trash2 className="w-3 h-3 text-rose-500" />
          <span>Hapus Detail</span>
        </button>
      </div>

      {/* 5. Bottom Calculation & Notes */}
      <div className="bg-slate-50/70 border border-slate-300 rounded p-1 sm:p-1.5 text-xs shadow-2xs shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          {/* Left: Keterangan + Badge */}
          <div className="md:col-span-6 space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-semibold text-[10px] whitespace-nowrap">
                Keterangan :
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan penerimaan pembayaran piutang..."
                className="flex-1 h-6 px-2 py-0 border border-slate-300 rounded text-[11px] text-slate-800 bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Maksimal pembayaran 100 baris.</span>
            </div>
          </div>

          {/* Right: Total Potongan | Total Bayar (pink box) | Lunas checkbox */}
          <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2 text-[11px]">
            {/* Total Potongan */}
            <div className="flex items-center gap-1">
              <label className="text-slate-600 font-semibold text-[10px] whitespace-nowrap">
                Total Potongan :
              </label>
              <div className="w-24 h-6 px-1.5 flex items-center justify-end border border-slate-300 rounded bg-slate-100 font-mono text-[11px]">
                {totalDiscount.toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Total Bayar (Pink Box) */}
            <div className="flex items-center gap-1">
              <label className="text-slate-700 font-bold text-[10px] whitespace-nowrap">
                Total Bayar :
              </label>
              <div className="w-32 h-6 px-2 bg-[#f5d0e3] border border-pink-300 rounded text-right font-mono font-extrabold text-xs text-slate-900 shadow-2xs flex items-center justify-end">
                {totalPayment.toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Lunas Checkbox */}
            <div className="flex items-center gap-1 ml-1">
              <label className="text-slate-700 font-semibold text-[10px]">Lunas :</label>
              <input
                type="checkbox"
                checked={isLunas}
                onChange={(e) => setIsLunas(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Bottom Master Actions */}
      {/* [+ Tambah] [💾 Simpan] [🗑️ Hapus] [🖨️ Cetak] */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Pembayaran Piutang Baru (+ Tambah)"
          >
            <Plus className="w-3 h-3 stroke-[2.8]" />
            <span>Tambah</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (totalPayment <= 0) {
                if (rows.length > 0) {
                  handleAutoPaySelectedRow();
                } else {
                  alert("Pilih pelanggan dan faktur yang akan dibayar terlebih dahulu.");
                }
                return;
              }
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="h-6 px-3 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Simpan Pembayaran Piutang"
          >
            <Save className="w-3 h-3" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>

          <button
            type="button"
            onClick={handleResetForm}
            className="h-6 px-2.5 bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Kosongkan Form"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Cetak Bukti Pembayaran"
          >
            <Printer className="w-3 h-3 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CariPelangganModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={(cust) => setSelectedCustomer(cust)}
        selectedId={selectedCustomer?.id}
      />
    </div>
  );
}
