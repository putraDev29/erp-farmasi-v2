"use client";

import React from "react";
import { SalesInvoiceForm } from "@/components/sales/SalesInvoiceForm";

export default function NewCashierSalePage() {
  return <SalesInvoiceForm isEdit={false} mode="CASHIER" />;
}
