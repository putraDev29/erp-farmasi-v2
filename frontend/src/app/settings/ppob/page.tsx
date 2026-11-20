"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Search, Copy, Edit2, ChevronLeft, Check, AlertTriangle } from "lucide-react";

interface PPOBServiceRow {
  id: string;
  name: string;
  percent: number;
  nominal: number;
}

export default function PPOBPage() {
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [apiKeySandbox, setApiKeySandbox] = useState("");
  const [apiKeyProd, setApiKeyProd] = useState("");
  const [callbackUrl, setCallbackUrl] = useState(
    "https://psx-svc-001.ketoko.id/callback/ppob-callback.php?token=wC45S4XVmip7S1YH0UYDU6GZjX52W121TWXFvzkOYHb80XD4yT5yIujW9rXo7IGkkXQQ3Mefq9ssHn1RQjTJty1bLS1jV1bLTF7x1TzeG7PSTWJhpvNpGeeZU9GR8DUPHyb8x2h7Hc"
  );
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
  const [itemCode, setItemCode] = useState("");
  const [marginMode, setMarginMode] = useState<"percent" | "nominal">("nominal");

  const [services, setServices] = useState<PPOBServiceRow[]>([
    { id: "1", name: "Keuntungan Pulsa", percent: 0.0, nominal: 0.0 },
    { id: "2", name: "Keuntungan Paket Data", percent: 0.0, nominal: 0.0 },
    { id: "3", name: "Keuntungan Listrik PLN", percent: 0.0, nominal: 0.0 },
    { id: "4", name: "Keuntungan E-Money", percent: 0.0, nominal: 0.0 },
  ]);

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setToastMsg("Callback URL disalin ke clipboard!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSave = () => {
    setToastMsg("Pengaturan integrasi PPOB berhasil disimpan!");
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
            <span className="font-semibold text-sm text-slate-800">
              Pengaturan Integrasi PPOB (Pulsa, Listrik, dan lainnya)
            </span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
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
          {/* IAK Logo */}
          <div className="flex flex-col items-end border-l border-slate-200 pl-3">
            <span className="font-black text-sm text-[#0066b2] tracking-tighter">IAK</span>
            <span className="text-[7px] text-slate-500 leading-none">Indobest Artha Kreasi</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 max-w-5xl">
        {/* AMBER NOTICE BOX */}
        <div className="p-3 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>PENTING :</span>
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-700 pl-1">
            <li>Selalu gunakan Mode Sandbox jika transaksi Demo/Test, untuk transaksi Nyata gunakan Mode Production.</li>
            <li>
              Untuk mendapatkan Username dan Api Key, silahkan mendaftar secara mandiri ke{" "}
              <span className="text-sky-600 font-semibold underline cursor-pointer">KLIK DISINI</span>.
            </li>
            <li>Pilih satu kodeitem jasa yang akan dijadikan acuan pembayaran ppob pada transaksi penjualan. Harga jual akan menyesuaikan nominal yang dipilih.</li>
          </ol>
        </div>

        {/* INPUT FIELDS */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-slate-700 mb-0.5">Username / NoTelp :</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 mb-0.5">Api Key (Mode Sandbox / Demo) :</label>
            <input
              type="text"
              value={apiKeySandbox}
              onChange={(e) => setApiKeySandbox(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 mb-0.5">Api Key (Mode Production) :</label>
            <input
              type="text"
              value={apiKeyProd}
              onChange={(e) => setApiKeyProd(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 mb-0.5">Callback Url :</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={callbackUrl}
                readOnly
                className="flex-1 h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded text-slate-600 font-mono text-[10px]"
              />
              <button
                type="button"
                onClick={handleCopyCallback}
                className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center justify-center shadow-2xs"
                title="Salin Callback URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-1.5 bg-[#fff9e6] border border-[#ffe58f] rounded text-[10px] text-slate-700 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>
                Penting: Setting Callback URL <span className="text-sky-600 underline font-semibold cursor-pointer">DISINI</span> agar status transaksi terupdate secara realtime.
              </span>
            </div>
          </div>

          {/* Mode */}
          <div className="flex items-center gap-6 pt-1">
            <span className="text-[11px] text-slate-700 w-24">Mode :</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                <input
                  type="radio"
                  name="ppob_mode"
                  checked={mode === "production"}
                  onChange={() => setMode("production")}
                  className="text-emerald-600 focus:ring-0"
                />
                <span>Mode Production</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                <input
                  type="radio"
                  name="ppob_mode"
                  checked={mode === "sandbox"}
                  onChange={() => setMode("sandbox")}
                  className="text-emerald-600 focus:ring-0"
                />
                <span>Mode Sandbox/Demo</span>
              </label>
            </div>
          </div>

          {/* Kode Item */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-700 w-24">Kode Item :</span>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="Ketik atau cari kode item..."
              className="flex-1 h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-sky-600 rounded flex items-center justify-center shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Margin Keuntungan */}
          <div className="flex items-center gap-6 pt-1">
            <span className="text-[11px] text-slate-700 w-36">Mode Margin Keuntungan :</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                <input
                  type="radio"
                  name="margin_mode"
                  checked={marginMode === "percent"}
                  onChange={() => setMarginMode("percent")}
                  className="text-emerald-600 focus:ring-0"
                />
                <span>Persentase</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                <input
                  type="radio"
                  name="margin_mode"
                  checked={marginMode === "nominal"}
                  onChange={() => setMarginMode("nominal")}
                  className="text-emerald-600 focus:ring-0"
                />
                <span>Nominal</span>
              </label>
            </div>
          </div>
        </div>

        {/* SERVICES TABLE */}
        <div className="border border-slate-300 rounded overflow-hidden shadow-2xs">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="py-2 px-3 border-r border-slate-200 w-16 text-center">Ubah</th>
                <th className="py-2 px-3 border-r border-slate-200">Nama Layanan</th>
                <th className="py-2 px-3 border-r border-slate-200 w-36 text-right">Persentase</th>
                <th className="py-2 px-3 w-36 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-slate-50">
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                    <button className="text-sky-600 hover:text-sky-800 p-0.5">
                      <Edit2 className="w-3 h-3 mx-auto" />
                    </button>
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                    {svc.name}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right text-slate-700">
                    {svc.percent.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-3 text-right text-slate-700">
                    {svc.nominal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTTOM ACTION */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
