"use client";

import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

export const MouseFollowBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const springConfigFast = { damping: 20, stiffness: 150 };
  const springConfigMedium = { damping: 25, stiffness: 100 };
  const springConfigSlow = { damping: 35, stiffness: 60 };
  const springConfigVerySlow = { damping: 50, stiffness: 40 };

  const rotateX = useSpring(0, springConfigMedium);
  const rotateY = useSpring(0, springConfigMedium);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const normalizedX = (clientX / innerWidth - 0.5) * 2;
      const normalizedY = (clientY / innerHeight - 0.5) * 2;
      
      setMousePosition({ x: normalizedX, y: normalizedY });
      rotateX.set(-normalizedY * 15);
      rotateY.set(normalizedX * 15);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [rotateX, rotateY]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" style={{ perspective: "1500px" }}>
      {/* 3D Rotating container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="absolute inset-0"
      >
        {/* Deep background layer */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 20, springConfigVerySlow),
            y: useSpring(mousePosition.y * 20, springConfigVerySlow),
            translateZ: -200,
          }}
          className="absolute inset-0"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-hashview-purple/5 via-transparent to-hashview-orange/5" />
        </motion.div>

        {/* 3D Floating cubes - back layer */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 40, springConfigSlow),
            y: useSpring(mousePosition.y * 40, springConfigSlow),
            rotateX: useSpring(mousePosition.y * 20, springConfigSlow),
            rotateY: useSpring(mousePosition.x * 20, springConfigSlow),
            translateZ: -150,
          }}
          className="absolute top-1/4 left-1/5 w-32 h-32 border border-hashview-purple/20 rounded-lg bg-hashview-purple/5 backdrop-blur-sm"
        />
        
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * -35, springConfigSlow),
            y: useSpring(mousePosition.y * -35, springConfigSlow),
            rotateX: useSpring(-mousePosition.y * 25, springConfigSlow),
            rotateY: useSpring(-mousePosition.x * 25, springConfigSlow),
            translateZ: -180,
          }}
          className="absolute bottom-1/3 right-1/5 w-24 h-24 border border-hashview-orange/20 rounded-lg bg-hashview-orange/5 backdrop-blur-sm"
        />

        {/* Large distant orbs */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 30, springConfigVerySlow),
            y: useSpring(mousePosition.y * 30, springConfigVerySlow),
            translateZ: -300,
          }}
          className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-hashview-purple/8 rounded-full blur-[120px]"
        />
        
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * -25, springConfigVerySlow),
            y: useSpring(mousePosition.y * -25, springConfigVerySlow),
            translateZ: -350,
          }}
          className="absolute -bottom-32 -right-32 w-[700px] h-[700px] bg-hashview-orange/6 rounded-full blur-[150px]"
        />

        {/* Mid-layer 3D shapes */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 60, springConfigMedium),
            y: useSpring(mousePosition.y * 60, springConfigMedium),
            rotateX: useSpring(mousePosition.y * 30, springConfigMedium),
            rotateY: useSpring(mousePosition.x * 30, springConfigMedium),
            translateZ: -50,
          }}
          className="absolute top-1/3 left-1/4 w-20 h-20 border-2 border-hashview-purple/30 rounded-xl bg-gradient-to-br from-hashview-purple/10 to-transparent backdrop-blur-md"
        />
        
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * -55, springConfigMedium),
            y: useSpring(mousePosition.y * -55, springConfigMedium),
            rotateX: useSpring(-mousePosition.y * 35, springConfigMedium),
            rotateY: useSpring(-mousePosition.x * 35, springConfigMedium),
            translateZ: -80,
          }}
          className="absolute bottom-1/3 right-1/4 w-16 h-16 border-2 border-hashview-orange/30 rounded-xl bg-gradient-to-br from-hashview-orange/10 to-transparent backdrop-blur-md"
        />

        {/* Floating orbs with 3D depth */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 80, springConfigMedium),
            y: useSpring(mousePosition.y * 80, springConfigMedium),
            translateZ: 50,
          }}
          className="absolute top-1/3 right-1/4 w-48 h-48 bg-hashview-purple/12 rounded-full blur-3xl"
        />
        
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * -70, springConfigMedium),
            y: useSpring(mousePosition.y * -70, springConfigMedium),
            translateZ: 30,
          }}
          className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-hashview-orange/12 rounded-full blur-3xl"
        />

        {/* Closest 3D elements - fastest parallax */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 120, springConfigFast),
            y: useSpring(mousePosition.y * 120, springConfigFast),
            rotateX: useSpring(mousePosition.y * 45, springConfigFast),
            rotateY: useSpring(mousePosition.x * 45, springConfigFast),
            translateZ: 100,
          }}
          className="absolute top-1/2 left-1/2 w-12 h-12 border border-hashview-purple/40 rounded-lg bg-hashview-purple/10 backdrop-blur-sm"
        />
        
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * -100, springConfigFast),
            y: useSpring(mousePosition.y * -100, springConfigFast),
            rotateX: useSpring(-mousePosition.y * 40, springConfigFast),
            rotateY: useSpring(-mousePosition.x * 40, springConfigFast),
            translateZ: 120,
          }}
          className="absolute top-2/3 right-1/3 w-10 h-10 border border-hashview-orange/40 rounded-lg bg-hashview-orange/10 backdrop-blur-sm"
        />

        {/* Small floating diamonds */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 150, springConfigFast),
            y: useSpring(mousePosition.y * 150, springConfigFast),
            rotate: 45,
            rotateX: useSpring(mousePosition.y * 60, springConfigFast),
            rotateY: useSpring(mousePosition.x * 60, springConfigFast),
            translateZ: 150,
          }}
          className="absolute top-1/4 right-1/2 w-6 h-6 border border-hashview-orange/50 bg-hashview-orange/15 backdrop-blur-sm"
        />
        
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * -130, springConfigFast),
            y: useSpring(mousePosition.y * -130, springConfigFast),
            rotate: 45,
            rotateX: useSpring(-mousePosition.y * 55, springConfigFast),
            rotateY: useSpring(-mousePosition.x * 55, springConfigFast),
            translateZ: 180,
          }}
          className="absolute bottom-1/4 left-1/2 w-8 h-8 border border-hashview-purple/50 bg-hashview-purple/15 backdrop-blur-sm"
        />

        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 140, springConfigFast),
            y: useSpring(mousePosition.y * 140, springConfigFast),
            rotate: 45,
            translateZ: 200,
          }}
          className="absolute top-3/4 right-1/4 w-4 h-4 bg-hashview-orange/30 backdrop-blur-sm"
        />

        {/* Subtle grid overlay */}
        <motion.div 
          style={{ 
            x: useSpring(mousePosition.x * 15, springConfigVerySlow),
            y: useSpring(mousePosition.y * 15, springConfigVerySlow),
            translateZ: -100,
          }}
          className="absolute inset-0 opacity-[0.015]"
        >
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                               linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '80px 80px'
            }}
          />
        </motion.div>

        {/* Radial gradient spotlight */}
        <motion.div
          style={{ 
            x: useSpring(mousePosition.x * 200, springConfigMedium),
            y: useSpring(mousePosition.y * 200, springConfigMedium),
            translateZ: 50,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-hashview-purple/5 via-transparent to-transparent rounded-full blur-3xl"
        />
      </motion.div>

      {/* Floating rings - outside 3D container for extra depth */}
      <motion.div
        style={{ 
          x: useSpring(mousePosition.x * 90, springConfigMedium),
          y: useSpring(mousePosition.y * 90, springConfigMedium),
        }}
        className="absolute top-1/4 left-1/3 w-40 h-40 border-2 border-hashview-purple/10 rounded-full"
      />
      
      <motion.div
        style={{ 
          x: useSpring(mousePosition.x * -85, springConfigMedium),
          y: useSpring(mousePosition.y * -85, springConfigMedium),
        }}
        className="absolute bottom-1/4 right-1/3 w-32 h-32 border-2 border-hashview-orange/10 rounded-full"
      />
    </div>
  );
};