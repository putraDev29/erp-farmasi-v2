"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ItemListPage from "../items/page";

export default function ProductsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/master/items");
  }, [router]);

  return <ItemListPage />;
}
