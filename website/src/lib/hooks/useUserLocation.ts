/**
 * useUserLocation
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the mobile app's location flow from UserHomeScreen.js.
 *
 * Key behaviours:
 *  - On first mount, checks localStorage for a cached location (< 30 min old).
 *    If cache is fresh, uses it immediately without asking the browser again.
 *  - If no fresh cache, requests the browser geolocation (up to 10 s timeout).
 *  - Caches the result in localStorage so subsequent page loads are instant.
 *  - Exposes a `retry()` function so the user can re-trigger the request.
 *  - On permanent denial, sets `denied = true` and falls back to London coords
 *    (same as the mobile app's default fallback).
 */

"use client";

import { useState, useEffect, useCallback } from "react";

const CACHE_KEY = "hv_user_location";
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export const DEFAULT_LOCATION = { latitude: 51.5283, longitude: -0.1005 }; // London

interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface UserLocationState {
  /** Resolved coordinates (null while loading) */
  location: { latitude: number; longitude: number } | null;
  /** True while actively requesting from the browser */
  loading: boolean;
  /** True if permission was permanently denied */
  denied: boolean;
  /** True if we got real coords from the browser (not fallback) */
  hasRealLocation: boolean;
  /** Call to re-request location after denial */
  retry: () => void;
}

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CachedLocation = JSON.parse(raw);
    if (Date.now() - data.timestamp < CACHE_MAX_AGE_MS) return data;
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number) {
  try {
    const data: CachedLocation = { latitude: lat, longitude: lng, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore — storage quota / SSR
  }
}

export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [hasRealLocation, setHasRealLocation] = useState(false);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      // No geolocation support → use London fallback immediately
      setDenied(true);
      return;
    }

    setLoading(true);
    setDenied(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        writeCache(coords.latitude, coords.longitude);
        setLocation(coords);
        setHasRealLocation(true);
        setLoading(false);
      },
      () => {
        // Permission denied or timed out
        setDenied(true);
        setHasRealLocation(false);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,       // faster, battery-friendly (same as mobile Balanced)
        timeout: 10_000,                 // 10 s — matches mobile's 10000 timeout
        maximumAge: CACHE_MAX_AGE_MS,    // let browser use its own cached position
      }
    );
  }, []);

  useEffect(() => {
    // 1. Try the localStorage cache first (instant — no browser prompt needed)
    const cached = readCache();
    if (cached) {
      setLocation({ latitude: cached.latitude, longitude: cached.longitude });
      setHasRealLocation(true);
      return; // Skip browser request — cache is fresh
    }

    // 2. No fresh cache → request from browser
    requestLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, loading, denied, hasRealLocation, retry: requestLocation };
}
