"use client";

import React from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Printer } from "lucide-react";

export interface MasterToolbarButtonsProps {
  onAdd?: () => void;
  addHref?: string;
  addLabel?: string;
  onEdit?: () => void;
  editDisabled?: boolean;
  editLabel?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteLabel?: string;
  onPrint?: () => void;
  printDisabled?: boolean;
  printLabel?: string;
  showPrint?: boolean;
  className?: string;
  extraButtons?: React.ReactNode;
}

export const MasterToolbarButtons: React.FC<MasterToolbarButtonsProps> = ({
  onAdd,
  addHref,
  addLabel = "Tambah",
  onEdit,
  editDisabled = false,
  editLabel = "Ubah",
  onDelete,
  deleteDisabled = false,
  deleteLabel = "Hapus",
  onPrint,
  printDisabled = false,
  printLabel = "Cetak",
  showPrint = true,
  className = "",
  extraButtons,
}) => {
  const handleDefaultPrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* 1. Tombol [+ Tambah] (Emerald Green) */}
      {addHref ? (
        <Link
          href={addHref}
          className="h-6 px-2.5 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 whitespace-nowrap"
          title={addLabel}
        >
          <Plus className="w-3 h-3 shrink-0 stroke-[2.8]" />
          <span>{addLabel}</span>
        </Link>
      ) : onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="h-6 px-2.5 bg-[#009b62] hover:bg-[#008754] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 whitespace-nowrap"
          title={addLabel}
        >
          <Plus className="w-3 h-3 shrink-0 stroke-[2.8]" />
          <span>{addLabel}</span>
        </button>
      ) : null}

      {/* 2. Tombol [✏️ Ubah] (Light Pastel Sky Blue) */}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={editDisabled}
          className="h-6 px-2.5 bg-[#8bc5e8] hover:bg-[#7ab6db] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          title={editLabel}
        >
          <Pencil className="w-3 h-3 shrink-0 stroke-[2.4]" />
          <span>{editLabel}</span>
        </button>
      )}

      {/* 3. Tombol [🗑️ Hapus] (Soft Pastel Rose / Pink) */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          className="h-6 px-2.5 bg-[#f095a5] hover:bg-[#e28395] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          title={deleteLabel}
        >
          <Trash2 className="w-3 h-3 shrink-0 stroke-[2.4]" />
          <span>{deleteLabel}</span>
        </button>
      )}

      {/* 4. Tombol [🖨️ Cetak] (Cool Slate Gray) */}
      {showPrint && (
        <button
          type="button"
          onClick={handleDefaultPrint}
          disabled={printDisabled}
          className="h-6 px-2.5 bg-[#9faab5] hover:bg-[#8e9aa5] text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 shadow-2xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          title={printLabel}
        >
          <Printer className="w-3 h-3 shrink-0 stroke-[2.4]" />
          <span>{printLabel}</span>
        </button>
      )}

      {/* Extra buttons if any (e.g. Kartu Stok, Import Excel, etc.) */}
      {extraButtons}
    </div>
  );
};

export default MasterToolbarButtons;
