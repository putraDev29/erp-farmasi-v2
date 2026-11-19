"use client";

import React from "react";
import { ItemForm } from "@/components/items/ItemForm";

export default function NewItemPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <ItemForm isEdit={false} />
    </div>
  );
}
