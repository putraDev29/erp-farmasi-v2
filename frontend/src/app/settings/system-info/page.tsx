"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, ShieldCheck, Cpu, HardDrive, CheckCircle2, Award, Terminal, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function SystemInfoPage() {
  const { data: info = {}, isLoading } = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => {
      const res = await api.get("/settings/system-info");
      return res.data?.data || {};
    },
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Informasi Sistem &amp; Lisensi Apotek</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10.5px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Status Lisensi: AKTIF</span>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-4xl space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat informasi sistem...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. System Header Card */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {info.app_name || "Ketoko ERP Farmasi & POS Enterprise"}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Versi Perangkat Lunak: <span className="font-mono font-bold text-emerald-700">{info.version || "2.4.0-PRO"}</span> &bull; Build: {info.build_date || "2026-11-19"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Award className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Compliance Certificate */}
            <div className="bg-emerald-50/70 rounded border border-emerald-200 p-3.5 shadow-2xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-950 text-xs">Sertifikasi Standar BPOM &amp; Kemenkes RI</div>
                <div className="text-[11px] text-emerald-900/90 mt-0.5 leading-relaxed">
                  Aplikasi ini dirancang dengan modul Jejak Audit Imutabel (Audit Trail 21 CFR Part 11), pelacakan nomor batch, tanggal kadaluarsa (ED), dan integrasi faktur farmasi sesuai standar CDOB (Cara Distribusi Obat yang Baik).
                </div>
              </div>
            </div>

            {/* 3. Runtime & Technology Stack */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                <span>Spesifikasi Lingkungan &amp; Arsitektur Teknis</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Backend Server:</span>
                  <span className="font-mono font-bold text-slate-800">Golang Gin Engine ({info.go_version || "go1.23"})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Frontend Client:</span>
                  <span className="font-mono font-bold text-slate-800">Next.js 14 App Router + React 18</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Basis Data:</span>
                  <span className="font-mono font-bold text-slate-800">{info.database_engine || "PostgreSQL 18"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Platform OS / Arsitektur:</span>
                  <span className="font-mono font-bold text-slate-800">{info.os_arch || "Windows / AMD64"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Goroutines Aktif:</span>
                  <span className="font-mono font-bold text-slate-800">{info.goroutines || 12} worker</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Alokasi Memori Heap:</span>
                  <span className="font-mono font-bold text-slate-800">{info.memory_allocated || "18.5 MB"}</span>
                </div>
              </div>
            </div>

            {/* 4. Licensee Entity Details */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
                Hak Cipta &amp; Pemegang Lisensi Resmi
              </h3>
              <div className="text-[11px] space-y-1.5 text-slate-700">
                <div>
                  Dilisensikan Kepada: <span className="font-bold text-slate-900">{info.pharmacy_name || "Apotek Berkat Purnama"}</span>
                </div>
                <div>
                  Cabang Operasional: <span className="font-bold text-slate-900">{info.branch || "Apotek Berkat Purnama [Utama]"}</span>
                </div>
                <div className="text-slate-400 text-[10px] pt-1">
                  &copy; 2026 Ketoko.co.id &bull; Hak Cipta Dilindungi Undang-Undang Republik Indonesia.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
