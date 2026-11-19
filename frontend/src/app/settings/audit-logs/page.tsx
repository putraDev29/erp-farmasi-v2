"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Search, Filter, Eye, X, Loader2, Calendar } from "lucide-react";
import { api, formatDate } from "@/lib/api";

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entity, action, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entity) params.append("entity", entity);
      if (action) params.append("action", action);
      if (search) params.append("q", search);
      const res = await api.get(`/settings/audit-logs?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const totalPages = Math.ceil(logs.length / PAGE_SIZE) || 1;
  const pagedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return logs.slice(start, start + PAGE_SIZE);
  }, [logs, currentPage]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Log Aktivitas Pengguna &amp; Audit Trail BPOM</h1>
        </div>
        <div className="text-[11px] font-bold text-slate-500">
          Standar Kepatuhan: <span className="text-emerald-700">BPOM e-Farmasi &amp; CDOB</span>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0 space-y-2 overflow-hidden">
        {/* FILTER BAR */}
        <div className="bg-white rounded border border-slate-300 p-2 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Cari aktivitas atau pengguna..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-7 pl-8 pr-2.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 px-2 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Semua Entitas Modul</option>
              <option value="USER">Pengguna &amp; Hak Akses</option>
              <option value="PRODUCT">Item Obat &amp; Stok</option>
              <option value="PURCHASE">Pembelian &amp; Hutang</option>
              <option value="SALE">Penjualan &amp; Kasir</option>
              <option value="JOURNAL">Akuntansi &amp; Kas</option>
              <option value="SETTINGS">Pengaturan Sistem</option>
            </select>

            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setCurrentPage(1);
              }}
              className="h-7 px-2 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Semua Jenis Aksi</option>
              <option value="CREATE">CREATE (Tambah Data)</option>
              <option value="UPDATE">UPDATE (Ubah Data)</option>
              <option value="DELETE">DELETE (Hapus Data)</option>
              <option value="LOGIN">LOGIN (Masuk Sistem)</option>
            </select>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            Total Log: <span className="text-emerald-700">{logs.length}</span>
          </div>
        </div>

        {/* LOGS TABLE */}
        <div className="flex-1 min-h-0 bg-white rounded border border-slate-300 flex flex-col shadow-2xs overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200">Waktu Kejadian</th>
                  <th className="py-2 px-3 border-r border-slate-200">Pengguna (User)</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-center">Aksi</th>
                  <th className="py-2 px-3 border-r border-slate-200">Modul / Entitas</th>
                  <th className="py-2 px-3 border-r border-slate-200">Keterangan Aktivitas</th>
                  <th className="py-2 px-3 border-r border-slate-200">Alamat IP</th>
                  <th className="py-2 px-3 text-center w-14">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                      <span>Memuat log aktivitas...</span>
                    </td>
                  </tr>
                ) : pagedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada jejak audit yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  pagedLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-1.5 px-3 font-mono text-slate-600 border-r border-slate-200">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800 border-r border-slate-200">
                        {log.user?.full_name || log.user?.username || "Sistem"}
                      </td>
                      <td className="py-1.5 px-3 text-center border-r border-slate-200">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                            log.action === "CREATE"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.action === "UPDATE"
                              ? "bg-sky-100 text-sky-800"
                              : log.action === "DELETE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 font-bold text-slate-700 border-r border-slate-200">
                        {log.entity}
                      </td>
                      <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200 truncate max-w-xs">
                        {log.description || "-"}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-slate-500 border-r border-slate-200">
                        {log.ip_address || "127.0.0.1"}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                          title="Lihat Detail Log"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="h-8 px-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">
              Menampilkan {pagedLogs.length} dari {logs.length} catatan
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-semibold border transition ${
                    currentPage === page
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-xs text-slate-800">
                Detail Log Audit #{selectedLog.id?.substring(0, 8)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">Waktu:</span>
                  <span className="font-mono font-bold text-slate-800">{formatDate(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">User Pelaksana:</span>
                  <span className="font-bold text-slate-800">{selectedLog.user?.full_name || selectedLog.user?.username || "Sistem"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">Aksi &amp; Entitas:</span>
                  <span className="font-bold text-slate-800">{selectedLog.action} &bull; {selectedLog.entity}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px]">IP Address:</span>
                  <span className="font-mono text-slate-700">{selectedLog.ip_address || "127.0.0.1"}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block text-[10px] mb-1">Deskripsi Aktivitas:</span>
                <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
                  {selectedLog.description || "Tidak ada deskripsi rinci."}
                </p>
              </div>

              {selectedLog.old_value && (
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] mb-1">Nilai Sebelum (Old Value):</span>
                  <pre className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] font-mono overflow-auto max-h-24">
                    {selectedLog.old_value}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] mb-1">Nilai Sesudah (New Value):</span>
                  <pre className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] font-mono overflow-auto max-h-24">
                    {selectedLog.new_value}
                  </pre>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="h-7 px-4 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
