"use client";

import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, Receipt } from "lucide-react";
import { api } from "@/lib/api";

interface RiwayatPembayaranSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  saleId?: string | null;
  paymentId?: string | null;
}

// Logo PT Berkat Jaya Pharma SVG Vector (identical to SP & Faktur Kop)
function LogoBerkatJayaPharma({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#16a34a" strokeWidth="3" fill="#f0fdf4" />
      <path d="M30 65C30 40 45 25 70 25C70 50 55 65 30 65Z" fill="#16a34a" />
      <path d="M42 75C60 75 75 60 75 42C75 55 62 68 45 70C40 70.5 35 73 42 75Z" fill="#dc2626" />
      <path d="M48 35H52V45H62V49H52V59H48V49H38V45H48V35Z" fill="white" />
    </svg>
  );
}

// Ordinal naming in Indonesian e.g. "Pembayaran pertama", "Pembayaran kedua"
function getOrdinalPaymentName(index: number): string {
  const ordinals = [
    "pertama",
    "kedua",
    "ketiga",
    "keempat",
    "kelima",
    "keenam",
    "ketujuh",
    "kedelapan",
    "kesembilan",
    "kesepuluh",
  ];
  if (index < ordinals.length) {
    return `Pembayaran ${ordinals[index]}`;
  }
  return `Pembayaran ke-${index + 1}`;
}

