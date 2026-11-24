"use client";

import React, { use } from "react";
import { SalesInvoiceForm } from "@/components/sales/SalesInvoiceForm";

export default function EditCashierSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  return (
    <SalesInvoiceForm
      isEdit={true}
      invoiceId={unwrappedParams.id}
      mode="CASHIER"
    />
  );
}
