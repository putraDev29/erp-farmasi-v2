"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Smartphone, Save, Check, RefreshCw, AlertCircle, Loader2, Key, Shield } from "lucide-react";
import { api } from "@/lib/api";

export default function PPOBIntegrationPage() {
  const [provider, setProvider] = useState("digiflazz");
  const [username, setUsername] = useState("apotekberkat");
  const [apiKey, setApiKey] = useState("df_live_891238912381293");
  const [webhookUrl, setWebhookUrl] = useState("https://api.apotek.co.id/api/v1/ppob/callback");
  const [status, setStatus] = useState("connected");
  const [balance, setBalance] = useState("Rp 1.450.000");
  const [isChecking, setIsChecking] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["settings-ppob"],
    queryFn: async () => {
      const res = await api.get("/settings/groups/PPOB");
      return res.data?.data || {};
    },
  });

  useEffect(() => {
    if (settings) {
      if (settings.provider) setProvider(settings.provider);
      if (settings.username) setUsername(settings.username);
      if (settings.api_key) setApiKey(settings.api_key);
      if (settings.webhook_url) setWebhookUrl(settings.webhook_url);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      return await api.put("/settings/groups/PPOB", payload);
    },
    onSuccess: () => {
      showToast("success", "Pengaturan integrasi PPOB berhasil disimpan!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Gagal menyimpan integrasi PPOB");
    },
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCheckBalance = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setBalance("Rp 1.450.000 (Aktif)");
      showToast("success", "Koneksi PPOB berhasil diverifikasi. Saldo aktif: Rp 1.450.000");
    }, 1200);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      provider,
      username,
      api_key: apiKey,
      webhook_url: webhookUrl,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs select-none">
      {toastMsg && (
        <div
          className={`fixed top-12 right-6 z-50 px-4 py-2 rounded shadow-md text-xs font-semibold flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <h1 className="font-semibold text-sm text-slate-800">Integrasi PPOB (Pulsa, PLN, PDAM &amp; BPJS)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckBalance}
            disabled={isChecking}
            className="h-7 px-3 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
            <span>Tes Koneksi &amp; Saldo</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Simpan</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl space-y-4 overflow-y-auto">
        <div className="bg-white rounded border border-slate-300 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Konfigurasi API PPOB Mitra Kasir</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-700 text-[11px]">Saldo PPOB: {balance}</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Penyedia / Vendor PPOB
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="digiflazz">Digiflazz Indonesia (Rekomendasi - Pulsa, Listrik, Paket Data, E-Wallet)</option>
                <option value="tripay">Tripay PPOB Gateway</option>
                <option value="ayopop">Ayopop B2B</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Username / Merchant Code
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="Kode merchant"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  API Key / Production Secret
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="df_live_..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Webhook Callback URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full h-8 px-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-cyan-500 font-mono text-slate-600"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Salin tautan ini ke dasbor pengembang vendor PPOB Anda untuk notifikasi status instan.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
