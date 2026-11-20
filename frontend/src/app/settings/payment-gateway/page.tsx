"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Save, ChevronLeft, Check, AlertTriangle, Send, PhoneCall } from "lucide-react";

export default function PaymentGatewayPage() {
  const router = useRouter();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [paymentOption, setPaymentOption] = useState<"manual" | "online" | "semi_online">("manual");
  const [enableEcommerce, setEnableEcommerce] = useState(false);
  const [isQrisActive, setIsQrisActive] = useState(false);

  const handleSave = () => {
    setToastMsg("Pengaturan integrasi Payment Gateway berhasil disimpan!");
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
            <span className="font-semibold text-sm text-slate-800">Pengaturan Integrasi Payment Gateway</span>
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
        {/* CARDS LIST AT TOP */}
        <div className="flex items-start gap-4">
          {/* Add Provider Card */}
          <button
            type="button"
            className="w-32 h-36 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center justify-center transition shadow-2xs group"
          >
            <div className="w-8 h-8 rounded border border-emerald-500 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-50">
              <Plus className="w-5 h-5" />
            </div>
          </button>

          {/* Ketoko QRIS MidTrans Card */}
          <div className="w-64 border border-slate-300 rounded bg-white p-3 shadow-2xs flex flex-col items-center justify-between space-y-3">
            <div className="text-[11px] font-semibold text-slate-700 text-center">
              Ketoko QRIS (Power By MidTrans)
            </div>

            {/* QRIS Logo badge */}
            <div className="flex items-center justify-center py-2">
              <span className="font-black text-2xl tracking-tighter text-slate-800 italic">
                QRIS
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-6 px-3 bg-sky-500 hover:bg-sky-600 text-white text-[11px] rounded flex items-center gap-1 font-medium shadow-2xs"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="h-6 w-6 bg-rose-500 hover:bg-rose-600 text-white rounded flex items-center justify-center shadow-2xs"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Status indicator */}
            <div className="text-[11px] text-slate-500">
              Status : <span className={isQrisActive ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                {isQrisActive ? "Aktif" : "Non Aktif"}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM TWO COLUMNS */}
        <div className="grid grid-cols-12 gap-6 items-start pt-4">
          {/* Left Column: Radio Options & Ecommerce Checkbox */}
          <div className="col-span-5 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-800 mb-2">
                Opsi Pembayaran :
              </label>
              <div className="space-y-1.5 pl-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                  <input
                    type="radio"
                    name="payment_option"
                    checked={paymentOption === "manual"}
                    onChange={() => setPaymentOption("manual")}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span>Pembayaran Manual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                  <input
                    type="radio"
                    name="payment_option"
                    checked={paymentOption === "online"}
                    onChange={() => setPaymentOption("online")}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span>Pembayaran Online</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-[11px]">
                  <input
                    type="radio"
                    name="payment_option"
                    checked={paymentOption === "semi_online"}
                    onChange={() => setPaymentOption("semi_online")}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span>Pembayaran Semi Online</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-800 mb-2">
                Aktifkan Payment gateway untuk pembayaran ecommerce :
              </label>
              <input
                type="checkbox"
                checked={enableEcommerce}
                onChange={(e) => setEnableEcommerce(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Column: Warning box & Support Contact Buttons */}
          <div className="col-span-7 space-y-3">
            <div className="p-3.5 bg-[#fff9e6] border border-[#ffe58f] rounded text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>PENTING :</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                <li>Untuk mendapatkan Client Key dan Server Key, silahkan mendaftar ke Penyedia Payment Gateway pilihan anda.</li>
                <li>Payment Gateway tidak dapat memproses transaksi dengan decimal, pastikan sebelum anda mengaktifkan fitur ini.</li>
                <li>[Khusus QRIS] Untuk integrasi silakan request ke tim support kami Email: support@ketoko.co.id, WA atau telegram</li>
                <li>[MIDTRANS &amp; QRIS] Format Nomor Transaksi Penjualan dan Kasir yang di perbolehkan : Huruf, Angka dan beberapa simbol berikut: Dash(-), Underscore(_), Dot(.)</li>
              </ol>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3 h-3 text-sky-500" />
                <span>Kontak Telegram</span>
              </button>
              <button
                type="button"
                className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded flex items-center gap-1.5 shadow-2xs"
              >
                <PhoneCall className="w-3 h-3 text-emerald-600" />
                <span>Kontak WA</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium rounded flex items-center gap-1.5 shadow-2xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
