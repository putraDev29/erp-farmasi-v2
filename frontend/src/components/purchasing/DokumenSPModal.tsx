"use client";

import React, { useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, FileText, Layers, CheckCircle2 } from "lucide-react";
import { api, formatDate, resolveAssetUrl } from "@/lib/api";

interface DokumenSPModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  poData?: any;
}

// Helper Terbilang untuk Jumlah Barang / Qty
export function terbilangQty(n: number): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Nol";
  if (n < 12) return bilangan[n];
  if (n < 20) return bilangan[n - 10] + " Belas";
  if (n < 100)
    return (
      bilangan[Math.floor(n / 10)] +
      " Puluh" +
      (n % 10 !== 0 ? " " + bilangan[n % 10] : "")
    );
  if (n < 200) return "Seratus" + (n - 100 !== 0 ? " " + terbilangQty(n - 100) : "");
  if (n < 1000)
    return (
      bilangan[Math.floor(n / 100)] +
      " Ratus" +
      (n % 100 !== 0 ? " " + terbilangQty(n % 100) : "")
    );
  if (n < 2000) return "Seribu" + (n - 1000 !== 0 ? " " + terbilangQty(n - 1000) : "");
  if (n < 1000000)
    return (
      terbilangQty(Math.floor(n / 1000)) +
      " Ribu" +
      (n % 1000 !== 0 ? " " + terbilangQty(n % 1000) : "")
    );
  return String(n);
}

// Logo PT Berkat Jaya Pharma SVG Vector
export function LogoBerkatJayaPharma({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#16a34a" strokeWidth="3" fill="#f0fdf4" />
      <path d="M30 65C30 40 45 25 70 25C70 50 55 65 30 65Z" fill="#16a34a" />
      <path d="M42 75C60 75 75 60 75 42C75 55 62 68 45 70C40 70.5 35 73 42 75Z" fill="#dc2626" />
      <path d="M48 35H52V45H62V49H52V59H48V49H38V45H48V35Z" fill="white" />
    </svg>
  );
}

export interface SingleSPSheetProps {
  supplierName: string;
  spNumber: string;
  formattedDate: string;
  items: any[];
  apjName: string;
  apjSipaNo: string;
  apjPhone: string;
  stampUrl?: string;
  signatureUrl?: string;
  sheetIndex?: number;
  totalSheets?: number;
}

