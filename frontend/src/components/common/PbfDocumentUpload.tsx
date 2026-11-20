"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileCheck,
  FolderArchive,
  Layers,
  File,
  Loader2,
  Download,
  Info,
  Eye,
  Edit2,
  Check,
  X,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api, formatDate } from "@/lib/api";

export interface DocumentAttachment {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  upload_mode: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  notes?: string;
  expiry_date?: string;
  created_at: string;
  approval_status?: "PENDING" | "APPROVED" | "REJECTED";
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
  };
  approver?: {
    id: string;
    username: string;
    full_name: string;
  };
}

export interface PbfRequirement {
  document_type: string;
  title: string;
  description: string;
  isRequired: boolean;
}

interface PbfDocumentUploadProps {
  entityType: "purchase" | "purchase_order" | "sale" | "sales_order" | "supplier" | "customer";
  entityId: string;
  title?: string;
  subtitle?: string;
  initialDocType?: string;
  onUploadedCountChange?: (count: number) => void;
}

export default function PbfDocumentUpload({
  entityType,
  entityId,
  title = "Lampiran Dokumen Kepatuhan Farmasi / PBF (CDOB)",
  subtitle,
  initialDocType,
  onUploadedCountChange,
}: PbfDocumentUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  // Modes & UI States
  const isCustomer = entityType === "customer";
  const [uploadMode, setUploadMode] = useState<"SINGLE" | "BUNDLE">("SINGLE");
  const [selectedDocType, setSelectedDocType] = useState<string>(initialDocType || "");
  const [docNotes, setDocNotes] = useState<string>("");
  const [docExpiryDate, setDocExpiryDate] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialDocType) {
      setSelectedDocType(initialDocType);
    }
  }, [initialDocType]);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<DocumentAttachment | null>(null);

  // Edit Modal State
  const [editDoc, setEditDoc] = useState<DocumentAttachment | null>(null);
  const [editDocType, setEditDocType] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editExpiryDate, setEditExpiryDate] = useState<string>("");
  const [editReplacementFile, setEditReplacementFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Reject Modal State
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Requirements definition by entity type
  const requirements: PbfRequirement[] = React.useMemo(() => {
    switch (entityType) {
      case "purchase":
        return [
          {
            document_type: "FAKTUR_PBF",
            title: "Faktur Asli PBF / Distributor",
            description: "Scan atau e-faktur tagihan resmi asli dari distributor farmasi (PBF).",
            isRequired: true,
          },
          {
            document_type: "SURAT_JALAN",
            title: "Surat Jalan / Delivery Order (DO) PBF",
            description: "Bukti fisik serah terima barang obat/alkes dari kurir PBF berstempel apotek.",
            isRequired: true,
          },
          {
            document_type: "FAKTUR_PAJAK",
            title: "e-Faktur Pajak PBF",
            description: "Faktur Pajak resmi keluaran PBF dengan barcode valid Ditjen Pajak.",
            isRequired: false,
          },
          {
            document_type: "COA",
            title: "Certificate of Analysis (CoA)",
            description: "Sertifikat analisis mutu bets dari produsen/industri farmasi terkait.",
            isRequired: false,
          },
        ];
      case "purchase_order":
        return [
          {
            document_type: "SURAT_PESANAN",
            title: "Surat Pesanan (SP) Resmi Bertandatangan APJ",
            description: "Scan SP fisik yang ditandatangani basah oleh Apoteker Penanggung Jawab dan berstempel apotek.",
            isRequired: true,
          },
        ];
      case "sale":
      case "sales_order":
        return [
          {
            document_type: "SURAT_PESANAN",
            title: "Surat Pesanan (SP) Asli Pemesan / Sarana",
            description: "Surat Pesanan dari Apotek/RS/Klinik pemesan berstempel dan ditandatangani APJ pemesan.",
            isRequired: true,
          },
          {
            document_type: "FAKTUR_PBF_ASAL",
            title: "Faktur Pembelian PBF / Prinsipal Asal",
            description: "Bukti faktur perolehan asli saat kita kulakan ke PBF guna menjamin rantai pasok sah (CDOB BPOM).",
            isRequired: true,
          },
          {
            document_type: "SURAT_JALAN",
            title: "Surat Jalan / DO Pengiriman Penjualan",
            description: "Bukti penyerahan produk ke sarana pemesan.",
            isRequired: false,
          },
          {
            document_type: "FAKTUR_PAJAK",
            title: "Faktur Pajak Penjualan",
            description: "Dokumen faktur pajak keluaran transaksi.",
            isRequired: false,
          },
        ];
      case "supplier":
        return [
          {
            document_type: "IZIN_PBF",
            title: "Surat Izin Usaha PBF / Cabang",
            description: "Izin operasional resmi Kemenkes / Dinas Kesehatan terkait.",
            isRequired: true,
          },
          {
            document_type: "SERTIFIKAT_CDOB",
            title: "Sertifikat CDOB BPOM",
            description: "Sertifikat Cara Distribusi Obat yang Baik yang masih aktif.",
            isRequired: true,
          },
          {
            document_type: "SIPA_APJ",
            title: "SIPA Apoteker Penanggung Jawab",
            description: "Surat Izin Praktik Apoteker penanggung jawab teknis PBF.",
            isRequired: true,
          },
        ];
      case "customer":
        return [
          {
            document_type: "NIB",
            title: "NIB (Nomor Induk Berusaha)",
            description: "Dokumen Nomor Induk Berusaha fasilitas (Format: PDF)",
            isRequired: false,
          },
          {
            document_type: "IZIN_OPERASIONAL",
            title: "Izin Operasional Fasilitas",
            description: "Izin Operasional Fasilitas / SIA / Izin RS / Klinik (Format: PDF)",
            isRequired: false,
          },
          {
            document_type: "NPWP",
            title: "NPWP",
            description: "Nomor Pokok Wajib Pajak fasilitas (Format: PDF / JPG)",
            isRequired: false,
          },
          {
            document_type: "SIPA_APJ",
            title: "SIPA Apoteker",
            description: "Surat Izin Praktik Apoteker Penanggung Jawab (Format: PDF / JPG)",
            isRequired: false,
          },
          {
            document_type: "STR_APJ",
            title: "STR Apoteker",
            description: "Surat Tanda Registrasi Apoteker / STRA (Format: PDF / JPG)",
            isRequired: false,
          },
          {
            document_type: "SURAT_PENUNJUKAN_APJ",
            title: "Surat Penunjukan Apoteker",
            description: "Surat penunjukan / SK penugasan APJ (Format: PDF)",
            isRequired: false,
          },
          {
            document_type: "DOKUMEN_TAMBAHAN",
            title: "Dokumen Tambahan",
            description: "Denah sarana atau dokumen pendukung lain (Format: PDF / JPG / PNG)",
            isRequired: false,
          },
        ];
      default:
        return [];
    }
  }, [entityType]);

  // Set default selectedDocType if single mode
  useEffect(() => {
    if (requirements.length > 0 && !selectedDocType) {
      setSelectedDocType(requirements[0].document_type);
    }
  }, [requirements, selectedDocType]);

  // Query existing documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", entityType, entityId],
    queryFn: async () => {
      if (!entityId || entityId === "new" || entityId === "temp") return [];
      const res = await api.get(`/documents?entity_type=${entityType}&entity_id=${entityId}`);
      return (res.data?.data || []) as DocumentAttachment[];
    },
    enabled: !!entityId && entityId !== "new" && entityId !== "temp",
  });

  // Report count to parent
  useEffect(() => {
    if (onUploadedCountChange) {
      onUploadedCountChange(documents.length);
    }
  }, [documents, onUploadedCountChange]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      setSuccessMsg("Dokumen berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus dokumen");
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Approval Mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "APPROVED" | "REJECTED" | "PENDING"; notes?: string }) => {
      const res = await api.put(`/documents/${id}/approval`, { status, notes });
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data?.message || "Status persetujuan berhasil diperbarui");
      setRejectingDocId(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui status persetujuan");
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Upload handler for single doc
  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!entityId || entityId === "new" || entityId === "temp") {
      setErrorMsg("Mohon simpan data transaksi terlebih dahulu sebelum mengunggah dokumen!");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("document_type", selectedDocType || "OTHER");
    formData.append("upload_mode", "SINGLE");
    if (docNotes) formData.append("notes", docNotes);
    if (docExpiryDate) formData.append("expiry_date", docExpiryDate);

    try {
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMsg(
        isCustomer
          ? "Dokumen pelanggan berhasil diunggah! Menunggu persetujuan APJ/perusahaan."
          : "Dokumen berhasil diunggah dan terarsip!"
      );
      setDocNotes("");
      setDocExpiryDate("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengunggah dokumen");
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  // Upload handler for bundle multi-file
  const handleBundleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!entityId || entityId === "new" || entityId === "temp") {
      setErrorMsg("Mohon simpan data transaksi terlebih dahulu sebelum mengunggah dokumen bundle!");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("document_type", "BUNDLE_ALL");
    formData.append("upload_mode", "BUNDLE");
    if (docNotes) formData.append("notes", docNotes);
    if (docExpiryDate) formData.append("expiry_date", docExpiryDate);

    try {
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMsg(`${files.length} berkas bundle berhasil diunggah!`);
      setDocNotes("");
      setDocExpiryDate("");
      if (bundleInputRef.current) bundleInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengunggah berkas bundle");
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (doc: DocumentAttachment) => {
    setEditDoc(doc);
    setEditDocType(doc.document_type);
    setEditNotes(doc.notes || "");
    setEditExpiryDate(doc.expiry_date ? doc.expiry_date.split("T")[0] : "");
    setEditReplacementFile(null);
  };

  // Submit edit modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoc) return;

    setIsEditing(true);
    setErrorMsg(null);

    try {
      if (editReplacementFile) {
        // Use multipart form to replace file
        const formData = new FormData();
        formData.append("document_type", editDocType);
        formData.append("notes", editNotes);
        if (editExpiryDate) formData.append("expiry_date", editExpiryDate);
        formData.append("file", editReplacementFile);

        await api.put(`/documents/${editDoc.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Use JSON for metadata update
        await api.put(`/documents/${editDoc.id}`, {
          document_type: editDocType,
          notes: editNotes,
          expiry_date: editExpiryDate || null,
        });
      }

      setSuccessMsg("Dokumen berhasil diperbarui!");
      setEditDoc(null);
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui dokumen");
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsEditing(false);
    }
  };

  // Submit rejection
  const handleConfirmReject = () => {
    if (!rejectingDocId) return;
    approvalMutation.mutate({
      id: rejectingDocId,
      status: "REJECTED",
      notes: rejectionReason.trim() || "Dokumen tidak sesuai standar kepatuhan CDOB PBF",
    });
  };

  // Backend URL helper for files
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  // Filter single vs bundle documents
  const singleDocuments = documents.filter((d) => d.upload_mode !== "BUNDLE");
  const bundleDocuments = documents.filter((d) => d.upload_mode === "BUNDLE");

  // Status badge helper
  const renderApprovalBadge = (doc: DocumentAttachment) => {
    if (!isCustomer) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full"
          title="Dokumen lampiran transaksi terarsip sah (tidak memerlukan persetujuan)"
        >
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          <span>Terarsip</span>
        </span>
      );
    }

    const status = doc.approval_status || "PENDING";
    if (status === "APPROVED") {
      return (
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-400 px-2.5 py-0.5 rounded-full shadow-2xs"
          title={`Disetujui oleh: ${doc.approver?.full_name || "Apoteker / Perusahaan"} pada ${doc.approved_at ? formatDate(doc.approved_at) : "-"}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>✓ Disetujui Perusahaan</span>
        </span>
      );
    }
    if (status === "REJECTED") {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-400 px-2.5 py-0.5 rounded-full"
          title={`Alasan: ${doc.approval_notes || "Ditolak perusahaan"}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>✕ Ditolak</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2.5 py-0.5 rounded-full animate-pulse"
        title="Menunggu verifikasi dan persetujuan APJ perusahaan"
      >
        <Clock className="w-3.5 h-3.5 text-amber-700" />
        <span>Perlu Persetujuan (Pending)</span>
      </span>
    );
  };

  // Expiry date badge helper
  const renderExpiryBadge = (expDate?: string) => {
    if (!expDate) return null;
    const exp = new Date(expDate);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded"
          title={`Kedaluwarsa pada ${formatDate(expDate)}`}
        >
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Expired: {formatDate(expDate)}</span>
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded"
          title={`Akan expired dalam ${diffDays} hari`}
        >
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>Exp: {formatDate(expDate)} ({diffDays} hr lagi)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
        <span>Exp: {formatDate(expDate)}</span>
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden text-xs">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-emerald-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
            <p className="text-[11px] text-slate-500">
              {subtitle || "Unggah dokumen kepatuhan (SP, Faktur PBF Asal, SIA, SIPA) dengan alur persetujuan perusahaan & preview."}
            </p>
          </div>
        </div>

        {/* Tab Mode Switcher */}
        <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs">
          <button
            type="button"
            onClick={() => setUploadMode("SINGLE")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
              uploadMode === "SINGLE"
                ? "bg-[#00c875] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Upload Satu per Satu</span>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode("BUNDLE")}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
              uploadMode === "BUNDLE"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Upload Semua Jadi 1 (Bundle)</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Mode 1: Upload Satu per Satu per Kategori */}
      {uploadMode === "SINGLE" && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requirements.map((req) => {
              const uploadedDocs = singleDocuments.filter(
                (d) => d.document_type === req.document_type
              );
              const isUploaded = uploadedDocs.length > 0;

              return (
                <div
                  key={req.document_type}
                  className={`border rounded-lg p-3 transition flex flex-col justify-between ${
                    isUploaded
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{req.title}</span>
                        {req.isRequired ? (
                          <span className="text-[10px] font-semibold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">
                            Wajib
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            Opsional
                          </span>
                        )}
                      </div>
                      {isUploaded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Terunggah ({uploadedDocs.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-full">
                          Belum Diunggah
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 leading-tight">
                      {req.description}
                    </p>

                    {/* Uploaded items in this slot */}
                    {uploadedDocs.length > 0 && (
                      <div className="space-y-2 my-2">
                        {uploadedDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <File className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate max-w-[170px] font-medium text-slate-800" title={doc.original_name}>
                                  {doc.original_name}
                                </span>
                                <span className="text-slate-400 text-[10px] shrink-0">
                                  ({formatFileSize(doc.file_size)})
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {renderExpiryBadge(doc.expiry_date)}
                                {renderApprovalBadge(doc)}
                              </div>
                            </div>

                            {/* Rejection notice if any */}
                            {doc.approval_status === "REJECTED" && doc.approval_notes && (
                              <div className="text-[10.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                                <span><strong>Catatan Penolakan:</strong> {doc.approval_notes}</span>
                              </div>
                            )}

                            {/* Approver info if approved (Customer only) */}
                            {isCustomer && doc.approval_status === "APPROVED" && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50/60 rounded px-2 py-0.5 border border-emerald-200/60 flex items-center justify-between">
                                <span>Disetujui oleh: <strong>{doc.approver?.full_name || "Apoteker / APJ Perusahaan"}</strong></span>
                                <span>{doc.approved_at ? formatDate(doc.approved_at) : ""}</span>
                              </div>
                            )}

                            {/* Action Buttons: Preview, Edit, Approve/Reject (Khusus Pelanggan PBF), Delete */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-1">
                                {/* Preview */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="h-6 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold inline-flex items-center gap-1 transition"
                                  title="Preview File"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>Preview</span>
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(doc)}
                                  className="h-6 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold inline-flex items-center gap-1 transition"
                                  title="Edit Dokumen / Ganti File / Tanggal Expired"
                                >
                                  <Edit2 className="w-3 h-3 text-amber-600" />
                                  <span>Edit</span>
                                </button>
                              </div>

                              {/* Company Approval Actions (KHUSUS PELANGGAN PBF) & Delete */}
                              <div className="flex items-center gap-1">
                                {isCustomer && (
                                  <>
                                    {/* 1. SEBELUM DISETUJUI (STATUS PENDING) */}
                                    {doc.approval_status === "PENDING" && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            approvalMutation.mutate({
                                              id: doc.id,
                                              status: "APPROVED",
                                              notes: "Dokumen legalitas pelanggan telah diverifikasi dan disetujui",
                                            })
                                          }
                                          disabled={approvalMutation.isPending}
                                          className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] active:scale-95 text-white rounded font-bold inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-50 text-[10.5px]"
                                          title="Setujui Dokumen Pelanggan PBF"
                                        >
                                          <Check className="w-3 h-3 stroke-[3]" />
                                          <span>Setujui</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRejectingDocId(doc.id);
                                            setRejectionReason("");
                                          }}
                                          className="h-6 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold inline-flex items-center gap-1 shadow-2xs transition text-[10.5px]"
                                          title="Tolak Dokumen Ini"
                                        >
                                          <X className="w-3 h-3" />
                                          <span>Tolak</span>
                                        </button>
                                      </>
                                    )}

                                    {/* 2. SESUDAH DISETUJUI (STATUS APPROVED - Tombol Jelas Berbeda) */}
                                    {doc.approval_status === "APPROVED" && (
                                      <>
                                        <div
                                          className="h-6 px-2.5 bg-emerald-800 text-white rounded-md font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs border border-emerald-900 cursor-default"
                                          title={`Dokumen telah diverifikasi dan disetujui oleh ${doc.approver?.full_name || "Apoteker"}`}
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                                          <span>Telah Disetujui</span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            approvalMutation.mutate({
                                              id: doc.id,
                                              status: "PENDING",
                                              notes: "Persetujuan dibatalkan untuk verifikasi ulang",
                                            })
                                          }
                                          disabled={approvalMutation.isPending}
                                          className="h-6 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold inline-flex items-center gap-1 transition"
                                          title="Batalkan Persetujuan (Kembalikan ke status Menunggu)"
                                        >
                                          <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                                          <span>Batalkan</span>
                                        </button>
                                      </>
                                    )}

                                    {/* 3. SESUDAH DITOLAK (STATUS REJECTED) */}
                                    {doc.approval_status === "REJECTED" && (
                                      <>
                                        <div className="h-6 px-2 bg-rose-700 text-white rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                                          <XCircle className="w-3 h-3" />
                                          <span>Telah Ditolak</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            approvalMutation.mutate({
                                              id: doc.id,
                                              status: "APPROVED",
                                              notes: "Disetujui ulang setelah perbaikan berkas",
                                            })
                                          }
                                          className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                        >
                                          Setujui Ulang
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Hapus dokumen "${doc.original_name}"?`)) {
                                      deleteMutation.mutate(doc.id);
                                    }
                                  }}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload button for this specific slot */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {/* Tanggal Expired Dokumen Input */}
                    <div className="flex items-center gap-1 text-[10.5px]">
                      <span className="text-slate-600 font-medium">Tgl Expired:</span>
                      <input
                        type="date"
                        value={docExpiryDate}
                        onChange={(e) => setDocExpiryDate(e.target.value)}
                        className="h-6 px-1.5 border border-slate-300 rounded text-[10.5px] bg-white text-slate-800"
                        title="Tanggal Kedaluwarsa Dokumen / Izin (SIPA, SIA, Izin PBF, dsb)"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-[11px] shadow-2xs transition active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-[#00c875]" />
                        <span>{isUploaded ? "+ Tambah File Lain" : "Unggah File Ini"}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            setSelectedDocType(req.document_type);
                            handleSingleUpload(e);
                          }}
                          disabled={uploading}
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Upload Semua Dokumen Menjadi 1 (Bundle / Sekaligus) */}
      {uploadMode === "BUNDLE" && (
        <div className="p-4 space-y-4">
          <div className="text-[11px] text-slate-600 bg-blue-50/70 border border-blue-200/60 rounded p-2.5 flex items-start gap-2">
            <FolderArchive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-900 block mb-0.5">
                Fitur Upload Sekaligus / Berkas Gabungan (Bundle)
              </span>
              <span>
                Anda dapat mengunggah <strong>1 file gabungan (PDF yang sudah berisi Faktur PBF, Surat Jalan, SP, dan Faktur Pajak sekaligus)</strong>, atau memilih banyak berkas sekaligus (multi-select) untuk diarsipkan dalam satu paket transaksi ini.
              </span>
            </div>
          </div>

          {/* Bundle Dropzone / Upload Box */}
          <div className="border-2 border-dashed border-slate-300 hover:border-[#00c875] rounded-lg p-6 bg-slate-50/60 hover:bg-slate-50 text-center transition flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-[#00c875]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Pilih 1 File Gabungan (Merged PDF) atau Multi-File</h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Tarik file ke sini atau klik tombol di bawah untuk memilih file PDF atau gambar dokumen lengkap.
              </p>
            </div>

            <div className="w-full max-w-md my-1">
              <input
                type="text"
                placeholder="Catatan bundle dokumen (opsional, misal: Faktur PBF No. 12345 Lengkap)"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                className="w-full h-7 px-2.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-[#00c875]"
              />
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#00c875] hover:bg-[#00b066] text-white font-semibold rounded text-xs shadow-2xs transition active:scale-95">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Pilih Berkas Bundle / Multi-File</span>
                </>
              )}
              <input
                ref={bundleInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.zip"
                onChange={handleBundleUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Bundle Documents List */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <FolderArchive className="w-4 h-4 text-emerald-600" />
              <span>Daftar Berkas Bundle Terunggah ({bundleDocuments.length})</span>
            </h4>

            {bundleDocuments.length === 0 ? (
              <div className="border border-slate-200 rounded p-4 text-center text-slate-400 bg-slate-50/50">
                Belum ada bundle dokumen yang diunggah untuk transaksi ini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-left">
                      <th className="py-2 px-3">Nama Berkas</th>
                      <th className="py-2 px-3">Ukuran</th>
                      <th className="py-2 px-3">Status Persetujuan</th>
                      <th className="py-2 px-3">Catatan</th>
                      <th className="py-2 px-3">Tanggal Unggah</th>
                      <th className="py-2 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bundleDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 flex items-center gap-2 font-medium text-slate-800">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[200px]" title={doc.original_name}>
                            {doc.original_name}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500">{formatFileSize(doc.file_size)}</td>
                        <td className="py-2 px-3">
                          {renderApprovalBadge(doc)}
                          {doc.approval_status === "REJECTED" && doc.approval_notes && (
                            <p className="text-[10px] text-rose-600 truncate max-w-[150px] mt-0.5">
                              {doc.approval_notes}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 italic">{doc.notes || "-"}</td>
                        <td className="py-2 px-3 text-slate-500">{formatDate(doc.created_at)}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="h-6 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                              title="Preview Dokumen"
                            >
                              <Eye className="w-3 h-3 text-blue-600" />
                              <span>Preview</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(doc)}
                              className="h-6 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                              title="Edit / Ganti Berkas"
                            >
                              <Edit2 className="w-3 h-3 text-amber-600" />
                              <span>Edit</span>
                            </button>

                            {/* Approval actions (KHUSUS PELANGGAN PBF) */}
                            {isCustomer && (
                              <>
                                {/* 1. SEBELUM DISETUJUI */}
                                {doc.approval_status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        approvalMutation.mutate({
                                          id: doc.id,
                                          status: "APPROVED",
                                          notes: "Bundle dokumen pelanggan telah disetujui",
                                        })
                                      }
                                      disabled={approvalMutation.isPending}
                                      className="h-6 px-2.5 bg-[#00c875] hover:bg-[#00b066] active:scale-95 text-white rounded font-bold inline-flex items-center gap-1 shadow-2xs transition disabled:opacity-50 text-[10px]"
                                      title="Setujui Dokumen Pelanggan"
                                    >
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>Setujui</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingDocId(doc.id);
                                        setRejectionReason("");
                                      }}
                                      className="h-6 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold inline-flex items-center gap-1 shadow-2xs transition text-[10px]"
                                      title="Tolak Dokumen"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Tolak</span>
                                    </button>
                                  </>
                                )}

                                {/* 2. SESUDAH DISETUJUI */}
                                {doc.approval_status === "APPROVED" && (
                                  <>
                                    <div
                                      className="h-6 px-2 bg-emerald-800 text-white rounded font-bold text-[10px] inline-flex items-center gap-1 shadow-xs border border-emerald-900 cursor-default"
                                      title="Dokumen telah disetujui"
                                    >
                                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                                      <span>Telah Disetujui</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        approvalMutation.mutate({
                                          id: doc.id,
                                          status: "PENDING",
                                          notes: "Persetujuan dibatalkan untuk verifikasi ulang",
                                        })
                                      }
                                      disabled={approvalMutation.isPending}
                                      className="h-6 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold inline-flex items-center gap-0.5 transition"
                                      title="Batalkan Persetujuan"
                                    >
                                      <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                                      <span>Batalkan</span>
                                    </button>
                                  </>
                                )}

                                {/* 3. SESUDAH DITOLAK */}
                                {doc.approval_status === "REJECTED" && (
                                  <>
                                    <div className="h-6 px-2 bg-rose-700 text-white rounded font-bold text-[10px] inline-flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      <span>Telah Ditolak</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        approvalMutation.mutate({
                                          id: doc.id,
                                          status: "APPROVED",
                                          notes: "Disetujui ulang",
                                        })
                                      }
                                      className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                    >
                                      Setujui Ulang
                                    </button>
                                  </>
                                )}
                              </>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus berkas "${doc.original_name}"?`)) {
                                  deleteMutation.mutate(doc.id);
                                }
                              }}
                              className="h-6 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Status summary */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>Total Berkas Dokumen: <strong>{documents.length}</strong> file</span>
        <span>Standar CDOB BPOM &bull; Sistem ERP Farmasi</span>
      </div>

      {/* 2. PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs truncate max-w-md">
                  {previewDoc.original_name}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  ({formatFileSize(previewDoc.file_size)})
                </span>
                {renderApprovalBadge(previewDoc)}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${backendBaseUrl}${previewDoc.file_path}`}
                  download={previewDoc.original_name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 text-slate-400 hover:text-white rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 min-h-0 bg-slate-100 flex items-center justify-center overflow-auto p-2">
              {previewDoc.mime_type.includes("pdf") || previewDoc.file_name.endsWith(".pdf") ? (
                <iframe
                  src={`${backendBaseUrl}${previewDoc.file_path}#toolbar=1`}
                  className="w-full h-full rounded border border-slate-300 bg-white"
                  title="PDF Preview"
                />
              ) : previewDoc.mime_type.includes("image") ||
                previewDoc.file_name.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <div className="max-w-full max-h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${backendBaseUrl}${previewDoc.file_path}`}
                    alt={previewDoc.original_name}
                    className="max-w-full max-h-[75vh] object-contain rounded shadow border border-slate-300 bg-white"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Preview langsung tidak tersedia untuk format berkas ini.</p>
                  <p className="text-xs text-slate-500 mt-1">Silakan klik tombol unduh di atas untuk membuka berkas.</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Bar: Approval Actions */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-600">
                {previewDoc.notes && (
                  <span><strong>Catatan:</strong> {previewDoc.notes}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isCustomer && (
                  <>
                    {previewDoc.approval_status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            approvalMutation.mutate({
                              id: previewDoc.id,
                              status: "APPROVED",
                              notes: "Disetujui dari preview modal",
                            });
                            setPreviewDoc((prev) => prev ? { ...prev, approval_status: "APPROVED" } : null);
                          }}
                          className="px-3 py-1 bg-[#00c875] hover:bg-[#00b066] text-white font-bold rounded flex items-center gap-1 shadow-2xs transition text-xs"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Setujui Dokumen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingDocId(previewDoc.id);
                            setRejectionReason("");
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1 shadow-2xs transition text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak Dokumen</span>
                        </button>
                      </>
                    )}

                    {previewDoc.approval_status === "APPROVED" && (
                      <div className="px-3 py-1 bg-emerald-800 text-white font-bold rounded flex items-center gap-1 shadow-xs text-xs border border-emerald-900">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Telah Disetujui</span>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT MODAL */}
      {editDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Edit Dokumen / Ganti Berkas</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditDoc(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Berkas Saat Ini:
                </label>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700 flex items-center gap-2">
                  <File className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium truncate">{editDoc.original_name}</span>
                  <span className="text-slate-400 text-[10px]">({formatFileSize(editDoc.file_size)})</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kategori Dokumen:
                </label>
                <select
                  value={editDocType}
                  onChange={(e) => setEditDocType(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  {requirements.map((r) => (
                    <option key={r.document_type} value={r.document_type}>
                      {r.title}
                    </option>
                  ))}
                  <option value="BUNDLE_ALL">Bundle Lengkap Semua Dokumen</option>
                  <option value="OTHER">Dokumen Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan:
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan dokumen..."
                  className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tanggal Kedaluwarsa (Expired Date):
                </label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ganti File Berkas (Opsional):
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setEditReplacementFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer"
                />
                {editReplacementFile && (
                  <p className="text-[10px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Mengganti file akan me-reset status persetujuan kembali ke &quot;Menunggu Persetujuan&quot;.</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditDoc(null)}
                  className="flex-1 h-8 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REJECTION REASON MODAL */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Alasan Penolakan Dokumen</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-600 leading-tight">
                Silakan tuliskan alasan penolakan dokumen agar pelanggan / staf pengunggah dapat melakukan perbaikan:
              </p>

              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Misal: Tanda tangan basah APJ belum ada, atau SIPA sudah kadaluarsa..."
                className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-rose-500 text-xs"
                autoFocus
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={approvalMutation.isPending}
                  className="flex-1 h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  {approvalMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>Konfirmasi Tolak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingDocId(null)}
                  className="flex-1 h-8 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded transition"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