// Format currency identical to reference image (e.g. "Rp7.653.599,50" or "Rp500.000")
function formatRupiahDisplay(num: number): string {
  if (!num && num !== 0) return "Rp0";
  if (Math.round(num) === num) {
    return "Rp" + num.toLocaleString("id-ID");
  }
  return "Rp" + num.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RiwayatPembayaranSalesModal({
  isOpen,
  onClose,
  orderId,
  saleId,
  paymentId,
}: RiwayatPembayaranSalesModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch payment history for Sales Order
  const { data: soData, isLoading: loadingSO } = useQuery({
    queryKey: ["so-payment-history", orderId],
    enabled: isOpen && !!orderId,
    queryFn: async () => {
      const res = await api.get(`/sales/orders/${orderId}/payment-history`);
      return res.data?.data;
    },
  });

  // Fetch payment history for Sales Invoice
  const { data: saleData, isLoading: loadingSale } = useQuery({
    queryKey: ["sale-payment-history", saleId],
    enabled: isOpen && !!saleId,
    queryFn: async () => {
      const res = await api.get(`/sales/${saleId}/payment-history`);
      return res.data?.data;
    },
  });

  // Fetch single CustomerPayment if opened by paymentId
  const { data: paymentData, isLoading: loadingPayment } = useQuery({
    queryKey: ["single-customer-payment", paymentId],
    enabled: isOpen && !!paymentId && !orderId && !saleId,
    queryFn: async () => {
      const res = await api.get(`/sales/payments`);
      const all = res.data?.data || [];
      return all.find((p: any) => p.id === paymentId);
    },
  });

  if (!isOpen) return null;

  const isLoading = loadingSO || loadingSale || loadingPayment;

  // Resolve active entity data
  let docTitle = "Faktur Pembayaran Penjualan";
  let trxNo = "-";
  let customerName = "-";
  let totalAmount = 0;
  let paidAmount = 0;
  let remainingAmount = 0;
  let paymentStatus = "UNPAID";
  let historyItems: any[] = [];

  if (soData?.order) {
    const o = soData.order;
    trxNo = o.order_no;
    docTitle = `Faktur Pembayaran ${o.order_no}`;
    customerName = o.customer?.name || "Pelanggan";
    totalAmount = Number(o.total_amount) || 0;
    paidAmount = Number(o.paid_amount) || 0;
    remainingAmount = Number(o.remaining_amount) || 0;
    paymentStatus = o.payment_status || "UNPAID";
    historyItems = soData.history || [];
  } else if (saleData?.sale) {
    const s = saleData.sale;
    trxNo = s.invoice_no;
    docTitle = `Faktur Pembayaran ${s.invoice_no}`;
    customerName = s.customer?.name || "Pelanggan Umum";
    totalAmount = Number(s.total_amount) || 0;
    paidAmount = Number(s.paid_amount) || 0;
    remainingAmount = Number(s.remaining_amount) || 0;
    paymentStatus = s.payment_status || "UNPAID";
    historyItems = saleData.history || [];
  } else if (paymentData) {
    trxNo = paymentData.payment_no;
    docTitle = `Faktur Penerimaan Piutang ${paymentData.payment_no}`;
    customerName = paymentData.customer?.name || "-";
    totalAmount = Number(paymentData.total_amount) || 0;
    paidAmount = Number(paymentData.total_amount) || 0;
    remainingAmount = 0;
    paymentStatus = "PAID";
    historyItems = [
      {
        id: paymentData.id,
        date: paymentData.date,
        trx_no: paymentData.payment_no,
        category: "Pelunasan Piutang",
        payment_method: paymentData.payment_method,
        account_name: paymentData.bank?.name || "Kas Tunai",
        amount: paymentData.total_amount,
        notes: paymentData.notes || "Penerimaan Piutang",
        created_by: paymentData.user?.full_name || "Admin",
      },
    ];
  }

  const isLunas = paymentStatus === "PAID" || remainingAmount <= 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-xl flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-xs text-slate-800">
              Faktur Pembayaran &amp; Riwayat Piutang
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Faktur</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet (KOP + Faktur Pembayaran Layout) */}
        <div
          ref={printRef}
          className="p-6 sm:p-8 overflow-y-auto print:overflow-visible print:p-0 font-sans text-xs bg-white text-slate-900 select-text flex flex-col justify-between"
          style={{ minHeight: "600px" }}
        >
          <div>
            {/* 1. KOP SURAT (IDENTICAL TO SP KOP) */}
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-900">
              <LogoBerkatJayaPharma className="w-14 h-14 shrink-0" />
              <div className="text-center flex-1">
                <h1 className="font-serif font-black text-base sm:text-lg tracking-wide text-slate-900 leading-tight">
                  PT BERKAT JAYA PHARMA
                </h1>
                <p className="text-[10px] text-slate-800 font-medium leading-tight">
                  Jl. Karya Baru No. 43 Pontianak Selatan
                </p>
                <p className="text-[9.5px] text-slate-700 leading-tight">
                  Telp: 0561-572028/0561-8178650 Fax: 0561-572028
                </p>
                <p className="text-[9.5px] text-slate-700 leading-tight">
                  NPWP: 83.957.195.7-701.000 Izin PBF: 81201151705760001
                </p>
                <p className="text-[9.5px] text-slate-700 leading-tight">
                  E-mail: BerkatJP@gmail.com
                </p>
              </div>
            </div>

            {/* 2. Document Header & Status Badge */}
            <div className="pt-4 pb-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {docTitle}
              </h2>
              <div className="mt-1.5">
                {isLunas ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                    Lunas
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a]">
                    Belum Lunas (Sisa: {formatRupiahDisplay(remainingAmount)})
                  </span>
                )}
              </div>
            </div>

            {/* 3. Hero Total Amount */}
            <div className="mt-3 mb-6">
              <div className="text-2xl sm:text-3xl font-black text-[#059669] tracking-tight font-sans">
                {formatRupiahDisplay(totalAmount)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Total nilai penjualan
              </p>
            </div>

            {/* 4. Financial Breakdown */}
            <div className="space-y-3 text-[13px] border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center text-slate-700">
                <span>Total penjualan</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatRupiahDisplay(totalAmount)}
                </span>
              </div>

              {/* Dynamic list of payments */}
              {historyItems.map((item, idx) => (
                <div key={item.id || idx} className="flex justify-between items-center text-slate-700">
                  <span>{getOrdinalPaymentName(idx)}</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatRupiahDisplay(item.amount)}
                  </span>
                </div>
              ))}

              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-center">
                <span className="font-bold text-slate-900 text-sm">Sisa piutang</span>
                <span
                  className={`font-black text-sm font-mono ${
                    remainingAmount <= 0 ? "text-[#059669]" : "text-rose-600"
                  }`}
                >
                  {formatRupiahDisplay(remainingAmount)}
                </span>
              </div>
            </div>

            {/* 5. Riwayat Pembayaran Section */}
            <div className="mt-6">
              <h3 className="font-bold text-sm text-slate-900 mb-3">
                Riwayat pembayaran
              </h3>

              {historyItems.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs text-center">
                  Belum ada pembayaran yang tercatat (Status: Tempo / Bayar Rp 0). Sisa piutang dapat dibayarkan melalui menu Bayar Piutang.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {historyItems.map((hist, i) => {
                    const paymentDate = hist.date ? new Date(hist.date) : new Date();
                    const day = paymentDate.getDate();
                    const monthNames = [
                      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
                    ];
                    const monthStr = monthNames[paymentDate.getMonth()];
                    const yearStr = paymentDate.getFullYear();
                    const formattedHistDate = `${day} ${monthStr} ${yearStr}`;

                    const isInitial = i === 0 || hist.category?.includes("awal") || hist.category?.includes("DP");
                    const subtitle = `${isInitial ? "Pembayaran awal" : "Pelunasan"} · ${hist.trx_no || trxNo}`;

                    return (
                      <div
                        key={hist.id || i}
                        className="flex justify-between items-start border-b border-slate-50 pb-2.5"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            {formattedHistDate}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {subtitle}
                          </div>
                        </div>
                        <div className="font-bold text-[#059669] text-sm font-mono">
                          {formatRupiahDisplay(hist.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 6. Signature Block for Official Printout */}
          <div className="mt-10 pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-700">
            <div>
              <p className="font-semibold text-slate-800">Kasir / Pembuat</p>
              <div className="h-14"></div>
              <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                ( .................... )
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Bagian Keuangan</p>
              <div className="h-14"></div>
              <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                ( .................... )
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Pelanggan / Penerima</p>
              <div className="h-14"></div>
              <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                ( {customerName} )
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
