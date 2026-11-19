"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  ShoppingBasket,
  Wrench,
  Package,
  BookOpen,
  PieChart,
  Settings,
  Globe,
  ChevronDown,
  ChevronRight,
  Scale,
  LogOut,
  Pill,
  Puzzle,
  PackageCheck,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

interface NestedSubItem {
  title: string;
  href: string;
}

interface SubMenuItem {
  title: string;
  href: string;
  children?: NestedSubItem[];
}

interface MenuItem {
  title: string;
  href?: string;
  icon: any;
  iconColor?: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    iconColor: "text-amber-500",
  },
  {
    title: "Master Data",
    icon: Database,
    iconColor: "text-indigo-500",
    subItems: [
      { title: "Daftar Item", href: "/master/items" },
      { title: "Kartu Stok", href: "/inventory/stock-card" },
      { title: "Datasheet", href: "/master/datasheet" },
      { title: "Daftar Supplier", href: "/master/suppliers" },
      { title: "Daftar Pelanggan", href: "/master/customers" },
      { title: "Daftar Sales", href: "/master/sales-reps" },
      { title: "Daftar Grup Pelanggan", href: "/master/customer-groups" },
      {
        title: "Wilayah",
        href: "/master/territories",
        children: [
          { title: "Daftar Wilayah", href: "/master/territories" },
          { title: "Daftar Sub Wilayah", href: "/master/sub-territories" },
        ],
      },
      {
        title: "Diskon & Promosi",
        href: "/master/discounts/periodic",
        children: [
          { title: "Diskon Periode", href: "/master/discounts/periodic" },
          { title: "Periode Promosi", href: "/master/promotions/periodic" },
          { title: "Periode Tebus Murah", href: "/master/promotions/tebus-murah" },
        ],
      },
      {
        title: "Data Lainnya",
        href: "/master/customer-points",
        children: [
          { title: "Point Pelanggan", href: "/master/customer-points" },
          { title: "Daftar Satuan", href: "/master/units" },
          { title: "Daftar Merek", href: "/master/brands" },
          { title: "Daftar Jenis", href: "/master/categories" },
          { title: "Daftar Sub Jenis", href: "/master/sub-categories" },
          { title: "Daftar Varian", href: "/master/variants" },
          { title: "Daftar Bank", href: "/master/banks" },
          { title: "Daftar E-Money", href: "/master/e-money" },
          { title: "Daftar Ongkir", href: "/master/shipping-fees" },
          { title: "Dept / Gudang", href: "/master/warehouses" },
        ],
      },
    ],
  },
  {
    title: "Pembelian",
    icon: ShoppingCart,
    iconColor: "text-amber-600",
    subItems: [
      { title: "Pesanan Pembelian", href: "/purchasing/orders" },
      { title: "Pembelian", href: "/purchasing/invoices" },
      {
        title: "Retur Pembelian",
        href: "/purchasing/returns",
        children: [
          { title: "Retur Pembelian", href: "/purchasing/returns" },
          { title: "Retur Baru Mode 1", href: "/purchasing/returns/mode1" },
          { title: "Retur Baru Mode 2", href: "/purchasing/returns/mode2" },
        ],
      },
      { title: "History Harga Beli", href: "/purchasing/price-history" },
      {
        title: "Bayar Hutang",
        href: "/purchasing/payments",
        children: [
          { title: "Daftar Pembayaran", href: "/purchasing/payments" },
          { title: "Status Lunas BG/Cek", href: "/purchasing/payments/bg-check-status" },
        ],
      },
    ],
  },
  {
    title: "Penjualan",
    icon: ShoppingBasket,
    iconColor: "text-emerald-500",
    subItems: [
      { title: "Pesanan Penjualan", href: "/sales/orders" },
      {
        title: "Pesanan Marketplace",
        href: "/ecommerce/orders",
        children: [
          { title: "Daftar Pesanan", href: "/ecommerce/orders" },
          { title: "History Pesanan Marketplace", href: "/ecommerce/marketplace" },
        ],
      },
      { title: "Penjualan", href: "/sales/invoices" },
      { title: "Kasir", href: "/sales/cashier" },
      {
        title: "Retur Penjualan",
        href: "/sales/returns",
        children: [
          { title: "Retur Penjualan", href: "/sales/returns" },
          { title: "Retur Baru Mode 1", href: "/sales/returns/mode1" },
          { title: "Retur Baru Mode 2", href: "/sales/returns/mode2" },
        ],
      },
      {
        title: "Point",
        href: "/sales/points",
        children: [
          { title: "Point Penjualan", href: "/sales/points" },
          { title: "Perbaikan Point Pelanggan", href: "/sales/points/fix" },
        ],
      },
      { title: "History Harga Jual", href: "/sales/price-history" },
      { title: "Data Pengiriman", href: "/sales/deliveries" },
      {
        title: "Bayar Piutang",
        href: "/sales/payments",
        children: [
          { title: "Daftar Pembayaran", href: "/sales/payments" },
          { title: "Status Lunas BG/Cek", href: "/sales/payments/bg-check-status" },
        ],
      },
      {
        title: "Komisi Sales",
        href: "/sales/commissions",
        children: [
          { title: "Daftar Pembayaran", href: "/sales/commissions" },
          { title: "Status Lunas BG/Cek", href: "/sales/commissions/bg-check-status" },
        ],
      },
      { title: "Ekspor CSV/XML Faktur Pajak", href: "/sales/tax-export" },
      { title: "Terminal Harga", href: "/sales/price-terminal" },
    ],
  },
  {
    title: "Perakitan",
    icon: Puzzle,
    iconColor: "text-red-500",
    subItems: [
      { title: "Pesanan Perakitan", href: "/assembly/orders" },
      { title: "Proses Perakitan", href: "/assembly/process" },
      { title: "Proses Jadi", href: "/assembly/finished" },
    ],
  },
  {
    title: "Persediaan",
    icon: PackageCheck,
    iconColor: "text-amber-500",
    subItems: [
      { title: "Item Masuk", href: "/inventory/in" },
      { title: "Item Keluar", href: "/inventory/out" },
      {
        title: "Item Transfer",
        href: "/inventory/transfers",
        children: [
          { title: "Pesanan Item Transfer", href: "/inventory/transfer-orders" },
          { title: "Item Transfer", href: "/inventory/transfers" },
        ],
      },
      { title: "Saldo Awal", href: "/inventory/initial-stock" },
      { title: "Stock Opname", href: "/inventory/opname" },
      { title: "Stock Minimum", href: "/inventory/minimum-stock" },
      { title: "Proses Perbaikan Saldo", href: "/inventory/fix-balance" },
      { title: "Koreksi Nilai Persediaan", href: "/inventory/cost-correction" },
      { title: "Riwayat Serial", href: "/inventory/serial-history" },
    ],
  },
  {
    title: "Akuntansi",
    icon: BookOpen,
    iconColor: "text-purple-600",
    subItems: [
      { title: "Daftar Perkiraan", href: "/accounting/accounts" },
      { title: "Kas Masuk", href: "/accounting/cash-in" },
      { title: "Kas Keluar", href: "/accounting/cash-out" },
      { title: "Kas Transfer", href: "/accounting/cash-transfer" },
      { title: "Jurnal", href: "/accounting/journals" },
      { title: "Buku Besar", href: "/accounting/ledger" },
      {
        title: "Deposit",
        href: "/accounting/deposits/supplier",
        children: [
          { title: "Deposit Supplier", href: "/accounting/deposits/supplier" },
          { title: "Deposit Pelanggan", href: "/accounting/deposits/customer" },
          { title: "Deposit Saldo", href: "/accounting/deposits/balance" },
        ],
      },
      {
        title: "Pengaturan Aset",
        href: "/accounting/assets",
        children: [
          { title: "Daftar Aset", href: "/accounting/assets" },
          { title: "Daftar Grup Aset", href: "/accounting/assets/groups" },
          { title: "Proses Penyusutan", href: "/accounting/assets/depreciation" },
        ],
      },
      { title: "Proses Tahunan", href: "/accounting/yearly-closing" },
      {
        title: "Lainnya",
        href: "/accounting/initial-balance/accounts",
        children: [
          { title: "Saldo Awal Perkiraan", href: "/accounting/initial-balance/accounts" },
          { title: "Saldo Awal Hutang", href: "/accounting/initial-balance/payables" },
          { title: "Saldo Awal Piutang", href: "/accounting/initial-balance/receivables" },
          { title: "Setting Perkiraan", href: "/accounting/account-settings" },
          { title: "Catatan Transaksi", href: "/accounting/audit-notes" },
        ],
      },
    ],
  },
  {
    title: "Laporan",
    icon: PieChart,
    iconColor: "text-violet-500",
    subItems: [
      { title: "Laporan Penjualan (Excel)", href: "/reports/sales" },
      { title: "Laporan Persediaan (Excel)", href: "/reports/inventory" },
    ],
  },
  {
    title: "Pengaturan",
    icon: Settings,
    iconColor: "text-slate-500",
    subItems: [
      { title: "Profil Perusahaan", href: "/settings/company" },
      { title: "Manajemen Pengguna", href: "/settings/users" },
      { title: "Format Penomoran", href: "/settings/numbering" },
      { title: "Jejak Audit BPOM", href: "/settings/audit-logs" },
    ],
  },
  {
    title: "E-commerce",
    icon: Globe,
    iconColor: "text-sky-500",
    subItems: [
      { title: "Integrasi Marketplace", href: "/ecommerce/marketplace" },
      { title: "Pesanan Online", href: "/ecommerce/orders" },
    ],
  },
];

