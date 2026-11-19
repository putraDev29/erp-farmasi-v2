"use client";

import React from "react";
import PurchaseOrderForm from "@/components/purchasing/PurchaseOrderForm";

export default function NewPurchaseOrderPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <PurchaseOrderForm isEdit={false} />
    </div>
  );
}
