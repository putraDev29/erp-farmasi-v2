"use client";

import React, { useState } from "react";
import { CreditCard, Save, Check, QrCode, ShieldCheck, Key } from "lucide-react";

export default function PaymentGatewayPage() {
  const [activeGateway, setActiveGateway] = useState<"midtrans" | "xendit">("midtrans");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("production");
  const [serverKey, setServerKey] = useState("Mid-server-8921XyZ...");
  const [clientKey, setClientKey] = useState("Mid-client-0912AbC...");
  const [enableQris, setEnableQris] = useState(true);
  const [enableVA, setEnableVA] = useState(true);
  const [enableCC, setEnableCC] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg("Pengaturan Payment Gateway berhasil disimpan!");
    setTimeout(() => setToastMsg(null), 3000);
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
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Integrasi Payment Gateway (QRIS &amp; Otomasi Bank)</h1>
        </div>
        <button
          onClick={handleSave}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Simpan Konfigurasi</span>
        </button>
      </div>

      <div className="flex-1 p-4 max-w-3xl space-y-4 overflow-y-auto">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
            <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
              Pilihan Gerbang Pembayaran Elektronik (Gateway)
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveGateway("midtrans")}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  activeGateway === "midtrans"
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs">Midtrans Payment (GoTo)</div>
                  <div className="text-[10px] text-slate-500">Mendukung Snap &amp; QRIS Dinamis Terintegrasi POS Kasir</div>
                </div>
                {activeGateway === "midtrans" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>

              <div
                onClick={() => setActiveGateway("xendit")}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  activeGateway === "xendit"
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs">Xendit Indonesia</div>
                  <div className="text-[10px] text-slate-500">Mendukung Invoice Otomatis &amp; Virtual Account Multibank</div>
                </div>
                {activeGateway === "xendit" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Lingkungan Operasional (Environment)
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="production">Production (Live - Transaksi Riil Pembeli)</option>
                  <option value="sandbox">Sandbox (Pengujian - Simulator)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Server Key (Kunci Rahasia API)
                </label>
                <input
                  type="password"
                  value={serverKey}
                  onChange={(e) => setServerKey(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Client Key (Kunci Publik Frontend)
              </label>
              <input
                type="text"
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
            <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
              Metode Pembayaran yang Diaktifkan di Kasir POS
            </h2>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={enableQris}
                  onChange={(e) => setEnableQris(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                  <span>QRIS Dinamis (Muncul barcode di layar kasir &amp; struk bayar)</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={enableVA}
                  onChange={(e) => setEnableVA(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Virtual Account Transfer Bank Otomatis (BCA, Mandiri, BRI, BNI)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={enableCC}
                  onChange={(e) => setEnableCC(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Kartu Kredit &amp; Debit Online (Visa, MasterCard, JCB)</span>
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
