"use client";

import React from "react";
import { ItemForm } from "@/components/items/ItemForm";

export default function ItemAdPage() {
  return (
    <div className="space-y-3">
      <ItemForm isEdit={false} />
    </div>
  );
}
