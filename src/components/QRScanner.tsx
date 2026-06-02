"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Loader2, AlertTriangle, Keyboard, Check, Flashlight, FlashlightOff } from "lucide-react";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  continuous?: boolean;
  embedded?: boolean;
}

export default function QRScanner({ onScan, onClose, continuous = false, embedded = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const animRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const SCAN_INTERVAL = 100;
  const SCAN_SIZE = 288;
  const DUPLICATE_TIMEOUT = 1500;

  const isCameraAvailable = typeof navigator !== "undefined" && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getUserMedia === "function";

  const handleScanResult = useCallback((code: string, timestamp?: number) => {
    const now = timestamp || Date.now();
    if (continuous && code === lastCodeRef.current && now - lastScanTimeRef.current < DUPLICATE_TIMEOUT) {
      return;
    }

    lastScanTimeRef.current = now;
    lastCodeRef.current = code;

    onScan(code);
    setScanCount((prev) => prev + 1);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 800);

    if (!continuous) {
      stopCamera();
    }
  }, [continuous, onScan]);

  const toggleTorch = useCallback(async () => {
    if (!trackRef.current) return;

    try {
      const newTorchState = !torchEnabled;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraints]
      });
      setTorchEnabled(newTorchState);
    } catch (e) {
      console.error("Failed to toggle torch:", e);
    }
  }, [torchEnabled]);

  useEffect(() => {
    if (!isCameraAvailable) {
      setShowManualInput(true);
      return;
    }

    let cancelled = false;

    async function startCamera() {
      try {
        const jsQR = (await import("jsqr")).default;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        trackRef.current = videoTrack;

        const capabilities = videoTrack.getCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(capabilities.torch as boolean);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);

          const canvas = document.createElement("canvas");
          canvasRef.current = canvas;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctxRef.current = ctx;

          function tick(timestamp: number) {
            if (cancelled || !videoRef.current || !ctx) return;

            if (timestamp - lastScanTimeRef.current >= SCAN_INTERVAL) {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (canvas.width !== videoRef.current.videoWidth) {
                  canvas.width = videoRef.current.videoWidth;
                  canvas.height = videoRef.current.videoHeight;
                }

                ctx.drawImage(videoRef.current, 0, 0);

                const centerX = (canvas.width - SCAN_SIZE) / 2;
                const centerY = (canvas.height - SCAN_SIZE) / 2;
                const imageData = ctx.getImageData(
                  Math.max(0, centerX),
                  Math.max(0, centerY),
                  SCAN_SIZE,
                  SCAN_SIZE
                );

                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                  handleScanResult(code.data, timestamp);
                  if (!continuous) return;
                }
              }
            }

            animRef.current = requestAnimationFrame(tick);
          }

          animRef.current = requestAnimationFrame(tick);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Camera error:", e);
          setError("无法访问摄像头，请使用手动输入");
          setShowManualInput(true);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  function closeManualInput() {
    setShowManualInput(false);
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }

  function handleManualSubmit() {
    if (manualCode.trim()) {
      handleScanResult(manualCode.trim(), Date.now());
      setManualCode("");
      if (!continuous) {
        setShowManualInput(false);
      }
    }
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  const scannerContent = (
    <>
      {showSuccess && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-lg">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">已扫描 #{scanCount}</span>
          </div>
        </div>
      )}

      {showManualInput ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Keyboard className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-white text-center font-medium mb-2">手动输入</p>
            <p className="text-white/70 text-sm text-center mb-4">
              {error || "输入立创编号（如 C2907002）或完整二维码内容"}
            </p>
            <div className="space-y-3">
              <textarea
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="C2907002 或 {on:...,pc:C2907002,...}"
                className="w-full h-24 px-4 py-3 border border-gray-300 dark:border-[var(--card-border)] rounded-xl bg-white dark:bg-[var(--background-subtle)] text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
              />
              <div className="flex gap-3">
                {!embedded && (
                  <button
                    onClick={closeManualInput}
                    className="flex-1 px-4 py-2 border border-white/30 text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                )}
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-400 text-white rounded-xl font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">摄像头访问失败</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--background-subtle)] rounded-xl transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
              >
                手动输入
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          <div className="relative z-10">
            <div className="absolute -inset-[50vh] bg-black/30" />

            <div className="relative w-72 h-72">
              <div className="absolute inset-0 bg-transparent" />

              <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-white rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-white rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-white rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-white rounded-br-2xl" />

              {scanning && (
                <div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                  style={{ animation: "scan-line 1.5s ease-in-out infinite" }}
                />
              )}
            </div>
          </div>

          <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-3">
            {continuous && scanCount > 0 && (
              <div className="px-4 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                <p className="text-white/90 text-sm">
                  已扫描 <span className="font-bold text-emerald-400">{scanCount}</span> 个
                </p>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
              {scanning ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-white/90 text-sm">正在扫描...</p>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                  <p className="text-white/60 text-sm">正在启动摄像头...</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`px-4 py-1.5 backdrop-blur-sm text-white text-sm rounded-full transition-colors ${
                    torchEnabled 
                      ? "bg-amber-500/80 hover:bg-amber-500" 
                      : "bg-white/20 hover:bg-white/30"
                  }`}
                >
                  {torchEnabled ? (
                    <span className="flex items-center gap-1.5">
                      <FlashlightOff className="w-4 h-4" />
                      关灯
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Flashlight className="w-4 h-4" />
                      手电筒
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowManualInput(true)}
                className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full hover:bg-white/30 transition-colors"
              >
                手动输入
              </button>
              {continuous && (
                <button
                  onClick={handleClose}
                  className="px-5 py-1.5 bg-indigo-500 text-white text-sm rounded-full font-medium hover:bg-indigo-600 transition-colors"
                >
                  完成扫描
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="relative w-full h-[400px] bg-gray-900 rounded-2xl overflow-hidden">
        {scannerContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">
              {continuous ? "连续扫描" : "扫描二维码"}
            </h3>
            <p className="text-white/60 text-xs">
              {showManualInput ? "手动输入" : continuous ? "扫描完成后点击完成按钮" : "将二维码对准扫描框"}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {scannerContent}
    </div>
  );
}
