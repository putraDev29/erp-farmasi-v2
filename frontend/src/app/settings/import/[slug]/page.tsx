"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Check, AlertTriangle, Search } from "lucide-react";

const IMPORT_CONFIG: Record<string, { title: string; isItem: boolean }> = {
  supplier: { title: "Import Data Supplier", isItem: false },
  customer: { title: "Import Data Pelanggan", isItem: false },
  sales: { title: "Import Data Sales", isItem: false },
  "item-single-price": { title: "Import Data Item Satu Harga", isItem: true },
  "item-units": { title: "Import Data Item Satuan", isItem: true },
  "item-quantity": { title: "Import Data Item Jumlah", isItem: true },
  "item-level": { title: "Import Data Item Level", isItem: true },
  "variant-quantity": { title: "Import Data Item Varian Jumlah", isItem: true },
  "variant-level": { title: "Import Data Item Varian Level", isItem: true },
};

export default function ImportDynamicSlugPage() {
  const router = useRouter();
  const params = useParams();
  const rawSlug = (params?.slug as string) || "supplier";
  const slug = rawSlug.toLowerCase();

  const config = IMPORT_CONFIG[slug] || {
    title: `Import Data ${slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
    isItem: slug.includes("item") || slug.includes("variant"),
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState("");
  const [importHeader, setImportHeader] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setToastMsg(`File dipilih: ${e.target.files[0].name}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      setToastMsg("Silakan pilih file Excel (.xlsx / .xls) terlebih dahulu!");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    setToastMsg(`Sedang memproses import ${config.title}...`);
    setTimeout(() => {
      setToastMsg("Data berhasil diimport!");
      setTimeout(() => setToastMsg(null), 3000);
    }, 1500);
  };

  const handleDownloadSample = () => {
    setToastMsg(`Mengunduh contoh file template ${config.title}...`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SUB-HEADER / TITLE BAR */}
      <div className="h-10 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-800 flex items-center text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="font-semibold text-sm text-slate-800">{config.title}</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            33
          </span>
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 max-w-5xl">
        {/* File input */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">File :</label>
          <div className="flex items-center gap-3">
            <label className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center justify-center font-medium shadow-2xs cursor-pointer">
              <span>Upload File</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {selectedFile && (
              <span className="text-[11px] text-emerald-700 font-semibold">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Pilih Sheet */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Pilih Sheet :</label>
          <select
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Select..</option>
            <option value="Sheet1">Sheet 1</option>
            <option value="Sheet2">Sheet 2</option>
            <option value="Data">Data</option>
          </select>
        </div>

        {/* Import Header */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Import Header :</label>
          <input
            type="checkbox"
            checked={importHeader}
            onChange={(e) => setImportHeader(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
          />
        </div>

        {/* PENTING AMBER BOX */}
        <div className="p-3.5 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 space-y-1 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>PENTING :</span>
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-700 pl-1">
            <li>
              Maksimum total {config.isItem ? "item" : "data"} yang bisa diimport dalam sekali proses adalah 1000.
            </li>
            <li>
              Jika total {config.isItem ? "item" : "data"} yang akan anda import lebih dari 1000, bagi data item ke dalam 2 sheet yang berbeda atau lebih dan lakukan proses import lebih dari satu kali.
            </li>
            <li>Disarankan baris pertama tidak boleh kosong.</li>
          </ol>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleImport}
            className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium rounded flex items-center gap-1.5 shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Data</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium rounded flex items-center gap-1.5 shadow-2xs"
          >
            <Search className="w-3.5 h-3.5 text-slate-600" />
            <span>Contoh File</span>
          </button>
        </div>
      </div>
    </div>
  );
}
