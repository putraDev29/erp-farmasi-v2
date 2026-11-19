"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Save, Check, AlertCircle, Loader2, MapPin, Phone, Mail, FileText } from "lucide-react";
import { api } from "@/lib/api";

export default function CompanySettingsPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [siaNumber, setSiaNumber] = useState("SIA-440/123-DINKES/2024");
  const [sipaNumber, setSipaNumber] = useState("SIPA-503/456-APJ/2024");
  const [apjName, setApjName] = useState("apt. Rahmat Hidayat, S.Farm.");
  const [receiptFooter, setReceiptFooter] = useState("Semoga Lekas Sembuh & Terima Kasih Atas Kunjungan Anda");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get("/companies");
      return res.data?.data || [];
    },
  });

  const company = companies?.[0];

  useEffect(() => {
    if (company) {
      setName(company.name || "Apotek Berkat Purnama");
      setCode(company.code || "ABP");
      setTaxNumber(company.tax_number || "01.234.567.8-901.000");
      setAddress(company.address || "Jl. Farmasi Raya No. 10, Jakarta");
      setPhone(company.phone || "021-5550192");
      setEmail(company.email || "info@apotekberkatpurnama.co.id");
    }
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (company?.id) {
        return await api.put(`/companies/${company.id}`, payload);
      }
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showToast("success", "Profil apotek & perusahaan berhasil diperbarui!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal memperbarui profil perusahaan");
    },
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      code,
      tax_number: taxNumber,
      address,
      phone,
      email,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Pengaturan Profil Perusahaan &amp; Legalitas Apotek</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saveMutation.isPending || isLoading}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Simpan Perubahan</span>
        </button>
      </div>

      <div className="flex-1 p-4 max-w-4xl space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat data apotek...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Legalitas Entitas & Izin Apotek */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>1. Identitas &amp; Legalitas Apotek (Standar BPOM &amp; Kemenkes)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Resmi Apotek / Perusahaan *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kode Perusahaan (Singkatan)</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Apoteker Penanggung Jawab (APJ)</label>
                  <input
                    type="text"
                    value={apjName}
                    onChange={(e) => setApjName(e.target.value)}
                    placeholder="apt. Nama, S.Farm."
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Izin Apotek (SIA)</label>
                  <input
                    type="text"
                    value={siaNumber}
                    onChange={(e) => setSiaNumber(e.target.value)}
                    placeholder="SIA-..."
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor SIPA APJ</label>
                  <input
                    type="text"
                    value={sipaNumber}
                    onChange={(e) => setSipaNumber(e.target.value)}
                    placeholder="SIPA-..."
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Kontak & Alamat */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>2. Kontak &amp; Alamat Operasional</span>
              </h2>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alamat Lengkap Apotek</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">NPWP Perusahaan</label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Catatan Kaki Struk Kasir */}
            <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
              <h2 className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-2">
                3. Footer / Catatan Kaki Nota Struk Kasir
              </h2>
              <div>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">Teks ini akan tercetak otomatis di bagian paling bawah struk thermal kasir POS.</p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
