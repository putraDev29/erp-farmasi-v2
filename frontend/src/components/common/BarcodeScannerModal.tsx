"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, Volume2, VolumeX, Keyboard } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode Produk / Obat",
}) => {
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [beepEnabled, setBeepEnabled] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Play synthetic beep on success
  const playBeep = () => {
    if (!beepEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz beep
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12); // 120ms beep
    } catch (e) {
      // Audio not permitted or not supported
    }
  };

  const handleSuccessScan = (decodedText: string) => {
    if (!decodedText) return;
    playBeep();
    stopScanner();
    onScan(decodedText.trim());
    onClose();
  };

  const startScanner = async () => {
    try {
      setCameraError(null);
      const html5QrCode = new Html5Qrcode("barcode-scanner-view");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.5,
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Prefer back camera on HP
        config,
        (decodedText) => {
          handleSuccessScan(decodedText);
        },
        (errorMessage) => {
          // ignore transient scan frames
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      setCameraError(
        err?.message || "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser."
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for DOM to render #barcode-scanner-view
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  // Support Hardware Barcode Scanner (Keydown buffer)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const currentTime = Date.now();

      // Hardware scanners typically type characters rapidly (< 50ms per key)
      if (currentTime - lastKeyTime > 150) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleSuccessScan(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-[#6b21a8] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Camera className="w-4 h-4 text-amber-300" />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBeepEnabled(!beepEnabled)}
              className="p-1 hover:bg-white/10 rounded transition text-white/90"
              title={beepEnabled ? "Suara beep aktif" : "Suara beep nonaktif"}
            >
              {beepEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-300" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-1 hover:bg-white/10 rounded transition text-white/90 font-bold"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div className="p-4 space-y-3 bg-slate-50">
          <div className="relative overflow-hidden rounded-lg bg-black border border-slate-300 min-h-[220px] flex items-center justify-center">
            <div id="barcode-scanner-view" className="w-full"></div>

            {/* Viewfinder overlay reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-emerald-400 rounded-md relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse"></div>
              </div>
            </div>

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 text-white p-4 flex flex-col items-center justify-center text-center space-y-2 z-10">
                <Camera className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-semibold">{cameraError}</p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-700 rounded text-xs font-medium flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Arahkan kamera HP ke barcode atau gunakan alat scanner barcode USB/Bluetooth.
          </p>

          {/* Manual input fallback */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-slate-700 font-medium text-[11px] mb-1">
              Atau ketik manual / scan via alat scanner:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) {
                  handleSuccessScan(manualCode);
                }
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Keyboard className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ketik kode barcode lalu tekan Enter..."
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-sky-500 bg-white"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3.5 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium rounded text-xs transition disabled:opacity-50"
              >
                Pilih
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
