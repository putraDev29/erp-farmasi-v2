"use client";

import React, { useRef } from "react";
import { Printer, FileText } from "lucide-react";
import { SingleSPSheet } from "@/components/purchasing/DokumenSPModal";

interface DokumenSPSalesViewerProps {
  sale: any;
  company?: any;
}

export function DokumenSPSalesViewer({ sale, company }: DokumenSPSalesViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Resolve SP Number identical to SP Pembelian format (SP/YYYY/MM/XXXXX)
  let spNumber = sale?.customer_sp_number;
  if (!spNumber || spNumber.trim() === "") {
    if (sale?.invoice_no) {
      const clean = String(sale.invoice_no)
        .replace(/^INV\//i, "")
        .replace(/^POS\//i, "")
        .replace(/^SO\//i, "");
      spNumber = `SP/${clean}`;
    } else {
      spNumber = "SP/2026/11/0001";
    }
  }

  // 2. Resolve SP Date formatted as DD-M-YY identical to SP Pembelian
  const saleDate = sale?.customer_sp_date
    ? new Date(sale.customer_sp_date)
    : sale?.date
    ? new Date(sale.date)
    : new Date();
  const dateDay = String(saleDate.getDate()).padStart(2, "0");
  const dateMonth = String(saleDate.getMonth() + 1);
  const dateYearShort = String(saleDate.getFullYear()).slice(-2);
  const formattedDate = `${dateDay}-${dateMonth}-${dateYearShort}`;

  // 3. Resolve Customer Name on "Kepada Yth."
  const customerName =
    sale?.customer?.name ||
    (sale?.customer_id ? "Pelanggan Farmasi" : "Pelanggan Umum (Tunai)");

  // 4. Resolve APJ & Signature Details
  const apjName =
    company?.apj_name ||
    "apt. Rahmat Hidayat, S.Farm.";
  const apjSipaNo =
    company?.apj_sipa ||
    "19920101/SIPA_61.71/2022/2048";
  const apjPhone =
    company?.apj_phone ||
    "08124984426";
  const stampUrl = company?.stamp_url;
  const signatureUrl = company?.signature_url;

  // 5. Items mapping
  const items = (sale?.items || []).map((it: any) => ({
    id: it.id,
    product_id: it.product_id,
    product: it.product,
    name: it.product?.name || it.name,
    unit: it.unit,
    qty: it.qty,
  }));

  const handlePrint = () => {
    if (!printRef.current) {
      window.print();
      return;
    }

    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Surat Pesanan (SP) - ${spNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 6px; }
            .border-box { border: 1px solid #0f172a; }
            .border-b { border-bottom: 1px solid #0f172a; }
            .border-r { border-right: 1px solid #0f172a; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: monospace; }
            .uppercase { text-transform: uppercase; }
            @media print {
              .print\\:hidden { display: none !important; }
            }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 300);">
          <div style="max-width: 680px; margin: 0 auto;">
            ${printContents}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 print:border-none print:shadow-none text-slate-900 bg-white">
      {/* Top Control Bar (Hidden on print) */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-300 print:hidden shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-700" />
          <span className="font-bold text-xs text-slate-800">
            Dokumen Surat Pesanan (SP) Resmi
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            [{spNumber}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak SP</span>
          </button>
        </div>
      </div>

      {/* Printable SP Sheets Container */}
      <div
        ref={printRef}
        className="overflow-y-auto print:overflow-visible flex-1 bg-slate-100/60 print:bg-white p-3 sm:p-5 print:p-0 space-y-4 print:space-y-0"
      >
        <div className="bg-white rounded border border-slate-200 shadow-xs print:border-none print:shadow-none print:rounded-none max-w-2xl mx-auto">
          <SingleSPSheet
            supplierName={customerName}
            spNumber={spNumber}
            formattedDate={formattedDate}
            items={items}
            apjName={apjName}
            apjSipaNo={apjSipaNo}
            apjPhone={apjPhone}
            stampUrl={stampUrl}
            signatureUrl={signatureUrl}
            sheetIndex={1}
            totalSheets={1}
          />
        </div>
      </div>
    </div>
  );
}
