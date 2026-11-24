"use client";

import React from "react";
import { useParams } from "next/navigation";
import PurchaseInvoiceForm from "@/components/purchasing/PurchaseInvoiceForm";

export default function ViewOrEditPurchaseInvoicePage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="flex flex-col h-full min-h-0">
      <PurchaseInvoiceForm isEdit={true} invoiceId={id} />
    </div>
  );
}
