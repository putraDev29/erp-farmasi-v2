"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronLeft, Check, AlertTriangle, Lightbulb, RotateCcw, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const MODULE_OPTIONS = [
  { value: "SI", label: "Penjualan / Kasir POS", prefix: "KSR", dept: "UTAMA" },
  { value: "SO", label: "Pesanan Penjualan (SO)", prefix: "SO", dept: "UTAMA" },
  { value: "PI", label: "Pembelian / Faktur Beli (PI)", prefix: "PI", dept: "UTAMA" },
  { value: "PO", label: "Pesanan Pembelian (PO)", prefix: "PO", dept: "UTAMA" },
  { value: "PAY_IN", label: "Pembayaran Piutang", prefix: "PPL", dept: "UTAMA" },
  { value: "PAY_OUT", label: "Pembayaran Hutang", prefix: "PHT", dept: "UTAMA" },
  { value: "ST", label: "Transfer Item Antar Gudang", prefix: "TRF", dept: "UTAMA" },
  { value: "OP", label: "Stok Opname", prefix: "OPN", dept: "UTAMA" },
  { value: "KAS_IN", label: "Kas Masuk", prefix: "KM", dept: "UTAMA" },
  { value: "KAS_OUT", label: "Kas Keluar", prefix: "KK", dept: "UTAMA" },
  { value: "JV", label: "Jurnal Umum Akuntansi", prefix: "JU", dept: "UTAMA" },
];

