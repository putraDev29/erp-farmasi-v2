"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Save,
  CheckCircle2,
  Settings,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

type TabType = "Data Item" | "Pembelian" | "Penjualan" | "Hutang Piutang" | "Lain Lain";

interface SettingField {
  key: string;
  label: string;
  defaultCodePrefix?: string;
  badge?: string;
}

const TAB_FIELDS: Record<TabType, { section?: string; fields: SettingField[] }[]> = {
  "Data Item": [
    {
      section: "Akun Pokok & Persediaan",
      fields: [
        { key: "item_hpp", label: "HPP :", defaultCodePrefix: "5-1" },
        { key: "item_sales_income", label: "Pendapatan Jual :", defaultCodePrefix: "4-1" },
        { key: "item_service_income", label: "Pendapatan Jasa :", defaultCodePrefix: "4-1" },
        { key: "item_inventory", label: "Persediaan Obat :", defaultCodePrefix: "1-2" },
        { key: "item_non_inventory", label: "Non Inventory :", defaultCodePrefix: "5-2" },
        { key: "item_wip", label: "Persediaan Dalam Proses :", defaultCodePrefix: "1-3" },
        { key: "item_labor_cost", label: "Biaya Tenaga Kerja :", defaultCodePrefix: "6-1" },
        { key: "item_overhead_cost", label: "Biaya Overhead :", defaultCodePrefix: "6-1" },
      ],
    },
    {
      section: "Penyesuaian & Stock Opname",
      fields: [
        { key: "item_in", label: "Item Masuk :", defaultCodePrefix: "5-2" },
        { key: "item_out", label: "Item Keluar :", defaultCodePrefix: "5-2" },
        { key: "item_opname", label: "Selisih Opname :", defaultCodePrefix: "5-22" },
        { key: "item_initial_stock", label: "Saldo Awal :", defaultCodePrefix: "3-1" },
        { key: "item_cost_correction", label: "Koreksi Persediaan :", defaultCodePrefix: "5-2" },
      ],
    },
  ],
  Pembelian: [
    {
      section: "Transaksi Faktur Pembelian",
      fields: [
        { key: "purch_price_discount", label: "Potongan Harga Pembelian (Faktur) :", defaultCodePrefix: "5-1", badge: "Diskon Faktur" },
        { key: "purch_discount", label: "Potongan Hutang (Keringanan Hutang) :", defaultCodePrefix: "5-2100", badge: "Bayar Hutang" },
        { key: "purch_tax", label: "Pajak Masukan :", defaultCodePrefix: "1-14" },
        { key: "purch_other_cost", label: "Biaya Angkut / Lain :", defaultCodePrefix: "5-3" },
        { key: "purch_cash_dp", label: "Pembayaran Kas / Tunai :", defaultCodePrefix: "1-11" },
        { key: "purch_credit_payable", label: "Hutang Usaha (Kredit) :", defaultCodePrefix: "2-11" },
        { key: "purch_order_advance", label: "Uang Muka Pesanan :", defaultCodePrefix: "1-14" },
        { key: "purch_supplier_deposit", label: "Deposit Supplier :", defaultCodePrefix: "1-1141" },
      ],
    },
    {
      section: "Pesanan & Retur Pembelian",
      fields: [
        { key: "po_advance", label: "Uang Muka PO :", defaultCodePrefix: "1-14" },
        { key: "po_cash_bank", label: "Kas / Bank PO :", defaultCodePrefix: "1-11" },
        { key: "purch_return_deposit", label: "Retur (Kas/Deposit) :", defaultCodePrefix: "1-11" },
        { key: "purch_return_credit", label: "Retur Kredit (Potong Hutang) :", defaultCodePrefix: "2-11" },
        { key: "purch_return_discount", label: "Potongan Retur :", defaultCodePrefix: "5-2" },
        { key: "purch_return_tax", label: "Pajak Retur :", defaultCodePrefix: "1-14" },
      ],
    },
  ],
  Penjualan: [
    {
      section: "Transaksi Penjualan & Kasir",
      fields: [
        { key: "sales_price_discount", label: "Potongan Harga Penjualan (Faktur/Kasir) :", defaultCodePrefix: "4-1", badge: "Diskon Jual" },
        { key: "sales_discount", label: "Potongan Piutang (Keringanan Piutang) :", defaultCodePrefix: "4-1200", badge: "Bayar Piutang" },
        { key: "sales_tax", label: "Pajak Keluaran :", defaultCodePrefix: "2-12" },
        { key: "sales_cash_dp", label: "Pembayaran Tunai / Kasir :", defaultCodePrefix: "1-11" },
        { key: "sales_debit", label: "Pembayaran Kartu Debit :", defaultCodePrefix: "1-11" },
        { key: "sales_credit_card", label: "Pembayaran Kartu Kredit :", defaultCodePrefix: "1-1220" },
        { key: "sales_credit_receivable", label: "Piutang Usaha (Kredit) :", defaultCodePrefix: "1-1210" },
        { key: "sales_rounding", label: "Pembulatan Nilai :", defaultCodePrefix: "7-1" },
      ],
    },
    {
      section: "Pesanan & Retur Penjualan",
      fields: [
        { key: "so_advance", label: "Uang Muka SO :", defaultCodePrefix: "2-13" },
        { key: "so_cash_bank", label: "Kas / Bank SO :", defaultCodePrefix: "1-11" },
        { key: "sales_return_cash", label: "Retur Tunai :", defaultCodePrefix: "1-11" },
        { key: "sales_return_credit", label: "Retur Kredit (Potong Piutang) :", defaultCodePrefix: "1-1210" },
        { key: "sales_return_discount", label: "Potongan Retur :", defaultCodePrefix: "4-2" },
        { key: "sales_return_tax", label: "Pajak Retur :", defaultCodePrefix: "2-12" },
      ],
    },
  ],
  "Hutang Piutang": [
    {
      section: "Akun Pelunasan & Selisih Kurs",
      fields: [
        { key: "ap_discount", label: "Potongan Hutang (Keringanan Hutang) :", defaultCodePrefix: "5-2100", badge: "Bayar Hutang" },
        { key: "ar_discount", label: "Potongan Piutang (Keringanan Piutang) :", defaultCodePrefix: "4-1200", badge: "Bayar Piutang" },
        { key: "purch_price_discount", label: "Potongan Harga Beli (Faktur) :", defaultCodePrefix: "5-1100", badge: "Diskon Faktur" },
        { key: "sales_price_discount", label: "Potongan Harga Jual (Faktur) :", defaultCodePrefix: "4-1100", badge: "Diskon Faktur" },
        { key: "forex_gain", label: "Laba Selisih Kurs :", defaultCodePrefix: "7-1" },
        { key: "forex_loss", label: "Rugi Selisih Kurs :", defaultCodePrefix: "8-1" },
      ],
    },
  ],
  "Lain Lain": [
    {
      section: "Modal, Laba & Penyusutan",
      fields: [
        { key: "other_prive", label: "Prive :", defaultCodePrefix: "3-8000" },
        { key: "other_retained_earnings", label: "Laba Ditahan :", defaultCodePrefix: "3-1000" },
        { key: "other_current_year_earnings", label: "Laba Tahun Berjalan :", defaultCodePrefix: "3-3000" },
        { key: "other_historical_balancing", label: "Penyeimbang Historical :", defaultCodePrefix: "3-9000" },
        { key: "deprec_expense_account", label: "Biaya Penyusutan :", defaultCodePrefix: "6-5001" },
      ],
    },
  ],
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("Pembelian");
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  // 1. Fetch Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  const detailAccounts = useMemo(() => {
    return accounts.filter((a: any) => !a.is_header);
  }, [accounts]);

  // 2. Fetch Server Settings
  const { data: serverSettings = [] } = useQuery({
    queryKey: ["account-settings"],
    queryFn: async () => {
      const res = await api.get("/accounting/account-settings");
      return res.data?.data || [];
    },
  });

  // Map server settings
  useEffect(() => {
    const map: Record<string, string> = {};
    serverSettings.forEach((s: any) => {
      if (s.key && s.account_id) {
        map[s.key] = s.account_id;
      }
    });

    // Smart auto-fill for unconfigured keys
    (Object.keys(TAB_FIELDS) as TabType[]).forEach((tab) => {
      TAB_FIELDS[tab].forEach((sec) => {
        sec.fields.forEach((f) => {
          if (!map[f.key]) {
            if (f.key === "purch_discount" || f.key === "ap_discount") {
              const match = detailAccounts.find(
                (a: any) => a.code === "5-2100" || a.name?.toUpperCase().includes("KERINGANAN HUTANG")
              );
              if (match) {
                map[f.key] = match.id;
                return;
              }
            }
            if (f.key === "purch_price_discount") {
              const match = detailAccounts.find(
                (a: any) =>
                  a.name?.toUpperCase().includes("POTONGAN HARGA PEMBELIAN") ||
                  a.name?.toUpperCase().includes("POTONGAN PEMBELIAN") ||
                  a.code === "5-1100" ||
                  a.code === "5-1000"
              );
              if (match) {
                map[f.key] = match.id;
                return;
              }
            }
            if (f.key === "sales_discount" || f.key === "ar_discount") {
              const match = detailAccounts.find(
                (a: any) => a.code === "4-1200" || a.name?.toUpperCase().includes("KERINGANAN PIUTANG")
              );
              if (match) {
                map[f.key] = match.id;
                return;
              }
            }
            if (f.key === "sales_price_discount") {
              const match = detailAccounts.find(
                (a: any) =>
                  a.name?.toUpperCase().includes("POTONGAN HARGA PENJUALAN") ||
                  a.name?.toUpperCase().includes("POTONGAN PENJUALAN") ||
                  a.code === "4-1100" ||
                  a.code === "4-1000"
              );
              if (match) {
                map[f.key] = match.id;
                return;
              }
            }
            if (f.defaultCodePrefix) {
              const match = detailAccounts.find((a: any) =>
                (a.code || "").startsWith(f.defaultCodePrefix!)
              );
              if (match) {
                map[f.key] = match.id;
              }
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
      alert("✅ Pengaturan perkiraan akun berhasil disimpan.");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan pengaturan: " + (err.response?.data?.message || err.message));
    },
  });

  const tabs: TabType[] = ["Pembelian", "Penjualan", "Hutang Piutang", "Data Item", "Lain Lain"];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2 text-xs select-none">
      {/* 1. Header Ringkas (Simple & Tidak Memakan Tempat) */}
      <div className="shrink-0 flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
            title="Kembali"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Perkiraan Akun Otomatis</span>
            </h1>
            
          </div>
        </div>

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-7 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}</span>
        </button>
      </div>

      {/* 2. Main Box dengan Tab Segmen Ringkas */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-2xs">
        {/* Tab Pills */}
        <div className="shrink-0 flex flex-wrap items-center gap-1 p-2 bg-slate-50/80 border-b border-slate-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-white text-emerald-700 shadow-2xs border border-slate-200 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Form List Fields (Simple, Rapi, & Tidak Memakan Tempat) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {TAB_FIELDS[activeTab]?.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              {sec.section && (
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 pb-0.5 border-b border-slate-100">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span>{sec.section}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                {sec.fields.map((field) => {
                  const currentVal = settingsMap[field.key] || "";
                  return (
                    <div
                      key={field.key}
                      className="flex items-center justify-between gap-2 py-0.5 px-1 hover:bg-slate-50 rounded"
                    >
                      <label className="text-[11px] text-slate-700 flex items-center gap-1.5 truncate">
                        <span>{field.label}</span>
                        {field.badge && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            {field.badge}
                          </span>
                        )}
                      </label>
                      <div className="w-56 sm:w-64 shrink-0">
                        <SearchableAccountSelect
                          accounts={detailAccounts}
                          value={currentVal}
                          onChange={(val) => handleSelectAccount(field.key, val)}
                          placeholder="-- Pilih / Cari Akun --"
                          buttonClassName="h-6 text-[11px] font-medium"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Simple Footer Indicator */}
        <div className="shrink-0 px-3 py-1.5 border-t border-slate-100 bg-slate-50 text-[10.5px] text-slate-500 flex items-center justify-between">
          <span>* Pengaturan perkiraan akun berlaku untuk seluruh jurnal otomatis sistem.</span>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
