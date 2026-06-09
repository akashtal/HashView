"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

export function PromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Sync state with video element initial load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => console.log("Play failed: ", err));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen state changes from ESC key or browser controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden glass gradient-border glow-mixed group flex flex-col"
    >
      {/* Mock Browser Header (hidden in fullscreen) */}
      {!isFullscreen && (
        <div className="w-full bg-secondary/80 backdrop-blur-md border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex-1 max-w-xs mx-auto bg-background/50 border border-border/20 rounded-md py-1 px-3 text-center text-xs text-muted-foreground truncate select-none">
            hashview.co.uk/promo
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>
      )}

      {/* Video Viewport */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src="/Hashview%201.mp4"
          autoPlay
          muted
          loop
          playsInline
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Floating Centered Play/Pause Button on Pause */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-hashview-gradient flex items-center justify-center text-primary-foreground shadow-2xl scale-hover active:scale-95 transition-all glow-mixed">
                <Play className="w-10 h-10 fill-current ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Mini Controls Pill */}
        <AnimatePresence>
          {(isHovering || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0, y: 15, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 15, x: "-50%" }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-6 left-1/2 z-20"
            >
              <div className="glass backdrop-blur-xl bg-black/60 border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 shadow-xl">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors flex items-center justify-center"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-4 bg-white/20" />

                {/* Sound Button */}
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors flex items-center justify-center"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-4 bg-white/20" />

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors flex items-center justify-center"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
