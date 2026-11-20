"use client";

import React, { useState, useEffect } from "react";
import { Palette, Check, Save } from "lucide-react";

const SIDEBAR_COLORS = [
  { id: "purple", color: "#7e22ce", name: "Purple", ring: "ring-[#7e22ce]" },
  { id: "emerald", color: "#10b981", name: "Emerald", ring: "ring-[#10b981]" },
  { id: "blue", color: "#0284c7", name: "Blue", ring: "ring-[#0284c7]" },
  { id: "dark", color: "#1e293b", name: "Dark Slate", ring: "ring-[#1e293b]" },
  { id: "red", color: "#dc2626", name: "Crimson Red", ring: "ring-[#dc2626]" },
];

const SIDEBAR_IMAGES = [
  {
    id: "img-1",
    name: "Pattern 1",
    bgClass: "from-slate-900 via-indigo-950 to-slate-900",
    previewUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "img-2",
    name: "Pattern 2",
    bgClass: "from-blue-950 via-slate-900 to-cyan-950",
    previewUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "img-3",
    name: "Pattern 3",
    bgClass: "from-emerald-950 via-teal-950 to-slate-900",
    previewUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "img-4",
    name: "Pattern 4",
    bgClass: "from-purple-950 via-slate-900 to-violet-950",
    previewUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "img-5",
    name: "Pattern 5",
    bgClass: "from-rose-950 via-slate-900 to-amber-950",
    previewUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80",
  },
];

export default function ThemePage() {
  const [selectedColor, setSelectedColor] = useState("purple");
  const [enableSidebarImage, setEnableSidebarImage] = useState(true);
  const [selectedImage, setSelectedImage] = useState("img-1");
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const savedColor = localStorage.getItem("erp_sidebar_color");
    const savedImgEnabled = localStorage.getItem("erp_sidebar_img_enabled");
    const savedImg = localStorage.getItem("erp_sidebar_image");

    if (savedColor) setSelectedColor(savedColor);
    if (savedImgEnabled !== null) setEnableSidebarImage(savedImgEnabled === "true");
    if (savedImg) setSelectedImage(savedImg);
  }, []);

  const handleSave = () => {
    localStorage.setItem("erp_sidebar_color", selectedColor);
    localStorage.setItem("erp_sidebar_img_enabled", String(enableSidebarImage));
    localStorage.setItem("erp_sidebar_image", selectedImage);

    // Apply color to body or css variables if needed
    document.documentElement.setAttribute("data-sidebar-color", selectedColor);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

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
          <Palette className="w-4 h-4 text-purple-600" />
          <h1 className="font-semibold text-sm text-slate-800">Pengaturan Tema Website</h1>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-3xl space-y-6 overflow-y-auto">
        <div className="bg-white rounded-lg border border-slate-300 p-6 shadow-2xs space-y-6">
          {/* Header Title & Subtitle */}
          <div>
            <h2 className="text-base font-bold text-slate-900">Pengaturan Tema Website</h2>
            <p className="text-slate-500 text-xs mt-0.5">Ubah tampilan tema website Anda</p>
          </div>

          {/* Section 1: WARNA SIDEBAR */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-xs text-slate-800 tracking-wide uppercase text-[11px]">
              WARNA SIDEBAR
            </h3>
            <div className="flex items-center gap-3">
              {SIDEBAR_COLORS.map((c) => {
                const isSelected = selectedColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-7 h-7 rounded-full transition-transform active:scale-95 flex items-center justify-center shadow-xs ${
                      isSelected ? "ring-2 ring-offset-2 " + c.ring : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: AKTIFKAN GAMBAR SIDEBAR */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-xs text-slate-800 tracking-wide uppercase text-[11px]">
              AKTIFKAN GAMBAR SIDEBAR
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableSidebarImage}
                onChange={(e) => setEnableSidebarImage(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Section 3: SIDEBAR IMAGE */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-xs text-slate-800 tracking-wide uppercase text-[11px]">
              SIDEBAR IMAGE
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SIDEBAR_IMAGES.map((img) => {
                const isSelected = selectedImage === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img.id)}
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition h-28 bg-slate-900 group shadow-xs ${
                      isSelected
                        ? "border-purple-600 ring-2 ring-purple-500/20 shadow-md"
                        : "border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-200 group-hover:scale-105"
                      style={{ backgroundImage: `url(${img.previewUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    <div className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white truncate drop-shadow">
                      {img.name}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Gambar sidebar akan ditampilkan jika toggle <span className="font-semibold text-slate-700">Aktifkan Gambar Sidebar</span> dinyalakan.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-6 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold rounded shadow-2xs transition flex items-center gap-1.5 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Tema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
