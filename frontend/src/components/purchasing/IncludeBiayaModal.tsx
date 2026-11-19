"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Check, HelpCircle, Package, Truck } from "lucide-react";

interface IncludeBiayaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNominal: number;
  initialData?: {
    name: string;
    nominal: number;
    allocation: string;
    notes: string;
  };
  onSave: (data: {
    name: string;
    nominal: number;
    allocation: string;
    notes: string;
  }) => void;
  onCancel: () => void;
}

export const IncludeBiayaModal: React.FC<IncludeBiayaModalProps> = ({
  isOpen,
  onClose,
  initialNominal,
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || "Ongkos Kirim");
  const [nominalStr, setNominalStr] = useState(
    initialNominal ? initialNominal.toLocaleString("id-ID") : "0"
  );
  const [allocation, setAllocation] = useState(initialData?.allocation || "HPP");
  const [notes, setNotes] = useState(initialData?.notes || "");

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "Ongkos Kirim");
      const nom = initialData?.nominal || initialNominal || 0;
      setNominalStr(nom > 0 ? nom.toLocaleString("id-ID") : "");
      setAllocation(initialData?.allocation || "HPP");
      setNotes(initialData?.notes || "");
    }
  }, [isOpen, initialNominal, initialData]);

  if (!isOpen) return null;

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setNominalStr("");
      return;
    }
    const val = parseInt(raw, 10);
    setNominalStr(val.toLocaleString("id-ID"));
  };

  const handleSave = () => {
    const raw = nominalStr.replace(/[^0-9]/g, "");
    const nom = Number(raw) || 0;
    onSave({
      name,
      nominal: nom,
      allocation,
      notes,
    });
    onClose();
  };

  const handleClose = () => {
    onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-200" />
            <h3 className="font-bold text-sm tracking-tight">Include Biaya Tambahan</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 bg-slate-50/50">
          {/* Jenis / Nama Biaya */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Jenis / Nama Biaya :
            </label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Ongkos Kirim">Ongkos Kirim / Ekspedisi</option>
              <option value="Biaya Asuransi Pengiriman">Biaya Asuransi Pengiriman</option>
              <option value="Biaya Bongkar Muat">Biaya Bongkar Muat</option>
              <option value="Biaya Layanan & Administrasi">Biaya Layanan &amp; Administrasi</option>
              <option value="Biaya Lain-lain">Biaya Lain-lain</option>
            </select>
          </div>

          {/* Nominal Biaya (Rupiah) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Nominal Biaya (Rp) :
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                Rp
              </span>
              <input
                type="text"
                autoFocus
                placeholder="0"
                value={nominalStr}
                onChange={handleNominalChange}
                className="w-full h-8 pl-9 pr-3 border border-slate-300 rounded-lg text-xs font-mono font-bold text-right text-slate-900 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Nominal akan otomatis diformat dalam mata uang Rupiah dan ditambahkan ke Total Akhir.
            </p>
          </div>

          {/* Alokasi Biaya */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Alokasi Perhitungan Biaya :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition text-[11px] ${
                  allocation === "HPP"
                    ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="allocation"
                  value="HPP"
                  checked={allocation === "HPP"}
                  onChange={() => setAllocation("HPP")}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <span className="block">Beban ke HPP Item</span>
                  <span className="text-[9.5px] text-slate-500 font-normal">
                    Masuk ke harga pokok barang
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition text-[11px] ${
                  allocation === "NON_HPP"
                    ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="allocation"
                  value="NON_HPP"
                  checked={allocation === "NON_HPP"}
                  onChange={() => setAllocation("NON_HPP")}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <span className="block">Biaya Operasional</span>
                  <span className="text-[9.5px] text-slate-500 font-normal">
                    Dicatat sebagai beban terpisah
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Catatan / No. Resi / Keterangan :
            </label>
            <input
              type="text"
              placeholder="Contoh: JNE Trucking / Resi: JNE12345678"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan Biaya</span>
          </button>
        </div>
      </div>
    </div>
  );
};
