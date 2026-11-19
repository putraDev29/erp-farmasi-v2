"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import { api } from "@/lib/api";

export default function NumberingPage() {
  const { data: formats, isLoading } = useQuery({
    queryKey: ["numbering-formats"],
    queryFn: async () => {
      const res = await api.get("/settings/numbering");
      return res.data?.data || [];
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 border-b border-slate-200 pb-1">
        <h1 className="text-sm font-bold text-slate-800">Format Penomoran Dokumen Transaksi</h1>
        <p className="text-[11px] text-slate-500">Konfigurasi awalan kode penomoran otomatis untuk faktur, PO, SO, jurnal, dan mutasi.</p>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-3 px-4">Tipe Dokumen</th>
              <th className="py-3 px-4">Awalan (Prefix)</th>
              <th className="py-3 px-4">Panjang Nomor Seri</th>
              <th className="py-3 px-4">Nomor Urut Saat Ini</th>
              <th className="py-3 px-4">Siklus Reset Nomor</th>
              <th className="py-3 px-4">Contoh Format Keluaran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-sans">Memuat format penomoran...</td></tr>
            ) : (
              formats?.map((f: any) => (
                <tr key={f.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{f.doc_type}</td>
                  <td className="py-3 px-4 text-emerald-700 font-bold">{f.prefix}</td>
                  <td className="py-3 px-4 font-sans text-slate-700">{f.counter_length} Digit</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{f.current_number}</td>
                  <td className="py-3 px-4 font-sans text-slate-600">{f.reset_period}</td>
                  <td className="py-3 px-4 text-slate-500">{f.prefix}2026/11/00001</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
