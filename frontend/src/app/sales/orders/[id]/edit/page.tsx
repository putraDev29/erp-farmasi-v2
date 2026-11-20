"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SalesOrderForm } from "@/components/sales/SalesOrderForm";

export default function EditSalesOrderPage() {
  const params = useParams();
  const id = params?.id as string;

  return <SalesOrderForm isEdit={true} orderId={id} />;
}
