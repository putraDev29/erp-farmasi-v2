"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronLeft, Check, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function CompanySettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form fields matching Screenshot 3
  const [companyName, setCompanyName] = useState("APOTEK BERKAT PURNAMA");
  const [address1, setAddress1] = useState("JL.PURNAMA 1");
  const [address2, setAddress2] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("-");
  const [whatsapp, setWhatsapp] = useState("085158018858");
  const [email, setEmail] = useState("apotekberkat6699@gmail.com");
  const [npwp, setNpwp] = useState("-");
  const [nitku, setNitku] = useState("");
  const [pkpDate, setPkpDate] = useState("2024-04-23");
  const [maxMonthlyOmset, setMaxMonthlyOmset] = useState("Rp. 0");
  const [maxUser, setMaxUser] = useState("15");
  const [maxItem, setMaxItem] = useState("8000");

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
    }
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (company?.id) {
        await api.put(`/companies/${company.id}`, {
          name: companyName,
          address: address1,
          phone,
          email,
          tax_number: npwp,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setToastMsg("Pengaturan perusahaan berhasil disimpan!");
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: () => {
      setToastMsg("Gagal menyimpan profil perusahaan.");
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

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
            <span className="font-semibold text-sm text-slate-800">Pengaturan Perusahaan</span>
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

      {/* CONTENT FORM */}
      <div className="flex-1 p-6 overflow-y-auto space-y-3.5 max-w-4xl">
        {/* Nama Perusahaan */}
        <div>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded font-medium text-slate-800 focus:outline-none focus:border-cyan-500"
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

        {/* Whatsapp */}
        <div>
          <label className="block text-[11px] text-slate-600 mb-0.5">Whatsapp :</label>
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
          <label className="block text-[11px] text-slate-600 mb-0.5">NITKU (Nomor Identitas Tempat Kegiatan Usaha) :</label>
          <input
            type="text"
            value={nitku}
            onChange={(e) => setNitku(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Tanggal PKP */}
        <div>
          <label className="block text-[11px] text-slate-600 mb-0.5">Tanggal PKP :</label>
          <div className="relative">
            <input
              type="date"
              value={pkpDate}
              onChange={(e) => setPkpDate(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Max Omset Perbulan */}
        <div>
          <label className="block text-[11px] text-slate-600 mb-0.5">Max Omset Perbulan :</label>
          <input
            type="text"
            value={maxMonthlyOmset}
            readOnly
            className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 border-dashed rounded text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Max User */}
        <div>
          <label className="block text-[11px] text-slate-600 mb-0.5">Max User :</label>
          <input
            type="text"
            value={maxUser}
            readOnly
            className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 border-dashed rounded text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Max Item */}
        <div>
          <label className="block text-[11px] text-slate-600 mb-0.5">Max Item :</label>
          <input
            type="text"
            value={maxItem}
            readOnly
            className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 border-dashed rounded text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Logo upload and preview */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded shadow-2xs"
          >
            Pilih File Image Logo
          </button>

          {/* Logo preview matching red Apotek Berkat box in screenshot */}
          <div className="w-32 h-32 bg-red-600 rounded flex flex-col items-center justify-center p-2 text-white shadow-sm">
            <div className="text-3xl mb-1">💊</div>
            <div className="font-black text-xs tracking-wider text-center leading-tight uppercase">
              Apotek Berkat
            </div>
          </div>
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
