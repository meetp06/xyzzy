import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { AuthModal } from './AuthModal';

const NAV_LINKS = [
  { label: 'Subjects', path: '/subjects' },
  { label: 'Tutors', path: '/tutors' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Blog', path: '/blog' }
];
const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4';

export function LogoMark() {
  return (
    <svg width="44" height="26" viewBox="0 0 44 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="3" width="14" height="20" rx="3" fill="white" />
      <rect x="16" y="3" width="12" height="20" rx="3" fill="white" />
      <rect x="30" y="3" width="14" height="20" rx="3" fill="white" />
    </svg>
  );
}

export function Layout() {
  const [framesReady, setFramesReady] = useState(false);
  const [authModal, setAuthModal] = useState<{isOpen: boolean, mode: 'signIn' | 'signUp'}>({ isOpen: false, mode: 'signIn' });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBgRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Effect 1: Frame capture (boomerang setup)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let capturing = true;
    let lastTime = -1;
    const MAX_WIDTH = 960;
    const frames: HTMLCanvasElement[] = [];
    let rafId: number;

    const captureFrame = () => {
      if (!capturing || video.readyState < 2) {
        if (capturing) {
          if ('requestVideoFrameCallback' in video) {
            (video as any).requestVideoFrameCallback(captureFrame);
          } else {
            rafId = requestAnimationFrame(captureFrame);
          }
        }
        return;
      }
      
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
        const w = video.videoWidth * scale;
        const h = video.videoHeight * scale;
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          frames.push(canvas);
        }
      }

      if (capturing) {
        if ('requestVideoFrameCallback' in video) {
          (video as any).requestVideoFrameCallback(captureFrame);
        } else {
          rafId = requestAnimationFrame(captureFrame);
        }
      }
    };

    const onLoadedMetadata = () => {
      video.play().catch(() => {});
      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        rafId = requestAnimationFrame(captureFrame);
      }
    };

    const onEnded = () => {
      capturing = false;
      framesRef.current = frames;
      setFramesReady(true);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);

    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      capturing = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  // Effect 2: Boomerang render
  useEffect(() => {
    if (!framesReady || framesRef.current.length === 0) return;
    
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frames = framesRef.current;
    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    const interval = 1000 / 30; // 30fps playback
    let rafId: number;

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (now - last >= interval) {
        last = now - ((now - last) % interval);
        ctx.drawImage(frames[index], 0, 0);

        index += direction;
        if (index >= frames.length - 1) {
          index = frames.length - 1;
          direction = -1;
        } else if (index <= 0) {
          index = 0;
          direction = 1;
        }
      }
    };

    rafId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rafId);
  }, [framesReady]);

  // Effect 3: Parallax mouse tracking
  useEffect(() => {
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    const strength = 20;
    let rafId: number;

    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = ((e.clientX - cx) / cx) * strength;
      targetY = ((e.clientY - cy) / cy) * strength;
    };

    window.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      
      if (videoBgRef.current) {
        gsap.set(videoBgRef.current, { x: currentX, y: currentY });
      }
      
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-body overflow-x-hidden relative">
      
      {/* Video background layer */}
      <div ref={videoBgRef} className="fixed top-0 left-0 w-full h-full z-0 scale-[1.08] origin-center -ml-4 -mt-4">
        <video 
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          style={{ display: framesReady ? 'none' : 'block' }}
        />
        <canvas 
          ref={displayCanvasRef}
          className="w-full h-full object-cover"
          style={{ display: framesReady ? 'block' : 'none' }}
        />
        <div className="absolute inset-0 bg-black/15 mix-blend-multiply" />
      </div>

      {/* Nav */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap">
        <div className="liquid-glass flex items-center gap-6 rounded-full px-4 py-2.5">
          <Link to="/">
            <LogoMark />
          </Link>
          <div className="flex items-center gap-5">
            {NAV_LINKS.map(link => (
              <Link key={link.label} to={link.path} className="text-sm font-body font-light text-white/70 hover:text-white transition-colors duration-200">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button 
              onClick={() => setAuthModal({ isOpen: true, mode: 'signIn' })}
              className="text-sm font-body font-light text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              Sign in
            </button>
            <button 
              onClick={() => setAuthModal({ isOpen: true, mode: 'signUp' })}
              className="liquid-glass-strong text-sm font-body font-medium text-white rounded-full px-4 py-1.5 transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_16px_2px_rgba(255,255,255,0.12)] active:scale-[0.97]"
            >
              Try it free
            </button>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModal.isOpen} 
        initialMode={authModal.mode} 
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))} 
      />

      {/* Main Content Sections */}
      <main className="relative z-20">
         <Outlet />
      </main>
        
      {!isHome && (
        <footer className="relative z-20 py-16 text-center border-t border-white/5 flex flex-col items-center gap-6 bg-black/80 backdrop-blur-3xl shadow-[0_-40px_80px_rgba(0,0,0,0.8)]">
          <LogoMark />
          <p className="text-white/30 text-sm font-light">
            © 2026 EduLearn. Mastering the future.
          </p>
        </footer>
      )}
    </div>
  );
}
