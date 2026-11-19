"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Save,
  RotateCcw,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { api } from "@/lib/api";

type TabType = "Data Item" | "Pembelian" | "Penjualan" | "Hutang Piutang" | "Lain Lain";

interface SettingField {
  key: string;
  label: string;
  defaultCodePrefix?: string;
}

const TAB_FIELDS: Record<TabType, { section?: string; fields: SettingField[] }[]> = {
  "Data Item": [
    {
      section: "Data Akun Item & HPP",
      fields: [
        { key: "item_hpp", label: "HPP :", defaultCodePrefix: "5-1" },
        { key: "item_sales_income", label: "Pendapatan Jual :", defaultCodePrefix: "4-1" },
        { key: "item_service_income", label: "Pendapatan Jasa :", defaultCodePrefix: "4-1" },
        { key: "item_inventory", label: "Persediaan :", defaultCodePrefix: "1-2" },
        { key: "item_non_inventory", label: "Non Inventory :", defaultCodePrefix: "5-2" },
        { key: "item_wip", label: "Persediaan Dalam Proses :", defaultCodePrefix: "1-3" },
        { key: "item_labor_cost", label: "Biaya Tenaga Kerja :", defaultCodePrefix: "6-1" },
        { key: "item_overhead_cost", label: "Biaya Over Head :", defaultCodePrefix: "6-1" },
      ],
    },
    {
      section: "Penyesuaian Persediaan",
      fields: [
        { key: "item_in", label: "Item Masuk :", defaultCodePrefix: "5-2" },
        { key: "item_out", label: "Item Keluar :", defaultCodePrefix: "5-2" },
        { key: "item_opname", label: "Item Opname :", defaultCodePrefix: "5-22" },
        { key: "item_initial_stock", label: "Saldo Awal Item :", defaultCodePrefix: "3-1" },
        { key: "item_cost_correction", label: "Koreksi Nilai Persediaan :", defaultCodePrefix: "5-2" },
      ],
    },
  ],
  Pembelian: [
    {
      section: "Data Akun Pembelian",
      fields: [
        { key: "purch_discount", label: "Potongan :", defaultCodePrefix: "5-2" },
        { key: "purch_tax", label: "Pajak :", defaultCodePrefix: "1-14" },
        { key: "purch_other_cost", label: "Biaya Lain :", defaultCodePrefix: "5-3" },
        { key: "purch_cash_dp", label: "Pembayaran Tunai / DP :", defaultCodePrefix: "1-11" },
        { key: "purch_credit_payable", label: "Pembayaran Kredit :", defaultCodePrefix: "2-11" },
        { key: "purch_order_advance", label: "Uang Muka pd Pesanan :", defaultCodePrefix: "1-14" },
        { key: "purch_supplier_deposit", label: "Dana Deposit di Supplier :", defaultCodePrefix: "1-1141" },
      ],
    },
    {
      section: "Data Akun Pesanan Pembelian",
      fields: [
        { key: "po_advance", label: "Uang Muka :", defaultCodePrefix: "1-14" },
        { key: "po_cash_bank", label: "Kas / Bank :", defaultCodePrefix: "1-11" },
      ],
    },
    {
      section: "Data Akun Retur Pembelian",
      fields: [
        { key: "purch_return_deposit", label: "Kas / Bank / Deposit :", defaultCodePrefix: "1-11" },
        { key: "purch_return_cash", label: "Retur Tunai :", defaultCodePrefix: "1-11" },
        { key: "purch_return_credit", label: "Retur Kredit :", defaultCodePrefix: "2-11" },
        { key: "purch_return_consignment", label: "Retur Titipan :", defaultCodePrefix: "2-1111" },
        { key: "purch_return_discount", label: "Potongan :", defaultCodePrefix: "5-2" },
        { key: "purch_return_tax", label: "Pajak :", defaultCodePrefix: "1-14" },
      ],
    },
  ],
  Penjualan: [
    {
      section: "Data Akun Penjualan",
      fields: [
        { key: "sales_discount", label: "Potongan :", defaultCodePrefix: "4-2" },
        { key: "sales_tax", label: "Pajak :", defaultCodePrefix: "2-12" },
        { key: "sales_other_cost", label: "Biaya Lain :", defaultCodePrefix: "4-1" },
        { key: "sales_cash_dp", label: "Pembayaran Tunai / DP :", defaultCodePrefix: "1-11" },
        { key: "sales_debit", label: "Pembayaran Debit :", defaultCodePrefix: "1-11" },
        { key: "sales_credit_card", label: "Pembayaran Kartu Kredit :", defaultCodePrefix: "1-1220" },
        { key: "sales_emoney", label: "Pembayaran E-Money :", defaultCodePrefix: "1-122X" },
        { key: "sales_credit_receivable", label: "Pembayaran Kredit :", defaultCodePrefix: "1-1210" },
        { key: "sales_commission_pay", label: "Bayar Komisi Sales :", defaultCodePrefix: "6-1" },
        { key: "sales_commission_payable", label: "Hutang Komisi Sales :", defaultCodePrefix: "2-11" },
        { key: "sales_order_advance", label: "Uang Muka pd Pesanan :", defaultCodePrefix: "2-13" },
        { key: "sales_customer_deposit", label: "Dana Deposit di Pelanggan :", defaultCodePrefix: "2-1320" },
        { key: "sales_rounding", label: "Pembulatan :", defaultCodePrefix: "7-1" },
      ],
    },
    {
      section: "Data Akun Pesanan Penjualan",
      fields: [
        { key: "so_advance", label: "Uang Muka :", defaultCodePrefix: "2-13" },
        { key: "so_cash_bank", label: "Kas / Bank :", defaultCodePrefix: "1-11" },
      ],
    },
    {
      section: "Data Akun Retur Penjualan",
      fields: [
        { key: "sales_return_deposit", label: "Kas / Bank / Deposit :", defaultCodePrefix: "1-11" },
        { key: "sales_return_cash", label: "Retur Tunai :", defaultCodePrefix: "1-11" },
        { key: "sales_return_credit", label: "Retur Kredit :", defaultCodePrefix: "1-1210" },
        { key: "sales_return_consignment", label: "Retur Titipan :", defaultCodePrefix: "1-1211" },
        { key: "sales_return_consignment_in", label: "Titipan Masuk :", defaultCodePrefix: "1-4" },
        { key: "sales_return_consignment_out", label: "Titipan Keluar :", defaultCodePrefix: "1-4" },
        { key: "sales_return_discount", label: "Potongan :", defaultCodePrefix: "4-2" },
        { key: "sales_return_tax", label: "Pajak :", defaultCodePrefix: "2-12" },
      ],
    },
  ],
  "Hutang Piutang": [
    {
      section: "Data Akun Hutang Piutang",
      fields: [
        { key: "ap_discount", label: "Potongan Hutang :", defaultCodePrefix: "5-2" },
        { key: "ar_discount", label: "Potongan Piutang :", defaultCodePrefix: "4-2" },
        { key: "forex_gain", label: "Laba Selisih Kurs :", defaultCodePrefix: "7-1" },
        { key: "forex_loss", label: "Rugi Selisih Kurs :", defaultCodePrefix: "8-1" },
      ],
    },
  ],
  "Lain Lain": [
    {
      section: "Modal dan Laba",
      fields: [
        { key: "other_prive", label: "Prive :", defaultCodePrefix: "3-8000" },
        { key: "other_retained_earnings", label: "Laba Ditahan :", defaultCodePrefix: "3-1000" },
        { key: "other_current_year_earnings", label: "Laba Tahun Berjalan :", defaultCodePrefix: "3-3000" },
        { key: "other_historical_balancing", label: "Penyeimbang Historical :", defaultCodePrefix: "3-9000" },
        { key: "other_expense_source", label: "Biaya Lain Diambil Dari :", defaultCodePrefix: "1-1110" },
      ],
    },
    {
      section: "Data Akun Penyusutan",
      fields: [
        { key: "deprec_expense_account", label: "Biaya Penyusutan :", defaultCodePrefix: "6-5001" },
      ],
    },
  ],
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("Data Item");
  const [deptGudang, setDeptGudang] = useState("UTAMA - APOTEK BERKAT");
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  // 1. Fetch Accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  // Filter detail accounts only
  const detailAccounts = useMemo(() => {
    return accounts.filter((a: any) => !a.is_header);
  }, [accounts]);

  // 2. Fetch Server Settings
  const { data: serverSettings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["account-settings"],
    queryFn: async () => {
      const res = await api.get("/accounting/account-settings");
      return res.data?.data || [];
    },
  });

  // Sync state
  useEffect(() => {
    const map: Record<string, string> = {};
    serverSettings.forEach((s: any) => {
      if (s.key && s.account_id) {
        map[s.key] = s.account_id;
      }
    });

    // Auto default matching for unset keys
    Object.values(TAB_FIELDS).forEach((sections) => {
      sections.forEach((sec) => {
        sec.fields.forEach((f) => {
          if (!map[f.key] && f.defaultCodePrefix) {
            const match = detailAccounts.find((a: any) =>
              (a.code || "").startsWith(f.defaultCodePrefix!)
            );
            if (match) {
              map[f.key] = match.id;
            }
          }
        });
      });
    });

    setSettingsMap(map);
  }, [serverSettings, detailAccounts]);

  const handleSelectAccount = (key: string, accountId: string) => {
    setSettingsMap((prev) => ({
      ...prev,
      [key]: accountId,
    }));
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: { key: string; account_id: string; description: string }[] = [];
      Object.entries(settingsMap).forEach(([k, accId]) => {
        if (accId) {
          payload.push({
            key: k,
            account_id: accId,
            description: k,
          });
        }
      });
      return await api.post("/accounting/account-settings/batch", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-settings"] });
      alert("Pengaturan perkiraan akun berhasil disimpan.");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan pengaturan: " + (err.response?.data?.message || err.message));
    },
  });

  const tabs: TabType[] = ["Data Item", "Pembelian", "Penjualan", "Hutang Piutang", "Lain Lain"];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
      {/* 1. Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1 px-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-slate-800">Setting Perkiraan</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">33</span>
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">A</span>
          <span className="font-semibold text-slate-700">ADMIN2</span>
        </div>
      </div>

      {/* 2. Top Filter: Dept / Gudang */}
      <div className="shrink-0 flex items-center gap-2 pt-1 pb-1 px-1">
        <span className="font-semibold text-[11px] text-slate-700 min-w-[90px]">Dept / Gudang :</span>
        <select
          value={deptGudang}
          onChange={(e) => setDeptGudang(e.target.value)}
          className="border border-slate-300 rounded px-2 h-6 text-[11px] bg-white outline-none focus:border-emerald-500 font-medium min-w-[240px]"
        >
          <option value="UTAMA - APOTEK BERKAT">UTAMA - APOTEK BERKAT</option>
          <option value="CABANG B - APOTEK BERKAT">CABANG B - APOTEK BERKAT</option>
          <option value="CABANG C - APOTEK BERKAT">CABANG C - APOTEK BERKAT</option>
        </select>
      </div>

      {/* 3. Tab Bar */}
      <div className="shrink-0 flex border-b border-slate-300 bg-slate-100/80 px-1 pt-1 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[11px] font-semibold transition border-t border-l border-r rounded-t ${
                isActive
                  ? "bg-white border-slate-300 border-b-white text-emerald-800 -mb-[1px] z-10 shadow-2xs"
                  : "bg-slate-200/70 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content */}
      <div className="flex-1 min-h-0 border border-slate-300 rounded-b bg-white flex flex-col overflow-hidden shadow-2xs">
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {TAB_FIELDS[activeTab]?.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            {sec.section && (
              <div className="font-bold text-[11px] text-slate-800 border-b border-slate-200 pb-1">
                {sec.section}
              </div>
            )}
            {activeTab === "Lain Lain" ? (
              <div className="space-y-2 max-w-xl pt-1">
                {sec.fields.map((field) => {
                  const currentVal = settingsMap[field.key] || "";
                  return (
                    <div key={field.key} className="space-y-0.5">
                      <label className="text-[11px] text-slate-700 block">
                        {field.label}
                      </label>
                      <select
                        value={currentVal}
                        onChange={(e) => handleSelectAccount(field.key, e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 h-6 text-[11px] bg-white outline-none focus:border-emerald-500 font-medium text-slate-800"
                      >
                        <option value="">-- Pilih Akun Perkiraan --</option>
                        {detailAccounts.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 max-w-4xl pt-1">
                {sec.fields.map((field) => {
                  const currentVal = settingsMap[field.key] || "";
                  return (
                    <div key={field.key} className="flex items-center justify-between gap-2">
                      <label className="text-[11px] text-slate-700 min-w-[170px] truncate">
                        {field.label}
                      </label>
                      <select
                        value={currentVal}
                        onChange={(e) => handleSelectAccount(field.key, e.target.value)}
                        className="border border-slate-300 rounded px-1.5 h-6 text-[11px] bg-white outline-none focus:border-emerald-500 w-full max-w-[280px] font-medium text-slate-800"
                      >
                        <option value="">-- Pilih Akun Perkiraan --</option>
                        {detailAccounts.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        </div>

        {/* 5. Save Button pinned at bottom */}
        <div className="shrink-0 p-2.5 border-t border-slate-200 bg-slate-50/50 flex items-center">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
