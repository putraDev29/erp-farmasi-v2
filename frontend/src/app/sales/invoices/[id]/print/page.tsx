"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function SalesInvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const saleId = params?.id as string;

  const { data: printData, isLoading, refetch } = useQuery({
    queryKey: ["sale-print-data", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const res = await api.get(`/sales/${saleId}/print-data`);
      return res.data?.data || null;
    },
    enabled: !!saleId,
  });

  const sale = printData?.sale;
  const company = printData?.company;
  const isAlreadyPrinted = sale?.is_printed || (sale?.print_count || 0) > 0;

  const printMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/sales/${id}/print`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sale-print-data", saleId] });
      refetch();
      setTimeout(() => {
        window.print();
      }, 150);
    },
    onError: (err: any) => {
      alert(
        err.response?.data?.message ||
          "Gagal mencetak: Faktur ini sudah pernah dicetak sebelumnya."
      );
    },
  });

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatDateOnly = (dateStr?: string | Date) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const formatDotMatrixNum = (num: number) => {
    return Number(num || 0).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatBatchED = (item: any) => {
    const batch = item.batch_number || item.product?.batch_number || "BATCH-REG";
    let edStr = "-";
    if (item.expired_date) {
      const ed = new Date(item.expired_date);
      const pad = (n: number) => String(n).padStart(2, "0");
      edStr = `${pad(ed.getMonth() + 1)}.${String(ed.getFullYear()).slice(-2)}`;
    } else if (item.product?.expired_date) {
      const ed = new Date(item.product.expired_date);
      const pad = (n: number) => String(n).padStart(2, "0");
      edStr = `${pad(ed.getMonth() + 1)}.${String(ed.getFullYear()).slice(-2)}`;
    }
    const rack = item.product?.rack || "PR1";
    return `${rack} | ${batch} (${edStr})`;
  };

  const handlePrint = () => {
    if (isAlreadyPrinted) {
      alert("Faktur ini sudah pernah dicetak sebelumnya! Berdasarkan regulasi farmasi, cetak hanya boleh 1 kali.");
      return;
    }
    if (confirm("Cetak Faktur Penjualan ke Kertas Continuous Form?\n\nFaktur hanya dapat dicetak 1 KALI.")) {
      printMutation.mutate(saleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-mono text-sm">
        Memuat template cetak faktur dot matrix...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 font-mono">
        <p className="text-red-600 font-bold">Faktur Penjualan tidak ditemukan.</p>
        <button
          onClick={() => router.push("/sales/invoices")}
          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-2 sm:p-6 print:p-0 print:bg-white">
      {/* Top Controls (Screen Only) */}
      <div className="w-full max-w-[215mm] mb-4 flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-300 shadow-sm print:hidden">
        <button
          onClick={() => router.push("/sales/invoices")}
          className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2">
          {isAlreadyPrinted ? (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded text-xs font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sudah Cetak Faktur (Terkunci)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-xs font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Belum Cetak (Batas: 1 Kali)</span>
            </span>
          )}

          <button
            onClick={handlePrint}
            disabled={isAlreadyPrinted || printMutation.isPending}
            className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${
              isAlreadyPrinted
                ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                : "bg-[#00c875] hover:bg-[#00b066] text-white cursor-pointer active:scale-95"
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>
              {printMutation.isPending
                ? "Memproses..."
                : isAlreadyPrinted
                ? "Sudah Cetak Faktur"
                : "Cetak Faktur Sekarang"}
            </span>
          </button>
        </div>
      </div>

      {/* Paper Simulation */}
      <div
        id="printable-dotmatrix-invoice"
        className="bg-white text-black font-mono text-[11px] leading-tight w-full max-w-[215mm] min-h-[140mm] shadow-md border border-slate-300 relative flex flex-col p-6 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
      >
        {/* Pinhole simulation */}
        <div
          className="absolute left-1 top-0 bottom-0 w-3 flex flex-col justify-around pointer-events-none print:hidden opacity-30 select-none"
          aria-hidden="true"
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <span key={i} className="w-2 h-2 rounded-full border border-black bg-slate-100 block" />
          ))}
        </div>
        <div
          className="absolute right-1 top-0 bottom-0 w-3 flex flex-col justify-around pointer-events-none print:hidden opacity-30 select-none"
          aria-hidden="true"
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <span key={i} className="w-2 h-2 rounded-full border border-black bg-slate-100 block" />
          ))}
        </div>

        {/* 1. Header (3 Columns) */}
        <div className="grid grid-cols-12 gap-2 pb-2 text-[10.5px]">
          {/* Left: Company PBF Info */}
          <div className="col-span-4 pr-1">
            <div className="font-black text-sm tracking-wider uppercase">FAKTUR PENJUALAN</div>
            <div className="font-bold text-xs uppercase">{company?.name || "PT. BERKAT JAYA PHARMA"}</div>
            <div>{company?.address || "JL. KARYA BARU NO. 43 PTK"}</div>
            <div>{company?.pbf_license || "IZIN PBF: 91201151705760001"}</div>
            <div>{company?.phone || "HP: 085345445718"}</div>
            <div>{company?.npwp || "NPWP: 83.957.105.7-701.000"}</div>
          </div>

          {/* Center: Transaction Numbers */}
          <div className="col-span-3 px-1">
            <div className="grid grid-cols-12 gap-0.5">
              <span className="col-span-5 text-slate-700">No Transaksi</span>
              <span className="col-span-1">:</span>
              <span className="col-span-6 font-bold">{sale.invoice_no}</span>

              <span className="col-span-5 text-slate-700">Tanggal</span>
              <span className="col-span-1">:</span>
              <span className="col-span-6">{formatDateTime(sale.date)}</span>

              <span className="col-span-5 text-slate-700">Tanggal Jt</span>
              <span className="col-span-1">:</span>
              <span className="col-span-6">{formatDateOnly(sale.due_date)}</span>

              <span className="col-span-5 text-slate-700">Kode Sales</span>
              <span className="col-span-1">:</span>
              <span className="col-span-6 font-semibold">{sale.sales_rep?.code || sale.sales_rep?.name || "-"}</span>
            </div>
          </div>

          {/* Right: Customer Info */}
          <div className="col-span-5 pl-1">
            <div className="grid grid-cols-12 gap-0.5">
              <span className="col-span-4 text-slate-700">Kepada Yth.</span>
              <span className="col-span-1">:</span>
              <span className="col-span-7 font-bold uppercase">{sale.customer?.name || "APOTEK DIAN"}</span>

              <span className="col-span-4 text-slate-700">Alamat</span>
              <span className="col-span-1">:</span>
              <span className="col-span-7 leading-tight">
                {sale.customer?.address ||
                  "JL. ARUNG RAJA, KP. AIR RAYA, KEC. SERASAN, KEL. SERASAN, KAB. NATUNA"}
              </span>

              <span className="col-span-4 text-slate-700">NPWP</span>
              <span className="col-span-1">:</span>
              <span className="col-span-7">{sale.customer?.npwp || "2103064806890001"}</span>
            </div>
          </div>
        </div>

        {/* 2. Table Section */}
        <div className="w-full border-t border-b border-dashed border-black my-1">
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr className="border-b border-dashed border-black">
                <th className="py-1 px-1 w-6 text-center">No.</th>
                <th className="py-1 px-1">Nama Item</th>
                <th className="py-1 px-1 w-44">Batch/ED</th>
                <th className="py-1 px-1 w-12 text-right">Jml</th>
                <th className="py-1 px-1 w-12 text-center">Satuan</th>
                <th className="py-1 px-1 w-24 text-right">Harga</th>
                <th className="py-1 px-1 w-14 text-right">Pot</th>
                <th className="py-1 px-1 w-28 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item: any, idx: number) => {
                  const lineTotal = item.total_amount || item.qty * item.unit_price - (item.discount || 0);

                  return (
                    <tr key={item.id || idx} className="align-top leading-snug">
                      <td className="py-0.5 px-1 text-center">{idx + 1}</td>
                      <td className="py-0.5 px-1 font-semibold uppercase">
                        {item.product?.name || "OBAT"}
                        {item.product?.drug_classification === "PREKURSOR" && " (PREKURSOR)"}
                        {item.product?.drug_classification === "NARKOTIKA" && " (NARKOTIKA)"}
                        {item.product?.drug_classification === "PSIKOTROPIKA" && " (PSIKOTROPIKA)"}
                      </td>
                      <td className="py-0.5 px-1 font-mono text-[10px] whitespace-nowrap">
                        {formatBatchED(item)}
                      </td>
                      <td className="py-0.5 px-1 text-right">{formatDotMatrixNum(item.qty)}</td>
                      <td className="py-0.5 px-1 text-center uppercase">
                        {item.unit?.name || item.unit?.code || "BOX"}
                      </td>
                      <td className="py-0.5 px-1 text-right">{formatDotMatrixNum(item.unit_price)}</td>
                      <td className="py-0.5 px-1 text-right">{formatDotMatrixNum(item.discount || 0)}</td>
                      <td className="py-0.5 px-1 text-right font-medium">{formatDotMatrixNum(lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-slate-400">
                    Tidak ada rincian item obat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Signatures & Totals */}
        <div className="grid grid-cols-12 gap-2 pt-2 text-[10.5px]">
          {/* Signatures */}
          <div className="col-span-8 grid grid-cols-4 gap-1 text-center">
            <div className="flex flex-col justify-between h-24">
              <div>Penerima</div>
              <div className="text-[10px] text-slate-600">( ........................................ )</div>
            </div>
            <div className="flex flex-col justify-between h-24">
              <div>Picker</div>
              <div className="text-[10px] text-slate-600">( ........................................ )</div>
            </div>
            <div className="flex flex-col justify-between h-24">
              <div>Checker</div>
              <div className="text-[10px] text-slate-600">( ........................................ )</div>
            </div>
            <div className="flex flex-col justify-between h-24 text-center">
              <div className="font-bold">APOTEKER</div>
              <div className="leading-tight">
                <div className="font-bold text-[10px] uppercase">
                  {company?.pharmacist?.name || "APT. RAIF UMBARA, S.FARM"}
                </div>
                <div className="text-[8.5px] text-slate-700">
                  {company?.pharmacist?.sipa ||
                    "SIPA: 500.16/11151/SIPA/125270016/DPMTSP/SP/2025"}
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="col-span-4 border-l border-dashed border-black pl-3 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span>Sub Total</span>
              <span>:</span>
              <span className="font-medium text-right w-28">
                {formatDotMatrixNum(sale.subtotal || sale.total_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Potongan</span>
              <span>:</span>
              <span className="font-medium text-right w-28">
                {formatDotMatrixNum(sale.discount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pajak {sale.tax_percent ? `${sale.tax_percent}%` : "0,00 %"}</span>
              <span>:</span>
              <span className="font-medium text-right w-28">
                {formatDotMatrixNum(sale.tax_amount || 0)}
              </span>
            </div>
            <div className="flex justify-between border-t border-dashed border-black pt-1 font-bold text-xs">
              <span>Total Akhir</span>
              <span>:</span>
              <span className="text-right w-28">{formatDotMatrixNum(sale.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* 4. Notes & Bank Accounts */}
        <div className="grid grid-cols-12 gap-2 border-t border-dashed border-black mt-2 pt-1 text-[9.5px]">
          <div className="col-span-6 space-y-0.5">
            <div className="font-bold">
              KET : {sale.notes ? sale.notes.toUpperCase() : "KIRIM HARI INI"}
            </div>
            <div className="italic">*Wajib di TTD dan Nama Picker dan Checker</div>
            <div className="font-mono text-slate-700">
              {formatDateTime(sale.printed_at || sale.date)} {sale.user?.username || "ALTHA"}
            </div>
          </div>

          <div className="col-span-6 text-right font-mono text-[9px] leading-tight space-y-0.5">
            {company?.bank_accounts && company.bank_accounts.length > 0 ? (
              company.bank_accounts.map((acc: string, i: number) => <div key={i}>{acc}</div>)
            ) : (
              <>
                <div>Rekening Bank MANDIRI PT. BERKAT JAYA PHARMA no.rek 146-00-1236866-3</div>
                <div>Rekening Bank BRI PT. BERKAT JAYA PHARMA no.rek 0071-01-002042-56-2</div>
                <div>Rekening Bank BCA PT. BERKAT JAYA PHARMA no.rek 6465337900</div>
              </>
            )}
          </div>
        </div>

        {/* 5. CDOB BPOM Certificate */}
        <div className="text-center text-[9px] font-mono text-slate-600 pt-1 border-t border-dashed border-slate-300 mt-1">
          {company?.cdob_cert || "Sertifikat CDOB: CDOB2352/R/4-59333/01/2025"}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-dotmatrix-invoice,
          #printable-dotmatrix-invoice * {
            visibility: visible;
          }
          #printable-dotmatrix-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-family: "Courier New", Courier, monospace !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
}
