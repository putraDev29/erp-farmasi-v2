"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  Save,
  Check,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Info,
  Scale,
  Monitor,
  Receipt,
  ShoppingCart,
  FileSpreadsheet,
  Settings,
} from "lucide-react";
import { api } from "@/lib/api";

type TabKey = "umum" | "transaksi" | "penjualan_kasir" | "desimal" | "timbangan" | "terminal";

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("umum");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. TAB UMUM (Screenshot 10)
  const [appBrandName, setAppBrandName] = useState("Ketoko.co.id");
  const [appBrandSubtitle, setAppBrandSubtitle] = useState("ERP & POS");
  const [enableReportDesigner, setEnableReportDesigner] = useState(false);
  const [showDebtReminder, setShowDebtReminder] = useState(true);
  const [enableCashDrawerMode, setEnableCashDrawerMode] = useState(false);
  const [itemFormMode, setItemFormMode] = useState("Sedang");
  const [dataViewMode, setDataViewMode] = useState("Tampil Semua Data");
  const [itemRowMode, setItemRowMode] = useState("Tampil Sesuai Satuan");
  const [returnMode, setReturnMode] = useState("Mode 2");
  const [timezone, setTimezone] = useState("Asia/Jakarta (WIB)");
  const [maxSearchRows, setMaxSearchRows] = useState("50");
  const [chartSeriesMode, setChartSeriesMode] = useState("Nama Item");
  const [bindAddressToBranch, setBindAddressToBranch] = useState(false);
  const [stockUseBranchAccount, setStockUseBranchAccount] = useState(false);

  // 2. TAB TRANSAKSI (Screenshot 14)
  const [showImageTransaction, setShowImageTransaction] = useState(false);
  const [confirmPriceBelowHpp, setConfirmPriceBelowHpp] = useState(true);
  const [minProfitPercent, setMinProfitPercent] = useState("0");
  const [enableBrandColumn, setEnableBrandColumn] = useState(false);
  const [enableInfoColumn, setEnableInfoColumn] = useState(false);
  const [enableExpProdColumn, setEnableExpProdColumn] = useState(true);
  const [editButtonCanViewMaster, setEditButtonCanViewMaster] = useState(false);
  const [viewDataTxEditOff, setViewDataTxEditOff] = useState(false);
  const [checkOpenModuleOption, setCheckOpenModuleOption] = useState("Tidak aktif");
  const [barcodeInputMode, setBarcodeInputMode] = useState("Mode 1");
  const [purchaseTaxIncludeOption, setPurchaseTaxIncludeOption] = useState("Pajak Dimasukkan dalam Persediaan");
  const [transactionCostOption, setTransactionCostOption] = useState("Tidak ditambah dengan Total");
  const [allowOutOfStockSale, setAllowOutOfStockSale] = useState("Tidak");
  const [warnOutOfStock, setWarnOutOfStock] = useState("Ya Tampil");
  const [allowZeroQtyInput, setAllowZeroQtyInput] = useState("Bisa");
  const [checkDepositPerWarehouse, setCheckDepositPerWarehouse] = useState("Tidak aktif");
  const [blockDeleteDetailCredit, setBlockDeleteDetailCredit] = useState("Aktif");
  const [dueDateDays, setDueDateDays] = useState("10");
  const [taxSystem, setTaxSystem] = useState("Include");
  const [taxType, setTaxType] = useState("PPN 11%");
  const [defaultTaxRate, setDefaultTaxRate] = useState("11");
  const [debtPaymentInputMode, setDebtPaymentInputMode] = useState("Mode Lama");
  const [itemTransferInputMode, setItemTransferInputMode] = useState("Mode Biasa");

  // 3. TAB PENJUALAN / KASIR (Screenshot 12)
  const [enableRounding, setEnableRounding] = useState(true);
  const [smallestFractionMode, setSmallestFractionMode] = useState("Custom");
  const [customFractionValue, setCustomFractionValue] = useState("100.00");
  const [itemSelectionMode, setItemSelectionMode] = useState("Pilih satu persatu");
  const [defaultGeneralCustomer, setDefaultGeneralCustomer] = useState("KASIR - KASIR");
  const [posInputMode, setPosInputMode] = useState("Mode Lama");
  const [showPaymentTypeStatus, setShowPaymentTypeStatus] = useState(true);
  const [selectCustomerAutoSales, setSelectCustomerAutoSales] = useState(true);
  const [distinctTxNumberPosSales, setDistinctTxNumberPosSales] = useState(false);
  const [confirmChangeCustomer, setConfirmChangeCustomer] = useState("Ya Tampil");
  const [pendingTodaySameShift, setPendingTodaySameShift] = useState(true);
  const [popupPriceHistoryOnFocus, setPopupPriceHistoryOnFocus] = useState(false);

  // 4. TAB DESIMAL DIGIT (Screenshot 7)
  const [decimalDigitsPrice, setDecimalDigitsPrice] = useState("2");
  const [decimalDigitsQty, setDecimalDigitsQty] = useState("2");
  const [decimalDigitsTax, setDecimalDigitsTax] = useState("2");
  const [decimalDigitsDiscount, setDecimalDigitsDiscount] = useState("2");

  // 5. TAB OPSI TIMBANGAN (Screenshot 13)
  const [enableScaleMode, setEnableScaleMode] = useState(false);
  const [scaleFlagDigits, setScaleFlagDigits] = useState("2");
  const [scaleItemCodeDigits, setScaleItemCodeDigits] = useState("5");
  const [scaleWeightDigits, setScaleWeightDigits] = useState("5");
  const [scaleFlag1, setScaleFlag1] = useState("20");
  const [scaleFlag2, setScaleFlag2] = useState("10");
  const [scaleFlag3, setScaleFlag3] = useState("22");
  const [scaleUnitKg, setScaleUnitKg] = useState("KG");
  const [scaleUnitGram, setScaleUnitGram] = useState("GRAM");

  // 6. TAB OPSI TERMINAL (Screenshot 11)
  const [terminalShowStock, setTerminalShowStock] = useState(false);
  const [terminalShowImage, setTerminalShowImage] = useState(false);

  // Load settings from backend
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["settings-general"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/GENERAL");
      return res.data?.data || {};
    },
  });

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      // 1. Umum
      if (settings.app_brand_name !== undefined) setAppBrandName(settings.app_brand_name);
      if (settings.app_brand_subtitle !== undefined) setAppBrandSubtitle(settings.app_brand_subtitle);
      if (settings.enable_report_designer !== undefined) setEnableReportDesigner(settings.enable_report_designer === "true");
      if (settings.show_debt_reminder !== undefined) setShowDebtReminder(settings.show_debt_reminder === "true");
      if (settings.enable_cash_drawer_mode !== undefined) setEnableCashDrawerMode(settings.enable_cash_drawer_mode === "true");
      if (settings.item_form_mode) setItemFormMode(settings.item_form_mode);
      if (settings.data_view_mode) setDataViewMode(settings.data_view_mode);
      if (settings.item_row_mode) setItemRowMode(settings.item_row_mode);
      if (settings.return_mode) setReturnMode(settings.return_mode);
      if (settings.timezone) setTimezone(settings.timezone);
      if (settings.max_search_rows) setMaxSearchRows(settings.max_search_rows);
      if (settings.chart_series_mode) setChartSeriesMode(settings.chart_series_mode);
      if (settings.bind_address_to_branch !== undefined) setBindAddressToBranch(settings.bind_address_to_branch === "true");
      if (settings.stock_use_branch_account !== undefined) setStockUseBranchAccount(settings.stock_use_branch_account === "true");

      // 2. Transaksi
      if (settings.show_image_transaction !== undefined) setShowImageTransaction(settings.show_image_transaction === "true");
      if (settings.confirm_price_below_hpp !== undefined) setConfirmPriceBelowHpp(settings.confirm_price_below_hpp === "true");
      if (settings.min_profit_percent !== undefined) setMinProfitPercent(settings.min_profit_percent);
      if (settings.enable_brand_column !== undefined) setEnableBrandColumn(settings.enable_brand_column === "true");
      if (settings.enable_info_column !== undefined) setEnableInfoColumn(settings.enable_info_column === "true");
      if (settings.enable_exp_prod_column !== undefined) setEnableExpProdColumn(settings.enable_exp_prod_column === "true");
      if (settings.edit_button_can_view_master !== undefined) setEditButtonCanViewMaster(settings.edit_button_can_view_master === "true");
      if (settings.view_data_tx_edit_off !== undefined) setViewDataTxEditOff(settings.view_data_tx_edit_off === "true");
      if (settings.check_open_module_option) setCheckOpenModuleOption(settings.check_open_module_option);
      if (settings.barcode_input_mode) setBarcodeInputMode(settings.barcode_input_mode);
      if (settings.purchase_tax_include_option) setPurchaseTaxIncludeOption(settings.purchase_tax_include_option);
      if (settings.transaction_cost_option) setTransactionCostOption(settings.transaction_cost_option);
      if (settings.allow_out_of_stock_sale) setAllowOutOfStockSale(settings.allow_out_of_stock_sale);
      if (settings.warn_out_of_stock) setWarnOutOfStock(settings.warn_out_of_stock);
      if (settings.allow_zero_qty_input) setAllowZeroQtyInput(settings.allow_zero_qty_input);
      if (settings.check_deposit_per_warehouse) setCheckDepositPerWarehouse(settings.check_deposit_per_warehouse);
      if (settings.block_delete_detail_credit) setBlockDeleteDetailCredit(settings.block_delete_detail_credit);
      if (settings.due_date_days) setDueDateDays(settings.due_date_days);
      if (settings.tax_system) setTaxSystem(settings.tax_system);
      if (settings.tax_type) setTaxType(settings.tax_type);
      if (settings.default_tax_rate) setDefaultTaxRate(settings.default_tax_rate);
      if (settings.debt_payment_input_mode) setDebtPaymentInputMode(settings.debt_payment_input_mode);
      if (settings.item_transfer_input_mode) setItemTransferInputMode(settings.item_transfer_input_mode);

      // 3. Penjualan / Kasir
      if (settings.enable_rounding !== undefined) setEnableRounding(settings.enable_rounding === "true");
      if (settings.smallest_fraction_mode) setSmallestFractionMode(settings.smallest_fraction_mode);
      if (settings.custom_fraction_value) setCustomFractionValue(settings.custom_fraction_value);
      if (settings.item_selection_mode) setItemSelectionMode(settings.item_selection_mode);
      if (settings.default_general_customer) setDefaultGeneralCustomer(settings.default_general_customer);
      if (settings.pos_input_mode) setPosInputMode(settings.pos_input_mode);
      if (settings.show_payment_type_status !== undefined) setShowPaymentTypeStatus(settings.show_payment_type_status === "true");
      if (settings.select_customer_auto_sales !== undefined) setSelectCustomerAutoSales(settings.select_customer_auto_sales === "true");
      if (settings.distinct_tx_number_pos_sales !== undefined) setDistinctTxNumberPosSales(settings.distinct_tx_number_pos_sales === "true");
      if (settings.confirm_change_customer) setConfirmChangeCustomer(settings.confirm_change_customer);
      if (settings.pending_today_same_shift !== undefined) setPendingTodaySameShift(settings.pending_today_same_shift === "true");
      if (settings.popup_price_history_on_focus !== undefined) setPopupPriceHistoryOnFocus(settings.popup_price_history_on_focus === "true");

      // 4. Desimal
      if (settings.decimal_digits_price) setDecimalDigitsPrice(settings.decimal_digits_price);
      if (settings.decimal_digits_qty) setDecimalDigitsQty(settings.decimal_digits_qty);
      if (settings.decimal_digits_tax) setDecimalDigitsTax(settings.decimal_digits_tax);
      if (settings.decimal_digits_discount) setDecimalDigitsDiscount(settings.decimal_digits_discount);

      // 5. Timbangan
      if (settings.enable_scale_mode !== undefined) setEnableScaleMode(settings.enable_scale_mode === "true");
      if (settings.scale_flag_digits) setScaleFlagDigits(settings.scale_flag_digits);
      if (settings.scale_item_code_digits) setScaleItemCodeDigits(settings.scale_item_code_digits);
      if (settings.scale_weight_digits) setScaleWeightDigits(settings.scale_weight_digits);
      if (settings.scale_flag_1) setScaleFlag1(settings.scale_flag_1);
      if (settings.scale_flag_2) setScaleFlag2(settings.scale_flag_2);
      if (settings.scale_flag_3) setScaleFlag3(settings.scale_flag_3);
      if (settings.scale_unit_kg) setScaleUnitKg(settings.scale_unit_kg);
      if (settings.scale_unit_gram) setScaleUnitGram(settings.scale_unit_gram);

      // 6. Terminal
      if (settings.terminal_show_stock !== undefined) setTerminalShowStock(settings.terminal_show_stock === "true");
      if (settings.terminal_show_image !== undefined) setTerminalShowImage(settings.terminal_show_image === "true");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      return await api.put("/settings/groups/GENERAL", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-general"] });
      showToast("success", "Pengaturan umum berhasil disimpan!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menyimpan pengaturan umum");
    },
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const payload: Record<string, string> = {
      // 1. Umum
      app_brand_name: appBrandName,
      app_brand_subtitle: appBrandSubtitle,
      enable_report_designer: String(enableReportDesigner),
      show_debt_reminder: String(showDebtReminder),
      enable_cash_drawer_mode: String(enableCashDrawerMode),
      item_form_mode: itemFormMode,
      data_view_mode: dataViewMode,
      item_row_mode: itemRowMode,
      return_mode: returnMode,
      timezone: timezone,
      max_search_rows: maxSearchRows,
      chart_series_mode: chartSeriesMode,
      bind_address_to_branch: String(bindAddressToBranch),
      stock_use_branch_account: String(stockUseBranchAccount),

      // 2. Transaksi
      show_image_transaction: String(showImageTransaction),
      confirm_price_below_hpp: String(confirmPriceBelowHpp),
      min_profit_percent: minProfitPercent,
      enable_brand_column: String(enableBrandColumn),
      enable_info_column: String(enableInfoColumn),
      enable_exp_prod_column: String(enableExpProdColumn),
      edit_button_can_view_master: String(editButtonCanViewMaster),
      view_data_tx_edit_off: String(viewDataTxEditOff),
      check_open_module_option: checkOpenModuleOption,
      barcode_input_mode: barcodeInputMode,
      purchase_tax_include_option: purchaseTaxIncludeOption,
      transaction_cost_option: transactionCostOption,
      allow_out_of_stock_sale: allowOutOfStockSale,
      warn_out_of_stock: warnOutOfStock,
      allow_zero_qty_input: allowZeroQtyInput,
      check_deposit_per_warehouse: checkDepositPerWarehouse,
      block_delete_detail_credit: blockDeleteDetailCredit,
      due_date_days: dueDateDays,
      tax_system: taxSystem,
      tax_type: taxType,
      default_tax_rate: defaultTaxRate,
      debt_payment_input_mode: debtPaymentInputMode,
      item_transfer_input_mode: itemTransferInputMode,

      // 3. Penjualan / Kasir
      enable_rounding: String(enableRounding),
      smallest_fraction_mode: smallestFractionMode,
      custom_fraction_value: customFractionValue,
      item_selection_mode: itemSelectionMode,
      default_general_customer: defaultGeneralCustomer,
      pos_input_mode: posInputMode,
      show_payment_type_status: String(showPaymentTypeStatus),
      select_customer_auto_sales: String(selectCustomerAutoSales),
      distinct_tx_number_pos_sales: String(distinctTxNumberPosSales),
      confirm_change_customer: confirmChangeCustomer,
      pending_today_same_shift: String(pendingTodaySameShift),
      popup_price_history_on_focus: String(popupPriceHistoryOnFocus),

      // 4. Desimal
      decimal_digits_price: decimalDigitsPrice,
      decimal_digits_qty: decimalDigitsQty,
      decimal_digits_tax: decimalDigitsTax,
      decimal_digits_discount: decimalDigitsDiscount,

      // 5. Timbangan
      enable_scale_mode: String(enableScaleMode),
      scale_flag_digits: scaleFlagDigits,
      scale_item_code_digits: scaleItemCodeDigits,
      scale_weight_digits: scaleWeightDigits,
      scale_flag_1: scaleFlag1,
      scale_flag_2: scaleFlag2,
      scale_flag_3: scaleFlag3,
      scale_unit_kg: scaleUnitKg,
      scale_unit_gram: scaleUnitGram,

      // 6. Terminal
      terminal_show_stock: String(terminalShowStock),
      terminal_show_image: String(terminalShowImage),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Pengaturan Umum Apotek &amp; POS</h1>
        </div>
        <button
          onClick={() => handleSaveAll()}
          disabled={saveMutation.isPending}
          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Simpan Pengaturan</span>
        </button>
      </div>

      {/* TABS HEADER BAR (Sesuai 6 Tab Ketoko Gambar 7, 10, 11, 12, 13, 14) */}
      <div className="bg-white border-b border-slate-300 px-3 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("umum")}
          className={`px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "umum"
              ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Umum</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transaksi")}
          className={`px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "transaksi"
              ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Transaksi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("penjualan_kasir")}
          className={`px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "penjualan_kasir"
              ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Penjualan / Kasir</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("desimal")}
          className={`px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "desimal"
              ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Desimal Digit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timbangan")}
          className={`px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "timbangan"
              ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Opsi Timbangan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("terminal")}
          className={`px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === "terminal"
              ? "border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Opsi Terminal</span>
        </button>
      </div>

      {/* CONTENT BODY */}
      <div className="flex-1 p-3 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat pengaturan umum...</span>
          </div>
        ) : (
          <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-4">
            {/* ========================================================================= */}
            {/* 1. TAB UMUM (Screenshot 10)                                               */}
            {/* ========================================================================= */}
            {activeTab === "umum" && (
              <div className="space-y-4">
                {/* Brand & App Title Customization */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Identitas Brand &amp; Teks Header Aplikasi
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Aplikasi / Brand Header (Default: Ketoko.co.id)
                      </label>
                      <input
                        type="text"
                        value={appBrandName}
                        onChange={(e) => setAppBrandName(e.target.value)}
                        placeholder="Ketoko.co.id"
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-white shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Subtitle / Versi Brand (Default: ERP &amp; POS)
                      </label>
                      <input
                        type="text"
                        value={appBrandSubtitle}
                        onChange={(e) => setAppBrandSubtitle(e.target.value)}
                        placeholder="ERP & POS"
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 bg-white shadow-2xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-2">
                    * Teks brand ini otomatis tampil pada sudut kiri atas Sidebar menu dan sinkron dengan seluruh aplikasi.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableReportDesigner}
                        onChange={(e) => setEnableReportDesigner(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Aktifkan Desain Report</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDebtReminder}
                        onChange={(e) => setShowDebtReminder(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Tampil Reminder Hutang Piutang</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableCashDrawerMode}
                        onChange={(e) => setEnableCashDrawerMode(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Aktifkan Mode Kas Laci</span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Tambah/Edit Item
                      </label>
                      <select
                        value={itemFormMode}
                        onChange={(e) => setItemFormMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Kecil">Kecil</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Lengkap">Lengkap</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Tampil Data
                      </label>
                      <select
                        value={dataViewMode}
                        onChange={(e) => setDataViewMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Tampil Semua Data">Tampil Semua Data</option>
                        <option value="Berdasarkan Cabang">Berdasarkan Cabang</option>
                        <option value="Berdasarkan Gudang">Berdasarkan Gudang</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Tampil Baris Item
                      </label>
                      <select
                        value={itemRowMode}
                        onChange={(e) => setItemRowMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Tampil Sesuai Satuan">Tampil Sesuai Satuan</option>
                        <option value="Satu Baris Per Item">Satu Baris Per Item</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Retur Pembelian dan Penjualan
                      </label>
                      <select
                        value={returnMode}
                        onChange={(e) => setReturnMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Mode 1">Mode 1</option>
                        <option value="Mode 2">Mode 2</option>
                      </select>
                    </div>

                    {returnMode === "Mode 2" && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-800 text-[11px] leading-relaxed">
                        <span className="font-bold">Mode 2 :</span> Retur dapat memotong saldo hutang/piutang secara otomatis tanpa proses manual.
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Time Zone
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Asia/Jakarta (WIB)">Asia/Jakarta (WIB)</option>
                        <option value="Asia/Makassar (WITA)">Asia/Makassar (WITA)</option>
                        <option value="Asia/Jayapura (WIT)">Asia/Jayapura (WIT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Maksimum Baris pada Pencarian
                      </label>
                      <input
                        type="number"
                        value={maxSearchRows}
                        onChange={(e) => setMaxSearchRows(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Tampil Series Chart Dashboard
                      </label>
                      <select
                        value={chartSeriesMode}
                        onChange={(e) => setChartSeriesMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Nama Item">Nama Item</option>
                        <option value="Kategori Item">Kategori Item</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={bindAddressToBranch}
                        onChange={(e) => setBindAddressToBranch(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Binding Data Alamat Sesuai Login Kantor</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stockUseBranchAccount}
                        onChange={(e) => setStockUseBranchAccount(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Persediaan Barang Menggunakan Akun pada Dept/Gudang</span>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. TAB TRANSAKSI (Screenshot 14 - KUNCI MARGIN PROFIT)                    */}
            {/* ========================================================================= */}
            {activeTab === "transaksi" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showImageTransaction}
                        onChange={(e) => setShowImageTransaction(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Tampil Gambar pada Transaksi</span>
                    </label>

                    {/* CRITICAL SETTING: Min. Profit & Konfirmasi Harga Pokok */}
                    <div className="p-3 bg-amber-50/70 border border-amber-300 rounded space-y-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmPriceBelowHpp}
                          onChange={(e) => setConfirmPriceBelowHpp(e.target.checked)}
                          className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="font-bold text-amber-900">
                          Tampil Konfirmasi Harga Jual lebih Kecil dari Harga Pokok
                        </span>
                      </label>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 mb-1">
                          Min. Profit (%) :
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={minProfitPercent}
                            onChange={(e) => setMinProfitPercent(e.target.value)}
                            className="w-32 h-8 px-2.5 text-xs border border-amber-400 rounded font-bold text-slate-800 focus:outline-none focus:border-amber-600 bg-white"
                          />
                          <span className="text-[11px] text-slate-600">
                            (Margin keuntungan minimal per item pada Penjualan &amp; Kasir)
                          </span>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableBrandColumn}
                        onChange={(e) => setEnableBrandColumn(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Aktifkan Kolom Merek pada Semua Transaksi</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableInfoColumn}
                        onChange={(e) => setEnableInfoColumn(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Aktifkan Kolom Info pada Semua Transaksi</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableExpProdColumn}
                        onChange={(e) => setEnableExpProdColumn(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Aktifkan Kolom Tgl Expired dan Kode Produksi pada Semua Transaksi
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editButtonCanViewMaster}
                        onChange={(e) => setEditButtonCanViewMaster(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Tombol Edit bisa melihat data apabila hak akses edit dimatikan (Grup Master Data)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viewDataTxEditOff}
                        onChange={(e) => setViewDataTxEditOff(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Opsi melihat data apabila hak akses edit Transaksi dimatikan
                      </span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi Cek Modul Terbuka :
                      </label>
                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="checkOpenModuleOption"
                            value="Aktif"
                            checked={checkOpenModuleOption === "Aktif"}
                            onChange={(e) => setCheckOpenModuleOption(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Aktif</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="checkOpenModuleOption"
                            value="Tidak aktif"
                            checked={checkOpenModuleOption === "Tidak aktif"}
                            onChange={(e) => setCheckOpenModuleOption(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Tidak aktif</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Input KodeItem/Barcode :
                      </label>
                      <select
                        value={barcodeInputMode}
                        onChange={(e) => setBarcodeInputMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Mode 1">Mode 1</option>
                        <option value="Mode 2">Mode 2</option>
                      </select>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px] leading-relaxed">
                      <span className="font-bold">Panduan Mode Input:</span> Mode 1 kursor berpindah otomatis setelah pemindaian barcode. Mode 2 menuntut tombol Enter/konfirmasi manual.
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi Pajak Include Pada Pembelian
                      </label>
                      <select
                        value={purchaseTaxIncludeOption}
                        onChange={(e) => setPurchaseTaxIncludeOption(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Pajak Dimasukkan dalam Persediaan">Pajak Dimasukkan dalam Persediaan</option>
                        <option value="Pajak Menjadi PPN Masukan">Pajak Menjadi PPN Masukan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi Biaya Pada Transaksi
                      </label>
                      <select
                        value={transactionCostOption}
                        onChange={(e) => setTransactionCostOption(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Tidak ditambah dengan Total">Tidak ditambah dengan Total</option>
                        <option value="Ditambah dengan Total">Ditambah dengan Total</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Bisa Jual Stok Habis
                      </label>
                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="allowOutOfStockSale"
                            value="Bisa"
                            checked={allowOutOfStockSale === "Bisa"}
                            onChange={(e) => setAllowOutOfStockSale(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Bisa</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="allowOutOfStockSale"
                            value="Tidak"
                            checked={allowOutOfStockSale === "Tidak"}
                            onChange={(e) => setAllowOutOfStockSale(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Tidak</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tampil Peringatan Stok Habis saat Pilih Item Transaksi
                      </label>
                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="warnOutOfStock"
                            value="Ya Tampil"
                            checked={warnOutOfStock === "Ya Tampil"}
                            onChange={(e) => setWarnOutOfStock(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Ya Tampil</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="warnOutOfStock"
                            value="Tidak Tampil"
                            checked={warnOutOfStock === "Tidak Tampil"}
                            onChange={(e) => setWarnOutOfStock(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Tidak Tampil</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Transaksi Bisa Input Angka Nol(0)
                      </label>
                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="allowZeroQtyInput"
                            value="Bisa"
                            checked={allowZeroQtyInput === "Bisa"}
                            onChange={(e) => setAllowZeroQtyInput(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Bisa</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="allowZeroQtyInput"
                            value="Tidak"
                            checked={allowZeroQtyInput === "Tidak"}
                            onChange={(e) => setAllowZeroQtyInput(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Tidak</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi cek saldo deposit supplier/pelanggan per gudang
                      </label>
                      <select
                        value={checkDepositPerWarehouse}
                        onChange={(e) => setCheckDepositPerWarehouse(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak aktif">Tidak aktif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Opsi blokir Hapus detail pada Pembelian dan Penjualan jika sudah ada potongan retur atau pembayaran kredit
                      </label>
                      <select
                        value={blockDeleteDetailCredit}
                        onChange={(e) => setBlockDeleteDetailCredit(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak aktif">Tidak aktif</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Jumlah Hari Jatuh Tempo
                        </label>
                        <input
                          type="number"
                          value={dueDateDays}
                          onChange={(e) => setDueDateDays(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Sistem Pajak
                        </label>
                        <select
                          value={taxSystem}
                          onChange={(e) => setTaxSystem(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Include">Include</option>
                          <option value="Exclude">Exclude</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Jenis Pajak
                        </label>
                        <select
                          value={taxType}
                          onChange={(e) => setTaxType(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="PPN 11%">PPN 11%</option>
                          <option value="PPN 12%">PPN 12%</option>
                          <option value="Non-PPN">Non-PPN</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Default Pajak (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={defaultTaxRate}
                          onChange={(e) => setDefaultTaxRate(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Mode Input Hutang/Piutang
                        </label>
                        <select
                          value={debtPaymentInputMode}
                          onChange={(e) => setDebtPaymentInputMode(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Mode Lama">Mode Lama</option>
                          <option value="Mode Baru">Mode Baru</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Input Transfer Item
                        </label>
                        <select
                          value={itemTransferInputMode}
                          onChange={(e) => setItemTransferInputMode(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Mode Biasa">Mode Biasa</option>
                          <option value="Mode Cepat">Mode Cepat</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. TAB PENJUALAN / KASIR (Screenshot 12)                                  */}
            {/* ========================================================================= */}
            {activeTab === "penjualan_kasir" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableRounding}
                        onChange={(e) => setEnableRounding(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">Aktifkan Pembulatan</span>
                    </label>

                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px]">
                      Pembulatan hanya berlaku pada transaksi Penjualan dan Kasir.
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Cek Pecahan Terkecil
                      </label>
                      <select
                        value={smallestFractionMode}
                        onChange={(e) => setSmallestFractionMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Standar">Standar</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Isi Pecahan Terkecil (Custom)
                      </label>
                      <input
                        type="text"
                        value={customFractionValue}
                        onChange={(e) => setCustomFractionValue(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Pecahan mata uang terkecil (Contoh: 100 untuk pembulatan ratusan rupiah).
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Pilih Item Transaksi (Penjualan dan Kasir)
                      </label>
                      <select
                        value={itemSelectionMode}
                        onChange={(e) => setItemSelectionMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Pilih satu persatu">Pilih satu persatu</option>
                        <option value="Pilih banyak sekaligus">Pilih banyak sekaligus</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Pelanggan Umum/ Non Member
                      </label>
                      <input
                        type="text"
                        value={defaultGeneralCustomer}
                        onChange={(e) => setDefaultGeneralCustomer(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Mode Input Kasir
                      </label>
                      <select
                        value={posInputMode}
                        onChange={(e) => setPosInputMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Mode Lama">Mode Lama</option>
                        <option value="Mode Baru">Mode Baru</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPaymentTypeStatus}
                        onChange={(e) => setShowPaymentTypeStatus(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Tampil Tipe Bayar dan Status Bayar pada List Penjualan
                      </span>
                    </label>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
                      Menampilkan kolom tipe pembayaran (Tunai/Kredit/Kartu) dan status lunas pada tabel penjualan.
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectCustomerAutoSales}
                        onChange={(e) => setSelectCustomerAutoSales(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Aktifkan Pilih Customer langsung tampil sales
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={distinctTxNumberPosSales}
                        onChange={(e) => setDistinctTxNumberPosSales(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Opsi Pembeda No. Transaksi Penjualan dan Kasir
                      </span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tampil Konfirmasi ganti pelanggan pada penjualan
                      </label>
                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="confirmChangeCustomer"
                            value="Ya Tampil"
                            checked={confirmChangeCustomer === "Ya Tampil"}
                            onChange={(e) => setConfirmChangeCustomer(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Ya Tampil</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="confirmChangeCustomer"
                            value="Tidak Tampil"
                            checked={confirmChangeCustomer === "Tidak Tampil"}
                            onChange={(e) => setConfirmChangeCustomer(e.target.value)}
                            className="text-emerald-600"
                          />
                          <span>Tidak Tampil</span>
                        </label>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingTodaySameShift}
                        onChange={(e) => setPendingTodaySameShift(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Tampil Data Pending Untuk Hari Ini Saja dan Shift yang Sama
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupPriceHistoryOnFocus}
                        onChange={(e) => setPopupPriceHistoryOnFocus(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700">
                        Tampil Popup History Harga Jual saat fokus ke kolom Harga (Modul Penjualan back office)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. TAB DESIMAL DIGIT (Screenshot 7)                                       */}
            {/* ========================================================================= */}
            {activeTab === "desimal" && (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Digit Desimal Harga
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={decimalDigitsPrice}
                      onChange={(e) => setDecimalDigitsPrice(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Digit Desimal Jumlah
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={decimalDigitsQty}
                      onChange={(e) => setDecimalDigitsQty(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Digit Desimal Pajak
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={decimalDigitsTax}
                      onChange={(e) => setDecimalDigitsTax(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Digit Desimal Potongan
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={decimalDigitsDiscount}
                      onChange={(e) => setDecimalDigitsDiscount(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Yellow/Amber Warning Box (Persis Gambar 7) */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Penting:</span>
                  </div>
                  <p>
                    Mengubah pengaturan desimal setelah banyak transaksi dapat menyebabkan selisih digit pada pembayaran, laporan, dan semua modul terkait.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. TAB OPSI TIMBANGAN (Screenshot 13)                                     */}
            {/* ========================================================================= */}
            {activeTab === "timbangan" && (
              <div className="space-y-4 max-w-2xl">
                <label className="flex items-center gap-2 cursor-pointer pb-1">
                  <input
                    type="checkbox"
                    checked={enableScaleMode}
                    onChange={(e) => setEnableScaleMode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">Aktifkan Mode Timbangan</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jml Digit Flag
                    </label>
                    <input
                      type="number"
                      value={scaleFlagDigits}
                      onChange={(e) => setScaleFlagDigits(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jml Digit Kode Item
                    </label>
                    <input
                      type="number"
                      value={scaleItemCodeDigits}
                      onChange={(e) => setScaleItemCodeDigits(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jml Digit Berat
                    </label>
                    <input
                      type="number"
                      value={scaleWeightDigits}
                      onChange={(e) => setScaleWeightDigits(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nilai Flag 1
                    </label>
                    <input
                      type="text"
                      value={scaleFlag1}
                      onChange={(e) => setScaleFlag1(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nilai Flag 2
                    </label>
                    <input
                      type="text"
                      value={scaleFlag2}
                      onChange={(e) => setScaleFlag2(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nilai Flag 3
                    </label>
                    <input
                      type="text"
                      value={scaleFlag3}
                      onChange={(e) => setScaleFlag3(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Satuan item yang bisa dibaca dalam KG (Kilo Gram)
                    </label>
                    <input
                      type="text"
                      value={scaleUnitKg}
                      onChange={(e) => setScaleUnitKg(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Satuan item yang bisa dibaca dalam GRAM
                    </label>
                    <input
                      type="text"
                      value={scaleUnitGram}
                      onChange={(e) => setScaleUnitGram(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px] space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Keterangan Format Barcode Timbangan:</span>
                  </div>
                  <p>
                    Format barcode timbangan: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">FFIIIIIBBBBBC</code> (Flag + Item + Berat + Checksum). Nilai flag diidentifikasi otomatis oleh mesin kasir POS saat membaca barcode timbangan.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 6. TAB OPSI TERMINAL (Screenshot 11)                                      */}
            {/* ========================================================================= */}
            {activeTab === "terminal" && (
              <div className="space-y-4 max-w-md">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terminalShowStock}
                      onChange={(e) => setTerminalShowStock(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">Tampil Stok/Gudang</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terminalShowImage}
                      onChange={(e) => setTerminalShowImage(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700">Tampil Gambar Item</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={saveMutation.isPending}
                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
