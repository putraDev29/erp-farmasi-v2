"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ChevronLeft,
  Check,
  Upload,
  Trash2,
  FileCheck,
  Stamp,
  PenTool,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, resolveAssetUrl } from "@/lib/api";

export default function CompanySettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form fields matching Screenshot 3 & Company profile
  const [companyName, setCompanyName] = useState("PT BERKAT JAYA PHARMA");
  const [address1, setAddress1] = useState("Jl. Karya Baru No. 43 Pontianak Selatan");
  const [address2, setAddress2] = useState("");
  const [phone, setPhone] = useState("0561-572028");
  const [fax, setFax] = useState("0561-572028");
  const [whatsapp, setWhatsapp] = useState("08124984426");
  const [email, setEmail] = useState("BerkatJP@gmail.com");
  const [npwp, setNpwp] = useState("63.957.195.7.701.00");
  const [nitku, setNitku] = useState("");
  const [pkpDate, setPkpDate] = useState("2024-04-23");
  const [maxMonthlyOmset, setMaxMonthlyOmset] = useState("Rp. 0");
  const [maxUser, setMaxUser] = useState("15");
  const [maxItem, setMaxItem] = useState("8000");

  // Assets & APJ Legal settings
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [stampUrl, setStampUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [apjName, setApjName] = useState<string>("apt. Rahmat Hidayat, S.Farm.");
  const [apjSipa, setApjSipa] = useState<string>("19920101/SIPA_61.71/2022/2048");
  const [apjPhone, setApjPhone] = useState<string>("08124984426");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      try {
        const res = await api.get("/companies");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const company = companies[0];

  useEffect(() => {
    if (company) {
      if (company.name) setCompanyName(company.name);
      if (company.address) setAddress1(company.address);
      if (company.phone) setPhone(company.phone);
      if (company.email) setEmail(company.email);
      if (company.tax_number) setNpwp(company.tax_number);
      if (company.logo_url) setLogoUrl(company.logo_url);
      if (company.stamp_url) setStampUrl(company.stamp_url);
      if (company.signature_url) setSignatureUrl(company.signature_url);
      if (company.apj_name) setApjName(company.apj_name);
      if (company.apj_sipa) setApjSipa(company.apj_sipa);
      if (company.apj_phone) setApjPhone(company.apj_phone);
    }
  }, [company]);

  const handleFileUpload = async (file: File, type: "stamp" | "signature" | "logo") => {
    // 1. Immediate local data URL for instant zero-latency visual feedback
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (type === "stamp") setStampUrl(dataUrl);
      if (type === "signature") setSignatureUrl(dataUrl);
      if (type === "logo") setLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    // 2. Upload to backend server
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/companies/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.data?.url) {
        const serverUrl = res.data.data.url;
        if (type === "stamp") setStampUrl(serverUrl);
        if (type === "signature") setSignatureUrl(serverUrl);
        if (type === "logo") setLogoUrl(serverUrl);
      }
    } catch (err) {
      console.warn("Server upload failed, fallback to data-uri is active", err);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (company?.id) {
        await api.put(`/companies/${company.id}`, {
          name: companyName,
          address: address1,
          phone,
          email,
          tax_number: npwp,
          logo_url: logoUrl,
          stamp_url: stampUrl,
          signature_url: signatureUrl,
          apj_name: apjName,
          apj_sipa: apjSipa,
          apj_phone: apjPhone,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setToastMsg("Pengaturan perusahaan & legalitas APJ berhasil disimpan!");
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: () => {
      setToastMsg("Gagal menyimpan profil perusahaan.");
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 text-xs select-none">
      {toastMsg && (
        <div className="fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 animate-in fade-in">
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
            <span className="font-semibold text-sm text-slate-800">Pengaturan Perusahaan</span>
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">{companyName} [UTAMA]</span>
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

      {/* CONTENT FORM */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-5xl">
        {/* Hidden File Inputs */}
        <input
          ref={stampInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f, "stamp");
          }}
        />
        <input
          ref={signatureInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f, "signature");
          }}
        />
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f, "logo");
          }}
        />

        {/* 1. INFORMASI UMUM PERUSAHAAN */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3.5">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>Profil Perusahaan / Apotek</span>
          </h3>

          {/* Nama Perusahaan */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Nama Perusahaan :</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Alamat 1 */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-0.5">Alamat 1 :</label>
            <input
              type="text"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Alamat 2 */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-0.5">Alamat 2 :</label>
            <input
              type="text"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Telephone */}
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Telephone :</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Fax */}
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Fax :</label>
              <input
                type="text"
                value={fax}
                onChange={(e) => setFax(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Whatsapp Perusahaan */}
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Whatsapp Kantor :</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Email :</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* NPWP */}
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">NPWP :</label>
              <input
                type="text"
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* NITKU */}
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">NITKU :</label>
              <input
                type="text"
                value={nitku}
                onChange={(e) => setNitku(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* 2. PENGATURAN LEGALITAS APJ, STEMPEL & TANDA TANGAN (Surat Pesanan & Faktur) */}
        <div className="bg-white rounded-lg border-2 border-emerald-500/40 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Legalitas APJ, Stempel & Tanda Tangan Digital
                </h3>
                <p className="text-[11px] text-slate-500">
                  Stempel dan Tanda Tangan ini otomatis dicetak pada Surat Pesanan (SP) dan Faktur Pembayaran.
                </p>
              </div>
            </div>
          </div>

          {/* Form APJ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Nama Apoteker Penanggung Jawab (APJ) :
              </label>
              <input
                type="text"
                value={apjName}
                placeholder="Contoh: apt. Rahmat Hidayat, S.Farm."
                onChange={(e) => setApjName(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Nomor SIPA APJ :
              </label>
              <input
                type="text"
                value={apjSipa}
                placeholder="Contoh: 19920101/SIPA_61.71/2022/2048"
                onChange={(e) => setApjSipa(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                No. WhatsApp APJ :
              </label>
              <input
                type="text"
                value={apjPhone}
                placeholder="Contoh: 08124984426"
                onChange={(e) => setApjPhone(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Box Upload Stempel */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <Stamp className="w-4 h-4 text-rose-600" />
                    <span>Stempel Apotek / Perusahaan</span>
                  </div>
                  {stampUrl && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">
                      Terunggah
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Format PNG/JPG transparan direkomendasikan agar menimpa tanda tangan secara natural.
                </p>

                {/* Stamp Preview Area */}
                <div className="h-28 bg-white border border-dashed border-slate-300 rounded flex items-center justify-center p-2 relative overflow-hidden">
                  {stampUrl ? (
                    <img
                      src={resolveAssetUrl(stampUrl)}
                      alt="Stempel Preview"
                      className="max-h-full max-w-full object-contain rotate-[-4deg]"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Stamp className="w-8 h-8 mx-auto opacity-30 mb-1" />
                      <span className="text-[11px]">Belum ada stempel diunggah</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => stampInputRef.current?.click()}
                  className="flex-1 h-7 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded flex items-center justify-center gap-1.5 text-[11px] shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>{stampUrl ? "Ganti Stempel" : "Unggah Stempel"}</span>
                </button>
                {stampUrl && (
                  <button
                    type="button"
                    onClick={() => setStampUrl("")}
                    className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded flex items-center justify-center text-[11px]"
                    title="Hapus Stempel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Box Upload Tanda Tangan APJ */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    <span>Tanda Tangan APJ</span>
                  </div>
                  {signatureUrl && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">
                      Terunggah
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Format PNG transparan direkomendasikan agar tanda tangan menyatu rapi dengan cap stempel.
                </p>

                {/* Signature Preview Area */}
                <div className="h-28 bg-white border border-dashed border-slate-300 rounded flex items-center justify-center p-2 relative overflow-hidden">
                  {signatureUrl ? (
                    <img
                      src={resolveAssetUrl(signatureUrl)}
                      alt="Tanda Tangan Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <PenTool className="w-8 h-8 mx-auto opacity-30 mb-1" />
                      <span className="text-[11px]">Belum ada tanda tangan diunggah</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => signatureInputRef.current?.click()}
                  className="flex-1 h-7 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded flex items-center justify-center gap-1.5 text-[11px] shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>{signatureUrl ? "Ganti Tanda Tangan" : "Unggah Tanda Tangan"}</span>
                </button>
                {signatureUrl && (
                  <button
                    type="button"
                    onClick={() => setSignatureUrl("")}
                    className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded flex items-center justify-center text-[11px]"
                    title="Hapus Tanda Tangan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Preview Box matching Dokumen SP */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 mb-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Pratinjau Posisi Cetak pada Surat Pesanan (SP)</span>
            </div>
            <div className="p-4 bg-white rounded border border-slate-200 flex justify-center">
              <div className="w-64 text-center text-[10.5px] leading-tight flex flex-col items-center bg-slate-50/50 p-3 rounded border border-slate-200 shadow-2xs">
                <p className="font-semibold text-slate-800">Pemesan,</p>
                <p className="font-semibold text-slate-800">Penanggung Jawab</p>

                {/* Watermark / Stamp Space */}
                <div className="relative h-20 w-44 my-1 flex items-center justify-center">
                  {/* Stamp */}
                  {stampUrl ? (
                    <img
                      src={resolveAssetUrl(stampUrl)}
                      alt="Stempel Apotek"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none opacity-85 rotate-[-5deg]"
                    />
                  ) : (
                    <div className="absolute inset-0 border-2 border-dashed border-red-500/30 rounded-lg flex flex-col items-center justify-center text-red-600/40 font-bold select-none rotate-[-6deg]">
                      <span className="text-[9px] uppercase tracking-wider">PT. BERKAT JAYA PHARMA</span>
                      <span className="text-[8px]">APOTEK & PBF</span>
                    </div>
                  )}

                  {/* Signature */}
                  {signatureUrl ? (
                    <img
                      src={resolveAssetUrl(signatureUrl)}
                      alt="Tanda Tangan APJ"
                      className="relative z-10 w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <svg className="w-36 h-14 text-blue-900 z-10" viewBox="0 0 150 60" fill="none">
                      <path
                        d="M20 45C35 25 45 10 55 25C65 40 45 55 70 30C90 10 105 20 120 40C125 45 130 35 140 25"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>

                <p className="font-bold underline text-slate-900 text-xs">
                  {apjName || "apt. Rahmat Hidayat, S.Farm."}
                </p>
                <p className="text-[9.5px] text-slate-700 font-mono mt-0.5">
                  SIPA: {apjSipa || "19920101/SIPA_61.71/2022/2048"}
                </p>
                <p className="text-[9.5px] text-slate-700 font-mono">
                  WA: {apjPhone || "08124984426"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION */}
        <div className="pt-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded flex items-center gap-2 shadow-sm transition disabled:opacity-50 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
