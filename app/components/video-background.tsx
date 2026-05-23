"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const VIDEO_SRC = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4";

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBgRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const [framesReady, setFramesReady] = useState(false);

  // Effect 1: Frame capture — record every distinct video frame to an offscreen canvas array
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let capturing = true;
    let lastTime = -1;
    const MAX_WIDTH = 960;
    const frames: HTMLCanvasElement[] = [];
    let rafId = 0;

    const captureFrame = () => {
      if (!capturing) return;
      if (video.readyState < 2) {
        rafId = requestAnimationFrame(captureFrame);
        return;
      }

      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
        const w = video.videoWidth * scale;
        const h = video.videoHeight * scale;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          frames.push(canvas);
        }
      }

      if ("requestVideoFrameCallback" in video) {
        (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void })
          .requestVideoFrameCallback(captureFrame);
      } else {
        rafId = requestAnimationFrame(captureFrame);
      }
    };

    const onLoadedMetadata = () => {
      video.play().catch(() => {});
      if ("requestVideoFrameCallback" in video) {
        (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void })
          .requestVideoFrameCallback(captureFrame);
      } else {
        rafId = requestAnimationFrame(captureFrame);
      }
    };

    const onEnded = () => {
      capturing = false;
      framesRef.current = frames;
      setFramesReady(true);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);

    if (video.readyState >= 1) onLoadedMetadata();

    return () => {
      capturing = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  // Effect 2: Boomerang render — play captured frames forward then reverse at 30fps
  useEffect(() => {
    if (!framesReady || framesRef.current.length === 0) return;

    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frames = framesRef.current;
    canvas.width = frames[0].width;
    canvas.height = frames[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    const interval = 1000 / 30;
    let rafId = 0;

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

  // Effect 3: Parallax mouse tracking — smoothly drift the layer with cursor
  useEffect(() => {
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    const strength = 20;
    let rafId = 0;

    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = ((e.clientX - cx) / cx) * strength;
      targetY = ((e.clientY - cy) / cy) * strength;
    };

    window.addEventListener("mousemove", onMouseMove);

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
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={videoBgRef}
      className="pointer-events-none fixed inset-0 z-0 -ml-4 -mt-4 origin-center scale-[1.08]"
      aria-hidden="true"
      style={{ filter: "saturate(1.15) contrast(1.05)" }}
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="h-full w-full object-cover"
        style={{ display: framesReady ? "none" : "block" }}
      />
      <canvas
        ref={displayCanvasRef}
        className="h-full w-full object-cover"
        style={{ display: framesReady ? "block" : "none" }}
      />
      {/* Soft top/bottom vignette so nav + footer text stay legible without
          killing the video. The middle is mostly transparent so the video pops. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
