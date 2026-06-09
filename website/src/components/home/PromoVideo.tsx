"use client";

export function PromoVideo() {
  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden glass gradient-border glow-mixed flex flex-col">
      {/* Mock Browser Header */}
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

      {/* Video Viewport */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <video
          src="/Hashview%201.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