export const Sidebar: React.FC<{ isOpen: boolean; onClose?: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    "Master Data":
      pathname.startsWith("/master") ||
      pathname.startsWith("/inventory/stock-card") ||
      pathname === "/itemad" ||
      pathname === "/kartustok" ||
      pathname === "/datasheet",
    Pembelian:
      pathname.startsWith("/purchasing") ||
      pathname.startsWith("/belilist") ||
      pathname.startsWith("/returbelilist"),
    Penjualan:
      pathname.startsWith("/pos") ||
      pathname.startsWith("/sales") ||
      pathname.startsWith("/ecommerce"),
    Perakitan: pathname.startsWith("/assembly"),
    Persediaan: pathname.startsWith("/inventory") && !pathname.includes("stock-card"),
    Akuntansi: pathname.startsWith("/accounting"),
    Laporan: pathname.startsWith("/reports"),
    Pengaturan: pathname.startsWith("/settings"),
    "E-commerce": pathname.startsWith("/ecommerce"),
  });

  const [openNested, setOpenNested] = useState<{ [key: string]: boolean }>({
    Wilayah: pathname.includes("/territories") || pathname.includes("/sub-territories"),
    "Diskon & Promosi": pathname.includes("/discounts") || pathname.includes("/promotions"),
    "Data Lainnya":
      pathname.includes("/customer-points") ||
      pathname.includes("/units") ||
      pathname.includes("/brands") ||
      pathname.includes("/categories") ||
      pathname.includes("/sub-categories") ||
      pathname.includes("/variants") ||
      pathname.includes("/banks") ||
      pathname.includes("/e-money") ||
      pathname.includes("/shipping-fees") ||
      pathname.includes("/warehouses"),
    "Retur Pembelian":
      pathname.includes("/purchasing/returns") || pathname.includes("/returbelilist"),
    "Bayar Hutang": pathname.includes("/purchasing/payments"),
    // Penjualan sub-groups
    "Pesanan Marketplace": pathname.startsWith("/ecommerce"),
    "Retur Penjualan": pathname.startsWith("/sales/returns"),
    Point: pathname.startsWith("/sales/points"),
    "Bayar Piutang": pathname.startsWith("/sales/payments"),
    "Komisi Sales": pathname.startsWith("/sales/commissions"),
    // Persediaan sub-groups
    "Item Transfer": pathname.includes("/inventory/transfer"),
    // Akuntansi sub-groups
    Deposit: pathname.includes("/accounting/deposits"),
    "Pengaturan Aset": pathname.includes("/accounting/assets"),
    Lainnya:
      pathname.includes("/accounting/initial-balance") ||
      pathname.includes("/accounting/account-settings") ||
      pathname.includes("/accounting/audit-notes"),
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleNested = (title: string) => {
    setOpenNested((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const displayName = user?.full_name?.split(" ")[0] || user?.username || "Admin";
  const userRole = user?.roles?.[0] || "SUPER ADMIN";
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-52 bg-white text-slate-700 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 select-none shadow-[2px_0_8px_rgba(0,0,0,0.03)] border-r border-slate-200/90 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* 1. BRAND HEADER (Compact Width) */}
      <div className="h-13 px-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00c875] to-emerald-700 flex items-center justify-center text-white shadow-xs shadow-emerald-500/20 shrink-0">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-[13px] tracking-tight text-slate-900 leading-none block truncate">
              Ketoko.co.id
            </span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 uppercase tracking-wider block mt-0.5 w-fit leading-none">
              ERP &amp; POS
            </span>
          </div>
        </Link>
      </div>

      {/* 2. HERO ACTION SHORTCUT (Quick Open POS Cashier) */}
      <div className="px-2.5 pt-2 pb-1 shrink-0">
        <Link
          href="/pos"
          onClick={onClose}
          className="w-full py-1.5 px-2 bg-gradient-to-r from-[#00c875] to-emerald-600 hover:from-[#00b067] hover:to-emerald-700 active:scale-[0.98] text-white font-bold rounded-lg shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-1.5 text-[11px] transition-all duration-150"
        >
          <Scale className="w-3.5 h-3.5 text-white" />
          <span>Buka Kasir POS</span>
        </Link>
      </div>

      {/* 3. SCROLLABLE MENU HIERARCHY */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5 text-xs scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubs = item.subItems && item.subItems.length > 0;
          const isGroupOpen = openGroups[item.title];
          const isCurrentActive = item.href === pathname;

          if (!hasSubs && item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all duration-150 ${
                  isCurrentActive
                    ? "bg-[#00c875] text-white font-bold shadow-sm shadow-[#00c875]/30"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isCurrentActive ? "text-white" : item.iconColor || "text-slate-400"
                  }`}
                />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          }

          // Group Menu (with Collapsible Sub-Items)
          const isAnyChildActive = item.subItems?.some((sub) => {
            if (pathname === sub.href) return true;
            if (sub.children?.some((child) => child.href === pathname)) return true;
            return false;
          });

          return (
            <div key={item.title} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(item.title)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all duration-150 ${
                  isAnyChildActive
                    ? "text-emerald-900 bg-emerald-50/90 font-bold border border-emerald-200/80"
                    : isGroupOpen
                    ? "text-slate-800 bg-slate-50 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isAnyChildActive ? "text-[#00c875]" : item.iconColor || "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.title}</span>
                </div>
                {isGroupOpen ? (
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                )}
              </button>

              {/* Sub Menu Drawer */}
              {isGroupOpen && item.subItems && (
                <div className="pl-2.5 pr-0.5 py-0.5 space-y-0.5 border-l-2 border-slate-100 ml-2.5">
                  {item.subItems.map((sub) => {
                    const hasChildren = sub.children && sub.children.length > 0;
                    const isNestedOpen = openNested[sub.title];
                    const isSubActive =
                      pathname === sub.href ||
                      (sub.href === "/master/items" &&
                        (pathname.startsWith("/master/items") || pathname === "/itemad")) ||
                      (sub.href === "/inventory/stock-card" &&
                        (pathname.startsWith("/inventory/stock-card") || pathname === "/kartustok")) ||
                      (sub.href === "/master/datasheet" &&
                        (pathname.startsWith("/master/datasheet") || pathname === "/datasheet"));

                    if (hasChildren) {
                      const isAnyGrandchildActive = sub.children!.some(
                        (c) => pathname === c.href
                      );

                      return (
                        <div key={sub.title} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => toggleNested(sub.title)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-all ${
                              isAnyGrandchildActive
                                ? "text-emerald-900 font-bold bg-emerald-50"
                                : isNestedOpen
                                ? "text-slate-800 font-semibold bg-slate-50"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium"
                            }`}
                          >
                            <span className="truncate">{sub.title}</span>
                            {isNestedOpen ? (
                              <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                            ) : (
                              <ChevronRight className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                            )}
                          </button>

                          {/* Nested Sub-Children */}
                          {isNestedOpen && (
                            <div className="pl-2.5 pr-0.5 py-0.5 space-y-0.5 border-l border-slate-200 ml-1.5">
                              {sub.children!.map((child) => {
                                const isChildActive = pathname === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={onClose}
                                    className={`block px-2 py-1 rounded text-[10.5px] transition-all truncate ${
                                      isChildActive
                                        ? "bg-[#00c875] text-white font-bold shadow-xs shadow-[#00c875]/30"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    }`}
                                  >
                                    {child.title}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Direct Sub-Item Link
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onClose}
                        className={`block px-2 py-1 rounded-md text-[11px] transition-all truncate ${
                          isSubActive
                            ? "bg-[#00c875] text-white font-bold shadow-xs shadow-[#00c875]/30"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        {sub.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. PINNED MODERN USER PROFILE FOOTER */}
      <div className="p-2.5 bg-slate-50/90 border-t border-slate-200/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] border border-emerald-200 shrink-0 shadow-xs">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">
              {displayName}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[8.5px] font-extrabold px-1 py-0.2 rounded leading-tight uppercase truncate">
                {userRole}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Keluar dari Sistem (Logout)"
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors ml-1"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
