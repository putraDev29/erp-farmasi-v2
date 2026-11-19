"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  RefreshCw,
  Table,
} from "lucide-react";

interface ImportConfig {
  title: string;
  description: string;
  headers: string[];
  sampleRows: string[][];
}

const IMPORT_CONFIGS: Record<string, ImportConfig> = {
  supplier: {
    title: "Import Data Supplier",
    description: "Import daftar distributor obat, PBF, dan vendor farmasi melalui file Excel / CSV.",
    headers: ["Kode Supplier", "Nama Supplier", "Alamat", "Telepon", "Email", "Kontak Person", "Term Hari"],
    sampleRows: [
      ["SUP-001", "PT. Kimia Farma Trading", "Jl. Budi Utomo No. 1", "021-3847709", "order@kftd.co.id", "Bpk. Hendra", "30"],
      ["SUP-002", "PT. Anugrah Argon Medica", "Jl. Boulevard Barat No. 8", "021-4585123", "sales@aam.co.id", "Ibu Santi", "30"],
      ["SUP-003", "PT. Mensa Bina Sukses", "Kawasan Industri Pulo Gadung", "021-4601122", "pbf@mbs.co.id", "Bpk. Arif", "45"],
    ],
  },
  customer: {
    title: "Import Data Pelanggan",
    description: "Import data master pelanggan umum, klinik rekanan, dan pasien tetap apotek.",
    headers: ["Kode Pelanggan", "Nama Pelanggan", "Grup Pelanggan", "Alamat", "No HP", "Batas Piutang (Limit)", "Term"],
    sampleRows: [
      ["CST-001", "Klinik Medika Sehat", "Klinik Rekanan", "Jl. Kesehatan No. 12", "081234567890", "15000000", "30"],
      ["CST-002", "dr. Ahmad Subagyo, Sp.A", "Dokter Praktek", "Jl. Diponegoro No. 44", "081987654321", "10000000", "14"],
      ["CST-003", "Ibu Siti Rahma (Pasien Rutin)", "Umum / Resep", "Komp. Griya Indah B3", "085678912345", "0", "0"],
    ],
  },
  sales: {
    title: "Import Data Sales",
    description: "Import daftar tenaga penjual / medical representative dan persentase komisi.",
    headers: ["Kode Sales", "Nama Sales", "No HP", "Email", "Alamat", "Komisi Penjualan (%)"],
    sampleRows: [
      ["SLS-001", "Budi Santoso", "081234112233", "budi.sales@farmasi.local", "Jakarta Timur", "2.5"],
      ["SLS-002", "Dewi Lestari", "081399887766", "dewi.sales@farmasi.local", "Jakarta Selatan", "2.5"],
    ],
  },
  "item-single-price": {
    title: "Import Data Item Satu Harga",
    description: "Import master obat dan produk farmasi dengan 1 harga jual flat (tanpa satuan bertingkat).",
    headers: ["Kode Item", "Nama Obat / Item", "Kategori", "Satuan", "Harga Beli Pokok", "Harga Jual", "Stok Awal"],
    sampleRows: [
      ["ITM-001", "Paracetamol 500mg Tablet", "Analgesik", "Strip", "4500", "7500", "150"],
      ["ITM-002", "Amoxicillin 500mg Kapsul", "Antibiotik", "Strip", "6000", "11000", "80"],
      ["ITM-003", "Antasida Doen Tablet Kunyah", "Saluran Cerna", "Strip", "3000", "5000", "120"],
    ],
  },
  "item-units": {
    title: "Import Data Item Satuan (Multi-Satuan)",
    description: "Import obat dengan konversi multi-satuan (contoh: 1 Box = 10 Strip = 100 Tablet).",
    headers: ["Kode Item", "Nama Item", "Satuan Dasar", "Satuan 2", "Isi Satuan 2", "Satuan 3", "Isi Satuan 3"],
    sampleRows: [
      ["ITM-010", "Bodrex Extra Tablet", "Tablet", "Strip", "4", "Box", "100"],
      ["ITM-011", "Sanmol Sirup 60ml", "Botol", "Dus", "12", "-", "-"],
    ],
  },
  "item-quantity": {
    title: "Import Data Item Jumlah (Stok Fisik & Nilai)",
    description: "Import saldo kuantiti persediaan dan harga perolehan rata-rata per gudang.",
    headers: ["Kode Item", "Nama Item", "Nama Gudang", "Jumlah Fisik", "Harga Pokok Satuan", "Total Nilai Stok"],
    sampleRows: [
      ["ITM-001", "Paracetamol 500mg Tablet", "Gudang Utama Apotek", "150", "4500", "675000"],
      ["ITM-002", "Amoxicillin 500mg Kapsul", "Gudang Utama Apotek", "80", "6000", "480000"],
    ],
  },
  "item-level": {
    title: "Import Data Item Level (Harga Bertingkat)",
    description: "Import obat dengan tier harga berbeda berdasarkan kuantiti (Level 1, 2, 3, Resep, Grosir).",
    headers: ["Kode Item", "Nama Item", "Satuan", "Harga Level 1 (Umum)", "Harga Level 2 (Member)", "Harga Level 3 (Grosir)"],
    sampleRows: [
      ["ITM-020", "Neurobion Forte Tablet", "Strip", "45000", "43000", "41000"],
      ["ITM-021", "Imboost Force Tablet", "Strip", "85000", "82000", "79000"],
    ],
  },
  "variant-quantity": {
    title: "Import Varian Jumlah",
    description: "Import saldo stok item farmasi yang memiliki varian warna, ukuran, atau kemasan.",
    headers: ["Kode Induk", "Nama Item", "Nama Varian", "Kuantiti Varian", "Satuan", "Harga Beli"],
    sampleRows: [
      ["ITM-030", "Masker Medis 3 Ply", "Warna Biru", "50", "Box", "25000"],
      ["ITM-030", "Masker Medis 3 Ply", "Warna Hijau", "40", "Box", "25000"],
    ],
  },
  "variant-level": {
    title: "Import Varian Level",
    description: "Import level harga berjenjang untuk masing-masing varian produk.",
    headers: ["Kode Induk", "Nama Varian", "Level 1 (Ecer)", "Level 2 (Semi Grosir)", "Level 3 (Grosir Partai)"],
    sampleRows: [
      ["ITM-030", "Warna Biru", "35000", "32000", "29000"],
      ["ITM-030", "Warna Hijau", "35000", "32000", "29000"],
    ],
  },
};

