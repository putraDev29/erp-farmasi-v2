"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";

export type StandardSortValue =
  | "created_at_desc"
  | "code_asc"
  | "code_desc"
  | "name_asc"
  | "name_desc";

export interface TableSortSelectProps {
  value: string;
  onChange: (value: StandardSortValue) => void;
  label?: string;
  codeLabel?: string;
  nameLabel?: string;
  timeLabel?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Standardized Sort Filter matching user requirements:
 * 1. Urutan sesuai waktu input paling atas
 * 2. Kode (A - Z)
 * 3. Kode (Z - A)
 * 4. Nama (A - Z)
 * 5. Nama (Z - A)
 */
export const TableSortSelect: React.FC<TableSortSelectProps> = ({
  value,
  onChange,
  label = "Urut Berdasar :",
  codeLabel = "Kode",
  nameLabel = "Nama",
  timeLabel = "Urutan sesuai waktu input paling atas",
  className = "",
  compact = false,
}) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-700 font-semibold text-[11px] shrink-0 whitespace-nowrap">
          {label}
        </label>
      )}
      <div className="relative flex-1 min-w-[210px]">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as StandardSortValue)}
          className={`w-full h-6 px-2 pr-6 py-0 border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-emerald-500 bg-white font-medium shadow-2xs truncate cursor-pointer ${
            compact ? "h-6 text-[11px]" : "h-6 text-xs"
          }`}
          title="Pengurutan data tabel"
        >
          <option value="created_at_desc">1. {timeLabel}</option>
          <option value="code_asc">2. {codeLabel} (A - Z)</option>
          <option value="code_desc">3. {codeLabel} (Z - A)</option>
          <option value="name_asc">4. {nameLabel} (A - Z)</option>
          <option value="name_desc">5. {nameLabel} (Z - A)</option>
        </select>
        <div className="absolute right-2 top-1.5 pointer-events-none text-slate-400">
          <ArrowUpDown className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

export function parseSortValue(val: string): { sortBy: string; sortDir: "asc" | "desc" } {
  switch (val) {
    case "created_at_desc":
    case "terbaru":
    case "waktu_input":
      return { sortBy: "created_at", sortDir: "desc" };
    case "code_asc":
      return { sortBy: "code", sortDir: "asc" };
    case "code_desc":
      return { sortBy: "code", sortDir: "desc" };
    case "name_asc":
      return { sortBy: "name", sortDir: "asc" };
    case "name_desc":
      return { sortBy: "name", sortDir: "desc" };
    default:
      return { sortBy: "created_at", sortDir: "desc" };
  }
}

export function sortTableData<T>(
  data: T[],
  sortVal: string,
  accessors?: {
    getCode?: (item: T) => string | number | undefined | null;
    getName?: (item: T) => string | number | undefined | null;
    getDate?: (item: T) => string | Date | number | undefined | null;
  }
): T[] {
  if (!Array.isArray(data) || data.length === 0) return data || [];

  const getCode =
    accessors?.getCode ||
    ((item: any) =>
      item.code ||
      item.order_no ||
      item.invoice_no ||
      item.payment_no ||
      item.return_no ||
      item.transfer_no ||
      item.doc_no ||
      item.delivery_no ||
      item.number ||
      "");

  const getName =
    accessors?.getName ||
    ((item: any) =>
      item.name ||
      item.customer?.name ||
      item.customer_name ||
      item.supplier?.name ||
      item.supplier_name ||
      item.product?.name ||
      item.title ||
      "");

  const getDate =
    accessors?.getDate ||
    ((item: any) =>
      item.created_at ||
      item.createdAt ||
      item.date ||
      item.updated_at ||
      item.updatedAt ||
      item.id ||
      "");

  const copy = [...data];

  switch (sortVal) {
    case "created_at_desc":
    case "terbaru":
    case "waktu_input":
      return copy.sort((a, b) => {
        const daStr = getDate(a);
        const dbStr = getDate(b);
        const da = daStr ? new Date(daStr).getTime() : 0;
        const db = dbStr ? new Date(dbStr).getTime() : 0;
        if (db !== da) return db - da;
        // fallback compare string or ID
        return String(b).localeCompare(String(a));
      });

    case "code_asc":
      return copy.sort((a, b) =>
        String(getCode(a) || "").localeCompare(String(getCode(b) || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

    case "code_desc":
      return copy.sort((a, b) =>
        String(getCode(b) || "").localeCompare(String(getCode(a) || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

    case "name_asc":
      return copy.sort((a, b) =>
        String(getName(a) || "").localeCompare(String(getName(b) || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

    case "name_desc":
      return copy.sort((a, b) =>
        String(getName(b) || "").localeCompare(String(getName(a) || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

    default:
      return copy;
  }
}

export default TableSortSelect;
