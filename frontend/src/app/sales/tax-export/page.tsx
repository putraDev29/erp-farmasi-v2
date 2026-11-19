"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FileSpreadsheet,
  FileCode,
  Table as TableIcon,
  AlertTriangle,
  ChevronLeft as BackIcon,
} from "lucide-react";
import { api, formatCurrency, formatDate } from "@/lib/api";

export default function SalesTaxExportPage() {
  const router = useRouter();

  // Filters matching Ketoko Spec (Image 3)
  const [xmlFormat, setXmlFormat] = useState("FAKTUR_PAJAK_KELUARAN");
  const [taxOnly, setTaxOnly] = useState(false);
  const [startDate, setStartDate] = useState("01/11/2026 00:00:00");
  const [endDate, setEndDate] = useState("30/11/2026 23:59:59");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedUser, setSelectedUser] = useState("");
  const [txFrom, setTxFrom] = useState("");
  const [txTo, setTxTo] = useState("");
  const [roundingOption, setRoundingOption] = useState(0);
  const [customerFrom, setCustomerFrom] = useState("");
  const [customerTo, setCustomerTo] = useState("");

  const [hasQueried, setHasQueried] = useState(false);

  // Queries
  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: [
      "tax-sales-export",
      startDate,
      endDate,
      selectedWarehouse,
      taxOnly,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", "2026-11-01");
      if (endDate) params.append("end_date", "2026-11-30");

      const res = await api.get(`/sales?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: hasQueried,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const handleTampilData = () => {
    setHasQueried(true);
    refetch();
  };

  const handleExportCSV = () => {
    if (sales.length === 0) {
      alert("Tampilkan data terlebih dahulu sebelum melakukan ekspor!");
      return;
    }
    const headers = [
      "No Transaksi",
      "Tanggal",
      "Pelanggan",
      "NPWP",
      "NIK",
      "Nama NPWP",
      "Alamat NPWP",
      "PPN",
      "Jenis Pajak",
      "No Faktur Pajak",
      "Total",
      "Keterangan",
    ];
    const rows = sales.map((s: any) => [
      s.invoice_no,
      formatDate(s.date),
      s.customer?.name || "Pelanggan Umum",
      s.customer?.npwp || "00.000.000.0-000.000",
      s.customer?.nik || "-",
      s.customer?.name || "-",
      s.customer?.address || "-",
      s.tax_percent > 0 ? "PPN 11%" : "Non",
      "Exclude",
      `010.000-26.${s.invoice_no?.replace(/\D/g, "") || "00000001"}`,
      s.total_amount,
      s.notes || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Faktur_Pajak_Keluaran_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXML = () => {
    if (sales.length === 0) {
      alert("Tampilkan data terlebih dahulu sebelum melakukan ekspor!");
      return;
    }
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resValidateFakturPm xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  ${sales
    .map(
      (s: any) => `  <fakturPajak>
    <kdJenisTransaksi>01</kdJenisTransaksi>
    <fgPengganti>0</fgPengganti>
    <nomorFaktur>01000026${s.invoice_no?.replace(/\D/g, "") || "00000001"}</nomorFaktur>
    <tanggalFaktur>${s.date}</tanggalFaktur>
    <npwpPenjual>0123456789012345</npwpPenjual>
    <namaPenjual>APOTEK BERKAT PURNAMA</namaPenjual>
    <alamatPenjual>Jl. Purnama No. 33</alamatPenjual>
    <npwpLawanTransaksi>${s.customer?.npwp || "0000000000000000"}</npwpLawanTransaksi>
    <namaLawanTransaksi>${s.customer?.name || "PELANGGAN UMUM"}</namaLawanTransaksi>
    <jumlahDpp>${s.subtotal || s.total_amount}</jumlahDpp>
    <jumlahPpn>${s.tax_amount || 0}</jumlahPpn>
  </fakturPajak>`
    )
    .join("\n")}
</resValidateFakturPm>`;

    const blob = new Blob([xmlContent], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eFaktur_Keluaran_${Date.now()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Ekspor CSV/XML Faktur Pajak Keluaran
          </h1>
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

      {/* 2. FILTER & CONFIG SECTION (Matching Image 3) */}
      <div className="shrink-0 bg-white p-2.5 rounded border border-slate-200 shadow-2xs space-y-2 text-[11px]">
        {/* Row 1: Format XML & Tampil Pajak Saja */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-700">Format XML :</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="xmlFormat"
                value="FAKTUR_PAJAK_KELUARAN"
                checked={xmlFormat === "FAKTUR_PAJAK_KELUARAN"}
                onChange={(e) => setXmlFormat(e.target.value)}
              />
              <span>Faktur Pajak Keluaran</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="xmlFormat"
                value="RETUR_INDUK"
                checked={xmlFormat === "RETUR_INDUK"}
                onChange={(e) => setXmlFormat(e.target.value)}
              />
              <span>Retur Induk 1A5, 1A9 dan 1B (SPT PPN Digunggung)</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="taxOnlyCheck" className="font-semibold text-slate-700 cursor-pointer">
              Tampil yang Kena Pajak Saja :
            </label>
            <input
              type="checkbox"
              id="taxOnlyCheck"
              checked={taxOnly}
              onChange={(e) => setTaxOnly(e.target.checked)}
              className="w-3.5 h-3.5 border rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Row 2: Tanggal, Dept/Gudang, User */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Dari :</label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal Sampai :</label>
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Dept/Gudang :</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white"
            >
              <option value="all">UTAMA - APOTEK BERKAT</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">User :</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-500"
            >
              <option value="">Select...</option>
              <option value="ADMIN2">ADMIN2</option>
              <option value="KASIR1">KASIR1</option>
            </select>
          </div>
        </div>

        {/* Row 3: No Transaksi Dari/Sampai, Opsi Pembulatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">No Transaksi Dari :</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={txFrom}
                onChange={(e) => setTxFrom(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
              <button
                type="button"
                className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">No Transaksi Sampai :</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={txTo}
                onChange={(e) => setTxTo(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
              />
              <button
                type="button"
                className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Opsi Pembulatan :</label>
            <input
              type="number"
              value={roundingOption}
              onChange={(e) => setRoundingOption(parseInt(e.target.value) || 0)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-center text-[11px]"
            />
          </div>
        </div>

        {/* Row 4: Pelanggan Dari/Sampai & Warning Notice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-center">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Pelanggan Dari :</label>
            <div className="flex gap-1">
              <select
                value={customerFrom}
                onChange={(e) => setCustomerFrom(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-500"
              >
                <option value="">Select...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Pelanggan Sampai :</label>
            <div className="flex gap-1">
              <select
                value={customerTo}
                onChange={(e) => setCustomerTo(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-500"
              >
                <option value="">Select...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-6 w-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="md:col-span-2 pt-3">
            <div className="bg-[#fff9e6] border border-[#ffe082] text-[#8d6e19] px-2.5 py-1 rounded flex items-center gap-1.5 text-[10.5px]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#e6a817] shrink-0" />
              <span>
                <strong>Penting:</strong> sesuai Pasal 129 ayat (2) dan (3).
              </span>
            </div>
          </div>
        </div>

        {/* Row 5: Action Buttons (Matching Image 3) */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          {/* Tampil Data (Sky blue) */}
          <button
            type="button"
            onClick={handleTampilData}
            className="h-6 px-3 bg-[#4ba3e3] hover:bg-[#388ecf] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tampil Data</span>
          </button>

          {/* Proses Ekspor CSV (Emerald Green) */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Proses Ekspor CSV</span>
          </button>

          {/* Proses Ekspor XML (Emerald Green) */}
          <button
            type="button"
            onClick={handleExportXML}
            className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Proses Ekspor XML</span>
          </button>
        </div>
      </div>

      {/* 3. TABLE SECTION (14 Columns Matching Image 3) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Tanggal</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Pelanggan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">NPWP</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">NIK</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama NPWP</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Alamat NPWP</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">PPN</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Jenis Pajak (Exclude)</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Faktur Pajak</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Total</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Keterangan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">User Buat</th>
              <th className="py-0.5 px-2.5">User Ubah</th>
            </tr>
          </thead>
          <tbody>
            {!hasQueried ? (
              <tr>
                <td colSpan={14} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={14} className="text-center py-12 text-slate-400">
                  Memuat data faktur pajak...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-20 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              sales.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 h-6">
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-semibold text-emerald-700">
                    {s.invoice_no}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    {formatDate(s.date)}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">
                    {s.customer?.name || "Pelanggan Umum"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                    {s.customer?.npwp || "00.000.000.0-000.000"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                    {s.customer?.nik || "-"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    {s.customer?.name || "-"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 max-w-[150px] truncate text-slate-500">
                    {s.customer?.address || "-"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    {s.tax_percent > 0 ? `${s.tax_percent}%` : "Non"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100">
                    Exclude
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-700">
                    {`010.000-26.${s.invoice_no?.replace(/\D/g, "") || "00000001"}`}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 text-right font-bold text-slate-800">
                    {formatCurrency(s.total_amount)}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 max-w-[120px] truncate text-slate-600">
                    {s.notes || "-"}
                  </td>
                  <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-slate-600">
                    {s.user?.username || "ADMIN2"}
                  </td>
                  <td className="py-0.5 px-2.5 text-slate-400">
                    -
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
