"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft as BackIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { api } from "@/lib/api";
import { TableSortSelect, sortTableData } from "@/components/common/TableSortSelect";
import { SearchableAccountSelect } from "@/components/common/SearchableAccountSelect";

type CategoryTab =
  | "Aktiva"
  | "Kewajiban"
  | "Modal"
  | "Pendapatan"
  | "HPP"
  | "Biaya"
  | "Pendapatan Lain"
  | "Biaya Lain"
  | "Semua Akun";

const CATEGORIES: CategoryTab[] = [
  "Aktiva",
  "Kewajiban",
  "Modal",
  "Pendapatan",
  "HPP",
  "Biaya",
  "Pendapatan Lain",
  "Biaya Lain",
  "Semua Akun",
];

export default function AccountsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<CategoryTab>("Aktiva");
  const [sortOption, setSortOption] = useState<string>("code_asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountLevel, setAccountLevel] = useState<"HEADER" | "DETAIL">("DETAIL");
  const [modalCategory, setModalCategory] = useState<CategoryTab>("Aktiva");
  const [parentAccountId, setParentAccountId] = useState("");
  const [codePrefix, setCodePrefix] = useState("1");
  const [codeSuffix, setCodeSuffix] = useState("");
  const [name, setName] = useState("");
  const [isCashBank, setIsCashBank] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounting/accounts");
      return res.data?.data || [];
    },
  });

  // Filter accounts by active tab
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a: any) => {
      const code = a.code || "";
      switch (activeTab) {
        case "Aktiva":
          return code.startsWith("1-");
        case "Kewajiban":
          return code.startsWith("2-");
        case "Modal":
          return code.startsWith("3-");
        case "Pendapatan":
          return code.startsWith("4-");
        case "HPP":
          return code.startsWith("5-");
        case "Biaya":
          return code.startsWith("6-");
        case "Pendapatan Lain":
          return code.startsWith("7-");
        case "Biaya Lain":
          return code.startsWith("8-");
        case "Semua Akun":
        default:
          return true;
      }
    });
  }, [accounts, activeTab]);

  const sortedAccounts = useMemo(() => {
    return sortTableData(filteredAccounts, sortOption, {
      getCode: (a: any) => a.code,
      getName: (a: any) => a.name,
      getDate: (a: any) => a.created_at,
    });
  }, [filteredAccounts, sortOption]);

  // Headers for parent position dropdown
  const headerAccounts = useMemo(() => {
    return accounts.filter((a: any) => a.is_header);
  }, [accounts]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        return await api.put(`/accounting/accounts/${editingId}`, payload);
      }
      return await api.post("/accounting/accounts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setModalOpen(false);
      resetModal();
    },
    onError: (err: any) => {
      alert("Gagal menyimpan akun: " + (err.response?.data?.message || err.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/accounting/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedId(null);
      alert("Akun perkiraan berhasil dihapus.");
    },
    onError: (err: any) => {
      alert("Gagal menghapus akun: " + (err.response?.data?.message || err.message));
    },
  });

  const resetModal = () => {
    setEditingId(null);
    setAccountLevel("DETAIL");
    setModalCategory(activeTab === "Semua Akun" ? "Aktiva" : activeTab);
    setParentAccountId("");
    setCodePrefix(getCategoryPrefix(activeTab === "Semua Akun" ? "Aktiva" : activeTab));
    setCodeSuffix("");
    setName("");
    setIsCashBank(false);
  };

  const getCategoryPrefix = (cat: CategoryTab): string => {
    switch (cat) {
      case "Aktiva":
        return "1";
      case "Kewajiban":
        return "2";
      case "Modal":
        return "3";
      case "Pendapatan":
        return "4";
      case "HPP":
        return "5";
      case "Biaya":
        return "6";
      case "Pendapatan Lain":
        return "7";
      case "Biaya Lain":
        return "8";
      default:
        return "1";
    }
  };

  const handleOpenCreate = () => {
    resetModal();
    setModalOpen(true);
  };

  const handleOpenEdit = (accToEdit?: any) => {
    const acc = accToEdit || accounts.find((a: any) => a.id === selectedId);
    if (!acc) return;
    setEditingId(acc.id);
    setAccountLevel(acc.is_header ? "HEADER" : "DETAIL");
    const parts = (acc.code || "").split("-");
    setCodePrefix(parts[0] || "1");
    setCodeSuffix(parts[1] || "");
    setName(acc.name || "");
    setIsCashBank(acc.subtype === "CASH_BANK");
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const acc = accounts.find((a: any) => a.id === selectedId);
    if (!acc) return;
    if (confirm(`Yakin ingin menghapus akun [${acc.code}] ${acc.name}?`)) {
      deleteMutation.mutate(selectedId);
    }
  };

  const handleSubmit = () => {
    const fullCode = `${codePrefix}-${codeSuffix.trim()}`;
    if (!codeSuffix.trim() || !name.trim()) {
      alert("Kode dan Nama perkiraan wajib diisi.");
      return;
    }

    let accType = "ASSET";
    let normalBal = "DEBIT";
    if (codePrefix === "1") {
      accType = "ASSET";
      normalBal = "DEBIT";
    } else if (codePrefix === "2") {
      accType = "LIABILITY";
      normalBal = "CREDIT";
    } else if (codePrefix === "3") {
      accType = "EQUITY";
      normalBal = "CREDIT";
    } else if (codePrefix === "4") {
      accType = "REVENUE";
      normalBal = "CREDIT";
    } else if (codePrefix === "5") {
      accType = "EXPENSE";
      normalBal = "DEBIT";
    } else if (codePrefix === "6") {
      accType = "EXPENSE";
      normalBal = "DEBIT";
    } else if (codePrefix === "7") {
      accType = "REVENUE";
      normalBal = "CREDIT";
    } else if (codePrefix === "8") {
      accType = "EXPENSE";
      normalBal = "DEBIT";
    }

    const payload: any = {
      code: fullCode,
      name: name.trim().toUpperCase(),
      type: accType,
      subtype: isCashBank ? "CASH_BANK" : "GENERAL",
      normal_balance: normalBal,
      is_header: accountLevel === "HEADER",
      is_active: true,
    };

    saveMutation.mutate(payload);
  };

  // Indentation helper
  const getIndent = (code: string) => {
    if (!code) return 0;
    const parts = code.split("-");
    const num = parts[1] || "";
    if (num.endsWith("000")) return 0;
    if (num.endsWith("00")) return 16;
    if (num.endsWith("0")) return 32;
    return 48;
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none bg-[#fafbfc]">
      {/* 1. TOP TITLE HEADER */}
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
          <h1 className="text-sm font-bold text-slate-800">Data Perkiraan</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span>APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            33
          </span>
          <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            A
          </span>
          <span>ADMIN2</span>
        </div>
      </div>

      {/* 2. TOP ACTION BUTTONS & SORT */}
      <div className="shrink-0 flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="h-6 w-7 bg-[#00c875] hover:bg-[#00b066] text-white rounded flex items-center justify-center shadow-xs transition active:scale-95"
            title="Tambah Perkiraan"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => handleOpenEdit()}
            className="h-6 w-7 bg-[#3b82f6] hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-xs transition active:scale-95 disabled:opacity-40"
            title="Ubah Perkiraan"
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={handleDelete}
            className="h-6 w-7 bg-[#ef4444] hover:bg-red-600 text-white rounded flex items-center justify-center shadow-xs transition active:scale-95 disabled:opacity-40"
            title="Hapus Perkiraan"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
        <div className="w-64">
          <TableSortSelect
            value={sortOption}
            onChange={(val) => setSortOption(val)}
            compact
          />
        </div>
      </div>

      {/* 3. CATEGORY TABS (Screenshot 1: Aktiva, Kewajiban, Modal, Pendapatan, HPP, Biaya, Pendapatan Lain, Biaya Lain, Semua Akun) */}
      <div className="flex-1 min-h-0 border border-slate-300 rounded bg-white overflow-hidden shadow-2xs flex flex-col">
        <div className="shrink-0 flex items-center border-b border-slate-300 bg-[#f8fafc] overflow-x-auto text-[11px] font-semibold text-slate-700">
          {CATEGORIES.map((cat) => {
            const isActive = activeTab === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveTab(cat);
                  setSelectedId(null);
                }}
                className={`px-3 py-1 border-r border-slate-300 whitespace-nowrap transition ${
                  isActive
                    ? "bg-white text-slate-900 border-b-2 border-b-sky-600 font-bold -mb-[1px]"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 4. TREE TABLE (Screenshot 1) */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-slate-700 font-bold border-b border-slate-300 sticky top-0 h-6">
              <tr>
                <th className="py-0.5 px-2 border-r border-slate-200 w-10 text-center"></th>
                <th className="py-0.5 px-3 border-r border-slate-200 w-56">Kode</th>
                <th className="py-0.5 px-3 border-r border-slate-200">Nama</th>
                <th className="py-0.5 px-3 text-center w-20">Tipe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    Memuat data perkiraan...
                  </td>
                </tr>
              ) : sortedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 font-normal">
                    No data
                  </td>
                </tr>
              ) : (
                sortedAccounts.map((acc: any) => {
                  const isSelected = selectedId === acc.id;
                  const isHeader = !!acc.is_header;
                  const indentPx = getIndent(acc.code);

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => setSelectedId(acc.id)}
                      className={`h-6 transition cursor-pointer ${
                        isSelected
                          ? "bg-[#9ec5f7] text-slate-900 font-semibold"
                          : isHeader
                          ? "hover:bg-slate-50 font-bold text-slate-900"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {/* Action Pencil on row */}
                      <td className="py-0.5 px-1.5 border-r border-slate-200 text-center w-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(acc.id);
                            handleOpenEdit(acc);
                          }}
                          className="text-slate-400 hover:text-blue-600 inline-flex items-center justify-center p-0.5"
                          title="Ubah"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </td>

                      {/* Kode with hierarchical indent and prefix dash for sub-accounts */}
                      <td className="py-0.5 px-3 border-r border-slate-200 font-mono">
                        <span style={{ paddingLeft: `${indentPx}px` }}>
                          {indentPx > 0 ? `- ${acc.code}` : acc.code}
                        </span>
                      </td>

                      {/* Nama */}
                      <td className="py-0.5 px-3 border-r border-slate-200">
                        {acc.name}
                      </td>

                      {/* Tipe: H for Header, D for Detail */}
                      <td className="py-0.5 px-3 text-center font-bold">
                        {isHeader ? "H" : "D"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH / UBAH PERKIRAAN (Screenshot 10) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border border-slate-300">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-800 text-xs">
                {editingId ? "Ubah Perkiraan" : "Tambah Perkiraan"}
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2.5 text-[11px]">
              {/* Radio Header vs Detail */}
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="accountLevel"
                    value="HEADER"
                    checked={accountLevel === "HEADER"}
                    onChange={() => setAccountLevel("HEADER")}
                    className="accent-sky-600"
                  />
                  <span className="font-semibold text-slate-700">Header</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="accountLevel"
                    value="DETAIL"
                    checked={accountLevel === "DETAIL"}
                    onChange={() => setAccountLevel("DETAIL")}
                    className="accent-sky-600"
                  />
                  <span className="font-semibold text-slate-700">Detail</span>
                </label>
              </div>

              {/* Kelompok */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-slate-600 font-semibold">Kelompok :</label>
                <div className="col-span-2">
                  <select
                    value={modalCategory}
                    onChange={(e) => {
                      const newCat = e.target.value as CategoryTab;
                      setModalCategory(newCat);
                      setCodePrefix(getCategoryPrefix(newCat));
                    }}
                    className="w-full h-6 px-2 border border-slate-300 rounded bg-white text-[11px] focus:outline-none focus:border-sky-500"
                  >
                    {CATEGORIES.filter((c) => c !== "Semua Akun").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Posisi */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-slate-600 font-semibold">Posisi :</label>
                <div className="col-span-2">
                  <SearchableAccountSelect
                    accounts={headerAccounts}
                    value={parentAccountId}
                    onChange={(val) => setParentAccountId(val)}
                    placeholder="-- Posisi Utama / Cari Induk Akun --"
                    allowClear={true}
                    includeHeaders={true}
                  />
                </div>
              </div>

              {/* Perkiraan [1] - [Kode] */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-slate-600 font-semibold">Perkiraan :</label>
                <div className="col-span-2 flex items-center gap-1">
                  <input
                    type="text"
                    value={codePrefix}
                    disabled
                    className="w-10 h-6 px-1.5 border border-slate-300 rounded bg-slate-100 text-center font-mono font-bold text-[11px]"
                  />
                  <span>-</span>
                  <input
                    type="text"
                    value={codeSuffix}
                    onChange={(e) => setCodeSuffix(e.target.value)}
                    placeholder="Contoh: 1105"
                    className="flex-1 h-6 px-2 border border-slate-300 rounded font-mono text-[11px] focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Nama */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-slate-600 font-semibold">Nama :</label>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: KAS KASIR SHIFT 1"
                    className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] focus:outline-none focus:border-sky-500 uppercase"
                  />
                </div>
              </div>

              {/* Kas Bank */}
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="text-slate-600 font-semibold">Kas Bank :</label>
                <div className="col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    checked={isCashBank}
                    onChange={(e) => setIsCashBank(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons (Screenshot 10: Simpan and Kembali) */}
            <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!codeSuffix || !name || saveMutation.isPending}
                className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white rounded font-bold text-[11px] disabled:opacity-50 transition active:scale-95"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-6 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold text-[11px] transition"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
