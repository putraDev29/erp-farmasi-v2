"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sliders, Save, Check, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function GeneralSettingsPage() {
  const [currency, setCurrency] = useState("IDR");
  const [defaultTax, setDefaultTax] = useState("11");
  const [allowMinusStock, setAllowMinusStock] = useState("false");
  const [sellBelowCostMode, setSellBelowCostMode] = useState("confirm"); // confirm, block, allow
  const [barcodeMode, setBarcodeMode] = useState("auto_enter");
  const [edAlertDays, setEdAlertDays] = useState("7");
  const [edPopupDashboard, setEdPopupDashboard] = useState("true");
  const [minStockPopup, setMinStockPopup] = useState("true");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load settings
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["settings-general"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/GENERAL");
      return res.data?.data || {};
    },
  });

  useEffect(() => {
    if (settings) {
      if (settings.currency) setCurrency(settings.currency);
      if (settings.default_tax) setDefaultTax(settings.default_tax);
      if (settings.allow_minus_stock) setAllowMinusStock(settings.allow_minus_stock);
      if (settings.sell_below_cost) setSellBelowCostMode(settings.sell_below_cost);
      if (settings.barcode_mode) setBarcodeMode(settings.barcode_mode);
      if (settings.ed_alert_days) setEdAlertDays(settings.ed_alert_days);
      if (settings.ed_popup_dashboard) setEdPopupDashboard(settings.ed_popup_dashboard);
      if (settings.min_stock_popup) setMinStockPopup(settings.min_stock_popup);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      return await api.put("/settings/groups/GENERAL", payload);
    },
    onSuccess: () => {
      showToast("success", "Pengaturan umum berhasil disimpan!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menyimpan pengaturan umum");
    },
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      currency,
      default_tax: defaultTax,
      allow_minus_stock: allowMinusStock,
      sell_below_cost: sellBelowCostMode,
      barcode_mode: barcodeMode,
      ed_alert_days: edAlertDays,
      ed_popup_dashboard: edPopupDashboard,
      min_stock_popup: minStockPopup,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Pengaturan Umum Apotek &amp; POS</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Simpan Pengaturan</span>
        </button>
      </div>

      <div className="flex-1 p-4 max-w-4xl space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat pengaturan umum...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Transaksi & Keuangan */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
                1. Parameter Transaksi &amp; Keuangan
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mata Uang Default Sistem
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="IDR">IDR (Rupiah Indonesia - Rp)</option>
                    <option value="USD">USD (US Dollar - $)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tarif Pajak PPN Standar (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={defaultTax}
                    onChange={(e) => setDefaultTax(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 2. Persediaan & Farmasi */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
                2. Kebijakan Persediaan &amp; Kadaluarsa Obat (ED)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Izinkan Saldo Stok Minus pada Transaksi Kasir
                  </label>
                  <select
                    value={allowMinusStock}
                    onChange={(e) => setAllowMinusStock(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="false">Tidak (Tolak transaksi jika fisik stok habis - Direkomendasikan BPOM)</option>
                    <option value="true">Ya (Izinkan stok minus sementara hingga faktur beli diinput)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Konfirmasi Penjualan di Bawah Harga Pokok (HPP)
                  </label>
                  <select
                    value={sellBelowCostMode}
                    onChange={(e) => setSellBelowCostMode(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="confirm">Tampilkan Konfirmasi Dialog Peringatan Rugi</option>
                    <option value="block">Kunci / Tolak Penjualan di Bawah Harga Pokok</option>
                    <option value="allow">Izinkan Bebas Tanpa Konfirmasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Batas Peringatan Obat Mendekati Expired (ED)
                  </label>
                  <select
                    value={edAlertDays}
                    onChange={(e) => setEdAlertDays(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="7">1 Minggu (7 Hari Sebelum ED)</option>
                    <option value="14">2 Minggu (14 Hari Sebelum ED)</option>
                    <option value="30">30 Hari (1 Bulan Sebelum ED)</option>
                    <option value="60">2 Bulan (60 Hari Sebelum ED)</option>
                    <option value="90">3 Bulan (90 Hari Sebelum ED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Popup Peringatan ED Obat di Dashboard
                  </label>
                  <select
                    value={edPopupDashboard}
                    onChange={(e) => setEdPopupDashboard(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="true">Aktif (Tampilkan popup modal saat pertama kali buka Dashboard)</option>
                    <option value="false">Nonaktif (Hanya tampil di menu Obat Kadaluarsa)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Kasir POS & Barcode Scanner */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
                3. Operasional Kasir &amp; Barcode Scanner
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mode Pemindaian Barcode (Scanner POS)
                  </label>
                  <select
                    value={barcodeMode}
                    onChange={(e) => setBarcodeMode(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto_enter">Auto Enter (Tambah 1 item per scan otomatis)</option>
                    <option value="manual_enter">Manual Enter (Fokus ke input kuantiti setelah scan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Peringatan Stok Minimum Saat Buka Kasir
                  </label>
                  <select
                    value={minStockPopup}
                    onChange={(e) => setMinStockPopup(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="true">Tampilkan Peringatan jika ada item mencapai batas minimum</option>
                    <option value="false">Jangan Tampilkan</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
