"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Edit2, Trash2, Check, ChevronLeft, Lightbulb } from "lucide-react";

export default function MarketplacePage() {
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleVerify = () => {
    setToastMsg("Membuka otentikasi verifikasi akun marketplace...");
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
            <span className="font-semibold text-sm text-slate-800">
              Pengaturan Integrasi Marketplace (Omnichannel)
            </span>
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
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* TOP CHANNELS CARDS */}
        <div className="flex items-start gap-4">
          {/* Add Channel Button Card */}
          <button
            type="button"
            className="w-32 h-36 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center justify-center transition shadow-2xs group"
          >
            <div className="w-8 h-8 rounded border border-emerald-500 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-50">
              <Plus className="w-5 h-5" />
            </div>
          </button>

          {/* Connected Shopee Card */}
          <div className="w-44 border border-slate-300 rounded bg-white p-3 shadow-2xs flex flex-col items-center justify-between space-y-2.5">
            {/* Top 3 action icons */}
            <div className="flex items-center justify-center gap-1.5 w-full">
              <button className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center shadow-2xs">
                <MessageSquare className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 bg-sky-500 hover:bg-sky-600 text-white rounded flex items-center justify-center shadow-2xs">
                <Edit2 className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded flex items-center justify-center shadow-2xs">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Shop Name */}
            <div className="text-[11px] font-semibold text-slate-800 truncate max-w-full text-center">
              goldhoney online st...
            </div>

            {/* Shopee logo icon */}
            <div className="w-10 h-10 bg-[#ee4d2d] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-xs">
              S
            </div>

            {/* Verify button */}
            <button
              onClick={handleVerify}
              type="button"
              className="w-full h-6 px-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] rounded flex items-center justify-center gap-1 shadow-2xs"
            >
              <Check className="w-3 h-3 text-slate-600" />
              <span>Verify</span>
            </button>
          </div>
        </div>

        {/* INSTRUCTIONS BOX (matching Ketoko blue instructions card) */}
        <div className="p-4 bg-[#f0f5ff] border border-[#d6e4ff] rounded text-[11px] text-slate-700 space-y-3 leading-relaxed shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Integrasi V2 = Tambah Item Produk Lewat Ketoko, Sync Order dan Proses Penjualan, Sync Stok Dan Harga</span>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-900">INTRUKSI REGISTRASI :</div>
            <div className="pl-2 space-y-1">
              <div className="font-semibold text-slate-800">SHOPEE &amp; LAZADA :</div>
              <ol className="list-decimal list-inside pl-2 space-y-0.5">
                <li>Tekan Tombol + Tambah pilih Shopee/Lazada lalu lengkapi data yg diminta. Lanjut tekan tombol verify lalu lakukan login ke Akun Shopee/Lazada anda pada halaman tersebut.</li>
                <li>Setelah sukses menyelesaikan prosedur verifikasi. Silahkan refresh kembali halaman ini.</li>
              </ol>

              <div className="font-semibold text-slate-800 pt-1">TOKOPEDIA X TIKTOK SHOP :</div>
              <ol className="list-decimal list-inside pl-2 space-y-0.5">
                <li>
                  Jika anda belum melakukan integrasi akun Tokopedia dengan Tiktok Shop, pelajari cara integrasinya pada link berikut:{" "}
                  <span className="text-sky-600 underline cursor-pointer">Integrasi Tokopedia x Tiktok Shop</span>
                </li>
                <li>Jika sudah memiliki akun integrasi, Tekan Tombol + Tambah pilih Tokopedia x Tiktok Shop lalu lengkapi data yg diminta. Lanjut tekan tombol verify lalu lakukan login ke Akun Tokopedia x Tiktok Shop anda pada halaman tersebut.</li>
                <li>Setelah sukses menyelesaikan prosedur verifikasi. Silahkan refresh kembali halaman ini.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="font-bold text-slate-900">INSTRUKSI SYNC DATA :</div>
            <ol className="list-decimal list-inside pl-4 space-y-0.5">
              <li>Sebagai acuan proses sync data, SKU Produk pada masing - masing Marketplace HARUS SAMA dengan SKU Produk pada aplikasi Ketoko.co.id.</li>
              <li>Proses sync data hanya akan Mensinkronisasikan Stok dan Harga di aplikasi Ketoko.co.id dengan Marketplace anda.</li>
              <li>Proses sync all dapat dilakukan saat pertama kali. Jika ingin sync per item dapat melalui menu master data -&gt; daftar item -&gt; edit item yang ingin di sync -&gt; pilih Tab Marketplace.</li>
            </ol>
          </div>

          <div className="space-y-1 pt-1">
            <div className="font-bold text-slate-900">INFO :</div>
            <ol className="list-decimal list-inside pl-4 space-y-0.5">
              <li>Cek Tipe Harga Jual berdasarkan Level pada masing - masing Item terlebih dahulu, karena jika Opsi Aktifkan Harga Gudang pada masing - masing Gudang marketplace aktif (Master Data -&gt; Data Lainnya -&gt; Dept/Gudang), maka harga item akan disesuaikan dengan opsi tersebut.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
