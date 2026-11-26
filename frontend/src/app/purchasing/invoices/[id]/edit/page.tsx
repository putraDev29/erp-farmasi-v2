"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import PurchaseInvoiceForm from "@/components/purchasing/PurchaseInvoiceForm";

export default function EditPurchaseInvoicePage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="flex flex-col h-full min-h-0">
      <Suspense fallback={<div className="p-4 text-xs text-slate-500">Memuat formulir faktur pembelian...</div>}>
        <PurchaseInvoiceForm isEdit={true} invoiceId={id} />
      </Suspense>
    </div>
  );
}
