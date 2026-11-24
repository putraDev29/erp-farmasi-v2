"use client";

import React, { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer, X, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

interface FakturPenjualanDotMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId?: string | null;
  orderId?: string | null;
  onPrintSuccess?: () => void;
}

export const FakturPenjualanDotMatrixModal: React.FC<FakturPenjualanDotMatrixModalProps> = ({
  isOpen,
  onClose,
  saleId,
  orderId,
  onPrintSuccess,
}) => {
  const queryClient = useQueryClient();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const isOrderMode = Boolean(orderId && !saleId);
  const activeId = saleId || orderId;

  // Fetch print data
  const { data: printData, isLoading, refetch } = useQuery({
    queryKey: [isOrderMode ? "sales-order-print-data" : "sale-print-data", activeId],
    queryFn: async () => {
      if (!activeId) return null;
      const endpoint = isOrderMode ? `/sales/orders/${activeId}/print-data` : `/sales/${activeId}/print-data`;
      const res = await api.get(endpoint);
      return res.data?.data || null;
    },
    enabled: isOpen && !!activeId,
  });

  const sale = printData?.sale || printData?.sales_order;
  const company = printData?.company;

  // Print mutation (marks as printed in DB - ONLY ALLOWED ONCE)
  const printMutation = useMutation({
    mutationFn: async (id: string) => {
      const endpoint = isOrderMode ? `/sales/orders/${id}/print` : `/sales/${id}/print`;
      return await api.post(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoices-detail", activeId] });
      queryClient.invalidateQueries({ queryKey: ["sale-print-data", activeId] });
      queryClient.invalidateQueries({ queryKey: ["sales-order-print-data", activeId] });
      refetch();
      if (onPrintSuccess) onPrintSuccess();

      // Trigger native browser print
      setTimeout(() => {
        window.print();
      }, 150);
    },
    onError: (err: any) => {
      alert(
        err.response?.data?.message ||
          "Gagal memproses cetak: Faktur ini sudah pernah dicetak sebelumnya."
      );
    },
  });

  if (!isOpen || !activeId) return null;

  const isAlreadyPrinted = sale?.is_printed || (sale?.print_count || 0) > 0;

  // Format date helper: DD/MM/YYYY HH:mm:ss
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

  // Format currency with Indonesian dot/comma decimal
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

  const handlePrintClick = () => {
    if (isAlreadyPrinted) {
      alert(
        "PERINGATAN REGULASI PBF / CDOB:\nFaktur Penjualan ini sudah pernah dicetak sebelumnya!\nCetak faktur fisik asli hanya diizinkan 1 (satu) kali."
      );
      return;
    }

    if (
      confirm(
        "Cetak Faktur Penjualan ke Kertas Continuous Form?\n\nPERHATIAN: Faktur hanya dapat dicetak 1 KALI. Setelah dicetak, tombol cetak akan otomatis dinonaktifkan."
      )
    ) {
      printMutation.mutate(activeId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container Card */}
      <div className="bg-slate-800 text-white rounded-xl shadow-2xl border border-slate-700 w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Top Control Bar (Screen Only) */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide flex items-center gap-1.5 text-emerald-400">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Format Cetak Faktur Penjualan (Kertas Continuous Form Dot Matrix)</span>
            </span>
            {isAlreadyPrinted ? (
              <span className="px-2 py-0.5 bg-slate-700 text-amber-300 border border-amber-400/40 rounded text-[11px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>SUDAH DICETAK (Terkunci)</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded text-[11px] font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Siap Cetak (1 Kali)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isAlreadyPrinted || printMutation.isPending || isLoading}
              onClick={handlePrintClick}
              className={`h-7 px-4 rounded text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 ${
                isAlreadyPrinted
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
                  : "bg-[#00c875] hover:bg-[#00b066] text-white cursor-pointer active:scale-95"
              }`}
              title={
                isAlreadyPrinted
                  ? "Faktur sudah dicetak sebelumnya. Hanya diizinkan cetak 1 kali."
                  : "Cetak Faktur Sekarang"
              }
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {printMutation.isPending
                  ? "Memproses..."
                  : isAlreadyPrinted
                  ? "Sudah Cetak Faktur"
                  : "Cetak Faktur Sekarang"}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container (Screen Simulation + Print) */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900/90 flex justify-center print:p-0 print:bg-white print:m-0">
          {isLoading ? (
            <div className="py-24 text-center text-slate-400">
              Menyiapkan data cetak faktur dot matrix...
            </div>
          ) : !sale ? (
            <div className="py-24 text-center text-red-400">
              Data transaksi faktur penjualan tidak ditemukan.
            </div>
          ) : (
            /* Continuous Form Paper Layout */
            <div
              ref={printAreaRef}
              id="printable-dotmatrix-invoice"
              className="bg-white text-black font-mono text-[11px] leading-tight w-full max-w-[215mm] min-h-[140mm] shadow-2xl border border-slate-300 relative flex flex-col p-4 sm:p-6 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
            >
              {/* Screen Only: Pinhole Margins on Left and Right (Exact Continuous Form Look) */}
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

              {/* 1. HEADER SECTION (3 Columns matching Image 1 & Image 2) */}
              <div className="grid grid-cols-12 gap-2 pb-2 text-[10.5px]">
                {/* Left: Company PBF Info */}
                <div className="col-span-4 pr-1">
                  <div className="font-black text-sm tracking-wider uppercase">
                    FAKTUR PENJUALAN
                  </div>
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
                    <span className="col-span-6 font-bold">{sale.invoice_no || sale.order_no}</span>

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

              {/* 2. TABLE SECTION (Dot Matrix Dashed Borders) */}
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
                            <td className="py-0.5 px-1 text-right">
                              {formatDotMatrixNum(item.qty)}
                            </td>
                            <td className="py-0.5 px-1 text-center uppercase">
                              {item.unit?.name || item.unit?.code || "BOX"}
                            </td>
                            <td className="py-0.5 px-1 text-right">
                              {formatDotMatrixNum(item.unit_price)}
                            </td>
                            <td className="py-0.5 px-1 text-right">
                              {formatDotMatrixNum(item.discount || 0)}
                            </td>
                            <td className="py-0.5 px-1 text-right font-medium">
                              {formatDotMatrixNum(lineTotal)}
                            </td>
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

              {/* 3. SIGNATURES & TOTALS SECTION matching Image 1 & Image 2 */}
              <div className="grid grid-cols-12 gap-2 pt-2 text-[10.5px]">
                {/* Left 4 Columns: Signatures */}
                <div className="col-span-8 grid grid-cols-4 gap-1 text-center">
                  {/* 1. Penerima */}
                  <div className="flex flex-col justify-between h-24">
                    <div>Penerima</div>
                    <div className="text-[10px] text-slate-600">( ........................................ )</div>
                  </div>

                  {/* 2. Picker */}
                  <div className="flex flex-col justify-between h-24">
                    <div>Picker</div>
                    <div className="text-[10px] text-slate-600">( ........................................ )</div>
                  </div>

                  {/* 3. Checker */}
                  <div className="flex flex-col justify-between h-24">
                    <div>Checker</div>
                    <div className="text-[10px] text-slate-600">( ........................................ )</div>
                  </div>

                  {/* 4. APOTEKER (With SIPA) */}
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

                {/* Right: Subtotal, Potongan, Pajak, Total Akhir */}
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

              {/* 4. BOTTOM NOTES & BANK ACCOUNTS matching Image 1 & Image 2 */}
              <div className="grid grid-cols-12 gap-2 border-t border-dashed border-black mt-2 pt-1 text-[9.5px]">
                {/* Left: Delivery notes & Verification rule */}
                <div className="col-span-6 space-y-0.5">
                  <div className="font-bold">
                    KET : {sale.notes ? sale.notes.toUpperCase() : "KIRIM HARI INI"}
                  </div>
                  <div className="italic">*Wajib di TTD dan Nama Picker dan Checker</div>
                  <div className="font-mono text-slate-700">
                    {formatDateTime(sale.printed_at || sale.date)} {sale.user?.username || "ALTHA"}
                  </div>
                </div>

                {/* Right: Bank Accounts for Payment */}
                <div className="col-span-6 text-right font-mono text-[9px] leading-tight space-y-0.5">
                  {company?.bank_accounts && company.bank_accounts.length > 0 ? (
                    company.bank_accounts.map((acc: string, i: number) => (
                      <div key={i}>{acc}</div>
                    ))
                  ) : (
                    <>
                      <div>Rekening Bank MANDIRI PT. BERKAT JAYA PHARMA no.rek 146-00-1236866-3</div>
                      <div>Rekening Bank BRI PT. BERKAT JAYA PHARMA no.rek 0071-01-002042-56-2</div>
                      <div>Rekening Bank BCA PT. BERKAT JAYA PHARMA no.rek 6465337900</div>
                    </>
                  )}
                </div>
              </div>

              {/* 5. CDOB BPOM CERTIFICATE WATERMARK FOOTER */}
              <div className="text-center text-[9px] font-mono text-slate-600 pt-1 border-t border-dashed border-slate-300 mt-1">
                {company?.cdob_cert || "Sertifikat CDOB: CDOB2352/R/4-59333/01/2025"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Print CSS */}
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
};
