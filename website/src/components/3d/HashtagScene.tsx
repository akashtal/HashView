"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Box } from "@react-three/drei";
import * as THREE from "three";

const AnimatedHashtag = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const bars = useMemo(() => {
    const positions: Array<{ x: number; y: number; z: number; rotationZ: number }> = [
      // Vertical bars
      { x: -0.4, y: 0, z: 0, rotationZ: 0 },
      { x: 0.4, y: 0, z: 0, rotationZ: 0 },
      // Horizontal bars
      { x: 0, y: 0.35, z: 0, rotationZ: Math.PI / 2 },
      { x: 0, y: -0.35, z: 0, rotationZ: Math.PI / 2 },
    ];
    return positions;
  }, []);

  return (
    <group ref={groupRef}>
      {bars.map((bar, index) => (
        <Float key={index} speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
          <mesh position={[bar.x, bar.y, bar.z]} rotation={[0, 0, bar.rotationZ]}>
            <boxGeometry args={[0.15, 1.2, 0.15]} />
            <MeshDistortMaterial
              color={index < 2 ? "#a855f7" : "#f97316"}
              distort={0.2}
              speed={2}
              roughness={0.1}
              metalness={0.8}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
};

const FloatingSpheres = () => {
  const spheresRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (spheresRef.current) {
      spheresRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={spheresRef}>
      <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[0.15, 32, 32]} position={[1.5, 0.5, -0.5]}>
          <MeshDistortMaterial
            color="#a855f7"
            distort={0.4}
            speed={3}
            roughness={0}
            metalness={0.9}
          />
        </Sphere>
      </Float>
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sphere args={[0.1, 32, 32]} position={[-1.2, -0.3, 0.5]}>
          <MeshDistortMaterial
            color="#f97316"
            distort={0.3}
            speed={2}
            roughness={0}
            metalness={0.9}
          />
        </Sphere>
      </Float>
      <Float speed={4} rotationIntensity={0.4} floatIntensity={1.2}>
        <Sphere args={[0.08, 32, 32]} position={[1, -0.8, 0.3]}>
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
        </Sphere>
      </Float>
      <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.6}>
        <Box args={[0.12, 0.12, 0.12]} position={[-1.5, 0.8, -0.2]}>
          <MeshDistortMaterial
            color="#a855f7"
            distort={0.2}
            speed={2}
            roughness={0.1}
            metalness={0.8}
          />
        </Box>
      </Float>
    </group>
  );
};

export const HashtagScene = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a855f7" />
        <pointLight position={[10, -10, 5]} intensity={0.5} color="#f97316" />
        <AnimatedHashtag />
        <FloatingSpheres />
      </Canvas>
    </div>
  );
};
