"use client";

import React, { useState } from "react";
import { Globe, Save, Check, RefreshCw, AlertCircle, ShoppingBag, ExternalLink } from "lucide-react";

interface MarketplaceChannel {
  id: string;
  name: string;
  logoColor: string;
  shopName: string;
  isConnected: boolean;
  autoSyncStock: boolean;
  autoSyncOrders: boolean;
  syncInterval: string;
}

export default function MarketplaceIntegrationPage() {
  const [channels, setChannels] = useState<MarketplaceChannel[]>([
    {
      id: "shopee",
      name: "Shopee Indonesia",
      logoColor: "bg-[#ee4d2d]",
      shopName: "Apotek Berkat Official",
      isConnected: true,
      autoSyncStock: true,
      autoSyncOrders: true,
      syncInterval: "5",
    },
    {
      id: "tokopedia",
      name: "Tokopedia",
      logoColor: "bg-[#03ac0e]",
      shopName: "Apotek Berkat Medika",
      isConnected: true,
      autoSyncStock: true,
      autoSyncOrders: true,
      syncInterval: "5",
    },
    {
      id: "tiktok",
      name: "TikTok Shop",
      logoColor: "bg-black",
      shopName: "ApotekBerkatShop",
      isConnected: false,
      autoSyncStock: false,
      autoSyncOrders: false,
      syncInterval: "15",
    },
    {
      id: "blibli",
      name: "Blibli",
      logoColor: "bg-[#0095da]",
      shopName: "-",
      isConnected: false,
      autoSyncStock: false,
      autoSyncOrders: false,
      syncInterval: "15",
    },
    {
      id: "lazada",
      name: "Lazada",
      logoColor: "bg-[#0f146d]",
      shopName: "-",
      isConnected: false,
      autoSyncStock: false,
      autoSyncOrders: false,
      syncInterval: "30",
    },
  ]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toggleStock = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, autoSyncStock: !c.autoSyncStock } : c))
    );
  };

  const toggleOrders = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, autoSyncOrders: !c.autoSyncOrders } : c))
    );
  };

  const handleSave = () => {
    setToastMsg("Pengaturan integrasi marketplace berhasil disimpan!");
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
          <Globe className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Integrasi Kanal Marketplace Online</h1>
        </div>
        <button
          onClick={handleSave}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Simpan Konfigurasi</span>
        </button>
      </div>

      <div className="flex-1 p-4 max-w-4xl space-y-4 overflow-y-auto">
        <div className="space-y-3">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="bg-white rounded border border-slate-300 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg ${ch.logoColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                >
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{ch.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        ch.isConnected
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {ch.isConnected ? "Terhubung" : "Belum Aktif"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Nama Toko: <span className="font-semibold text-slate-700">{ch.shopName}</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={ch.autoSyncStock}
                    onChange={() => toggleStock(ch.id)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Sinkron Stok Otomatis</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={ch.autoSyncOrders}
                    onChange={() => toggleOrders(ch.id)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Tarik Pesanan Masuk</span>
                </label>

                <button
                  type="button"
                  className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-[10.5px] transition"
                >
                  {ch.isConnected ? "Konfigurasi API" : "Hubungkan Akun"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
