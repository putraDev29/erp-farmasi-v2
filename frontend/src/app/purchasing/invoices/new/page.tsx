"use client";

import React from "react";
import PurchaseInvoiceForm from "@/components/purchasing/PurchaseInvoiceForm";

export default function NewPurchaseInvoicePage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <PurchaseInvoiceForm isEdit={false} />
    </div>
  );
}
