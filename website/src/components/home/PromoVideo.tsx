"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

export function PromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleDurationChange = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
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

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden glass gradient-border glow-mixed group flex flex-col"
    >
      {/* Mock Browser Header (only visible when not in fullscreen) */}
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
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
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

        {/* Custom Controls Bar */}
        <AnimatePresence>
          {(isHovering || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-4 left-4 right-4 z-20"
            >
              <div className="glass backdrop-blur-xl bg-black/60 border border-white/10 px-4 py-3 rounded-2xl flex flex-col md:flex-row items-center gap-4">
                {/* Left Controls (Play, Volume, Time) */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <span className="text-xs text-white/80 font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 flex items-center w-full">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={duration ? (currentTime / duration) * 100 : 0}
                    onChange={handleSeek}
                    className="w-full h-1.5 rounded-lg bg-white/20 accent-hashview-orange hover:accent-hashview-orange-light cursor-pointer transition-all outline-none"
                    style={{
                      background: `linear-gradient(to right, hsl(24 95% 53%) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.2) ${duration ? (currentTime / duration) * 100 : 0}%)`
                    }}
                  />
                </div>

                {/* Right Controls (Fullscreen) */}
                <div className="flex items-center gap-2 justify-end w-full md:w-auto">
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
