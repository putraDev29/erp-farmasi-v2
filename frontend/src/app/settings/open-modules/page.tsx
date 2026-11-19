"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, RefreshCw, XCircle, Check, AlertCircle, Loader2 } from "lucide-react";
import { api, formatDate } from "@/lib/api";

export default function OpenModulesPage() {
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["open-modules"],
    queryFn: async () => {
      const res = await api.get("/settings/open-modules");
      return res.data?.data || [];
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/settings/open-modules/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["open-modules"] });
      setToastMsg(`Sesi modul #${id} berhasil ditutup.`);
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

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
          <Layers className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Daftar Modul Terbuka &amp; Sesi Aktif Pengguna</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded flex items-center gap-1.5 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Segarkan Sesi</span>
        </button>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden">
        <div className="bg-white rounded border border-slate-300 p-2.5 shadow-2xs flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-600">
            Daftar sesi modul yang sedang diakses bersamaan oleh petugas apotek, kasir, dan administrator.
          </span>
          <div className="text-[11px] font-bold text-slate-700">
            Total Sesi Aktif: <span className="text-emerald-700">{sessions.length}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200">Pengguna (User)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Peran (Role)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Modul Terbuka</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Rute Halaman (Path)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Alamat IP</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Waktu Dibuka</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200">Status</th>
                  <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                      <span>Memeriksa sesi terbuka...</span>
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada modul terbuka aktif saat ini.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {s.user_name}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-cyan-800 border-r border-slate-200">
                        {s.module}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">
                        {s.path}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 border-r border-slate-200">
                        {s.ip_address}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">
                        {formatDate(s.opened_at)}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => closeMutation.mutate(s.id)}
                          disabled={closeMutation.isPending}
                          className="h-6 px-2 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold rounded text-[10px] flex items-center justify-center gap-1 mx-auto transition disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Tutup Sesi</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
