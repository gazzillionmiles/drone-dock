import { useEffect, useRef, useState } from 'react';
import { useLiveKit } from '../hooks/useLiveKit';
import './DroneVideoPlayer.css';

// LiveKit elements
import { LiveKitRoom } from '@livekit/components-react';

export default function DroneVideoPlayer({ drone }) {
  const { token, serverUrl, loading, error, configured } = useLiveKit(drone.id);
  const canvasRef = useRef(null);
  const [lkState, setLkState] = useState('Disconnected');

  // Dynamic LiveKit URL, fallback to local default
  const lkUrl = serverUrl || 'ws://localhost:7880';

  // HUD Drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let noiseSeed = 0;

    const render = () => {
      const w = (canvas.width = canvas.offsetWidth || 400);
      const h = (canvas.height = canvas.offsetHeight || 250);

      // Reset
      ctx.clearRect(0, 0, w, h);

      // Dark tactical background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // Primary HUD Accent Color
      ctx.strokeStyle = '#4dd4c7';
      ctx.fillStyle = '#4dd4c7';
      ctx.font = '10px monospace';
      ctx.lineWidth = 1.5;

      const centerY = h / 2;
      const centerX = w / 2;

      // Artificial Horizon Lines
      ctx.beginPath();
      ctx.moveTo(centerX - 60, centerY);
      ctx.lineTo(centerX - 20, centerY);
      ctx.moveTo(centerX + 20, centerY);
      ctx.lineTo(centerX + 60, centerY);
      ctx.stroke();

      // Pitch movement simulated via altitude state changes
      const pitchOffset = (drone.altitude % 40) - 20;
      ctx.beginPath();
      // +10 pitch
      ctx.moveTo(centerX - 40, centerY - 30 - pitchOffset);
      ctx.lineTo(centerX + 40, centerY - 30 - pitchOffset);
      // -10 pitch
      ctx.moveTo(centerX - 40, centerY + 30 - pitchOffset);
      ctx.lineTo(centerX + 40, centerY + 30 - pitchOffset);
      ctx.stroke();

      // Center crosshair aiming reticle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Speed scale tape (Left)
      ctx.beginPath();
      ctx.rect(15, 30, 42, h - 60);
      ctx.stroke();
      ctx.fillText('SPD m/s', 15, 24);
      ctx.fillText(`${drone.speed.toFixed(1)}`, 20, centerY + 4);

      for (let i = -3; i <= 3; i++) {
        const y = centerY + i * 20;
        if (y > 30 && y < h - 30) {
          ctx.beginPath();
          ctx.moveTo(15, y);
          ctx.lineTo(21, y);
          ctx.stroke();
          const spdMark = Math.max(0, drone.speed + i * 2).toFixed(0);
          ctx.fillText(spdMark, 24, y + 3);
        }
      }

      // Altitude scale tape (Right)
      ctx.beginPath();
      ctx.rect(w - 57, 30, 42, h - 60);
      ctx.stroke();
      ctx.fillText('ALT m', w - 57, 24);
      ctx.fillText(`${drone.altitude}`, w - 52, centerY + 4);

      for (let i = -3; i <= 3; i++) {
        const y = centerY + i * 20;
        if (y > 30 && y < h - 30) {
          ctx.beginPath();
          ctx.moveTo(w - 15, y);
          ctx.lineTo(w - 21, y);
          ctx.stroke();
          const altMark = Math.max(0, drone.altitude + i * 10).toFixed(0);
          ctx.fillText(altMark, w - 38, y + 3);
        }
      }

      // FPV Status Overlays
      ctx.fillText('FPV CAMERA STREAM // WEBRTC', w / 2 - 75, 20);
      ctx.fillText(`BAT: ${drone.battery.toFixed(1)}%`, 20, h - 15);
      ctx.fillText(`MODE: ${drone.status}`, w / 2 - 35, h - 15);
      ctx.fillText(`POS: ${drone.latitude.toFixed(4)}, ${drone.longitude.toFixed(4)}`, w - 170, h - 15);

      // CRT Scanline grid
      ctx.fillStyle = 'rgba(77, 212, 199, 0.04)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      // Static digital noise
      ctx.fillStyle = 'rgba(77, 212, 199, 0.02)';
      noiseSeed += 1;
      for (let i = 0; i < 200; i++) {
        const rx = (Math.sin(noiseSeed + i) * 10000) % w;
        const ry = (Math.cos(noiseSeed + i * 2) * 10000) % h;
        ctx.fillRect(rx, ry, 2, 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [drone]);

  // Hook LiveKit events to update status badge
  const handleConnected = () => setLkState('Connected');
  const handleDisconnected = () => setLkState('Disconnected');
  const handleError = () => setLkState('Disconnected');

  useEffect(() => {
    if (configured === false) {
      setLkState('Not Configured');
    } else if (token) {
      setLkState('Connecting...');
    } else {
      setLkState('Disconnected');
    }
  }, [token, configured]);

  return (
    <div className="drone-video">
      <div className="drone-video__header">
        <span className="drone-video__title mono">VIDEO FEED</span>
        <span className={`drone-video__badge mono drone-video__badge--${lkState.toLowerCase().replace('...', '').replace(' ', '-')}`}>
          {lkState}
        </span>
      </div>

      <div className="drone-video__container">
        {loading && <div className="drone-video__overlay mono">Syncing WebRTC token...</div>}
        {error && <div className="drone-video__overlay drone-video__overlay--error mono">LiveKit Error: {error}</div>}
        {configured === false && (
          <div className="drone-video__overlay drone-video__overlay--warning mono">
            VIDEO NOT CONFIGURED
          </div>
        )}

        <canvas ref={canvasRef} className="drone-video__canvas" />

        {token && (
          <LiveKitRoom
            video={false}
            audio={false}
            token={token}
            serverUrl={lkUrl}
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
            onError={handleError}
            connect={true}
          />
        )}
      </div>
    </div>
  );
}
