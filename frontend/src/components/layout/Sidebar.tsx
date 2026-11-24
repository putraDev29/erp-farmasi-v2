"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface NestedSubItem {
  title: string;
  href: string;
  children?: NestedSubItem[];
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
      { title: "Obat Kadaluarsa (ED)", href: "/inventory/expired" },
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
    href: "/reports",
    subItems: [
      { title: "Menu Laporan", href: "/reports" },
      { title: "Laporan Penjualan (Excel)", href: "/reports/sales" },
      { title: "Laporan Persediaan (Excel)", href: "/reports/inventory" },
    ],
  },
  {
    title: "Pengaturan",
    icon: Settings,
    iconColor: "text-purple-500",
    subItems: [
      {
        title: "Data User",
        href: "/settings/roles",
        children: [
          { title: "Kelompok Akses User", href: "/settings/roles" },
          { title: "Daftar User", href: "/settings/users" },
        ],
      },
      { title: "Pengaturan Tema", href: "/settings/theme" },
      { title: "Pengaturan Umum", href: "/settings/general" },
      { title: "Pengaturan Perusahaan", href: "/settings/company" },
      { title: "Integrasi PPOB", href: "/settings/ppob" },
      { title: "Integrasi Marketplace", href: "/settings/marketplace" },
      { title: "Integrasi Payment Gateway", href: "/settings/payment-gateway" },
      { title: "Mini Printer", href: "/settings/printer" },
      {
        title: "Setting Nomor",
        href: "/settings/numbering/master",
        children: [
          { title: "Setting Nomor Master", href: "/settings/numbering/master" },
          { title: "Setting Nomor Transaksi", href: "/settings/numbering/transactions" },
        ],
      },
      { title: "Log Aktivitas", href: "/settings/audit-logs" },
      { title: "Daftar Modul Terbuka", href: "/settings/open-modules" },
      {
        title: "Import Data",
        href: "/settings/import/supplier",
        children: [
          { title: "Import Data Supplier", href: "/settings/import/supplier" },
          { title: "Import Data Pelanggan", href: "/settings/import/customer" },
          { title: "Import Data Sales", href: "/settings/import/sales" },
          { title: "Import Data Item Satu Harga", href: "/settings/import/item-single-price" },
          { title: "Import Data Item Satuan", href: "/settings/import/item-units" },
          { title: "Import Data Item Jumlah", href: "/settings/import/item-quantity" },
          { title: "Import Data Item Level", href: "/settings/import/item-level" },
          {
            title: "Import Data Item Varian",
            href: "/settings/import/variant-quantity",
            children: [
              { title: "Import Varian Jumlah", href: "/settings/import/variant-quantity" },
              { title: "Import Varian Level", href: "/settings/import/variant-level" },
            ],
          },
        ],
      },
      { title: "Pengaturan Database", href: "/settings/database" },
      { title: "Informasi Sistem", href: "/settings/system-info" },
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
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const { data: generalSettings } = useQuery({
    queryKey: ["settings-general"],
    queryFn: async () => {
      try {
        const res = await api.get("/settings/groups/GENERAL");
        return res.data?.data || {};
      } catch {
        return {};
      }
    },
    staleTime: 300000,
  });

  const brandName = generalSettings?.app_brand_name || "Ketoko.co.id";
  const brandSubtitle = generalSettings?.app_brand_subtitle || "ERP & POS";

  useEffect(() => {
    const savedMode = localStorage.getItem("erp_theme_mode");
    if (savedMode === "dark") {
      setThemeMode("dark");
    }
  }, []);

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

  // Automatically keep current section expanded if navigating between routes
  useEffect(() => {
    if (pathname.startsWith("/master") || pathname.startsWith("/inventory/stock-card") || pathname === "/itemad" || pathname === "/kartustok" || pathname === "/datasheet") {
      setOpenGroups((prev) => ({ ...prev, "Master Data": true }));
    } else if (pathname.startsWith("/purchasing") || pathname.startsWith("/belilist") || pathname.startsWith("/returbelilist")) {
      setOpenGroups((prev) => ({ ...prev, Pembelian: true }));
    } else if (pathname.startsWith("/pos") || pathname.startsWith("/sales") || pathname.startsWith("/ecommerce")) {
      setOpenGroups((prev) => ({ ...prev, Penjualan: true }));
    } else if (pathname.startsWith("/assembly")) {
      setOpenGroups((prev) => ({ ...prev, Perakitan: true }));
    } else if (pathname.startsWith("/inventory") && !pathname.includes("stock-card")) {
      setOpenGroups((prev) => ({ ...prev, Persediaan: true }));
    } else if (pathname.startsWith("/accounting")) {
      setOpenGroups((prev) => ({ ...prev, Akuntansi: true }));
    } else if (pathname.startsWith("/reports")) {
      setOpenGroups((prev) => ({ ...prev, Laporan: true }));
    } else if (pathname.startsWith("/settings")) {
      setOpenGroups((prev) => ({ ...prev, Pengaturan: true }));
    }
  }, [pathname]);

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
    // Pengaturan sub-groups
    "Data User": pathname.startsWith("/settings/roles") || pathname.startsWith("/settings/users"),
    "Setting Nomor": pathname.startsWith("/settings/numbering"),
    "Import Data": pathname.startsWith("/settings/import"),
    "Import Data Item Varian": pathname.includes("/settings/import/variant"),
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

  const handleLinkClick = (href: string) => {
    if (href !== pathname) {
      setPendingPath(href);
    }
    if (typeof window !== "undefined" && window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  const handleMouseEnter = (href: string) => {
    try {
      router.prefetch(href);
    } catch {}
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-52 flex flex-col transition-transform duration-300 ease-in-out select-none shadow-[2px_0_8px_rgba(0,0,0,0.03)] border-r bg-white text-slate-700 border-slate-200/90 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* 1. BRAND HEADER (Compact Width) */}
      <div className="h-13 sm:h-14 px-3 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00c875] to-emerald-700 flex items-center justify-center text-white shadow-xs shadow-emerald-500/20 shrink-0">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="font-extrabold text-[13px] tracking-tight leading-snug block truncate pt-0.5 text-slate-900">
              {brandName}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 uppercase tracking-wider block mt-0.5 w-fit leading-none">
              {brandSubtitle}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. HERO ACTION SHORTCUT (Quick Open POS Cashier) */}
      {/* <div className="px-2.5 pt-2 pb-1 shrink-0">
        <Link
          href="/pos"
          onClick={handleLinkClick}
          className="w-full py-1.5 px-2 bg-gradient-to-r from-[#00c875] to-emerald-600 hover:from-[#00b067] hover:to-emerald-700 active:scale-[0.98] text-white font-bold rounded-lg shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-1.5 text-[11px] transition-all duration-150"
        >
          <Scale className="w-3.5 h-3.5 text-white" />
          <span>Buka Kasir POS</span>
        </Link>
      </div> */}

      {/* 3. SCROLLABLE MENU HIERARCHY */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5 text-xs scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubs = item.subItems && item.subItems.length > 0;
          const isGroupOpen = openGroups[item.title];
          const isCurrentActive = item.href === pathname;

          if (!hasSubs && item.href) {
            const isCurrentActive = item.href === pathname || pendingPath === item.href;
            const isPending = pendingPath === item.href;

            return (
              <Link
                key={item.title}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => handleMouseEnter(item.href!)}
                onClick={() => handleLinkClick(item.href!)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all duration-150 ${
                  isCurrentActive
                    ? "bg-[#00c875] text-white font-bold shadow-xs shadow-emerald-500/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isCurrentActive ? "text-white" : item.iconColor || "text-slate-400"
                  }`}
                />
                <span className="truncate flex-1">{item.title}</span>
                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />}
              </Link>
            );
          }

          // Group Menu (with Collapsible Sub-Items)
          const isAnyChildActive = item.subItems?.some((sub) => {
            if (pathname === sub.href || pendingPath === sub.href) return true;
            if (sub.children?.some((child) => child.href === pathname || child.href === pendingPath)) return true;
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
                <div className="pl-2.5 pr-0.5 py-0.5 space-y-0.5 border-l-2 ml-2.5 border-slate-100">
                  {item.subItems.map((sub) => {
                    const hasChildren = sub.children && sub.children.length > 0;
                    const isNestedOpen = openNested[sub.title];
                    const isSubActive =
                      pathname === sub.href ||
                      pendingPath === sub.href ||
                      (sub.href === "/master/items" &&
                        (pathname.startsWith("/master/items") || pathname === "/itemad")) ||
                      (sub.href === "/inventory/stock-card" &&
                        (pathname.startsWith("/inventory/stock-card") || pathname === "/kartustok")) ||
                      (sub.href === "/master/datasheet" &&
                        (pathname.startsWith("/master/datasheet") || pathname === "/datasheet"));
                    const isPending = pendingPath === sub.href;

                    if (hasChildren) {
                      const isAnyGrandchildActive = sub.children!.some(
                        (c) => pathname === c.href || pendingPath === c.href
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
                            <div className="pl-2.5 pr-0.5 py-0.5 space-y-0.5 border-l ml-1.5 border-slate-200">
                              {sub.children!.map((child) => {
                                const hasGrandchildren = child.children && child.children.length > 0;
                                if (hasGrandchildren) {
                                  const isChildNestedOpen = openNested[child.title];
                                  const isAnyGcActive = child.children!.some(
                                    (gc) => pathname === gc.href || pendingPath === gc.href
                                  );

                                  return (
                                    <div key={child.title} className="space-y-0.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleNested(child.title)}
                                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10.5px] transition-all ${
                                          isAnyGcActive
                                            ? "text-emerald-900 font-bold bg-emerald-50"
                                            : isChildNestedOpen
                                            ? "text-slate-800 font-semibold bg-slate-50"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium"
                                        }`}
                                      >
                                        <span className="truncate">{child.title}</span>
                                        {isChildNestedOpen ? (
                                          <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                                        ) : (
                                          <ChevronRight className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                                        )}
                                      </button>

                                      {isChildNestedOpen && (
                                        <div className="pl-2 pr-0.5 py-0.5 space-y-0.5 border-l ml-1.5 border-slate-200">
                                          {child.children!.map((gc) => {
                                            const isGcActive = pathname === gc.href || pendingPath === gc.href;
                                            const isGcPending = pendingPath === gc.href;
                                            return (
                                              <Link
                                                key={gc.href}
                                                href={gc.href}
                                                prefetch={true}
                                                onMouseEnter={() => handleMouseEnter(gc.href)}
                                                onClick={() => handleLinkClick(gc.href)}
                                                className={`flex items-center justify-between px-2 py-0.5 rounded text-[10px] transition-all truncate ${
                                                  isGcActive
                                                    ? "bg-[#00c875] text-white font-bold shadow-xs shadow-[#00c875]/30"
                                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                                }`}
                                              >
                                                <span className="truncate">{gc.title}</span>
                                                {isGcPending && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0 ml-1" />}
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                const isChildActive = pathname === child.href || pendingPath === child.href;
                                const isChildPending = pendingPath === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    prefetch={true}
                                    onMouseEnter={() => handleMouseEnter(child.href)}
                                    onClick={() => handleLinkClick(child.href)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-[10.5px] transition-all truncate ${
                                      isChildActive
                                        ? "bg-[#00c875] text-white font-bold shadow-xs shadow-[#00c875]/30"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span className="truncate">{child.title}</span>
                                    {isChildPending && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0 ml-1" />}
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
                        prefetch={true}
                        onMouseEnter={() => handleMouseEnter(sub.href)}
                        onClick={() => handleLinkClick(sub.href)}
                        className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-all truncate ${
                          isSubActive
                            ? "bg-[#00c875] text-white font-bold shadow-xs shadow-[#00c875]/30"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        <span className="truncate">{sub.title}</span>
                        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0 ml-1" />}
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
      <div className="p-2.5 border-t border-slate-200/90 bg-slate-50/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] border border-emerald-200 shrink-0 shadow-xs">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">
              {displayName}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8.5px] font-extrabold px-1 py-0.2 rounded leading-tight uppercase truncate">
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
