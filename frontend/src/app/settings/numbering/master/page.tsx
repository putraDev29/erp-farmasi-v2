"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, ChevronLeft, Bell, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface MasterFormatItem {
  id: string;
  doc_type: string;
  label: string;
  prefix: string;
  separator: string;
  segment3: string;
  digit_cnt: number;
  last_number: number;
}

const DEFAULT_MASTER_ROWS: MasterFormatItem[] = [
  { id: "supp", doc_type: "SUPP", label: "Format No Supplier :", prefix: "SP", separator: "-", segment3: "[CNT]", digit_cnt: 4, last_number: 1 },
  { id: "cust", doc_type: "CUST", label: "Format No Pelanggan :", prefix: "PL", separator: "-", segment3: "[CNT]", digit_cnt: 4, last_number: 13 },
  { id: "sales", doc_type: "SALES", label: "Format No Sales :", prefix: "SL", separator: "-", segment3: "[CNT]", digit_cnt: 4, last_number: 6 },
  { id: "asset", doc_type: "ASSET", label: "Format No Aset :", prefix: "", separator: "-", segment3: "", digit_cnt: 0, last_number: 0 },
  { id: "item", doc_type: "ITEM", label: "Format No Item :", prefix: "IT", separator: "-", segment3: "[CNT]", digit_cnt: 4, last_number: 7 },
];

export default function SettingNomorMasterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<MasterFormatItem[]>(DEFAULT_MASTER_ROWS);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: formats = [] } = useQuery({
    queryKey: ["numbering-master"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/numbering?category=master");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (formats.length > 0) {
      setRows((prev) =>
        prev.map((r) => {
          const found = formats.find((f: any) => f.doc_type === r.doc_type);
          if (found) {
            return {
              ...r,
              prefix: found.prefix || r.prefix,
              digit_cnt: found.counter_length || r.digit_cnt,
              last_number: found.current_number || r.last_number,
            };
          }
          return r;
        })
      );
    }
  }, [formats]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save all rows
      for (const r of rows) {
        const found = formats.find((f: any) => f.doc_type === r.doc_type);
        if (found) {
          await api.put(`/settings/numbering/${found.id}`, {
            prefix: r.prefix,
            counter_length: Number(r.digit_cnt),
            current_number: Number(r.last_number),
            suffix: "",
            reset_period: "NEVER",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["numbering-master"] });
      setToastMsg("Pengaturan nomor master berhasil disimpan!");
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: () => {
      setToastMsg("Gagal menyimpan pengaturan nomor master.");
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  const handleChange = (index: number, field: keyof MasterFormatItem, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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
            <span className="font-semibold text-sm text-slate-800">Setting Nomor Master</span>
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
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="space-y-4 max-w-6xl">
          {rows.map((row, idx) => (
            <div key={row.id} className="space-y-1">
              <label className="block text-[11px] font-normal text-slate-700">
                {row.label}
              </label>
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* Segment 1: Prefix */}
                <div className="col-span-3">
                  <select
                    value={row.prefix}
                    onChange={(e) => handleChange(idx, "prefix", e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select..</option>
                    {row.prefix && <option value={row.prefix}>{row.prefix}</option>}
                    <option value="SP">SP</option>
                    <option value="PL">PL</option>
                    <option value="SL">SL</option>
                    <option value="IT">IT</option>
                    <option value="AST">AST</option>
                  </select>
                </div>

                {/* Segment 2: Separator */}
                <div className="col-span-2">
                  <select
                    value={row.separator}
                    onChange={(e) => handleChange(idx, "separator", e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select..</option>
                    <option value="-">-</option>
                    <option value="/">/</option>
                    <option value=".">.</option>
                  </select>
                </div>

                {/* Segment 3: Count tag */}
                <div className="col-span-2">
                  <select
                    value={row.segment3}
                    onChange={(e) => handleChange(idx, "segment3", e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select..</option>
                    <option value="[CNT]">[CNT]</option>
                  </select>
                </div>

                {/* Digit CNT */}
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 whitespace-nowrap">Digit CNT :</span>
                  <input
                    type="number"
                    value={row.digit_cnt}
                    onChange={(e) => handleChange(idx, "digit_cnt", Number(e.target.value))}
                    min={0}
                    max={10}
                    className="w-16 h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-800 text-center focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* No Terakhir */}
                <div className="col-span-3 flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 whitespace-nowrap">No Terakhir :</span>
                  <input
                    type="number"
                    value={row.last_number}
                    onChange={(e) => handleChange(idx, "last_number", Number(e.target.value))}
                    min={0}
                    className="w-24 h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 text-left focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM ACTION */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
