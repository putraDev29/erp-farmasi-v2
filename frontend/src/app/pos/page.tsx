"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  X,
  AlertCircle,
} from "lucide-react";
import { api, formatCurrency } from "@/lib/api";
import { CariObatSalesModal } from "@/components/sales/CariObatSalesModal";

interface CartItem {
  product_id: string;
  name: string;
  code: string;
  barcode: string;
  unit_id: string;
  unit_name: string;
  qty: number;
  unit_price: number;
  discount: number;
  total_amount: number;
  available_stock: number;
  purchase_price?: number;
}

export default function PosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerID, setCustomerID] = useState("");
  const [warehouseID, setWarehouseID] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [tenderMethod, setTenderMethod] = useState("CASH");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCariModalOpen, setIsCariModalOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ["pos-warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data?.data || [];
    },
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["pos-customers"],
    queryFn: async () => {
      const res = await api.get("/customers");
      return res.data?.data || [];
    },
  });

  // Fetch general settings
  const { data: generalSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["settings-general"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/GENERAL");
      return res.data?.data || {};
    },
    staleTime: 0,
  });

  // Fetch products with stock (Only Retail OTC for POS Cashier)
  const { data: productsData } = useQuery({
    queryKey: ["pos-products", searchTerm, warehouseID],
    queryFn: async () => {
      const res = await api.get(`/products?search=${encodeURIComponent(searchTerm)}&retail_only=true&page_size=30`);
      return res.data?.data?.items || [];
    },
  });

  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !warehouseID) {
      setWarehouseID(warehouses[0].id);
    }
  }, [warehouses, warehouseID]);

  useEffect(() => {
    if (customers && customers.length > 0 && !customerID) {
      setCustomerID(customers[0].id);
    }
  }, [customers, customerID]);

  // Focus barcode input on mount and handle F2 shortcut
  useEffect(() => {
    barcodeInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setIsCariModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle barcode scanning
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = productsData?.find(
      (p: any) => p.barcode === barcodeInput.trim() || p.code === barcodeInput.trim()
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput("");
    } else {
      setErrorMsg(`Produk dengan barcode '${barcodeInput}' tidak ditemukan`);
      setTimeout(() => setErrorMsg(null), 3000);
      setBarcodeInput("");
    }
  };

  const addToCart = (prod: any) => {
    const purchasePrice = Number(prod.purchase_price || prod.avg_cost || 0);
    const sellingPrice = Number(prod.selling_price || 0);
    const confirmBelowHpp = generalSettings?.confirm_price_below_hpp === "true";
    const minProfit = parseFloat(generalSettings?.min_profit_percent || "0");

    if (purchasePrice > 0) {
      const margin = ((sellingPrice - purchasePrice) / purchasePrice) * 100;
      if (confirmBelowHpp && sellingPrice < purchasePrice) {
        setErrorMsg(`⚠️ Harga jual "${prod.name}" (Rp ${sellingPrice.toLocaleString()}) di bawah HPP (Rp ${purchasePrice.toLocaleString()})!`);
        setTimeout(() => setErrorMsg(null), 4000);
      } else if (minProfit > 0 && margin < minProfit) {
        setErrorMsg(`⚠️ Margin item "${prod.name}" (${margin.toFixed(1)}%) di bawah Min. Profit (${minProfit}%)!`);
        setTimeout(() => setErrorMsg(null), 4000);
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === prod.id
            ? {
              ...item,
              qty: item.qty + 1,
              total_amount: (item.qty + 1) * item.unit_price - item.discount,
            }
            : item
        );
      } else {
        const newItem: CartItem = {
          product_id: prod.id,
          name: prod.name,
          code: prod.code,
          barcode: prod.barcode,
          unit_id: prod.base_unit_id,
          unit_name: prod.base_unit?.name || "Pcs",
          qty: 1,
          unit_price: prod.selling_price || 0,
          purchase_price: purchasePrice,
          discount: 0,
          total_amount: prod.selling_price || 0,
          available_stock: 999,
        };
        return [...prev, newItem];
      }
    });
  };

  const updateQty = (productID: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productID) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              qty: newQty,
              total_amount: newQty * item.unit_price - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productID: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productID));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((acc, it) => acc + it.total_amount, 0);
  const tax = subtotal * 0.11; // 11% PPN standard
  const grandTotal = subtotal + tax;
  const change = Math.max(0, cashGiven - grandTotal);

  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setCashGiven(grandTotal);
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!warehouseID) {
      setErrorMsg("Pilih gudang terlebih dahulu");
      return;
    }

    const confirmBelowHpp = generalSettings?.confirm_price_below_hpp === "true";
    const minProfit = parseFloat(generalSettings?.min_profit_percent || "0");

    if (confirmBelowHpp) {
      const belowHpp = cart.filter(
        (it) => it.purchase_price && it.purchase_price > 0 && it.unit_price < it.purchase_price
      );
      if (belowHpp.length > 0) {
        const itemNames = belowHpp
          .map(
            (it) =>
              `- ${it.name} (Jual: Rp ${it.unit_price.toLocaleString()}, HPP: Rp ${it.purchase_price?.toLocaleString()})`
          )
          .join("\n");
        if (
          !confirm(
            `⚠️ Peringatan:\nTerdapat item kasir dengan harga jual di bawah Harga Pokok (HPP):\n${itemNames}\n\nApakah Anda yakin ingin melanjutkan transaksi kasir?`
          )
        ) {
          return;
        }
      }
    }

    if (minProfit > 0) {
      const belowMargin = cart.filter((it) => {
        if (!it.purchase_price || it.purchase_price <= 0) return false;
        const m = ((it.unit_price - it.purchase_price) / it.purchase_price) * 100;
        return m < minProfit;
      });
      if (belowMargin.length > 0) {
        const itemNames = belowMargin
          .map((it) => {
            const m = (
              ((it.unit_price - (it.purchase_price || 0)) / (it.purchase_price || 1)) *
              100
            ).toFixed(1);
            return `- ${it.name} (Margin: ${m}%, Batas Min: ${minProfit}%)`;
          })
          .join("\n");
        if (
          !confirm(
            `⚠️ Peringatan:\nTerdapat item kasir dengan margin di bawah batas Minimum Profit (${minProfit}%):\n${itemNames}\n\nApakah Anda yakin ingin melanjutkan transaksi kasir?`
          )
        ) {
          return;
        }
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      warehouse_id: warehouseID,
      customer_id: customerID || undefined,
      type: "POS",
      tax_percent: 11,
      discount: 0,
      shipping_fee: 0,
      notes: "Transaksi Kasir POS Standar",
      items: cart.map((it) => ({
        product_id: it.product_id,
        unit_id: it.unit_id,
        qty: it.qty,
        unit_price: it.unit_price,
        discount: it.discount,
      })),
      payments: [
        {
          method: tenderMethod,
          amount: tenderMethod === "CASH" ? cashGiven : grandTotal,
          referenceNo: tenderMethod === "CASH" ? "TUNAI" : "NON-TUNAI",
        },
      ],
    };

    try {
      const res = await api.post("/sales", payload);
      if (res.data?.success) {
        setCompletedSale(res.data.data);
        setCart([]);
        setPaymentModalOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal memproses transaksi kasir");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Column: Product Search & Catalog */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col p-4 overflow-hidden">
        {/* Barcode scanner & search bar */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Barcode input */}
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-3 text-emerald-600" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan / Ketik Barcode [Enter]..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </form>

            {/* Keyword search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama obat / kategori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Modal Cari Item Button (Matching Ketoko Spec) */}
            <button
              type="button"
              onClick={() => setIsCariModalOpen(true)}
              className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs text-xs shrink-0 transition active:scale-95"
              title="Buka Pencarian Item & Filter Farmasi (F2)"
            >
              <Search className="w-4 h-4" />
              <span>Cari Item (F2)</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {productsData?.map((prod: any) => (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="p-3 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition flex flex-col justify-between group h-32 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{prod.code}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {prod.base_unit?.name || "Box"}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-emerald-700">
                    {prod.name}
                  </h4>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                    {formatCurrency(prod.selling_price)}
                  </span>
                  <Plus className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Active Cart & Tender Summary */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col p-4">
        {/* Top selects: Warehouse & Customer */}
        <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Gudang</label>
            <select
              value={warehouseID}
              onChange={(e) => setWarehouseID(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            >
              {warehouses?.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pelanggan</label>
            <select
              value={customerID}
              onChange={(e) => setCustomerID(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Tanpa Pelanggan (Umum / Cash) --</option>
              {customers?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <Barcode className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Keranjang kasir masih kosong</p>
              <p className="text-[11px] text-slate-400">Scan barcode atau klik item produk di sebelah kiri.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product_id}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(item.unit_price)} / {item.unit_name}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQty(item.product_id, -1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-slate-800">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.product_id, 1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatCurrency(item.total_amount)}</p>
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="text-[10px] text-red-500 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal Produk</span>
            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>PPN (11%)</span>
            <span className="font-semibold text-slate-800">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Tagihan</span>
            <span className="text-emerald-600">{formatCurrency(grandTotal)}</span>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="px-3 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-xs transition disabled:opacity-40"
            >
              Kosongkan
            </button>
            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20 disabled:opacity-40"
            >
              Bayar (F9) &bull; {formatCurrency(grandTotal)}
            </button>
          </div>
        </div>
      </div>

      {/* Payment / Tender Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Pembayaran Kasir POS</h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Display */}
            <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
              <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Total Yang Harus Dibayar</p>
              <h2 className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(grandTotal)}</h2>
            </div>

            {/* Payment Method Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Metode Pembayaran</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "CASH", label: "Tunai", icon: Banknote },
                  { id: "BCA_TRF", label: "BCA Trf", icon: CreditCard },
                  { id: "QRIS", label: "QRIS", icon: QrCode },
                  { id: "EDC_DEBIT", label: "Debit EDC", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setTenderMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition ${tenderMethod === m.id
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tender Amount / Change Calculation */}
            {tenderMethod === "CASH" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Uang Diterima (Rp)</label>
                  <input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Quick denomination chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[grandTotal, 10000, 20000, 50000, 100000, 200000].map((denom, i) => (
                    <button
                      key={i}
                      onClick={() => setCashGiven(denom)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      {i === 0 ? "Uang Pas" : formatCurrency(denom)}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Uang Kembalian:</span>
                  <span className="text-base font-black text-slate-900">{formatCurrency(change)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleProcessPayment}
              disabled={submitting || (tenderMethod === "CASH" && cashGiven < grandTotal)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? "Memproses Transaksi..." : "Selesaikan Transaksi & Cetak Struk"}
            </button>
          </div>
        </div>
      )}

      {/* Sale Success & Print Dialog */}
      {completedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">Transaksi Kasir Berhasil!</h3>
              <p className="text-xs text-slate-500 mt-0.5">No Faktur: {completedSale.invoice_no}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold">{formatCurrency(completedSale.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dibayar:</span>
                <span className="font-bold">{formatCurrency(completedSale.paid_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembalian:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(completedSale.change_amount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`http://localhost:8080/api/v1/reports/invoices/${completedSale.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Faktur PDF</span>
              </a>
              <button
                onClick={() => setCompletedSale(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARI OBAT / ITEM SALES MODAL */}
      <CariObatSalesModal
        isOpen={isCariModalOpen}
        onClose={() => setIsCariModalOpen(false)}
        onSelect={(prod) => {
          addToCart(prod);
          setIsCariModalOpen(false);
        }}
        saleType="RETAIL_KASIR"
        retailOnly={true}
        warehouseId={warehouseID || undefined}
      />
    </div>
  );
}
