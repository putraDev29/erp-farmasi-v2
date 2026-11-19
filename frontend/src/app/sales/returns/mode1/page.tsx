"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  CreditCard,
  Search,
  ChevronLeft as BackIcon,
  AlertCircle,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";

export default function SalesReturnMode1Page() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Top Form Fields (Matching Image 6)
  const [returnNo] = useState("Auto");
  const [transactionDate, setTransactionDate] = useState("18/11/2026 17:21:27");
  const [customerId, setCustomerId] = useState("");
  const [salesRepId, setSalesRepId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [ppnType, setPpnType] = useState("Non");

  // Bottom Calculation Fields (Matching Image 6)
  const [notes, setNotes] = useState("");
  const [otherCost, setOtherCost] = useState(0);
  const [includeCost, setIncludeCost] = useState(false);
  const [taxPercent, setTaxPercent] = useState(0);
  const [taxChecked, setTaxChecked] = useState(false);

  // Table items state
  const [items, setItems] = useState<
    Array<{
      original_invoice_no: string;
      product_id: string;
      product_code: string;
      product_name: string;
      brand: string;
      sold_qty: number;
      sold_unit: string;
      qty: number;
      unit_id: string;
      unit_name: string;
      unit_price: number;
      discount_percent: number;
      total: number;
    }>
  >([]);

  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  const { data: salesReps = [] } = useQuery({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      const res = await api.get("/sales-reps");
      return res.data?.data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  const { data: salesInvoices = [] } = useQuery({
    queryKey: ["sales-for-return", customerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerId) params.append("customer_id", customerId);
      const res = await api.get(`/sales?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  React.useEffect(() => {
    if (customers.length > 0 && !customerId) setCustomerId(customers[0].id);
    if (warehouses.length > 0 && !warehouseId) setWarehouseId(warehouses[0].id);
  }, [customers, warehouses, customerId, warehouseId]);

  // Calculations
  const totalItemCount = items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const subTotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const nomPajak = (subTotal * taxPercent) / 100;
  const totalAkhir = subTotal + (taxChecked ? nomPajak : 0) + (includeCost ? otherCost : 0);

  // Handlers
  const handleAddItemFromInvoice = (invoice: any, item: any) => {
    const newItem = {
      original_invoice_no: invoice.invoice_no,
      product_id: item.product_id,
      product_code: item.product?.sku || "MED-001",
      product_name: item.product?.name || "Item Obat",
      brand: item.product?.brand?.name || "Generic",
      sold_qty: item.qty,
      sold_unit: item.unit?.name || "Pcs",
      qty: 1,
      unit_id: item.unit_id,
      unit_name: item.unit?.name || "Pcs",
      unit_price: item.unit_price,
      discount_percent: item.discount || 0,
      total: item.unit_price * (1 - (item.discount || 0) / 100),
    };
    setItems([...items, newItem]);
    setPickerModalOpen(false);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const updated = [...items];
    const it = updated[index];
    it.qty = newQty;
    const itemSub = it.qty * it.unit_price;
    const disc = (itemSub * it.discount_percent) / 100;
    it.total = itemSub - disc;
    setItems(updated);
  };

  const handleDeleteItem = () => {
    if (selectedRowIndex === null) return;
    setItems(items.filter((_, idx) => idx !== selectedRowIndex));
    setSelectedRowIndex(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        return_mode: "MODE_1",
        customer_id: customerId,
        sales_rep_id: salesRepId || undefined,
        warehouse_id: warehouseId,
        tax_type: ppnType,
        tax_percent: taxChecked ? taxPercent : 0,
        other_cost: includeCost ? otherCost : 0,
        reason: notes || "Retur Penjualan Mode 1",
        computer_name: "KOMPUTER-01",
        items: items.map((it) => ({
          product_id: it.product_id,
          unit_id: it.unit_id,
          original_invoice_no: it.original_invoice_no,
          brand: it.brand,
          sold_qty: it.sold_qty,
          sold_unit: it.sold_unit,
          qty: it.qty,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
        })),
      };
      return await api.post("/sales/returns", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      alert("Retur Penjualan Mode 1 berhasil disimpan!");
      router.push("/sales/returns");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menyimpan retur penjualan");
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1 text-xs select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/sales/returns")}
            className="text-slate-600 hover:text-slate-900"
          >
            <BackIcon className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800">
            Retur Penjualan Baru Mode 1
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

      {errorMsg && (
        <div className="p-1.5 bg-red-50 text-red-700 rounded border border-red-200 flex items-center gap-1.5 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. HEADER FORM (2 Rows Matching Image 6) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs space-y-1.5">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">No Transaksi :</label>
            <input
              type="text"
              value={returnNo}
              disabled
              className="w-full h-6 px-2 border border-slate-300 rounded bg-slate-50 text-slate-600 font-semibold text-[11px]"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Tanggal :</label>
            <input
              type="text"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Pelanggan :</label>
            <div className="flex gap-1">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-700"
              >
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
            <label className="block text-slate-600 font-semibold mb-0.5">Sales :</label>
            <div className="flex gap-1">
              <select
                value={salesRepId}
                onChange={(e) => setSalesRepId(e.target.value)}
                className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white text-slate-500"
              >
                <option value="">Select...</option>
                {salesReps.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div>
            <label className="block text-slate-600 font-semibold mb-0.5">Masuk ke :</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
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
            <label className="block text-slate-600 font-semibold mb-0.5">PPN :</label>
            <select
              value={ppnType}
              onChange={(e) => setPpnType(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px] bg-white"
            >
              <option value="Non">Non</option>
              <option value="Include">Include</option>
              <option value="Exclude">Exclude</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TABLE (12 Columns Matching Image 6) */}
      <div className="flex-1 min-h-0 bg-white rounded border border-slate-200 overflow-auto shadow-2xs">
        <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 h-6 shadow-2xs">
            <tr>
              <th className="py-0.5 px-2 border-r border-slate-200 text-center w-8">No</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">No Transaksi</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Kode Item</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Nama</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Merek</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Jml Jual</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Sat Jual</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right w-20">Jumlah</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200">Satuan</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Harga</th>
              <th className="py-0.5 px-2.5 border-r border-slate-200 text-right">Pot %</th>
              <th className="py-0.5 px-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-16 text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const isSelected = selectedRowIndex === idx;

                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedRowIndex(isSelected ? null : idx)}
                    className={`border-b border-slate-100 cursor-pointer h-6 transition-colors ${
                      isSelected ? "bg-sky-50 text-sky-900 font-medium" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-0.5 px-2 border-r border-slate-100 text-center">{idx + 1}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono text-emerald-700">
                      {it.original_invoice_no}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-mono">{it.product_code}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 font-medium">{it.product_name}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-slate-500">{it.brand}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">{it.sold_qty}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">{it.sold_unit}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                      <input
                        type="number"
                        min="1"
                        max={it.sold_qty}
                        value={it.qty}
                        onChange={(e) => handleUpdateItemQty(idx, parseFloat(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 h-5 px-1 border rounded text-right text-[11px]"
                      />
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100">{it.unit_name}</td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                      {formatCurrency(it.unit_price)}
                    </td>
                    <td className="py-0.5 px-2.5 border-r border-slate-100 text-right">
                      {it.discount_percent}
                    </td>
                    <td className="py-0.5 px-2.5 text-right font-bold text-slate-800">
                      {formatCurrency(it.total)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. SUB-TABLE ACTION BUTTONS */}
      <div className="shrink-0 flex items-center gap-1.5 py-0.5">
        <button
          type="button"
          onClick={() => setPickerModalOpen(true)}
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Item</span>
        </button>
        <button
          type="button"
          onClick={handleDeleteItem}
          disabled={selectedRowIndex === null}
          className="h-6 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-red-600 rounded flex items-center justify-center shadow-2xs disabled:opacity-40"
          title="Hapus Baris"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="h-6 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-500 rounded text-[11px]"
        >
          Data Serial
        </button>
      </div>

      {/* 5. BOTTOM CALCULATION PANEL (Matching Image 6) */}
      <div className="shrink-0 bg-white p-2 rounded border border-slate-200 shadow-2xs space-y-1.5 text-[11px]">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <div className="md:col-span-4 flex items-center gap-1.5">
            <label className="text-slate-600 font-semibold whitespace-nowrap">Keterangan :</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-[11px]"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-1">
            <span className="text-slate-600 font-semibold">Item :</span>
            <input
              type="text"
              value={totalItemCount.toFixed(2)}
              disabled
              className="w-full h-6 px-2 border border-slate-300 rounded text-right bg-slate-50 font-bold"
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-1">
            <span className="text-slate-600 font-semibold whitespace-nowrap">Sub Total :</span>
            <input
              type="text"
              value={formatCurrency(subTotal)}
              disabled
              className="w-full h-6 px-2 border border-slate-300 rounded text-right bg-slate-50 font-bold"
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-1">
            <span className="text-slate-600 font-semibold">Biaya :</span>
            <input
              type="number"
              value={otherCost}
              onChange={(e) => setOtherCost(parseFloat(e.target.value) || 0)}
              className="w-full h-6 px-2 border border-slate-300 rounded text-right font-mono"
            />
            <input
              type="checkbox"
              checked={includeCost}
              onChange={(e) => setIncludeCost(e.target.checked)}
              className="w-3.5 h-3.5 border rounded"
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <div className="md:col-span-3 flex items-center gap-1">
            <span className="text-slate-600 font-semibold">Pjk % :</span>
            <input
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              className="w-16 h-6 px-2 border border-slate-300 rounded text-right"
            />
            <input
              type="checkbox"
              checked={taxChecked}
              onChange={(e) => setTaxChecked(e.target.checked)}
              className="w-3.5 h-3.5 border rounded"
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-1">
            <span className="text-slate-600 font-semibold whitespace-nowrap">Nom Pajak :</span>
            <input
              type="text"
              value={formatCurrency(nomPajak)}
              disabled
              className="w-full h-6 px-2 border border-slate-300 rounded text-right bg-slate-50"
            />
            <input
              type="checkbox"
              checked={taxChecked}
              onChange={(e) => setTaxChecked(e.target.checked)}
              className="w-3.5 h-3.5 border rounded"
            />
          </div>
          <div className="md:col-span-6 flex items-center gap-2 justify-end">
            <span className="text-slate-700 font-bold whitespace-nowrap">Total Akhir :</span>
            {/* Pink box matching screenshot */}
            <div className="bg-[#f8b4c9] text-slate-800 font-bold text-sm px-4 py-1 rounded min-w-[180px] text-right shadow-2xs border border-[#f39bb6]">
              {formatCurrency(totalAkhir)}
            </div>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM ACTIONS (Matching Image 6) */}
      <div className="shrink-0 flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => {
            setItems([]);
            setNotes("");
          }}
          className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>

        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || items.length === 0}
          className="h-6 px-3 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{createMutation.isPending ? "Menyimpan..." : "Simpan"}</span>
        </button>

        <button
          type="button"
          onClick={() => setItems([])}
          className="h-6 px-3 bg-white hover:bg-slate-50 border border-red-300 text-red-600 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-6 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>

        <button
          type="button"
          className="h-6 px-3 bg-white hover:bg-slate-50 border border-amber-300 text-amber-700 font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Bayar</span>
        </button>
      </div>

      {/* PICKER MODAL: Select from Sales Invoices */}
      {pickerModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-emerald-600 text-white font-bold text-xs">
              <span>Pilih Item dari Faktur Penjualan</span>
              <button onClick={() => setPickerModalOpen(false)}>✕</button>
            </div>
            <div className="p-3 max-h-[70vh] overflow-y-auto space-y-2 text-[11px]">
              {salesInvoices.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Tidak ada faktur penjualan untuk pelanggan ini
                </div>
              ) : (
                salesInvoices.map((inv: any) => (
                  <div key={inv.id} className="border rounded p-2 bg-slate-50 space-y-1">
                    <div className="flex justify-between font-bold text-emerald-800 text-[11px]">
                      <span>{inv.invoice_no}</span>
                      <span>Total: {formatCurrency(inv.total_amount)}</span>
                    </div>
                    <table className="w-full bg-white border text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="p-1 border text-left">Item</th>
                          <th className="p-1 border text-center w-16">Qty Jual</th>
                          <th className="p-1 border text-right w-24">Harga</th>
                          <th className="p-1 border text-center w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items?.map((it: any) => (
                          <tr key={it.id} className="border-b">
                            <td className="p-1 border font-medium">{it.product?.name}</td>
                            <td className="p-1 border text-center">{it.qty}</td>
                            <td className="p-1 border text-right">{formatCurrency(it.unit_price)}</td>
                            <td className="p-1 border text-center">
                              <button
                                type="button"
                                onClick={() => handleAddItemFromInvoice(inv, it)}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded font-medium text-[10px] hover:bg-emerald-700"
                              >
                                + Pilih
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setPickerModalOpen(false)}
                className="h-6 px-3 border rounded hover:bg-slate-100 text-[11px]"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
