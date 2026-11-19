"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SalesInvoiceForm } from "@/components/sales/SalesInvoiceForm";

export default function EditSalesInvoicePage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  return <SalesInvoiceForm isEdit={true} invoiceId={invoiceId} />;
}
