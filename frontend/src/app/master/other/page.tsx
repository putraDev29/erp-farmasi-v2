"use client";

import React from "react";
import Link from "next/link";
import { Folder, Bookmark, Scale, Landmark, Warehouse, Building2, ChevronRight } from "lucide-react";

export default function MasterOtherPage() {
  const masterMenus = [
    { title: "Kategori Produk (Jenis)", desc: "Pengelompokan jenis dan sub-jenis obat/barang", href: "/master/categories", icon: Folder, color: "text-amber-500 bg-amber-50" },
    { title: "Merek & Pabrikan", desc: "Daftar produsen farmasi dan pabrikan resmi", href: "/master/brands", icon: Bookmark, color: "text-sky-500 bg-sky-50" },
    { title: "Satuan & Konversi", desc: "Satuan dasar dan rasio konversi unit (Box, Strip, Tablet)", href: "/master/units", icon: Scale, color: "text-emerald-500 bg-emerald-50" },
    { title: "Rekening Bank & Kas", desc: "Akun bank penerimaan dan pembayaran kas apotek", href: "/master/banks", icon: Landmark, color: "text-indigo-500 bg-indigo-50" },
  ];

  return (
    <div className="space-y-4 text-xs">
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Master Data Lainnya</h2>
        <p className="text-slate-500 text-[11px]">Parameter penunjang transaksi, pengelompokan inventori, dan akun kas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {masterMenus.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="bg-white border border-slate-200 hover:border-sky-300 rounded p-4 shadow-sm hover:shadow transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-sky-600 transition text-xs sm:text-sm">
                    {m.title}
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">{m.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition shrink-0 ml-2" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
