"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RotateCcw,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function PriceTerminalPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Focus input automatically on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["products-terminal"],
    queryFn: async () => {
      const res = await api.get("/products?page_size=200");
      return res.data?.data?.items || [];
    },
  });

  const handleSearch = () => {
    if (!barcodeQuery.trim()) return;
    const cleanQuery = barcodeQuery.trim().toLowerCase();

    const found = products.find(
      (p: any) =>
        p.sku?.toLowerCase() === cleanQuery ||
        p.barcode?.toLowerCase() === cleanQuery ||
        p.name?.toLowerCase().includes(cleanQuery)
    );

    if (found) {
      setSelectedProduct(found);
      setNotFound(false);
    } else {
      setSelectedProduct(null);
      setNotFound(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleReset = () => {
    setBarcodeQuery("");
    setSelectedProduct(null);
    setNotFound(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Terminal Harga (Cek Harga)
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {/* 2. TERMINAL BODY (Matching Image 2 Layout) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 max-w-5xl pr-1">
        {/* Section 1: Kode Item / Barcode */}
        <div className="space-y-1.5">
          <label className="block text-slate-800 font-bold text-[11px]">
            Kode Item / Barcode :
          </label>
          {/* Pink box input matching screenshot */}
          <input
            ref={inputRef}
            type="text"
            value={barcodeQuery}
            onChange={(e) => setBarcodeQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            className="w-full h-11 px-3 bg-[#e9b7cc] border border-[#d69db4] rounded text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleSearch}
              className="h-6 px-3 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-6 px-3 bg-[#e05d52] hover:bg-[#c94b41] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Section 2: Nama Item */}
        <div className="space-y-1">
          <label className="block text-slate-800 font-bold text-[11px]">
            Nama Item :
          </label>
          <div className="w-full min-h-[50px] p-2 bg-white border border-dashed border-slate-300 rounded flex items-center text-slate-800 font-bold text-sm">
            {selectedProduct ? (
              <span>
                {selectedProduct.name} ({selectedProduct.sku})
              </span>
            ) : notFound ? (
              <span className="text-red-500 font-medium text-xs">
                Item tidak ditemukan. Silakan periksa barcode atau nama item.
              </span>
            ) : null}
          </div>
        </div>

        {/* Section 3: Stok Item */}
        <div className="space-y-1">
          <label className="block text-slate-800 font-bold text-[11px]">
            Stok Item :
          </label>
          <div className="w-full min-h-[50px] p-2 bg-white border border-dashed border-slate-300 rounded flex items-center text-slate-800 font-semibold text-xs">
            {selectedProduct ? (
              <span className="text-emerald-700 font-bold">
                Tersedia ({selectedProduct.base_unit?.name || "Pcs"})
              </span>
            ) : null}
          </div>
        </div>

        {/* Section 4: Harga Jual (Large Slate Blue Box Matching Image 2) */}
        <div className="space-y-1">
          <label className="block text-slate-800 font-bold text-[11px]">
            Harga Jual :
          </label>
          <div className="w-full h-64 bg-[#718292] rounded-md shadow-inner flex items-center justify-end px-8 border border-[#5d6d7c]">
            <span className="text-6xl md:text-7xl font-black text-[#1a1c23] tracking-tight">
              {selectedProduct
                ? formatCurrency(selectedProduct.selling_price || 0).replace("Rp", "").trim()
                : "0.00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
