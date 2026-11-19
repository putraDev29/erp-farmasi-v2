"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Building,
  User,
  Shield,
  Search,
  Sparkles,
  Scale,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Determine current page title & category
  let pageTitle = "Dashboard";
  let pageCategory = "Home";
  let hasBack = false;
  let backHref = "/dashboard";

  if (pathname.includes("/master/items/new") || pathname === "/itemad") {
    pageTitle = "Tambah Item Baru";
    pageCategory = "Master Data";
    hasBack = true;
    backHref = "/master/items";
  } else if (pathname.includes("/master/items/") && pathname.includes("/edit")) {
    pageTitle = "Ubah Data Item";
    pageCategory = "Master Data";
    hasBack = true;
    backHref = "/master/items";
  } else if (pathname.includes("/master/items")) {
    pageTitle = "Daftar Item & Harga";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/inventory/stock-card") || pathname === "/kartustok") {
    pageTitle = "Kartu Stok (Ledger Mutasi)";
    pageCategory = "Gudang & Inventori";
  } else if (pathname.includes("/master/datasheet") || pathname === "/datasheet") {
    pageTitle = "Datasheet & Spesifikasi";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/suppliers") || pathname === "/listsupp") {
    pageTitle = "Daftar Supplier (Pemasok)";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/customers")) {
    pageTitle = "Daftar Pelanggan (Pasien)";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/sales-reps")) {
    pageTitle = "Daftar Sales Representative";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/customer-groups")) {
    pageTitle = "Daftar Grup Pelanggan";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/territories")) {
    pageTitle = "Daftar Wilayah";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/sub-territories")) {
    pageTitle = "Daftar Sub Wilayah";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/discounts/periodic")) {
    pageTitle = "Diskon Periode";
    pageCategory = "Diskon & Promosi";
  } else if (pathname.includes("/master/promotions/periodic")) {
    pageTitle = "Periode Promosi";
    pageCategory = "Diskon & Promosi";
  } else if (pathname.includes("/master/promotions/tebus-murah")) {
    pageTitle = "Periode Tebus Murah";
    pageCategory = "Diskon & Promosi";
  } else if (pathname.includes("/master/customer-points")) {
    pageTitle = "Setting Point Pelanggan";
    pageCategory = "Diskon & Promosi";
  } else if (pathname.includes("/master/units")) {
    pageTitle = "Daftar Satuan (Units)";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/brands")) {
    pageTitle = "Daftar Merek (Brand)";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/categories")) {
    pageTitle = "Daftar Jenis (Kategori)";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/sub-categories")) {
    pageTitle = "Daftar Sub Jenis";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/variants") || pathname === "/listvarian") {
    pageTitle = "Daftar Varian";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/banks") || pathname === "/listbank") {
    pageTitle = "Daftar Rekening Bank";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/e-money") || pathname === "/listemoney") {
    pageTitle = "Daftar E-Money & QRIS";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/shipping-fees") || pathname === "/listongkir") {
    pageTitle = "Daftar Ongkos Kirim (Ongkir)";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/master/warehouses") || pathname === "/listdept") {
    pageTitle = "Daftar Gudang / Departemen";
    pageCategory = "Master Data Depo";
  } else if (pathname.includes("/pos")) {
    pageTitle = "Kasir POS & Resep";
    pageCategory = "Transaksi Kasir";
  } else if (pathname.includes("/purchasing/orders")) {
    pageTitle = "Pesanan Pembelian (PO)";
    pageCategory = "Pembelian";
  } else if (pathname.includes("/purchasing/invoices")) {
    pageTitle = "Faktur Penerimaan Barang";
    pageCategory = "Pembelian";
  } else if (pathname.includes("/purchasing/payments")) {
    pageTitle = "Pembayaran Hutang Pemasok";
    pageCategory = "Keuangan";
  } else if (pathname.includes("/sales/orders")) {
    pageTitle = "Pesanan Penjualan (SO)";
    pageCategory = "Penjualan";
  } else if (pathname.includes("/sales/invoices")) {
    pageTitle = "Faktur Penjualan (Grosir)";
    pageCategory = "Penjualan";
  } else if (pathname.includes("/sales/payments")) {
    pageTitle = "Pelunasan Piutang Pelanggan";
    pageCategory = "Keuangan";
  } else if (pathname.includes("/inventory/balances")) {
    pageTitle = "Stok & Nilai Barang Gudang";
    pageCategory = "Gudang & Inventori";
  } else if (pathname.includes("/inventory/opname")) {
    pageTitle = "Stok Opname Fisik";
    pageCategory = "Gudang & Inventori";
  } else if (pathname.includes("/inventory/transfers")) {
    pageTitle = "Transfer Antar Gudang";
    pageCategory = "Gudang & Inventori";
  } else if (pathname.includes("/accounting/accounts")) {
    pageTitle = "Bagan Akun (Chart of Accounts)";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/accounting/journals")) {
    pageTitle = "Jurnal Pembukuan";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/accounting/manual-journal")) {
    pageTitle = "Input Jurnal Manual (Biaya Kas)";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/accounting/ledger")) {
    pageTitle = "Buku Besar (General Ledger)";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/accounting/trial-balance")) {
    pageTitle = "Neraca Saldo";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/accounting/profit-and-loss")) {
    pageTitle = "Laporan Laba Rugi";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/accounting/balance-sheet")) {
    pageTitle = "Laporan Neraca";
    pageCategory = "Akuntansi";
  } else if (pathname.includes("/reports")) {
    pageTitle = "Laporan & Analitik Bisnis";
    pageCategory = "Laporan";
  } else if (pathname.includes("/ecommerce")) {
    pageTitle = "Integrasi E-Commerce";
    pageCategory = "Marketplace";
  } else if (pathname.includes("/settings")) {
    pageTitle = "Pengaturan Sistem";
    pageCategory = "Pengaturan";
  }

  const initialLetter = (user?.full_name || user?.username || "David").charAt(0).toUpperCase();

  return (
    <header className="h-11 sm:h-12 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] shrink-0">
      {/* Left: Hamburger + Modern Breadcrumb Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden transition shrink-0"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {hasBack ? (
          <div className="flex items-center gap-2">
            <Link
              href={backHref}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
              title="Kembali"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                {pageCategory}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {pageTitle}
              </h1>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              {pageCategory}
            </span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {pageTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Right Controls: Branch Badge, Quick POS Button, Bell, User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Branch / Depo Badge with Live Dot */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-700">APOTEK BERKAT PURNAMA [UTAMA]</span>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 uppercase">
            Aktif
          </span>
        </div>

        {/* Quick Shortcut to Kasir & POS */}
        <Link
          href="/pos"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00a86b] hover:bg-[#00925d] text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Buka Kasir</span>
        </Link>

        {/* Notification Bell */}
        <div className="relative cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition">
          <Bell className="w-4 h-4" />
          <span className="absolute 1 top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
          >
            <div className="w-7 h-7 rounded-full bg-[#064e3b] text-emerald-300 font-bold flex items-center justify-center text-xs shadow-xs border border-emerald-500/30">
              {initialLetter}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                {user?.full_name?.split(" ")[0] || "David"}
              </span>
              <span className="text-[9px] font-bold text-purple-700 uppercase block">
                {user?.roles?.[0] || "SUPER ADMIN"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-800 text-xs">{user?.full_name || "David"}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user?.username || "admin"}</p>
                <span className="inline-block mt-1 bg-purple-100 text-purple-800 font-semibold text-[9px] px-1.5 py-0.2 rounded border border-purple-200 uppercase">
                  {user?.roles?.[0] || "SUPER ADMIN"}
                </span>
              </div>

              <Link
                href="/settings/company"
                onClick={() => setUserDropdownOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Profil Perusahaan</span>
              </Link>
              <Link
                href="/settings/users"
                onClick={() => setUserDropdownOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Manajemen Hak Akses</span>
              </Link>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => {
                  setUserDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Keluar dari Sistem</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
