"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Printer, ChevronLeft, Check, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function MiniPrinterPage() {
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form fields matching Screenshot 2
  const [printerMode, setPrinterMode] = useState("Printer Umum / Back Office");
  const [cashdrawer, setCashdrawer] = useState("Tidak Pakai");
  const [autoCutter, setAutoCutter] = useState("Tidak Pakai");
  const [paperSize, setPaperSize] = useState("5.8Cm/32 Kolom");
  const [lineOption, setLineOption] = useState("1 Baris");
  const [printCopies, setPrintCopies] = useState("1 Rangkap");
  const [emptyLines, setEmptyLines] = useState("2 Baris");
  const [alignHeader, setAlignHeader] = useState("Center");
  const [alignFooter, setAlignFooter] = useState("Left");
  const [pelSalesOption, setPelSalesOption] = useState("Tampil Pelanggan");
  const [roundingLabel, setRoundingLabel] = useState("");
  const [notes, setNotes] = useState("Terima Kasih telah berbelanja di toko kami.");

  const [enableLogo, setEnableLogo] = useState(true);
  const [logoRatio, setLogoRatio] = useState(300);

  const { data: settings = {} } = useQuery({
    queryKey: ["settings-printer"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/groups/PRINTER");
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
  });

  useEffect(() => {
    if (settings) {
      if (settings.printer_mode) setPrinterMode(settings.printer_mode);
      if (settings.cashdrawer) setCashdrawer(settings.cashdrawer);
      if (settings.auto_cutter) setAutoCutter(settings.auto_cutter);
      if (settings.paper_size) setPaperSize(settings.paper_size);
      if (settings.line_option) setLineOption(settings.line_option);
      if (settings.print_copies) setPrintCopies(settings.print_copies);
      if (settings.empty_lines) setEmptyLines(settings.empty_lines);
      if (settings.align_header) setAlignHeader(settings.align_header);
      if (settings.align_footer) setAlignFooter(settings.align_footer);
      if (settings.pel_sales_option) setPelSalesOption(settings.pel_sales_option);
      if (settings.rounding_label) setRoundingLabel(settings.rounding_label);
      if (settings.notes) setNotes(settings.notes);
      if (settings.enable_logo !== undefined) setEnableLogo(settings.enable_logo === "true" || settings.enable_logo === true);
      if (settings.logo_ratio) setLogoRatio(Number(settings.logo_ratio));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await api.put("/settings/groups/PRINTER", {
        printer_mode: printerMode,
        cashdrawer,
        auto_cutter: autoCutter,
        paper_size: paperSize,
        line_option: lineOption,
        print_copies: printCopies,
        empty_lines: emptyLines,
        align_header: alignHeader,
        align_footer: alignFooter,
        pel_sales_option: pelSalesOption,
        rounding_label: roundingLabel,
        notes,
        enable_logo: String(enableLogo),
        logo_ratio: String(logoRatio),
      });
    },
    onSuccess: () => {
      setToastMsg("Pengaturan mini printer berhasil disimpan!");
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: () => {
      setToastMsg("Gagal menyimpan pengaturan mini printer.");
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  const handleTestPrint = () => {
    setToastMsg("Mengirim data uji coba cetak ke Ketoko POS Printer Service...");
    setTimeout(() => {
      setToastMsg("Uji coba cetak selesai dikirim.");
      setTimeout(() => setToastMsg(null), 3000);
    }, 1200);
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
            <span className="font-semibold text-sm text-slate-800">Pengaturan Mini Printer</span>
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

      {/* CONTENT AREA */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* TOP NOTICE (Ketoko POS Printer Service warning) */}
        <div className="p-3 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Penting :</span>
            <span className="font-normal text-slate-700">
              Agar dapat memakai fitur ini, anda harus menginstall aplikasi &apos;Ketoko POS Printer Service&apos;,{" "}
              <span className="text-sky-600 font-semibold underline cursor-pointer">KLIK DISINI</span> untuk mengunduh/download
            </span>
          </div>
          <div className="pl-5 text-slate-600">
            Status Service : <span className="text-rose-600 font-semibold">Koneksi ke Ketoko POS Printer Service gagal, pastikan sudah terinstall dan aktif.</span>
          </div>
        </div>

        {/* 2-COLUMN GRID */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN: Main printer options */}
          <div className="col-span-6 space-y-3">
            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Mode Printer :</label>
              <select
                value={printerMode}
                onChange={(e) => setPrinterMode(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="Printer Umum / Back Office">Printer Umum / Back Office</option>
                <option value="Mini Printer Kasir POS">Mini Printer Kasir POS</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Cashdrawer :</label>
              <select
                value={cashdrawer}
                onChange={(e) => setCashdrawer(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="Tidak Pakai">Tidak Pakai</option>
                <option value="Buka Sebelum Cetak">Buka Sebelum Cetak</option>
                <option value="Buka Sesudah Cetak">Buka Sesudah Cetak</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">AutoCutter :</label>
              <select
                value={autoCutter}
                onChange={(e) => setAutoCutter(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="Tidak Pakai">Tidak Pakai</option>
                <option value="Potong Penuh (Full Cut)">Potong Penuh (Full Cut)</option>
                <option value="Potong Sebagian (Partial Cut)">Potong Sebagian (Partial Cut)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Ukuran Kertas :</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="5.8Cm/32 Kolom">5.8Cm/32 Kolom</option>
                <option value="8.0Cm/48 Kolom">8.0Cm/48 Kolom</option>
                <option value="7.6Cm/40 Kolom">7.6Cm/40 Kolom</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Opsi Baris :</label>
              <select
                value={lineOption}
                onChange={(e) => setLineOption(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="1 Baris">1 Baris</option>
                <option value="2 Baris">2 Baris</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Jumlah cetak :</label>
              <select
                value={printCopies}
                onChange={(e) => setPrintCopies(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="1 Rangkap">1 Rangkap</option>
                <option value="2 Rangkap">2 Rangkap</option>
                <option value="3 Rangkap">3 Rangkap</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Jumlah Baris Kosong :</label>
              <select
                value={emptyLines}
                onChange={(e) => setEmptyLines(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="1 Baris">1 Baris</option>
                <option value="2 Baris">2 Baris</option>
                <option value="3 Baris">3 Baris</option>
                <option value="4 Baris">4 Baris</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Align Header :</label>
              <select
                value={alignHeader}
                onChange={(e) => setAlignHeader(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="Center">Center</option>
                <option value="Left">Left</option>
                <option value="Right">Right</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Align Footer :</label>
              <select
                value={alignFooter}
                onChange={(e) => setAlignFooter(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="Left">Left</option>
                <option value="Center">Center</option>
                <option value="Right">Right</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Opsi Pel/Sales :</label>
              <select
                value={pelSalesOption}
                onChange={(e) => setPelSalesOption(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="Tampil Pelanggan">Tampil Pelanggan</option>
                <option value="Tampil Sales">Tampil Sales</option>
                <option value="Tampil Keduanya">Tampil Keduanya</option>
                <option value="Tidak Tampil">Tidak Tampil</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Label Pembulatan :</label>
              <input
                type="text"
                value={roundingLabel}
                onChange={(e) => setRoundingLabel(e.target.value)}
                placeholder="Pembulatan"
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Keterangan :</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Logo options */}
          <div className="col-span-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[11px] text-slate-700 mb-1">Logo Mini Printer :</label>
                <input
                  type="checkbox"
                  checked={enableLogo}
                  onChange={(e) => setEnableLogo(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-700 mb-1">Ratio Logo :</label>
                <input
                  type="number"
                  value={logoRatio}
                  onChange={(e) => setLogoRatio(Number(e.target.value))}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500 text-right"
                />
              </div>
            </div>

            <div className="p-2.5 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Penting: Logo hanya untuk printer POS thermal.</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 mb-1">Pilih file Gambar :</label>
              <input
                type="file"
                accept="image/*"
                className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-300 file:text-xs file:bg-slate-50 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
          <button
            onClick={handleTestPrint}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Test Print</span>
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
