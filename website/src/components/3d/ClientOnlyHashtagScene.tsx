"use client";

import { useEffect, useState, type ComponentType } from "react";

export function ClientOnlyHashtagScene() {
  const [HashtagScene, setHashtagScene] = useState<ComponentType | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Only import after component has mounted on the client
    if (typeof window !== "undefined") {
      import("./HashtagScene").then((mod) => {
        setHashtagScene(() => mod.HashtagScene);
      });
    }
  }, []);

  if (!hasMounted || !HashtagScene) {
    return <div className="absolute inset-0 -z-10" />;
  }

  return <HashtagScene />;
}

