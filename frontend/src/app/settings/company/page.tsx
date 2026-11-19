"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Phone, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function CompanySettingsPage() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get("/companies");
      return res.data?.data || [];
    },
  });

  const company = companies?.[0];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2 text-xs select-none">
      <div className="shrink-0 border-b border-slate-200 pb-1">
        <h1 className="text-sm font-bold text-slate-800">Profil & Konfigurasi Perusahaan</h1>
        <p className="text-[11px] text-slate-500">Legalitas entitas bisnis, izin PBF, mata uang transaksi, dan struktur cabang.</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-xs">Memuat data perusahaan...</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto max-w-4xl pr-1 space-y-4">
          <div className="bg-white rounded border border-slate-200 shadow-2xs p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{company?.name}</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Kode: {company?.code} &bull; NPWP: {company?.tax_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px]">Alamat Kantor Pusat:</span>
                <p className="text-slate-800 font-medium text-[11px]">{company?.address}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded space-y-1">
              <span className="text-slate-400 font-semibold block">Kontak Resmi:</span>
              <p className="text-slate-800 font-medium">Telepon: {company?.phone}</p>
              <p className="text-slate-800 font-medium">Email: {company?.email}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold block">Mata Uang & Standar Akuntansi:</span>
              <p className="text-slate-800 font-bold font-mono">IDR (Indonesian Rupiah) &bull; GAAP / SAK</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 font-semibold block">Zona Waktu Operasional:</span>
              <p className="text-slate-800 font-bold font-mono">Asia/Jakarta (WIB, UTC+7)</p>
            </div>
          </div>

          {/* Branches and Warehouses list */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Jaringan Cabang & Fasilitas Gudang</h3>
            <div className="space-y-2">
              {company?.branches?.map((b: any) => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900">{b.name} ({b.code})</span>
                    {b.is_head_office && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Kantor Pusat
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 mb-2">{b.address}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.warehouses?.map((w: any) => (
                      <span key={w.id} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-medium">
                        {w.name} ({w.type})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
