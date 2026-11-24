"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Check,
  AlertCircle,
  FileCheck,
  Eye,
  Loader2,
} from "lucide-react";
import { api, resolveAssetUrl, formatDate } from "@/lib/api";

interface UploadDokumenPBFModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  orderNo?: string | null;
  supplierName?: string | null;
  existingDocUrl?: string | null;
  onSuccess?: (newDocUrl: string) => void;
}

export function UploadDokumenPBFModal({
  isOpen,
  onClose,
  orderId,
  orderNo,
  supplierName,
  existingDocUrl,
  onSuccess,
}: UploadDokumenPBFModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch document from documents API if not provided
  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ["pbf-documents", orderId],
    enabled: isOpen && !!orderId,
    queryFn: async () => {
      try {
        const res = await api.get(`/documents`, {
          params: { entity_type: "purchase_order", entity_id: orderId },
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Current active document (either from existingDocUrl or from documents query)
  const activeDoc = documents.length > 0 ? documents[documents.length - 1] : null;
  const currentDocUrl = existingDocUrl || activeDoc?.file_path || null;

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setNotes("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 20MB
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Ukuran file terlalu besar (maksimal 20MB).");
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Pilih file dokumen terlebih dahulu");
      if (!orderId) throw new Error("ID Pesanan tidak valid");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("entity_type", "purchase_order");
      formData.append("entity_id", orderId);
      formData.append("document_type", "FAKTUR_PBF_ASAL");
      formData.append("notes", notes || `Dokumen faktur pembelian PBF asal PO ${orderNo || ""}`);

      const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["pbf-documents", orderId] });

      const uploadedList = res?.data || [];
      const newPath = uploadedList[0]?.file_path || "";

      setToastMsg("Dokumen PBF berhasil diunggah!");
      if (onSuccess) onSuccess(newPath);

      setTimeout(() => {
        setToastMsg(null);
        onClose();
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal mengunggah dokumen.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeDoc?.id && !orderId) throw new Error("Dokumen tidak ditemukan");

      if (activeDoc?.id) {
        await api.delete(`/documents/${activeDoc.id}`);
      } else if (orderId) {
        // Clear pbf_document_url on PO directly
        await api.put(`/purchases/orders/${orderId}`, {
          pbf_document_url: "",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["pbf-documents", orderId] });

      setToastMsg("Dokumen berhasil dihapus.");
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (onSuccess) onSuccess("");

      setTimeout(() => setToastMsg(null), 2000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || "Gagal menghapus dokumen.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 select-none">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-11 px-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <div>
              <h2 className="font-bold text-xs text-white">Upload Dokumen Pembelian (PBF Asal)</h2>
              <p className="text-[10px] text-slate-400 font-mono">
                {orderNo ? `${orderNo}` : "Purchase Order"} {supplierName ? `· ${supplierName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs">
          {toastMsg && (
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold flex items-center gap-2 text-[11px] animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{toastMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-300 text-rose-800 font-semibold flex items-center gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Hidden native file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Status Dokumen Tersimpan Saat Ini */}
          {currentDocUrl && !selectedFile && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-300 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Dokumen PBF Tersimpan</span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-medium px-2 py-0.5 rounded-full">
                  1 Dokumen
                </span>
              </div>

              <div className="text-[11px] text-slate-600 flex items-center justify-between">
                <span className="truncate max-w-[240px] font-mono text-[10.5px]">
                  {activeDoc?.original_name || activeDoc?.file_name || "Faktur_PBF_Asal.pdf"}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {activeDoc?.created_at ? formatDate(activeDoc.created_at) : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-emerald-200">
                <a
                  href={resolveAssetUrl(currentDocUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-7 bg-white hover:bg-slate-50 border border-emerald-400 text-emerald-800 rounded font-semibold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Buka Dokumen</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-medium text-[11px] flex items-center gap-1 shadow-2xs transition"
                >
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>Ganti File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Apakah Anda yakin ingin menghapus dokumen PBF ini?")) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded text-[11px] transition flex items-center justify-center"
                  title="Hapus Dokumen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Area / Dropzone */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              {currentDocUrl ? "Pilih Dokumen Baru (Pengganti) :" : "Pilih File Dokumen PBF (Scan / Foto Faktur) :"}
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
                selectedFile
                  ? "border-emerald-500 bg-emerald-50/40"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-400"
              }`}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  {filePreviewUrl ? (
                    <div className="h-32 max-w-full mx-auto flex items-center justify-center overflow-hidden rounded border border-slate-200 bg-white p-1">
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <FileText className="w-10 h-10 text-emerald-600 mx-auto" />
                  )}
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Klik untuk ganti
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-bold text-xs text-slate-700">
                    Klik di sini untuk memilih file dokumen
                  </p>
                  <p className="text-[10.5px] text-slate-500">
                    Mendukung format PDF, PNG, JPG (Maks. 20MB)
                  </p>
                  <p className="text-[9.5px] text-emerald-700 font-medium">
                    Dokumen pembelian jadi satu kesatuan
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Catatan Dokumen */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
              Catatan / No. Faktur Asal PBF (Opsional) :
            </label>
            <input
              type="text"
              value={notes}
              placeholder="Contoh: Faktur PBF AAM No. 2026/XI/8812 (Lengkap Surat Jalan)"
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded text-xs transition"
          >
            Batal
          </button>

          {selectedFile && (
            <button
              type="button"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Simpan Dokumen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
