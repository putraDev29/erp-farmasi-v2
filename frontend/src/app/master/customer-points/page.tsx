"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  AlertTriangle,
  Award,
  Save,
  Eye,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Info
} from "lucide-react";
import { api } from "@/lib/api";

export default function CustomerPointsPage() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    point_type: "TIDAK_MEMAKAI",
    invoice_multiple_amount: 100000,
    collect_start_date: "2023-01-01",
    collect_end_date: "2026-12-31",
    redeem_start_date: "2023-01-01",
    redeem_end_date: "2026-12-31",
    general_customer_name: "KASIR",
    non_member_earn_points: false,
    print_note_default: "Point Transaksi : [PNT], Periode penukaran Point dari [TTD] s/d [TTS]. Kumpulkan sebanyak banyaknya dapatkan hadiahnya.",
    point_redeem_value: 100,
    point_validity_days: 30,
    show_claim_button_in_sales: false,
    print_note_voucher: "Nilai Point Nominal [PNT]. Tukarkan sebagai Voucher belanja, sampai tanggal [TBP]",
    print_note_gift: "Point Transaksi : [PNT], Periode penukaran Point dari [TTD] s/d [TTS], Kumpulkan sebanyak banyaknya dapatkan hadiahnya, Total Point : [TOP]",
  });

  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch Point Settings
  const { data: serverSetting, isLoading } = useQuery({
    queryKey: ["customer-point-settings"],
    queryFn: async () => {
      const res = await api.get("/customer-point-settings");
      return res.data?.data;
    },
  });

  useEffect(() => {
    if (serverSetting) {
      setFormData({
        point_type: serverSetting.point_type || "TIDAK_MEMAKAI",
        invoice_multiple_amount: serverSetting.invoice_multiple_amount || 100000,
        collect_start_date: serverSetting.collect_start_date || "2023-01-01",
        collect_end_date: serverSetting.collect_end_date || "2026-12-31",
        redeem_start_date: serverSetting.redeem_start_date || "2023-01-01",
        redeem_end_date: serverSetting.redeem_end_date || "2026-12-31",
        general_customer_name: serverSetting.general_customer_name || "KASIR",
        non_member_earn_points: serverSetting.non_member_earn_points || false,
        print_note_default: serverSetting.print_note_default || "",
        point_redeem_value: serverSetting.point_redeem_value || 100,
        point_validity_days: serverSetting.point_validity_days || 30,
        show_claim_button_in_sales: serverSetting.show_claim_button_in_sales || false,
        print_note_voucher: serverSetting.print_note_voucher || "",
        print_note_gift: serverSetting.print_note_gift || "",
      });
    }
  }, [serverSetting]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return await api.put("/customer-point-settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-point-settings"] });
      alert("Pengaturan point pelanggan berhasil disimpan!");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan pengaturan: " + (err.response?.data?.message || err.message));
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => window.history.back()}
          className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 tracking-tight">Point Pelanggan</h1>
      </div>

      {/* Warning Callout Banner */}
      <div className="shrink-0 bg-amber-50 border border-amber-200/80 rounded p-2 px-3 flex items-center gap-2 text-xs text-amber-800 font-medium">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>PENTING :</strong> Jangan mengubah Setting point ini apabila proses masa periode pengumpulan point sudah berjalan.
        </span>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
        {/* Tipe Poin Radio Group */}
        <div>
          <label className="block text-slate-800 font-bold mb-2">Tipe Poin :</label>
          <div className="space-y-1.5 pl-1">
            {[
              { id: "TIDAK_MEMAKAI", label: "Tidak memakai point" },
              { id: "POTONGAN", label: "Point menjadi potongan" },
              { id: "TUKAR_HADIAH", label: "Point tukar hadiah" },
              { id: "POINT_ITEM", label: "Point item" },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="point_type"
                  value={opt.id}
                  checked={formData.point_type === opt.id}
                  onChange={(e) => setFormData({ ...formData, point_type: e.target.value })}
                  className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 1 Point kelipatan faktur */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">1 Point kelipatan faktur :</label>
          <div className="md:col-span-9">
            <input
              type="number"
              value={formData.invoice_multiple_amount}
              onChange={(e) => setFormData({ ...formData, invoice_multiple_amount: Number(e.target.value) })}
              className="w-full max-w-sm h-8 px-3 rounded border border-slate-300 text-right font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Masa periode point */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Masa periode point :</label>
          <div className="md:col-span-9 flex items-center gap-2">
            <input
              type="date"
              value={formData.collect_start_date}
              onChange={(e) => setFormData({ ...formData, collect_start_date: e.target.value })}
              className="h-8 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
            <span className="text-slate-500">s/d :</span>
            <input
              type="date"
              value={formData.collect_end_date}
              onChange={(e) => setFormData({ ...formData, collect_end_date: e.target.value })}
              className="h-8 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>
        </div>

        {/* Masa tukar point */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Masa tukar point dari :</label>
          <div className="md:col-span-9 flex items-center gap-2">
            <input
              type="date"
              value={formData.redeem_start_date}
              onChange={(e) => setFormData({ ...formData, redeem_start_date: e.target.value })}
              className="h-8 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
            <span className="text-slate-500">s/d :</span>
            <input
              type="date"
              value={formData.redeem_end_date}
              onChange={(e) => setFormData({ ...formData, redeem_end_date: e.target.value })}
              className="h-8 px-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>
        </div>

        {/* Pelanggan Umum */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Pelanggan Umum :</label>
          <div className="md:col-span-9">
            <input
              type="text"
              value={formData.general_customer_name}
              onChange={(e) => setFormData({ ...formData, general_customer_name: e.target.value })}
              className="w-full max-w-sm h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Non member dapat point */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Non member dapat point :</label>
          <div className="md:col-span-9">
            <input
              type="checkbox"
              checked={formData.non_member_earn_points}
              onChange={(e) => setFormData({ ...formData, non_member_earn_points: e.target.checked })}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Keterangan saat cetak penjualan (Default) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Keterangan saat cetak penjualan :</label>
          <div className="md:col-span-9">
            <input
              type="text"
              value={formData.print_note_default}
              onChange={(e) => setFormData({ ...formData, print_note_default: e.target.value })}
              className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>
        </div>

        {/* Nilai tukar nominal per 1 point */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Nilai tukar nominal per 1 point :</label>
          <div className="md:col-span-9">
            <input
              type="number"
              step="0.01"
              value={formData.point_redeem_value}
              onChange={(e) => setFormData({ ...formData, point_redeem_value: Number(e.target.value) })}
              className="w-full max-w-xs h-8 px-3 rounded border border-slate-300 text-right font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Masa berlaku Poin setiap transaksi */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Masa berlaku Poin setiap transaksi :</label>
          <div className="md:col-span-9 flex items-center gap-2">
            <input
              type="number"
              value={formData.point_validity_days}
              onChange={(e) => setFormData({ ...formData, point_validity_days: Number(e.target.value) })}
              className="w-24 h-8 px-3 rounded border border-slate-300 text-right font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <span className="text-slate-500">Hari</span>
          </div>
        </div>

        {/* Tampil Tombol Ambil Point di Penjualan */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Tampil Tombol Ambil Point di Penjualan :</label>
          <div className="md:col-span-9">
            <input
              type="checkbox"
              checked={formData.show_claim_button_in_sales}
              onChange={(e) => setFormData({ ...formData, show_claim_button_in_sales: e.target.checked })}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Keterangan Voucher */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Keterangan saat cetak penjualan :</label>
          <div className="md:col-span-9">
            <input
              type="text"
              value={formData.print_note_voucher}
              onChange={(e) => setFormData({ ...formData, print_note_voucher: e.target.value })}
              className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>
        </div>

        {/* Keterangan Gift */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <label className="md:col-span-3 text-slate-700 font-medium">Keterangan saat cetak penjualan :</label>
          <div className="md:col-span-9">
            <input
              type="text"
              value={formData.print_note_gift}
              onChange={(e) => setFormData({ ...formData, print_note_gift: e.target.value })}
              className="w-full h-8 px-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>
        </div>

        {/* Info Legend Box */}
        <div className="bg-sky-50/60 border border-sky-200/70 rounded-lg p-3 text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-sky-900 flex items-center gap-1.5 mb-1.5">
            <Info className="w-4 h-4 text-sky-600" />
            <span>Keterangan Kode Variabel :</span>
          </div>
          <p><code className="font-mono bg-white px-1 py-0.5 rounded border border-sky-200 text-sky-700">[PNT]</code> : Point Tukar</p>
          <p><code className="font-mono bg-white px-1 py-0.5 rounded border border-sky-200 text-sky-700">[MPD]/[MPS]</code> : Masa Pengumpulan Point Dari/Sampai</p>
          <p><code className="font-mono bg-white px-1 py-0.5 rounded border border-sky-200 text-sky-700">[TTD]/[TTS]</code> : Tanggal Tukar Dari/Sampai</p>
          <p><code className="font-mono bg-white px-1 py-0.5 rounded border border-sky-200 text-sky-700">[TBP]</code> : Tanggal Berlaku Point (untuk point yang menjadi potongan/voucher)</p>
          <p><code className="font-mono bg-white px-1 py-0.5 rounded border border-sky-200 text-sky-700">[TOP]</code> : Total Point</p>
        </div>

        </div>

        {/* Action Buttons matching screenshot */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 p-2.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => alert("Fitur Saldo Awal Point terbuka")}
            className="h-8 px-4 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded shadow-xs transition"
          >
            Saldo Awal Point
          </button>

          <button
            type="button"
            onClick={() => alert("Fitur Tutup Point periode berhasil dijalankan")}
            className="h-8 px-4 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded shadow-xs transition"
          >
            Tutup Point
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="h-8 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Preview</span>
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="h-8 px-5 bg-[#009b62] hover:bg-[#008754] text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
              Preview Hasil Cetak Struk Penjualan
            </h3>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded font-mono text-xs text-slate-700 space-y-2">
              <p className="text-center font-bold">APOTEK BERKAT PURNAMA</p>
              <div className="border-b border-dashed border-slate-300 my-2" />
              <p>Pelanggan: KASIR</p>
              <p>Total Belanja: Rp 250.000</p>
              <p>Perolehan Poin: 2 Poin</p>
              <div className="border-b border-dashed border-slate-300 my-2" />
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {formData.print_note_default
                  .replace("[PNT]", "2")
                  .replace("[TTD]", formData.redeem_start_date)
                  .replace("[TTS]", formData.redeem_end_date)}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs hover:bg-slate-900 transition"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
