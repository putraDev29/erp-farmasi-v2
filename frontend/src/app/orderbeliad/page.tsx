"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PurchaseOrderForm from "@/components/purchasing/PurchaseOrderForm";

export default function OrderBeliAdAliasPage() {
  const router = useRouter();

  useEffect(() => {
    // Keep URL synced if needed
  }, [router]);

  return <PurchaseOrderForm isEdit={false} />;
}