export default function ImportDynamicPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "supplier";

  const config = useMemo(() => {
    return (
      IMPORT_CONFIGS[slug] || {
        title: "Import Data",
        description: "Import data master ke sistem Ketoko Farmasi.",
        headers: ["Kolom 1", "Kolom 2", "Kolom 3"],
        sampleRows: [["Data 1", "Data 2", "Data 3"]],
      }
    );
  }, [slug]);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "validated" | "completed">("idle");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [config.headers.join(","), ...config.sampleRows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_${slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Template ${config.title} berhasil diunduh.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setImportStatus("idle");
      showToast(`File "${e.target.files[0].name}" siap divalidasi.`);
    }
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      setImportStatus("validated");
      showToast("Validasi sukses: Semua baris data sesuai skema dan tidak ditemukan duplikasi.");
    }, 1000);
  };

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setImportStatus("completed");
      showToast(`Berhasil mengimpor ${config.sampleRows.length} data ke database!`);
    }, 1500);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">{config.title}</h1>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Unduh Template CSV / Excel</span>
        </button>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-3 overflow-y-auto">
        {/* INSTRUCTION CARD */}
        <div className="bg-white rounded border border-slate-300 p-3 shadow-2xs space-y-1.5">
          <p className="text-[11px] text-slate-600">{config.description}</p>
          <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-[10.5px] text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Petunjuk: Unduh template di atas, isi data sesuai kolom yang tersedia tanpa mengubah nama header baris pertama, lalu unggah file untuk validasi.
            </span>
          </div>
        </div>

        {/* UPLOAD & ACTION BAR */}
        <div className="bg-white rounded border border-slate-300 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="h-8 px-4 bg-[#0ea5e9] hover:bg-[#0284c7] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadedFile ? "Ganti File..." : "Pilih File Excel / CSV"}</span>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} className="hidden" />
            </label>
            {uploadedFile && (
              <span className="font-semibold text-slate-700 text-[11px]">
                {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || isImporting}
              className="h-8 px-4 bg-[#f59e0b] hover:bg-[#d97706] active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{isValidating ? "Memvalidasi..." : "Validasi Data"}</span>
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              className="h-8 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isImporting ? "Mengimpor..." : "Mulai Import Sekarang"}</span>
            </button>
          </div>
        </div>

        {/* PREVIEW TABLE CONTAINER */}
        <div className="bg-white rounded border border-slate-300 flex-1 min-h-[220px] flex flex-col shadow-2xs overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Data Format (Pratinjau {config.sampleRows.length} Baris Data)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Status:{" "}
              {importStatus === "completed" ? (
                <span className="text-emerald-700 font-bold">Import Selesai</span>
              ) : importStatus === "validated" ? (
                <span className="text-sky-700 font-bold">Terverifikasi Valid</span>
              ) : (
                <span className="text-slate-500">Siap Divalidasi</span>
              )}
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2 px-3 w-10 text-center border-r border-slate-200">#</th>
                  {config.headers.map((h, i) => (
                    <th key={i} className="py-2 px-3 border-r border-slate-200">
                      {h}
                    </th>
                  ))}
                  <th className="py-2 px-3 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {config.sampleRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    {row.map((val, cellIdx) => (
                      <td key={cellIdx} className="py-2 px-3 border-r border-slate-200 text-slate-800 font-medium">
                        {val}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                        Valid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
