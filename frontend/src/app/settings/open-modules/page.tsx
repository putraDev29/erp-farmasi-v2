"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, RotateCcw, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface OpenModuleItem {
  noTx: string;
  tipe: string;
  komputer: string;
  user: string;
}

const DEFAULT_OPEN_MODULES: OpenModuleItem[] = [
  { noTx: "075791/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "075830/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076046/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076059/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076064/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076343/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(USER-PC)", user: "ELDHA" },
  { noTx: "076265/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(USER-PC)", user: "MAYA" },
  { noTx: "076275/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(USER-PC)", user: "MAYA" },
  { noTx: "076513/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(USER-PC)", user: "ELDHA" },
  { noTx: "076547/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076604/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(USER-PC)", user: "ELDHA" },
  { noTx: "076605/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076677/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076739/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076750/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
  { noTx: "076756/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "ELDHA" },
  { noTx: "076840/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "ELDHA" },
  { noTx: "079111/KSR/UTAMA/1126", tipe: "JL", komputer: "Ketoko-Desktop:2.3.1.3(DESKTOP-HIKIF1P)", user: "MAYA" },
];

export default function OpenModulesPage() {
  const router = useRouter();
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [modules, setModules] = useState<OpenModuleItem[]>(DEFAULT_OPEN_MODULES);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: serverSessions = [] } = useQuery({
    queryKey: ["open-modules"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/open-modules");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const handleResetSelected = () => {
    if (!selectedRow) {
      setToastMsg("Pilih salah satu baris transaksi terlebih dahulu!");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    setModules((prev) => prev.filter((m) => m.noTx !== selectedRow));
    setSelectedRow(null);
    setToastMsg(`Sesi transaksi #${selectedRow} berhasil di-reset.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleResetAll = () => {
    setModules([]);
    setSelectedRow(null);
    setToastMsg("Semua sesi modul terbuka berhasil di-reset!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SUB-HEADER / TITLE BAR */}
      <div className="h-10 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-800 flex items-center text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="font-semibold text-sm text-slate-800">Modul Terbuka</span>
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

      {/* TOOLBAR AT TOP */}
      <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 bg-[#f8fafc] shrink-0">
        <div className="flex items-center gap-1">
          <button className="h-6 w-6 border border-slate-300 rounded bg-white flex items-center justify-center hover:bg-slate-50">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-slate-700 text-[11px]">Hal 1 / 1</span>
          <button className="h-6 w-6 border border-slate-300 rounded bg-white flex items-center justify-center hover:bg-slate-50">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button className="h-6 w-6 border border-slate-300 rounded bg-white flex items-center justify-center hover:bg-slate-50 text-sky-600">
          <Search className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetSelected}
          type="button"
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1 text-[11px] shadow-2xs"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset</span>
        </button>

        <button
          onClick={handleResetAll}
          type="button"
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1 text-[11px] shadow-2xs"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset Semua</span>
        </button>
      </div>

      {/* TABLE CONTENT */}
      <div className="flex-1 min-h-0 overflow-auto border-b border-slate-200">
        <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
          <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0">
            <tr>
              <th className="py-2 px-3 border-r border-slate-200">No Transaksi</th>
              <th className="py-2 px-3 border-r border-slate-200 w-24">Tipe</th>
              <th className="py-2 px-3 border-r border-slate-200">Komputer Online</th>
              <th className="py-2 px-3">user Online</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {modules.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  Tidak ada transaksi atau modul terbuka.
                </td>
              </tr>
            ) : (
              modules.map((m) => {
                const isSelected = selectedRow === m.noTx;
                return (
                  <tr
                    key={m.noTx}
                    onClick={() => setSelectedRow(m.noTx)}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-sky-50 font-semibold" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-800">
                      {m.noTx}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                      {m.tipe}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700 font-mono text-[10px]">
                      {m.komputer}
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">
                      {m.user}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* TOOLBAR AT BOTTOM */}
      <div className="px-4 py-2 flex items-center gap-2 bg-[#f8fafc] shrink-0">
        <div className="flex items-center gap-1">
          <button className="h-6 w-6 border border-slate-300 rounded bg-white flex items-center justify-center hover:bg-slate-50">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-slate-700 text-[11px]">Hal 1 / 1</span>
          <button className="h-6 w-6 border border-slate-300 rounded bg-white flex items-center justify-center hover:bg-slate-50">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleResetSelected}
          type="button"
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1 text-[11px] shadow-2xs"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset</span>
        </button>

        <button
          onClick={handleResetAll}
          type="button"
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1 text-[11px] shadow-2xs"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset Semua</span>
        </button>
      </div>
    </div>
  );
}
