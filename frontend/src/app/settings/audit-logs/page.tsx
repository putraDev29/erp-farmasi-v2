"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Search } from "lucide-react";
import { api, formatDate } from "@/lib/api";

export default function AuditLogsPage() {
  const [entity, setEntity] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", entity],
    queryFn: async () => {
      let url = "/settings/audit-logs";
      if (entity) url += `?entity=${entity}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      <div className="shrink-0 border-b border-slate-200 pb-1">
        <h1 className="text-sm font-bold text-slate-800">Jejak Audit Sistem (BPOM & 21 CFR Part 11 Compliance)</h1>
        <p className="text-[11px] text-slate-500">Log mutasi data imutabel yang mencatat waktu, aksi, pengguna, dan alamat IP secara terverifikasi.</p>
      </div>

      <div className="shrink-0 bg-white p-1.5 rounded border border-slate-200 shadow-2xs flex items-center gap-2 text-[11px]">
        <span className="font-semibold text-slate-600">Filter Entitas:</span>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="h-6 px-2 text-[11px] bg-white border border-slate-300 rounded focus:border-emerald-500"
        >
          <option value="">Semua Entitas Data</option>
          <option value="USER">Otentikasi Pengguna</option>
          <option value="PRODUCT">Katalog Obat</option>
          <option value="PURCHASE">Faktur Pembelian</option>
          <option value="SALE">Transaksi Penjualan</option>
          <option value="JOURNAL">Jurnal Pembukuan</option>
        </select>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs h-6">
            <tr>
              <th className="py-3 px-4">Waktu Kejadian</th>
              <th className="py-3 px-4">Pengguna Pelaksana</th>
              <th className="py-3 px-4">Aksi</th>
              <th className="py-3 px-4">Entitas Terkait</th>
              <th className="py-3 px-4">ID Dokumen / Data</th>
              <th className="py-3 px-4">Alamat IP Klien</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-sans">Memuat jejak audit...</td></tr>
            ) : logs?.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-sans">Belum ada jejak audit tercatat.</td></tr>
            ) : (
              logs?.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-slate-500 font-sans">{formatDate(l.created_at)}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">{l.user?.full_name || l.user?.username || "Sistem"}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">{l.entity}</td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">{l.entity_id}</td>
                  <td className="py-3 px-4 text-slate-600 font-sans">{l.ip_address || "127.0.0.1"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
