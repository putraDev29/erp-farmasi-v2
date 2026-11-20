"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, AlertTriangle, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type LogTab = "Transaksi" | "Master" | "Akuntansi" | "Impor" | "Sistem" | "Auto Patch";

export default function LogAktivitasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LogTab>("Transaksi");
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("2026-11-01");
  const [toDate, setToDate] = useState("2026-11-30");
  const [page, setPage] = useState(1);

  const { data: serverLogs = [] } = useQuery({
    queryKey: ["audit-logs", activeTab, fromDate, toDate, keyword],
    queryFn: async () => {
      try {
        const res = await api.get(`/settings/audit-logs?from=${fromDate}&to=${toDate}&q=${keyword}`);
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mock data realistic to Screenshots 9, 11, 12, 13, 14, 15
  const transaksiData = [
    { tanggal: "2026-11-18 20:15:31", obyek: "PENJUALAN", noTx: "079112/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "MAYA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 20:14:43", obyek: "PENJUALAN", noTx: "079111/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "MAYA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 20:14:36", obyek: "PENJUALAN", noTx: "079110/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "ELDHA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 20:11:48", obyek: "PENJUALAN", noTx: "079109/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "ELDHA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:48:53", obyek: "PENJUALAN", noTx: "079108/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "MAYA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:46:55", obyek: "PENJUALAN", noTx: "079107/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "ELDHA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:43:58", obyek: "PENJUALAN", noTx: "079106/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "MAYA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:42:09", obyek: "PENJUALAN", noTx: "079105/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "ELDHA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:39:08", obyek: "PENJUALAN", noTx: "079104/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "MAYA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:36:38", obyek: "PENJUALAN", noTx: "079103/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "ELDHA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:35:04", obyek: "PENJUALAN", noTx: "079102/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "MAYA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 19:33:44", obyek: "PENJUALAN", noTx: "079101/KSR/UTAMA/112", keterangan: "Insert Penjualan", status: "Sukses", user: "ELDHA", ip: "118.99.64.8", pc: "Desktop (Windows)" },
  ];

  const masterData = [
    { tanggal: "2026-11-18 19:34:25", kode: "PCT+GG+CTM+PSO", keterangan: "Edit Item", status: "Sukses", user: "DEVI", ip: "182.2.105.104", pc: "Web (Safari)" },
    { tanggal: "2026-11-18 16:05:10", kode: "OTC-195", keterangan: "Edit Item", status: "Sukses", user: "DEVI", ip: "9.154.179.164", pc: "Web (Safari)" },
    { tanggal: "2026-11-18 13:17:39", kode: "OTC-389", keterangan: "Edit Item", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 12:28:20", kode: "PARACETAMOL-45", keterangan: "Edit Item", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 09:17:43", kode: "AMLODIPIN-IT", keterangan: "Edit Item", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-17 10:04:06", kode: "OTC-253", keterangan: "Edit Item", status: "Sukses", user: "DEVI", ip: "118.99.64.10", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-16 17:27:46", kode: "SALEP-015", keterangan: "Edit Item", status: "Sukses", user: "DEVI", ip: "9.154.179.164", pc: "Web (Chrome)" },
    { tanggal: "2026-11-16 14:54:55", kode: "SUCRALFATE-006", keterangan: "Edit Item", status: "Sukses", user: "DEVI", ip: "118.99.64.10", pc: "Web (Chrome)" },
  ];

  const akuntansiData = [
    { tanggal: "2026-11-18 14:14:04", obyek: "KAS", noTx: "1179/KASTR/UTAMA/112", keterangan: "Tambah Kas Transfer", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 12:38:03", obyek: "KAS", noTx: "0427/KASO/UTAMA/112", keterangan: "Tambah Kas Keluar", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-18 11:58:39", obyek: "KAS", noTx: "0426/KASO/UTAMA/112", keterangan: "Tambah Kas Keluar", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-17 21:35:04", obyek: "KAS", noTx: "1178/KASTR/UTAMA/112", keterangan: "Tambah Kas Transfer", status: "Sukses", user: "ELDHA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-17 21:27:46", obyek: "KAS", noTx: "1177/KASTR/UTAMA/112", keterangan: "Tambah Kas Transfer", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-17 21:27:00", obyek: "KAS", noTx: "1176/KASTR/UTAMA/112", keterangan: "Tambah Kas Transfer", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
    { tanggal: "2026-11-17 21:02:21", obyek: "KAS", noTx: "1175/KASTR/UTAMA/112", keterangan: "Tambah Kas Transfer", status: "Sukses", user: "NIWA", ip: "118.99.64.11", pc: "Desktop (Windows)" },
  ];

  const sistemData = [
    { tanggal: "2026-11-18 19:58:36", obyek: "LOGIN", keterangan: "Login Session", status: "Info", user: "ADMIN2", ip: "180.252.166.58", pc: "-" },
    { tanggal: "2026-11-18 19:33:52", obyek: "LOGIN", keterangan: "Login Standar", status: "Info", user: "DEVI", ip: "182.2.105.104", pc: "Web (Safari)" },
    { tanggal: "2026-11-18 19:20:16", obyek: "LOGOUT", keterangan: "Logout Sistem", status: "Info", user: "ADMIN", ip: "103.154.210.81", pc: "Web (Chrome)" },
    { tanggal: "2026-11-18 19:12:10", obyek: "LOGIN", keterangan: "Login Session", status: "Info", user: "ADMIN", ip: "103.154.210.81", pc: "-" },
    { tanggal: "2026-11-18 19:10:02", obyek: "LOGIN", keterangan: "Login Standar", status: "Info", user: "ADMIN", ip: "103.154.210.81", pc: "Web (Chrome)" },
    { tanggal: "2026-11-18 18:58:41", obyek: "LOGIN", keterangan: "Login Session", status: "Info", user: "ADMIN2", ip: "180.252.166.58", pc: "-" },
    { tanggal: "2026-11-18 09:03:52", obyek: "DAFTAR USER", keterangan: "EDIT USER", status: "Sukses", user: "ADMIN2", ip: "103.154.210.81", pc: "Web (Edge)" },
  ];

  const autoPatchData = [
    { tgl: "2026-10-05 14:11:12", patchNum: 347, message: "", status: "OK" },
    { tgl: "2026-10-05 14:11:12", patchNum: 346, message: "", status: "OK" },
    { tgl: "2026-07-28 13:52:25", patchNum: 342, message: "", status: "OK" },
    { tgl: "2026-07-28 13:52:25", patchNum: 343, message: "", status: "OK" },
    { tgl: "2026-07-28 13:52:25", patchNum: 344, message: "", status: "OK" },
    { tgl: "2026-07-28 13:52:25", patchNum: 340, message: "", status: "OK" },
    { tgl: "2026-07-28 13:52:25", patchNum: 341, message: "", status: "OK" },
    { tgl: "2026-07-28 13:52:25", patchNum: 345, message: "", status: "OK" },
    { tgl: "2026-07-17 13:12:24", patchNum: 339, message: "", status: "OK" },
    { tgl: "2026-05-16 14:06:00", patchNum: 338, message: "", status: "OK" },
    { tgl: "2026-03-24 17:21:45", patchNum: 334, message: "ERROR: insert or update on table \"tbl_perksetting\" violates foreign key constraint \"tbl_perksetting_kantor\" DETAIL: Key (acckantor)=(UTM) is not present in table \"tbl_kantor\".", status: "Gagal" },
    { tgl: "2026-03-24 17:21:45", patchNum: 335, message: "", status: "OK" },
    { tgl: "2026-03-24 17:21:45", patchNum: 336, message: "", status: "OK" },
    { tgl: "2026-03-24 17:21:44", patchNum: 323, message: "", status: "OK" },
  ];

  const filteredTransaksi = useMemo(() => {
    if (!keyword.trim()) return transaksiData;
    const q = keyword.toLowerCase();
    return transaksiData.filter((r) => r.noTx.toLowerCase().includes(q) || r.user.toLowerCase().includes(q));
  }, [keyword, transaksiData]);

  const filteredMaster = useMemo(() => {
    if (!keyword.trim()) return masterData;
    const q = keyword.toLowerCase();
    return masterData.filter((r) => r.kode.toLowerCase().includes(q) || r.user.toLowerCase().includes(q));
  }, [keyword, masterData]);

  const filteredAkuntansi = useMemo(() => {
    if (!keyword.trim()) return akuntansiData;
    const q = keyword.toLowerCase();
    return akuntansiData.filter((r) => r.noTx.toLowerCase().includes(q) || r.user.toLowerCase().includes(q));
  }, [keyword, akuntansiData]);

  const filteredSistem = useMemo(() => {
    if (!keyword.trim()) return sistemData;
    const q = keyword.toLowerCase();
    return sistemData.filter((r) => r.obyek.toLowerCase().includes(q) || r.user.toLowerCase().includes(q));
  }, [keyword, sistemData]);

  const totalPages =
    activeTab === "Transaksi"
      ? 119
      : activeTab === "Master"
      ? 3
      : activeTab === "Akuntansi"
      ? 3
      : activeTab === "Sistem"
      ? 6
      : activeTab === "Auto Patch"
      ? 11
      : 0;

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs select-none">
      {/* SUB-HEADER / TITLE BAR */}
      <div className="h-10 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-800 flex items-center text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="font-semibold text-sm text-slate-800">Log Aktivitas</span>
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

      {/* CONTENT */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col min-h-0">
        {/* AMBER NOTICE BOX */}
        <div className="p-2.5 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 space-y-0.5 shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>PENTING :</span>
          </div>
          <p className="text-slate-700 pl-5">
            Data Log Aktivitas Untuk Kedepannya akan hanya bisa di lihat untuk data per 6 bulan kebelakang, di atas 6 bulan dianggap kadaluarsa dan akan terhapus otomatis oleh sistem ketoko.
          </p>
        </div>

        {/* FILTER BAR */}
        <div className="grid grid-cols-12 gap-3 items-center shrink-0">
          <div className="col-span-5 flex items-center gap-2">
            <span className="text-[11px] text-slate-600 whitespace-nowrap">Kata Kunci :</span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="col-span-3 flex items-center gap-2">
            <span className="text-[11px] text-slate-600 whitespace-nowrap">Dari Tgl :</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="col-span-3 flex items-center gap-2">
            <span className="text-[11px] text-slate-600 whitespace-nowrap">s/d :</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="col-span-1 flex items-center justify-end gap-1">
            <button className="h-7 px-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-sky-600" />
            </button>
          </div>
        </div>

        {/* TABS HEADER */}
        <div className="flex items-center border-b border-slate-300 shrink-0">
          {(["Transaksi", "Master", "Akuntansi", "Impor", "Sistem", "Auto Patch"] as LogTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-4 py-1.5 text-xs font-semibold border-t border-l border-r rounded-t transition ${
                  activeTab === tab
                    ? "bg-white text-slate-900 border-slate-300 -mb-px border-b-white"
                    : "bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* TAB TABLE */}
        <div className="flex-1 min-h-0 border border-slate-300 rounded bg-white overflow-auto shadow-2xs">
          {/* TAB 1: Transaksi */}
          {activeTab === "Transaksi" && (
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Obyek</th>
                  <th className="py-2 px-3 border-r border-slate-200">No Transaksi</th>
                  <th className="py-2 px-3 border-r border-slate-200">Keterangan</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Status</th>
                  <th className="py-2 px-3 border-r border-slate-200">User</th>
                  <th className="py-2 px-3 border-r border-slate-200">IP Address</th>
                  <th className="py-2 px-3">Komputer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransaksi.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">{row.tanggal}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        {row.obyek}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-sky-600 cursor-pointer hover:underline">
                      {row.noTx}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-800">{row.keterangan}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800">{row.user}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">{row.ip}</td>
                    <td className="py-1.5 px-3 text-slate-600">{row.pc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: Master */}
          {activeTab === "Master" && (
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Kode</th>
                  <th className="py-2 px-3 border-r border-slate-200">Keterangan</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Status</th>
                  <th className="py-2 px-3 border-r border-slate-200">User</th>
                  <th className="py-2 px-3 border-r border-slate-200">IP Address</th>
                  <th className="py-2 px-3">Komputer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMaster.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">{row.tanggal}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-medium font-mono">
                        {row.kode}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-800">{row.keterangan}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800">{row.user}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">{row.ip}</td>
                    <td className="py-1.5 px-3 text-slate-600">{row.pc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: Akuntansi */}
          {activeTab === "Akuntansi" && (
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Obyek</th>
                  <th className="py-2 px-3 border-r border-slate-200">No Transaksi</th>
                  <th className="py-2 px-3 border-r border-slate-200">Keterangan</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Status</th>
                  <th className="py-2 px-3 border-r border-slate-200">User</th>
                  <th className="py-2 px-3 border-r border-slate-200">IP Address</th>
                  <th className="py-2 px-3">Komputer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAkuntansi.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">{row.tanggal}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[9px] font-bold">
                        {row.obyek}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-sky-600 cursor-pointer hover:underline">
                      {row.noTx}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-800">{row.keterangan}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800">{row.user}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">{row.ip}</td>
                    <td className="py-1.5 px-3 text-slate-600">{row.pc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 4: Impor */}
          {activeTab === "Impor" && (
            <div className="flex flex-col h-full">
              <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                    <th className="py-2 px-3 border-r border-slate-200">Obyek</th>
                    <th className="py-2 px-3 border-r border-slate-200">Keterangan</th>
                    <th className="py-2 px-3 border-r border-slate-200">Status</th>
                    <th className="py-2 px-3 border-r border-slate-200">User</th>
                    <th className="py-2 px-3 border-r border-slate-200">IP Address</th>
                    <th className="py-2 px-3">Komputer</th>
                  </tr>
                </thead>
              </table>
              <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-xs">
                No data
              </div>
            </div>
          )}

          {/* TAB 5: Sistem */}
          {activeTab === "Sistem" && (
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Obyek</th>
                  <th className="py-2 px-3 border-r border-slate-200">Keterangan</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Status</th>
                  <th className="py-2 px-3 border-r border-slate-200">User</th>
                  <th className="py-2 px-3 border-r border-slate-200">IP Address</th>
                  <th className="py-2 px-3">Komputer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSistem.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">{row.tanggal}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[9px] font-bold">
                        {row.obyek}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-800">{row.keterangan}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-white text-[9px] font-bold ${
                          row.status === "Sukses" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800">{row.user}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600">{row.ip}</td>
                    <td className="py-1.5 px-3 text-slate-600">{row.pc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 6: Auto Patch */}
          {activeTab === "Auto Patch" && (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200 w-44">TglPch</th>
                  <th className="py-2 px-3 border-r border-slate-200 w-24 text-center">Patch Num</th>
                  <th className="py-2 px-3 border-r border-slate-200">Message</th>
                  <th className="py-2 px-3 w-20 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {autoPatchData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                      {row.tgl}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono text-sky-600 font-semibold cursor-pointer hover:underline">
                      {row.patchNum}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 text-slate-800 text-[10px] font-mono leading-tight">
                      {row.message}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-white text-[9px] font-bold ${
                          row.status === "OK" ? "bg-cyan-600" : "bg-rose-500"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BOTTOM PAGINATION & ACTIONS */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-slate-700">
              Hal {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeTab === "Transaksi" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded shadow-2xs font-medium"
              >
                Restore
              </button>
              <button
                type="button"
                className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded shadow-2xs font-medium"
              >
                Restore Nomor Baru
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
