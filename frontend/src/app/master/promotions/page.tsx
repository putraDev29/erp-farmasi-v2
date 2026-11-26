"use client";

import React, { useState } from "react";
import { Plus, Tag, Percent } from "lucide-react";

export default function PromotionsPage() {
  const [promos] = useState([
    { id: "1", code: "PROMO-NEW", name: "Diskon Member Baru", type: "Persentase", value: "5%", minOrder: "Rp 50.000", period: "Sepanjang Tahun" },
    { id: "2", code: "PROMO-BULK", name: "Potongan Grosir Obat", type: "Nominal Bertingkat", value: "s/d 10%", minOrder: "Rp 1.000.000", period: "1 Jan - 31 Des" },
    { id: "3", code: "PROMO-VIT", name: "Diskon Vitamin Akhir Pekan", type: "Persentase", value: "7.5%", minOrder: "Rp 100.000", period: "Setiap Sabtu-Minggu" },
  ]);

  return (
    <div className="space-y-3 text-xs">
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Diskon & Promosi</h2>
        </div>
        <button className="h-8 px-3.5 bg-[#009b62] hover:bg-[#008754] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition active:scale-95">
          <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
          <span>Tambah Promosi</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
              <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center">No</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Kode Promo</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Nama Promosi</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Tipe Nilai</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-right">Potongan</th>
              <th className="py-2.5 px-3 border-r border-slate-200">Min. Pembelian</th>
              <th className="py-2.5 px-3 text-center">Periode Berlaku</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p, idx) => (
              <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-500">{idx + 1}</td>
                <td className="py-2 px-3 border-r border-slate-200 font-mono font-medium">{p.code}</td>
                <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-900">{p.name}</td>
                <td className="py-2 px-3 border-r border-slate-200">{p.type}</td>
                <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-emerald-700 font-semibold">{p.value}</td>
                <td className="py-2 px-3 border-r border-slate-200">{p.minOrder}</td>
                <td className="py-2 px-3 text-center">{p.period}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
