"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2, AlertTriangle } from "lucide-react";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          function tick() {
            if (cancelled || !videoRef.current || !ctx) return;
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              ctx.drawImage(videoRef.current, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code && code.data) {
                onScan(code.data);
                stopCamera();
                return;
              }
            }
            animRef.current = requestAnimationFrame(tick);
          }
          animRef.current = requestAnimationFrame(tick);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Camera error:", e);
          setError("无法访问摄像头，请确保已授权相机权限，并使用 HTTPS 访问");
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

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">扫描二维码</h3>
            <p className="text-white/60 text-xs">将二维码对准扫描框</p>
          </div>
        </div>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <p className="text-white text-lg font-medium mb-2">摄像头访问失败</p>
            <p className="text-white/60 text-sm mb-6">{error}</p>
            <button
              onClick={onClose}
              className="btn-press px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              关闭
            </button>
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
          
          {/* Scan overlay */}
          <div className="relative z-10">
            {/* Semi-transparent overlay */}
            <div className="absolute -inset-[50vh] bg-black/50" />
            
            {/* Scan frame */}
            <div className="relative w-72 h-72">
              {/* Clear center */}
              <div className="absolute inset-0 bg-transparent" />
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-white rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-white rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-white rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-white rounded-br-2xl" />
              
              {/* Scanning line */}
              {scanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" 
                     style={{ animation: "scan-line 2s ease-in-out infinite" }} />
              )}
            </div>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-12 left-0 right-0 text-center z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
              {scanning ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                  <p className="text-white/90 text-sm">正在扫描...</p>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                  <p className="text-white/60 text-sm">正在启动摄像头...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
