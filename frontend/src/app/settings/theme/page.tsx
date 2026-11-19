"use client";

import React, { useState, useEffect } from "react";
import { Palette, Check, Sun, Moon, Layout, Eye, Save } from "lucide-react";

export default function ThemePage() {
  const [themeColor, setThemeColor] = useState("emerald");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [tableDensity, setTableDensity] = useState<"compact" | "normal" | "comfortable">("compact");
  const [fontSize, setFontSize] = useState<"small" | "normal" | "large">("small");
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const savedColor = localStorage.getItem("erp_theme_color");
    const savedMode = localStorage.getItem("erp_theme_mode");
    const savedDensity = localStorage.getItem("erp_table_density");
    if (savedColor) setThemeColor(savedColor);
    if (savedMode) setThemeMode(savedMode as any);
    if (savedDensity) setTableDensity(savedDensity as any);
  }, []);

  const handleSave = () => {
    localStorage.setItem("erp_theme_color", themeColor);
    localStorage.setItem("erp_theme_mode", themeMode);
    localStorage.setItem("erp_table_density", tableDensity);
    localStorage.setItem("erp_font_size", fontSize);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const colors = [
    { id: "emerald", name: "Ketoko Green (Standar Apotek)", bg: "bg-[#00c875]", ring: "ring-[#00c875]" },
    { id: "cyan", name: "Cyan Biru Medika", bg: "bg-cyan-500", ring: "ring-cyan-500" },
    { id: "indigo", name: "Royal Indigo", bg: "bg-indigo-600", ring: "ring-indigo-600" },
    { id: "rose", name: "Rose Pharmacy", bg: "bg-rose-500", ring: "ring-rose-500" },
    { id: "amber", name: "Warm Amber", bg: "bg-amber-500", ring: "ring-amber-500" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {savedToast && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Pengaturan tema berhasil disimpan!</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Pengaturan Tema & Tampilan UI</h1>
        </div>
        <button
          onClick={handleSave}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Simpan Preferensi</span>
        </button>
      </div>

      <div className="flex-1 p-4 max-w-4xl space-y-4 overflow-y-auto">
        {/* 1. Color Palette */}
        <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
          <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <span>Skema Warna Utama Aplikasi (Brand Accent)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {colors.map((c) => (
              <div
                key={c.id}
                onClick={() => setThemeColor(c.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  themeColor === c.id
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full ${c.bg} shadow-xs shrink-0`} />
                  <span className="font-semibold text-slate-700 text-[11px]">{c.name}</span>
                </div>
                {themeColor === c.id && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Light / Dark Mode */}
        <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
          <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-slate-500" />
            <span>Mode Tampilan Gelap / Terang</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setThemeMode("light")}
              className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                themeMode === "light"
                  ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">Mode Terang (Light Mode - Rekomendasi)</div>
                  <div className="text-[10px] text-slate-500">Tampilan standar jernih dan nyaman untuk kasir & administrasi apotek</div>
                </div>
              </div>
              {themeMode === "light" && <Check className="w-4 h-4 text-emerald-600" />}
            </div>

            <div
              onClick={() => setThemeMode("dark")}
              className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                themeMode === "dark"
                  ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="w-5 h-5 text-indigo-500" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">Mode Gelap (Dark Mode)</div>
                  <div className="text-[10px] text-slate-500">Kontras rendah untuk operasional apotek 24 jam di pencahayaan redup</div>
                </div>
              </div>
              {themeMode === "dark" && <Check className="w-4 h-4 text-emerald-600" />}
            </div>
          </div>
        </div>

        {/* 3. Table Density & Font Size */}
        <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
          <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Layout className="w-3.5 h-3.5 text-slate-500" />
            <span>Kerapatan Tabel &amp; Ukuran Huruf</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "compact", title: "Sangat Ringkas (Ketoko Standard)", desc: "Tinggi baris 24px - muat banyak baris sekaligus" },
              { id: "normal", title: "Sedang (Standard)", desc: "Tinggi baris 32px - lebih leluasa membaca data" },
              { id: "comfortable", title: "Lapang (Comfortable)", desc: "Tinggi baris 40px - ramah layar sentuh (touchscreen)" },
            ].map((d) => (
              <div
                key={d.id}
                onClick={() => setTableDensity(d.id as any)}
                className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                  tableDensity === d.id
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">{d.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{d.desc}</div>
                </div>
                {tableDensity === d.id && (
                  <div className="mt-2 text-emerald-600 flex items-center gap-1 font-bold text-[10px]">
                    <Check className="w-3.5 h-3.5" /> Terpilih
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