export function SingleSPSheet({
  supplierName,
  spNumber,
  formattedDate,
  items,
  apjName,
  apjSipaNo,
  apjPhone,
  stampUrl,
  signatureUrl,
  sheetIndex,
  totalSheets,
}: SingleSPSheetProps) {
  const minRows = 8;
  const fillerCount = Math.max(0, minRows - items.length);

  return (
    <div
      className="p-5 sm:p-7 font-sans text-xs bg-white text-slate-900 select-text flex flex-col justify-between print:p-0 print:border-none print:shadow-none"
      style={{
        minHeight: "650px",
        pageBreakAfter: "always",
        breakAfter: "page",
      }}
    >
      <div>
        {/* 1. KOP SURAT (Letterhead identical to Image 1) */}
        <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-900">
          <LogoBerkatJayaPharma className="w-14 h-14 shrink-0" />
          <div className="text-center flex-1">
            <h1 className="font-serif font-black text-base sm:text-lg tracking-wide text-slate-900 leading-tight">
              PT BERKAT JAYA PHARMA
            </h1>
            <p className="text-[10px] text-slate-800 font-medium leading-tight mt-0.5">
              Jl. Karya Baru No. 43 Pontianak Selatan
            </p>
            <p className="text-[9.5px] text-slate-700 leading-tight">
              Telp: 0561-572028 / 0561-8178650 &nbsp;|&nbsp; Fax: 0561-572028
            </p>
            <p className="text-[9.5px] text-slate-700 leading-tight">
              NPWP: 63.957.195.7.701.000 &nbsp;|&nbsp; Izin PBF: 81201151705760001
            </p>
            <p className="text-[9.5px] text-slate-700 leading-tight">
              E-mail: BerkatJP@gmail.com
            </p>
          </div>
        </div>

        {/* 2. SP Number & Supplier Header */}
        <div className="pt-2.5 pb-2 text-[11px] leading-relaxed">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-semibold">SP No. </span>
              <span className="font-mono font-bold border-b border-dotted border-slate-700 pb-0.5 px-1 text-slate-950">
                {spNumber}
              </span>
              {totalSheets && totalSheets > 1 && (
                <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded print:hidden font-sans">
                  Lembar {sheetIndex} dari {totalSheets}
                </span>
              )}
            </div>
            <div>
              <span>Pontianak, </span>
              <span className="font-semibold">{formattedDate}</span>
            </div>
          </div>

          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-slate-700">Kepada Yth. </span>
            <span className="font-bold border-b border-dotted border-slate-700 pb-0.5 px-2 flex-1 text-slate-950">
              {supplierName}
            </span>
          </div>
        </div>

        {/* 3. Document Title */}
        <div className="text-center my-2">
          <h2 className="font-bold text-sm tracking-wider uppercase inline-block border-b-2 border-slate-900 pb-0.5">
            SURAT PESANAN
          </h2>
        </div>

        {/* 4. Items Table matching Image 1 */}
        <div className="relative border border-slate-900 mt-2">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-50 text-slate-900 font-bold text-center">
                <th className="py-1 px-1.5 border-r border-slate-900 w-[7%]">No.</th>
                <th className="py-1 px-2 border-r border-slate-900 text-left w-[47%]">Nama Obat</th>
                <th className="py-1 px-1.5 border-r border-slate-900 w-[12%]">Jmh</th>
                <th className="py-1 px-2 border-r border-slate-900 text-left w-[24%]">Terbilang</th>
                <th className="py-1 px-1.5 w-[10%]">Sat</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, idx: number) => {
                const prodName = it.product?.name || it.name || "Obat Farmasi";
                const qty = Number(it.qty) || 0;
                const unitName = it.unit?.name || it.unit?.code || "Box";
                return (
                  <tr key={it.id || idx} className="border-b border-slate-800/60 h-7 text-slate-900">
                    <td className="py-1 px-1 text-center border-r border-slate-900 font-medium">
                      {idx + 1}.
                    </td>
                    <td className="py-1 px-2 border-r border-slate-900 font-semibold">
                      {prodName}
                    </td>
                    <td className="py-1 px-1.5 text-center border-r border-slate-900 font-mono font-bold">
                      {qty}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-900 italic text-slate-800">
                      {terbilangQty(qty)}
                    </td>
                    <td className="py-1 px-1 text-center font-medium">
                      {unitName}
                    </td>
                  </tr>
                );
              })}

              {/* Empty filler rows - Clean borders without Z-line */}
              {Array.from({ length: fillerCount }).map((_, i) => (
                <tr key={`fill-${i}`} className="border-b border-slate-800/40 h-6">
                  <td className="border-r border-slate-900"></td>
                  <td className="border-r border-slate-900"></td>
                  <td className="border-r border-slate-900"></td>
                  <td className="border-r border-slate-900"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Footer / Tanda Tangan APJ (Matching Image 1 & User Settings) */}
      <div className="mt-8 flex justify-end">
        <div className="w-56 text-center text-[10.5px] leading-tight flex flex-col items-center">
          <p className="font-semibold text-slate-800">Pemesan,</p>
          <p className="font-semibold text-slate-800">Penanggung Jawab</p>

          {/* Watermark / Stamp Space & Signature Overlay */}
          <div className="relative h-20 w-44 my-1 flex items-center justify-center">
            {/* Stamp Apotek / Perusahaan from Settings or template */}
            {stampUrl ? (
              <img
                src={resolveAssetUrl(stampUrl)}
                alt="Stempel Apotek"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none opacity-85 rotate-[-5deg]"
              />
            ) : (
              <div className="absolute inset-0 border-2 border-dashed border-red-500/30 rounded-lg flex flex-col items-center justify-center text-red-600/40 font-bold select-none rotate-[-6deg]">
                <span className="text-[9px] uppercase tracking-wider">PT. BERKAT JAYA PHARMA</span>
                <span className="text-[8px]">APOTEK & PBF</span>
              </div>
            )}

            {/* Digital / Stylized Signature APJ from Settings or template */}
            {signatureUrl ? (
              <img
                src={resolveAssetUrl(signatureUrl)}
                alt="Tanda Tangan APJ"
                className="relative z-10 w-full h-full object-contain pointer-events-none select-none"
              />
            ) : (
              <svg className="w-36 h-14 text-blue-900 z-10" viewBox="0 0 150 60" fill="none">
                <path
                  d="M20 45C35 25 45 10 55 25C65 40 45 55 70 30C90 10 105 20 120 40C125 45 130 35 140 25"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          <p className="font-bold underline text-slate-900 text-xs">
            {apjName}
          </p>
          <p className="text-[9.5px] text-slate-700 font-mono mt-0.5">
            SIPA: {apjSipaNo}
          </p>
          <p className="text-[9.5px] text-slate-700 font-mono">
            WA: {apjPhone}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DokumenSPViewer({
  orderId,
  poData: initialPo,
  onClose,
  showClose = false,
}: {
  orderId?: string | null;
  poData?: any;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedSupplierTab, setSelectedSupplierTab] = useState<number | "ALL">("ALL");

  // Fetch PO detail if not fully loaded with items
  const { data: fetchedPO, isLoading } = useQuery({
    queryKey: ["purchase-order-sp", orderId],
    enabled: !!orderId && (!initialPo || !initialPo.items || initialPo.items.length === 0),
    queryFn: async () => {
      const res = await api.get(`/purchases/orders/${orderId}`);
      return res.data?.data;
    },
  });

  // Fetch Company Profile for custom Stempel & Tanda Tangan uploaded from Pengaturan
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      try {
        const res = await api.get("/companies");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });
  const company = companies[0];
  const stampUrl = company?.stamp_url;
  const signatureUrl = company?.signature_url;
  const companyApjName = company?.apj_name;
  const companyApjSipa = company?.apj_sipa;
  const companyApjPhone = company?.apj_phone;

  const po = fetchedPO || initialPo;

  // Resolve metadata
  const orderDate = po?.date ? new Date(po.date) : new Date();
  const dateDay = String(orderDate.getDate()).padStart(2, "0");
  const dateMonth = String(orderDate.getMonth() + 1);
  const dateYearShort = String(orderDate.getFullYear()).slice(-2);
  const formattedDate = `${dateDay}-${dateMonth}-${dateYearShort}`;

  const poSeq = po?.order_no ? parseInt(po.order_no.split("/").pop() || "1", 10) : 1;

  const apjName =
    po?.apj_name ||
    companyApjName ||
    "apt. Rahmat Hidayat, S.Farm.";
  const apjSipaNo =
    po?.apj_sipa_no ||
    companyApjSipa ||
    "19920101/SIPA_61.71/2022/2048";
  const apjPhone =
    companyApjPhone ||
    "08124984426";

  // Multi-Supplier grouping: Each supplier gets their own legal SP!
  const supplierGroups = useMemo(() => {
    const rawItems: any[] = po?.items || [];
    if (rawItems.length === 0) {
      return [
        {
          supplierId: po?.supplier?.id || "default",
          supplierName:
            po?.supplier?.name || "PT. ANUGRAH ARGON MEDICA (AAM)",
          items: [],
          spNumber:
            po?.sp_number && po.sp_number.trim() !== ""
              ? po.sp_number
              : `${poSeq}/BJP/${dateMonth}/${dateYearShort}`,
        },
      ];
    }

    const groupsMap = new Map<string, { supplierId: string; supplierName: string; items: any[] }>();

    rawItems.forEach((it: any) => {
      const sId = it.supplier_id || it.supplier?.id || po?.supplier?.id || "default";
      const sName =
        it.supplier?.name ||
        po?.supplier?.name ||
        "Supplier Farmasi";

      if (!groupsMap.has(sId)) {
        groupsMap.set(sId, {
          supplierId: sId,
          supplierName: sName,
          items: [],
        });
      }
      groupsMap.get(sId)!.items.push(it);
    });

    const groups = Array.from(groupsMap.values());
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    return groups.map((g, idx) => {
      const suffix = groups.length > 1 ? `-${alphabet[idx % 26]}` : "";
      const customSpNo =
        po?.sp_number && po.sp_number.trim() !== ""
          ? groups.length > 1
            ? `${po.sp_number}${suffix}`
            : po.sp_number
          : `${poSeq}${suffix}/BJP/${dateMonth}/${dateYearShort}`;

      return {
        ...g,
        spNumber: customSpNo,
      };
    });
  }, [po, poSeq, dateMonth, dateYearShort]);

  const isMultiSupplier = supplierGroups.length > 1;

  const handlePrint = () => {
    window.print();
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
          {isMultiSupplier ? (
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Multi-Supplier ({supplierGroups.length} SP)
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              [{supplierGroups[0]?.spNumber}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {selectedSupplierTab === "ALL" && isMultiSupplier
                ? `Cetak Semua SP (${supplierGroups.length} Lembar)`
                : "Cetak SP"}
            </span>
          </button>
          {showClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Multi-Supplier Tab Selector Bar (Hidden on print) */}
      {isMultiSupplier && (
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 print:hidden flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Pilih SP:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedSupplierTab("ALL")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
              selectedSupplierTab === "ALL"
                ? "bg-slate-800 text-white shadow-2xs"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Semua Lembar ({supplierGroups.length} SP)
          </button>
          {supplierGroups.map((g, idx) => (
            <button
              key={g.supplierId || idx}
              type="button"
              onClick={() => setSelectedSupplierTab(idx)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedSupplierTab === idx
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>SP {idx + 1}: {g.supplierName}</span>
              <span className="text-[10px] opacity-75">({g.items.length} item)</span>
            </button>
          ))}
        </div>
      )}

      {/* Printable SP Sheets Container */}
      <div
        ref={printRef}
        className="overflow-y-auto print:overflow-visible flex-1 bg-slate-100/60 print:bg-white p-3 sm:p-5 print:p-0 space-y-4 print:space-y-0"
      >
        {selectedSupplierTab === "ALL" ? (
          supplierGroups.map((g, idx) => (
            <div
              key={g.supplierId || idx}
              className="bg-white rounded border border-slate-200 shadow-xs print:border-none print:shadow-none print:rounded-none max-w-2xl mx-auto"
            >
              <SingleSPSheet
                supplierName={g.supplierName}
                spNumber={g.spNumber}
                formattedDate={formattedDate}
                items={g.items}
                apjName={apjName}
                apjSipaNo={apjSipaNo}
                apjPhone={apjPhone}
                stampUrl={stampUrl}
                signatureUrl={signatureUrl}
                sheetIndex={idx + 1}
                totalSheets={supplierGroups.length}
              />
            </div>
          ))
        ) : (
          <div className="bg-white rounded border border-slate-200 shadow-xs print:border-none print:shadow-none print:rounded-none max-w-2xl mx-auto">
            <SingleSPSheet
              supplierName={supplierGroups[selectedSupplierTab]?.supplierName || ""}
              spNumber={supplierGroups[selectedSupplierTab]?.spNumber || ""}
              formattedDate={formattedDate}
              items={supplierGroups[selectedSupplierTab]?.items || []}
              apjName={apjName}
              apjSipaNo={apjSipaNo}
              apjPhone={apjPhone}
              stampUrl={stampUrl}
              signatureUrl={signatureUrl}
              sheetIndex={(selectedSupplierTab as number) + 1}
              totalSheets={supplierGroups.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DokumenSPModal({
  isOpen,
  onClose,
  orderId,
  poData,
}: DokumenSPModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none text-slate-900 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <DokumenSPViewer orderId={orderId} poData={poData} onClose={onClose} showClose={true} />
      </div>
    </div>
  );
}
