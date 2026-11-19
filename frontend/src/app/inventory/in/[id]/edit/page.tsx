"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Trash2,
  Printer,
  ChevronLeft as BackIcon,
  AlertCircle,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function EditItemInPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: entry, isLoading } = useQuery({
    queryKey: ["item-entry", id],
    queryFn: async () => {
      const res = await api.get(`/inventory/item-entries/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  React.useEffect(() => {
    if (entry) {
      setNotes(entry.notes || "");
      setAccountCode(entry.account_code || "5-2201 - ITEM MASUK");
    }
  }, [entry]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.put(`/inventory/item-entries/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-entries"] });
      router.push("/inventory/in");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui item masuk");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      notes,
      account_code: accountCode,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Memuat data item masuk...</div>;
  }

  const items = entry?.items || [];
  const totalItemsCount = items.reduce((acc: number, it: any) => acc + (Number(it.qty) || 0), 0);
  const subTotalAmount = items.reduce(
    (acc: number, it: any) => acc + (Number(it.qty) || 0) * (Number(it.unit_price) || 0),
    0
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Ubah Item Masuk ({entry?.doc_no})
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. FORM FIELDS */}
      <div className="shrink-0 bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-2 text-[11px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="w-28 text-slate-600 font-semibold">No Transaksi :</label>
              <input
                type="text"
                disabled
                value={entry?.doc_no || ""}
                className="flex-1 h-6 px-2 border border-slate-300 rounded bg-slate-50 text-[11px] text-slate-700 font-medium"
              />
            </div>
            <div className="flex items-center">
              <label className="w-28 text-slate-600 font-semibold">Masuk Ke :</label>
              <input
                type="text"
                disabled
                value={entry?.warehouse?.name || "UTAMA - APOTEK BERKAT"}
                className="flex-1 h-6 px-2 border border-slate-300 rounded bg-slate-50 text-[11px] text-slate-700 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="w-28 text-slate-600 font-semibold">Tanggal :</label>
              <input
                type="text"
                disabled
                value={formatDate(entry?.date)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded bg-slate-50 text-[11px] text-slate-700 font-medium"
              />
            </div>
            <div className="flex items-center">
              <label className="w-28 text-slate-600 font-semibold">Kode Akun :</label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                className="flex-1 h-6 px-2 border border-slate-300 rounded text-[11px] bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. ITEM TABLE */}
      <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded overflow-auto shadow-2xs">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold">
              <th className="py-1 px-2 border-r border-slate-200 text-center w-10">No</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Kode</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-1 px-2.5 border-r border-slate-200">Merek</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right w-24">Jumlah</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-center w-20">Satuan</th>
              <th className="py-1 px-2.5 border-r border-slate-200 text-right w-28">Harga</th>
              <th className="py-1 px-2.5 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => {
              const total = (Number(it.qty) || 0) * (Number(it.unit_price) || 0);
              return (
                <tr key={it.id || idx} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-1 px-2 border-r border-slate-200 text-center text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                    {it.product_code || it.product?.code}
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                    {it.product_name || it.product?.name}
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-200 text-slate-600">
                    {it.brand || "-"}
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-200 text-right font-medium text-slate-800">
                    {(it.qty || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-200 text-center text-slate-600">
                    {it.unit_name || "PCS"}
                  </td>
                  <td className="py-1 px-2.5 border-r border-slate-200 text-right text-slate-700">
                    {formatCurrency(it.unit_price || 0)}
                  </td>
                  <td className="py-1 px-2.5 text-right font-medium text-slate-800">
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. SUMMARY BAR */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-600 font-semibold">Keterangan :</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-6 w-80 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">Item :</span>
            <span className="font-bold text-slate-800 border border-dashed border-slate-300 px-2 py-0.5 rounded bg-slate-50">
              {totalItemsCount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">Sub Total :</span>
            <span className="font-bold text-emerald-700 border border-dashed border-slate-300 px-2 py-0.5 rounded bg-slate-50">
              {formatCurrency(subTotalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM TOOLBAR */}
      <div className="shrink-0 flex items-center gap-1.5 pt-1 border-t border-slate-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="h-6 px-3 bg-[#3b82f6] hover:bg-blue-600 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/inventory/in")}
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <span>Kembali</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>
      </div>
    </div>
  );
}
