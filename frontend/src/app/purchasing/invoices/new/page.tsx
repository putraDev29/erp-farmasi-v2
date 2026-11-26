"use client";

import React, { Suspense } from "react";
import PurchaseInvoiceForm from "@/components/purchasing/PurchaseInvoiceForm";

export default function NewPurchaseInvoicePage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <Suspense fallback={<div className="p-4 text-xs text-slate-500">Memuat formulir faktur pembelian...</div>}>
        <PurchaseInvoiceForm isEdit={false} />
      </Suspense>
    </div>
  );
}
