import { useState, useEffect, useRef } from "react";
import { QrCode, X, Camera } from "lucide-react";
import { bookingService } from "../../services/bookingService";
import { toast } from "sonner";
import { Scanner } from '@yudiel/react-qr-scanner';

interface QrScanSimulatorProps {
  onCheckInSuccess?: () => void;
}

export function QrScanSimulator({ onCheckInSuccess }: QrScanSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isClickRef = useRef(true);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.target.setPointerCapture(e.pointerId);
    setIsDragging(true);
    isClickRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    isClickRef.current = false;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  useEffect(() => {
    const handleExternalTrigger = (e: Event) => {
      setIsOpen(true);
    };
    window.addEventListener('menara:trigger-scan-simulator', handleExternalTrigger);
    return () => window.removeEventListener('menara:trigger-scan-simulator', handleExternalTrigger);
  }, []);

  const handleCameraScan = async (result: any) => {
    if (result && result.length > 0 && !submitting) {
      let token = result[0].rawValue;
      if (token && (token.includes('/qr/') || token.includes('/public/qr/'))) {
        const parts = token.split('/qr/');
        token = parts[parts.length - 1].split('?')[0].split('#')[0];
      }
      setSubmitting(true);
      try {
        const res = await bookingService.checkIn(undefined, token, undefined);
        if (res.success) {
          toast.success(res.message || "Berhasil!");
          if (onCheckInSuccess) onCheckInSuccess();
          setTimeout(() => setIsOpen(false), 1000);
        }
      } catch (err: any) {
        toast.error(err.message || "QR Code tidak valid.");
      } finally {
        setTimeout(() => setSubmitting(false), 2000);
      }
    }
  };

  return (
    <>
      <div 
        className="hidden lg:flex fixed bottom-6 right-6 z-50"
        style={{
           transform: `translate(${position.x}px, ${position.y}px)`,
           cursor: isDragging ? 'grabbing' : 'grab',
           touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          onClick={(e) => {
            if (!isClickRef.current) {
              e.preventDefault();
              return;
            }
            setIsOpen(true);
          }}
          className={`flex px-6 py-4 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.4)] items-center gap-3 shadow-emerald-500/50 select-none ${isDragging ? '' : 'hover:-translate-y-1 active:scale-95 transition-all animate-bounce'}`}
          title="Check-In QR Code Pintu"
        >
          <QrCode size={24} className={isDragging ? '' : 'animate-pulse'} />
          <span className="text-sm font-bold uppercase tracking-wider">
            Tap QR Check-In
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-[#0A1428]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Pintu QR Code Check-In</h3>
                  <p className="text-[10px] text-slate-400">Pindai QR untuk kehadiran rapat</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-50/50">
              <div className="space-y-1.5 text-center">
                <label className="block text-xs font-bold text-slate-600 uppercase">
                  Arahkan Kamera ke QR Code
                </label>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Posisikan QR Code di dalam area kotak untuk memindai kehadiran secara otomatis.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 relative aspect-square max-w-sm mx-auto bg-black flex items-center justify-center">
                {submitting ? (
                  <div className="flex flex-col items-center justify-center text-white">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs font-bold">Memproses...</span>
                  </div>
                ) : (
                  <Scanner
                    onScan={handleCameraScan}
                    onError={(err: unknown) => {
                      const errMessage = err instanceof Error ? err.message : String(err);
                      if (!errMessage.includes('No barcode or QR code detected')) {
                        console.error(errMessage);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
