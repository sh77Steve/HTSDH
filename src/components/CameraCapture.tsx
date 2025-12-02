import { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string>('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        stopCamera();
      }
      setCapturing(false);
    }, 'image/jpeg', 0.9);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
        <h3 className="text-white text-lg font-semibold">Take Photo</h3>
        <div className="flex gap-2">
          <button
            onClick={toggleCamera}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            title="Switch Camera"
          >
            <RotateCw className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-w-full max-h-full"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {!error && (
        <div className="p-6 flex justify-center">
          <button
            onClick={handleCapture}
            disabled={capturing || !stream}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition disabled:opacity-50 shadow-lg"
          >
            <Camera className="w-8 h-8 text-gray-900" />
          </button>
        </div>
      )}
    </div>
  );
}
