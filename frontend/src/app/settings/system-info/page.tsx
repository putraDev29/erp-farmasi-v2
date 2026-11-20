"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Briefcase, Users, User, Cloud } from "lucide-react";

export default function SystemInfoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {/* SUB-HEADER / TITLE BAR */}
      <div className="h-10 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-800 flex items-center text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="font-semibold text-sm text-slate-800">Informasi Sistem</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            33
          </span>
          <div className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              A
            </span>
            <span>ADMIN2</span>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
        <div className="space-y-6 max-w-7xl w-full mx-auto">
          {/* PURPLE HERO BANNER (Ketoko style) */}
          <div className="w-full h-32 rounded-lg bg-gradient-to-r from-[#7c1d7e] via-[#89238c] to-[#6d166e] flex items-center justify-between px-8 text-white shadow-md">
            <h1 className="text-xl font-bold tracking-tight">Informasi Sistem</h1>
            <span className="text-3xl font-black tracking-tight drop-shadow-xs">
              Ketoko.co.id
            </span>
          </div>

          {/* 4 CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: Aplikasi */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                <Briefcase className="w-4 h-4 text-slate-600" />
                <span>Aplikasi</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Nama Aplikasi
                  </div>
                  <div className="font-semibold text-slate-800">Ketoko.co.id</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Versi
                  </div>
                  <div className="font-semibold text-slate-800">2.3.1.2</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Tanggal Build
                  </div>
                  <div className="font-semibold text-slate-800">2026-10-24</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Versi Service
                  </div>
                  <div className="font-semibold text-slate-800">2.3.1.2.DB0.01 [2026-10-24]</div>
                </div>
              </div>
            </div>

            {/* CARD 2: Lisensi & Langganan */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-slate-600" />
                <span>Lisensi &amp; Langganan</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Paket
                  </div>
                  <div className="font-semibold text-slate-800">POS Unlimited Omset</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Status Expired
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">09/01/2027</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                      Aktif
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    ID Perusahaan
                  </div>
                  <div className="font-semibold text-slate-800">apotekberkat</div>
                </div>
              </div>
            </div>

            {/* CARD 3: Sesi Pengguna */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-slate-600" />
                <span>Sesi Pengguna</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Nama Perusahaan
                  </div>
                  <div className="font-semibold text-slate-800">APOTEK BERKAT PURNAMA</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Departemen
                  </div>
                  <div className="font-semibold text-slate-800">UTAMA</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    User Login
                  </div>
                  <div className="font-semibold text-slate-800">ADMIN2</div>
                </div>
              </div>
            </div>

            {/* CARD 4: Infrastruktur */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                <Cloud className="w-4 h-4 text-slate-600" />
                <span>Infrastruktur</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Database Server
                  </div>
                  <div className="font-semibold text-slate-800">MS.Server : POS-01</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Status Koneksi
                  </div>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER TEXT */}
        <div className="text-center text-[11px] text-slate-400 py-4">
          Aplikasi ini dibuat oleh: Inspirasibiz / Inspirasi Media Kreatif
        </div>
      </div>
    </div>
  );
}
