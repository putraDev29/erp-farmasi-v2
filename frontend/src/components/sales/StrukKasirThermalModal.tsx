"use client";

import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, Check, Building, Phone } from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

interface StrukKasirThermalModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId?: string | null;
  saleData?: any;
}

export const StrukKasirThermalModal: React.FC<StrukKasirThermalModalProps> = ({
  isOpen,
  onClose,
  saleId,
  saleData: directSaleData,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch sale detail if not provided directly
  const { data: fetchedSale, isLoading } = useQuery({
    queryKey: ["sale-receipt-detail", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const res = await api.get(`/sales/${saleId}`);
      return res.data?.data;
    },
    enabled: isOpen && Boolean(saleId) && !directSaleData,
  });

  // Fetch Company / General settings for receipt header
  const { data: generalSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings-general-receipt"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/groups/GENERAL");
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
    enabled: isOpen,
  });

  const { data: apjSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings-pharmacy-receipt"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/groups/PHARMACY");
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const sale = directSaleData || fetchedSale;

  const pharmacyName =
    generalSettings?.app_brand_name ||
    sale?.company?.name ||
    "APOTEK BERKAT PURNAMA";
  const pharmacyAddress =
    generalSettings?.company_address ||
    "Jl. Karya Baru No. 43, Pontianak Selatan";
  const pharmacyPhone = generalSettings?.company_phone || "0561-572028";
  const apjName =
    apjSettings?.apj_name ||
    generalSettings?.apj_name ||
    "apt. Rahmat Hidayat, S.Farm.";
  const apjSipa =
    apjSettings?.apj_sipa_no ||
    generalSettings?.apj_sipa_no ||
    "19920101/SIPA_61.71/2022/2048";

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Kasir - ${sale?.invoice_no || "Faktur"}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              margin: 0;
              padding: 4px;
              line-height: 1.25;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000;
              margin: 4px 0;
            }
            .double-divider {
              border-top: 2px dashed #000;
              margin: 6px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .flex-between {
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const items = sale?.items || [];
  const subtotal = Number(sale?.subtotal || 0);
  const discount = Number(sale?.discount || 0);
  const tax = Number(sale?.tax_amount || 0);
  const total = Number(sale?.total_amount || 0);
  const paid = Number(sale?.paid_amount || sale?.total_amount || 0);
  const change = Number(sale?.change_amount || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header Dialog */}
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-wide text-white">
              Cetak Struk Kasir Thermal
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Preview Body (Styled as 80mm thermal paper) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
          <div
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white p-4 shadow-md border border-slate-300 font-mono text-[11px] text-slate-900 leading-snug rounded"
          >
            {/* Pharmacy Header */}
            <div className="text-center space-y-0.5">
              <h4 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                {pharmacyName}
              </h4>
              <p className="text-[10px] text-slate-600">{pharmacyAddress}</p>
              <p className="text-[10px] text-slate-600">Telp: {pharmacyPhone}</p>
              <p className="text-[9.5px] text-slate-500 pt-0.5">
                APJ: {apjName}
              </p>
              <p className="text-[9px] text-slate-500 font-sans">
                SIPA: {apjSipa}
              </p>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Transaction Metadata */}
            <div className="text-[10.5px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Struk :</span>
                <span className="font-bold">{sale?.invoice_no || "SI/Auto"}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal   :</span>
                <span>{sale?.date ? formatDate(sale.date) : formatDate(new Date().toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir     :</span>
                <span>{sale?.user?.username || "ADMIN KASIR"}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan :</span>
                <span>{sale?.customer?.name || "UMUM (PASIEN)"}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipe Trans:</span>
                <span className="font-semibold text-emerald-800">RETAIL OTC (CASH)</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Items Table */}
            <div className="space-y-1.5 text-[10.5px]">
              {items.map((it: any, idx: number) => {
                const prodName = it.product?.name || it.name || "Item Obat";
                const qty = Number(it.qty || 1);
                const unit = it.unit?.name || it.unit_name || "Pcs";
                const price = Number(it.unit_price || 0);
                const totalLine = Number(it.total_amount || qty * price);

                return (
                  <div key={idx} className="space-y-0.5">
                    <p className="font-bold truncate text-slate-900">{prodName}</p>
                    <div className="flex justify-between text-slate-700 text-[10px]">
                      <span>
                        {qty} {unit} x {formatCurrency(price)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(totalLine)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal :</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Diskon :</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>PPN :</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs text-slate-900 pt-0.5 border-t border-dotted border-slate-300">
                <span>TOTAL :</span>
                <span className="text-sm">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-slate-800 pt-0.5">
                <span>TUNAI (KASIR) :</span>
                <span className="font-bold">{formatCurrency(paid)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>KEMBALIAN :</span>
                <span>{formatCurrency(change)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                <span>Akun Kas :</span>
                <span>1-1110 - KAS KECIL</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Footer Greeting */}
            <div className="text-center text-[9.5px] text-slate-600 space-y-0.5">
              <p className="font-bold text-slate-800">
                *** TERIMA KASIH ***
              </p>
              <p>SEMOGA LEKAS SEMBUH</p>
              <p className="text-[8.5px] text-slate-500 pt-1">
                Barang yang sudah dibeli tidak dapat ditukar/dikembalikan
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Format: Thermal Paper (58mm / 80mm)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-semibold text-xs transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Struk Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
