"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Save,
  Printer,
  RotateCcw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function InitialBalanceAccountsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [balances, setBalances] = useState<{ [id: string]: number }>({});

  // 1. Fetch Accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  // 2. Fetch Initial Balance Entries
  const { data: initialEntries = [] } = useQuery({
    queryKey: ["initial-balances-accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/initial-balances?type=ACCOUNT");
      return res.data?.data || [];
    },
  });

  // Populate balances from server data
  useEffect(() => {
    if (accounts.length > 0) {
      const map: { [id: string]: number } = {};
      accounts.forEach((acc: any) => {
        const found = initialEntries.find((e: any) => e.account_id === acc.id);
        if (found) {
          map[acc.id] = (found.debit || 0) + (found.credit || 0);
        } else {
          map[acc.id] = Math.abs(acc.balance || 0);
        }
      });
      setBalances(map);
    }
  }, [accounts, initialEntries]);

  // Handle balance input change
  const handleAmountChange = (id: string, val: number) => {
    setBalances((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  // Split accounts into Aktiva (1-xxxx) and Kewajiban & Modal (2-xxxx, 3-xxxx)
  const aktivaAccounts = useMemo(() => {
    return accounts.filter((a: any) => (a.code || "").startsWith("1-"));
  }, [accounts]);

  const kewajibanModalAccounts = useMemo(() => {
    return accounts.filter((a: any) => {
      const c = a.code || "";
      return c.startsWith("2-") || c.startsWith("3-");
    });
  }, [accounts]);

  // Calculate Totals for detail accounts
  const totalAktiva = useMemo(() => {
    return aktivaAccounts
      .filter((a: any) => !a.is_header)
      .reduce((sum: number, a: any) => sum + (balances[a.id] || 0), 0);
  }, [aktivaAccounts, balances]);

  const totalKewajibanModal = useMemo(() => {
    return kewajibanModalAccounts
      .filter((a: any) => !a.is_header)
      .reduce((sum: number, a: any) => sum + (balances[a.id] || 0), 0);
  }, [kewajibanModalAccounts, balances]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any[] = [];
      accounts.forEach((acc: any) => {
        if (!acc.is_header) {
          const amount = balances[acc.id] || 0;
          const isDebit = acc.normal_balance === "DEBIT" || (acc.code || "").startsWith("1-");
          payload.push({
            account_id: acc.id,
            debit: isDebit ? amount : 0,
            credit: !isDebit ? amount : 0,
          });
        }
      });
      return await api.post("/accounting/initial-balances/batch-accounts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["initial-balances-accounts"] });
      alert("Saldo awal seluruh perkiraan akun berhasil disimpan ke buku besar.");
    },
    onError: (err: any) => {
      alert("Gagal menyimpan saldo awal: " + (err.response?.data?.message || err.message));
    },
  });

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
          <h1 className="text-sm font-semibold text-slate-800">Saldo Awal Perkiraan</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-medium">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">33</span>
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">A</span>
          <span className="font-semibold text-slate-700">ADMIN2</span>
        </div>
      </div>

      {/* 2. Top Warning Box */}
      <div className="shrink-0 border border-amber-300 bg-[#fffde7] px-3 py-1.5 rounded text-[11px] text-slate-700 space-y-0.5">
        <div className="font-bold text-red-600">PENTING :</div>
        <div>1. Pengisian Saldo Awal Perkiraan dilakukan Hanya Satu Kali saja, Pada Awal Penggunaan Program.</div>
        <div>2. Pengisian Saldo Awal Persediaan tidak pada menu ini, tetapi pada Menu Master Data &gt; Saldo Awal Item.</div>
      </div>

      {/* 3. Main Split Container (Aktiva & Kewajiban/Modal) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 overflow-hidden">
        {/* LEFT COLUMN: AKTIVA */}
        <div className="border border-slate-300 rounded bg-white overflow-hidden shadow-2xs flex flex-col h-full min-h-0">
          <div className="shrink-0 bg-slate-100 border-b border-slate-300 px-2.5 py-1 font-bold text-[11px] text-slate-800">
            Aktiva
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-300">
                <tr className="text-slate-700 font-semibold text-left">
                  <th className="py-1 px-2 border-r border-slate-300">Perkiraan</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-44 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400">
                      Memuat akun aktiva...
                    </td>
                  </tr>
                ) : aktivaAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400">
                      Belum ada data perkiraan aktiva.
                    </td>
                  </tr>
                ) : (
                  aktivaAccounts.map((acc: any) => {
                    const isHdr = acc.is_header;
                    const val = balances[acc.id] || 0;
                    return (
                      <tr
                        key={acc.id}
                        className={`border-b border-slate-200 ${
                          isHdr ? "bg-slate-50/80 font-bold text-slate-900" : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <td className="py-1 px-2 border-r border-slate-200">
                          <span
                            style={{
                              marginLeft: isHdr
                                ? acc.code.endsWith("000")
                                  ? 0
                                  : 12
                                : acc.code.endsWith("0")
                                ? 24
                                : 32,
                            }}
                            className="inline-block"
                          >
                            {isHdr && <span className="text-slate-400 mr-1">-</span>}
                            <span className="font-mono text-slate-600 mr-1.5">{acc.code}</span>
                            <span>{acc.name}</span>
                          </span>
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-200 text-right">
                          {isHdr ? (
                            <span className="text-slate-400 font-normal pr-2">-</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={val === 0 ? "" : val}
                              onChange={(e) => handleAmountChange(acc.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-right font-medium text-slate-800 border border-slate-200 rounded px-1.5 h-6 text-[11px] focus:border-emerald-500 focus:bg-emerald-50/20 outline-none"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Bottom Total Aktiva */}
          <div className="border-t border-slate-300 bg-[#fce4ec] p-1.5 flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-800">Total IDR :</span>
            <span className="font-bold text-slate-900 font-mono text-[12px]">
              {formatCurrency(totalAktiva)}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: KEWAJIBAN DAN MODAL */}
        <div className="border border-slate-300 rounded bg-white overflow-hidden shadow-2xs flex flex-col h-full min-h-0">
          <div className="shrink-0 bg-slate-100 border-b border-slate-300 px-2.5 py-1 font-bold text-[11px] text-slate-800">
            Kewajiban Dan Modal
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-300">
                <tr className="text-slate-700 font-semibold text-left">
                  <th className="py-1 px-2 border-r border-slate-300">Perkiraan</th>
                  <th className="py-1 px-2 border-r border-slate-300 w-44 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400">
                      Memuat akun kewajiban dan modal...
                    </td>
                  </tr>
                ) : kewajibanModalAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400">
                      Belum ada data perkiraan kewajiban dan modal.
                    </td>
                  </tr>
                ) : (
                  kewajibanModalAccounts.map((acc: any) => {
                    const isHdr = acc.is_header;
                    const val = balances[acc.id] || 0;
                    return (
                      <tr
                        key={acc.id}
                        className={`border-b border-slate-200 ${
                          isHdr ? "bg-slate-50/80 font-bold text-slate-900" : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <td className="py-1 px-2 border-r border-slate-200">
                          <span
                            style={{
                              marginLeft: isHdr
                                ? acc.code.endsWith("000")
                                  ? 0
                                  : 12
                                : acc.code.endsWith("0")
                                ? 24
                                : 32,
                            }}
                            className="inline-block"
                          >
                            {isHdr && <span className="text-slate-400 mr-1">-</span>}
                            <span className="font-mono text-slate-600 mr-1.5">{acc.code}</span>
                            <span>{acc.name}</span>
                          </span>
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-200 text-right">
                          {isHdr ? (
                            <span className="text-slate-400 font-normal pr-2">-</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={val === 0 ? "" : val}
                              onChange={(e) => handleAmountChange(acc.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-right font-medium text-slate-800 border border-slate-200 rounded px-1.5 h-6 text-[11px] focus:border-emerald-500 focus:bg-emerald-50/20 outline-none"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Bottom Total Kewajiban & Modal */}
          <div className="border-t border-slate-300 bg-[#fce4ec] p-1.5 flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-800">Total IDR :</span>
            <span className="font-bold text-slate-900 font-mono text-[12px]">
              {formatCurrency(totalKewajibanModal)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Alert */}
      <div className="shrink-0 border border-amber-300 bg-[#fffde7] px-3 py-1 rounded text-[11px] text-amber-950 font-medium">
        Alert : Saldo Awal per Tanggal : 2027-01-01, Persediaan dan Hutang Piutang langsung terhubung dari masing-masing saldo awal.
      </div>

      {/* 5. Action Buttons */}
      <div className="shrink-0 flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition"
        >
          <Printer className="w-3 h-3 text-slate-500" />
          <span>Cetak</span>
        </button>
      </div>
    </div>
  );
}
