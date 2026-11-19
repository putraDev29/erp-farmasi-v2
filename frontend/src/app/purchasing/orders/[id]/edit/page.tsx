"use client";

import React from "react";
import { useParams } from "next/navigation";
import PurchaseOrderForm from "@/components/purchasing/PurchaseOrderForm";

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="flex flex-col h-full min-h-0">
      <PurchaseOrderForm isEdit={true} orderId={id} />
    </div>
  );
}
