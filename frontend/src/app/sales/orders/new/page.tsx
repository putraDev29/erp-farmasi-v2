"use client";

import React from "react";
import { SalesOrderForm } from "@/components/sales/SalesOrderForm";

export default function NewSalesOrderPage() {
  return <SalesOrderForm isEdit={false} />;
}