export default function SettingNomorTransaksiPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states matching Screenshot 8
  const [dept, setDept] = useState("UTAMA - APOTEK BERKAT");
  const [selectedModule, setSelectedModule] = useState("SI");

  // 7 segment format boxes
  const [seg1, setSeg1] = useState("07");
  const [seg2, setSeg2] = useState("/");
  const [seg3, setSeg3] = useState("KSR");
  const [seg4, setSeg4] = useState("/");
  const [seg5, setSeg5] = useState("[DEPT]");
  const [seg6, setSeg6] = useState("/");
  const [seg7, setSeg7] = useState("[CNT]");

  const [digitCount, setDigitCount] = useState(6);
  const [lastNumber, setLastNumber] = useState(0);
  const [autoReset, setAutoReset] = useState<"month" | "year">("year");

  // Format preview
  const previewExample = useMemo(() => {
    const padNum = String(lastNumber + 1).padStart(digitCount > 0 ? digitCount : 4, "0");
    const d = new Date();
    const bln = String(d.getMonth() + 1).padStart(2, "0");
    const thn = String(d.getFullYear()).slice(-2);
    const blnthn = `${bln}${thn}`;

    const resolveTag = (s: string) => {
      if (s === "[BLN]") return bln;
      if (s === "[THN]") return thn;
      if (s === "[BLNTHN]") return blnthn;
      if (s === "[CNT]") return padNum;
      if (s === "[DEPT]") return "UTAMA";
      return s;
    };

    return [seg1, seg2, seg3, seg4, seg5, seg6, seg7].map(resolveTag).join("");
  }, [seg1, seg2, seg3, seg4, seg5, seg6, seg7, digitCount, lastNumber]);

  const handleModuleChange = (modKey: string) => {
    setSelectedModule(modKey);
    const mod = MODULE_OPTIONS.find((m) => m.value === modKey);
    if (mod) {
      setSeg3(mod.prefix);
    }
  };

  const handleSave = () => {
    setToastMsg("Pengaturan format nomor transaksi berhasil disimpan!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleResetLastNumber = () => {
    setLastNumber(0);
    setToastMsg("Nomor terakhir berhasil di-reset ke 0.");
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
            <span className="font-semibold text-sm text-slate-800">Setting Nomor Transaksi</span>
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
      <div className="flex-1 p-6 overflow-y-auto space-y-4 max-w-6xl">
        {/* Dept */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Dept :</label>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            <option value="UTAMA - APOTEK BERKAT">UTAMA - APOTEK BERKAT</option>
            <option value="GUDANG_A - GUDANG LOGISTIK">GUDANG_A - GUDANG LOGISTIK</option>
          </select>
        </div>

        {/* Modul */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Modul :</label>
          <select
            value={selectedModule}
            onChange={(e) => handleModuleChange(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
          >
            {MODULE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Format : 7 Segments Row */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Format :</label>
          <div className="grid grid-cols-7 gap-2">
            {/* Seg 1 */}
            <select
              value={seg1}
              onChange={(e) => setSeg1(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="07">07</option>
              <option value="[BLN]">[BLN]</option>
              <option value="[THN]">[THN]</option>
              <option value="[BLNTHN]">[BLNTHN]</option>
              <option value="[DEPT]">[DEPT]</option>
              <option value="[CNT]">[CNT]</option>
            </select>

            {/* Seg 2 */}
            <select
              value={seg2}
              onChange={(e) => setSeg2(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="/">/</option>
              <option value="-">-</option>
              <option value=".">.</option>
              <option value="">(Kosong)</option>
            </select>

            {/* Seg 3 */}
            <select
              value={seg3}
              onChange={(e) => setSeg3(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value={seg3}>{seg3}</option>
              <option value="KSR">KSR</option>
              <option value="PI">PI</option>
              <option value="PO">PO</option>
              <option value="SO">SO</option>
              <option value="TRF">TRF</option>
              <option value="OPN">OPN</option>
              <option value="[BLNTHN]">[BLNTHN]</option>
            </select>

            {/* Seg 4 */}
            <select
              value={seg4}
              onChange={(e) => setSeg4(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="/">/</option>
              <option value="-">-</option>
              <option value=".">.</option>
              <option value="">(Kosong)</option>
            </select>

            {/* Seg 5 */}
            <select
              value={seg5}
              onChange={(e) => setSeg5(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="[DEPT]">[DEPT]</option>
              <option value="UTAMA">UTAMA</option>
              <option value="[BLN]">[BLN]</option>
              <option value="[THN]">[THN]</option>
              <option value="[CNT]">[CNT]</option>
            </select>

            {/* Seg 6 */}
            <select
              value={seg6}
              onChange={(e) => setSeg6(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="/">/</option>
              <option value="-">-</option>
              <option value=".">.</option>
              <option value="">(Kosong)</option>
            </select>

            {/* Seg 7 */}
            <select
              value={seg7}
              onChange={(e) => setSeg7(e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="[CNT]">[CNT]</option>
              <option value="[BLNTHN]">[BLNTHN]</option>
              <option value="[THN]">[THN]</option>
            </select>
          </div>
        </div>

        {/* Digit */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Digit :</label>
          <input
            type="number"
            value={digitCount}
            onChange={(e) => setDigitCount(Number(e.target.value))}
            min={0}
            max={10}
            className="w-48 h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Terakhir */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Terakhir :</label>
          <input
            type="number"
            value={lastNumber}
            onChange={(e) => setLastNumber(Number(e.target.value))}
            min={0}
            className="w-48 h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Contoh */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-700">Contoh :</label>
          <div className="w-full h-8 px-3 flex items-center bg-white border border-slate-300 border-dashed rounded text-xs font-mono font-semibold text-slate-800">
            {previewExample}
          </div>
        </div>

        {/* Auto Reset */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] text-slate-700">Auto Reset :</label>
          <div className="space-y-1 pl-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
              <input
                type="radio"
                name="auto_reset"
                checked={autoReset === "month"}
                onChange={() => setAutoReset("month")}
                className="text-emerald-600 focus:ring-0"
              />
              <span>Reset No Transaksi tiap ganti bulan.</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
              <input
                type="radio"
                name="auto_reset"
                checked={autoReset === "year"}
                onChange={() => setAutoReset("year")}
                className="text-emerald-600 focus:ring-0"
              />
              <span>Reset No Transaksi tiap ganti tahun.</span>
            </label>
          </div>
        </div>

        {/* BLUE INSTRUCTIONS BOX */}
        <div className="p-3.5 bg-[#f0f5ff] border border-[#d6e4ff] rounded text-[11px] text-slate-700 space-y-1 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Kode Otomatis :</span>
          </div>
          <p className="text-slate-700 pl-5">
            <span className="font-semibold">[BLN]</span> = Bulan 2 Digit, <span className="font-semibold">[THN]</span> = Tahun 2 Digit, <span className="font-semibold">[BLNTHN]</span> = Bulan dan Tahun 4 Digit, <span className="font-semibold">[CNT]</span> = Count, <span className="font-semibold">[DEPT]</span> = Dept/Gudang, <span className="font-semibold">Kode Sendiri</span> : Bisa diketik sendiri.
          </p>
          <p className="text-slate-700 pl-5">
            <span className="font-semibold">Auto Reset</span> : Berdasarkan sistem bulan dan tahun pada komputer server database.
          </p>
        </div>

        {/* AMBER WARNING BOX */}
        <div className="p-2.5 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <span className="font-bold text-amber-800">Penting:</span> Pastikan hasil dari No Transaksi tidak lebih dari 40 karakter.
          </span>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
          <button
            onClick={handleSave}
            type="button"
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
          <button
            onClick={handleResetLastNumber}
            type="button"
            className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset No Terakhir</span>
          </button>
          <button
            type="button"
            className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Buat Setting</span>
          </button>
        </div>
      </div>
    </div>
  );
}
