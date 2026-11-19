"use client";

import React, { useState } from "react";
import { Printer, Save, Check, RefreshCw, PrinterCheck, Play } from "lucide-react";

export default function MiniPrinterPage() {
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("80");
  const [connectionType, setConnectionType] = useState<"usb" | "bluetooth" | "network">("usb");
  const [printerName, setPrinterName] = useState("EPSON TM-T82 Thermal Printer");
  const [ipAddress, setIpAddress] = useState("192.168.1.200");
  const [autoCut, setAutoCut] = useState(true);
  const [openDrawer, setOpenDrawer] = useState(true);
  const [header1, setHeader1] = useState("APOTEK BERKAT PURNAMA");
  const [header2, setHeader2] = useState("Jl. Farmasi Raya No. 10 - Jakarta");
  const [header3, setHeader3] = useState("Telp: 021-5550192 | SIA: 440/123-DINKES/2024");
  const [footer1, setFooter1] = useState("Terima kasih atas kepercayaan Anda");
  const [footer2, setFooter2] = useState("Semoga lekas sembuh!");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg("Pengaturan mini printer struk kasir berhasil disimpan!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTestPrint = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setToastMsg("Perintah cetak uji coba berhasil dikirim ke printer thermal!");
      setTimeout(() => setToastMsg(null), 3000);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Pengaturan Mini Printer Thermal Kasir POS</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="h-7 px-3 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isTesting ? "animate-pulse" : ""}`} />
            <span>Tes Cetak Struk</span>
          </button>
          <button
            onClick={handleSave}
            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-4xl space-y-4 overflow-y-auto">
        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. Hardware Connection */}
          <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
            <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
              1. Sambungan Hardware &amp; Ukuran Kertas Struk
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ukuran Lebar Kertas Thermal
                </label>
                <select
                  value={paperWidth}
                  onChange={(e) => setPaperWidth(e.target.value as any)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="80">80mm (Ukuran Standar Kasir Apotek &amp; Supermarket)</option>
                  <option value="58">58mm (Ukuran Kompak / Printer Mobile Bluetooth)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Metode Koneksi Printer
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value as any)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="usb">USB Port Direct (Driver Windows ESC/POS)</option>
                  <option value="bluetooth">Bluetooth Nirkabel (Wireless POS)</option>
                  <option value="network">Ethernet LAN / Jaringan TCP/IP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Printer di Sistem
                </label>
                <input
                  type="text"
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              {connectionType === "network" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    IP Address Printer (LAN)
                  </label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoCut}
                  onChange={(e) => setAutoCut(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Auto-Cut Kertas (Pemotong Otomatis setelah Selesai Struk)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={openDrawer}
                  onChange={(e) => setOpenDrawer(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Buka Laci Uang (Kick Cash Drawer Otomatis saat Bayar Tunai)</span>
              </label>
            </div>
          </div>

          {/* 2. Receipt Layout Preview */}
          <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
            <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
              2. Kustomisasi Header &amp; Footer Struk Belanja
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Header Baris 1 (Nama Apotek)</label>
                  <input
                    type="text"
                    value={header1}
                    onChange={(e) => setHeader1(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Header Baris 2 (Alamat)</label>
                  <input
                    type="text"
                    value={header2}
                    onChange={(e) => setHeader2(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Header Baris 3 (Kontak &amp; SIA)</label>
                  <input
                    type="text"
                    value={header3}
                    onChange={(e) => setHeader3(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded text-slate-600"
                  />
                </div>
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Footer Baris 1 (Ucapan Terima Kasih)</label>
                  <input
                    type="text"
                    value={footer1}
                    onChange={(e) => setFooter1(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Footer Baris 2 (Doa / Ketentuan Retur)</label>
                  <input
                    type="text"
                    value={footer2}
                    onChange={(e) => setFooter2(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Receipt Preview Paper */}
              <div className="bg-slate-100 p-4 rounded-lg flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Simulasi Hasil Cetak Struk</span>
                <div className="w-56 bg-white shadow-md p-3 border border-slate-200 text-center font-mono text-[9px] text-slate-800 space-y-1">
                  <div className="font-bold text-[11px]">{header1}</div>
                  <div className="text-[8px]">{header2}</div>
                  <div className="text-[7.5px] text-slate-500">{header3}</div>
                  <div className="border-t border-dashed border-slate-400 my-1 pt-1 text-left text-[8px]">
                    <div>No: POS-202611-00042</div>
                    <div>Tgl: 19/11/2026 12:30:15</div>
                    <div>Kasir: Admin Apotek</div>
                  </div>
                  <div className="border-t border-dashed border-slate-400 my-1 pt-1 text-left text-[8px]">
                    <div className="flex justify-between font-bold">
                      <span>Paracetamol 500mg</span>
                      <span>15.000</span>
                    </div>
                    <div className="text-slate-500 text-[7.5px]">1 Strip @ 15.000</div>
                    <div className="flex justify-between font-bold">
                      <span>Amoxicillin 500mg</span>
                      <span>25.000</span>
                    </div>
                    <div className="text-slate-500 text-[7.5px]">1 Strip @ 25.000</div>
                  </div>
                  <div className="border-t border-dashed border-slate-400 my-1 pt-1 font-bold text-[8.5px]">
                    <div className="flex justify-between">
                      <span>TOTAL:</span>
                      <span>Rp 40.000</span>
                    </div>
                    <div className="flex justify-between font-normal text-slate-600">
                      <span>Tunai:</span>
                      <span>Rp 50.000</span>
                    </div>
                    <div className="flex justify-between font-normal text-slate-600">
                      <span>Kembali:</span>
                      <span>Rp 10.000</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-400 my-1 pt-1 text-[7.5px] text-slate-500 italic">
                    <div>{footer1}</div>
                    <div>{footer2}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
