'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/feature-gates';

export default function InvitePage() {
  const params = useParams();
  const code = typeof params.code === 'string' ? params.code.toUpperCase() : '';
  const [device, setDevice] = useState<'ios' | 'android' | 'desktop' | null>(null);

  useEffect(() => {
    // Detect OS
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    if (/android/i.test(userAgent)) {
      setDevice('android');
      // Redirect to Android Play Store
      window.location.href = PLAY_STORE_URL;
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setDevice('ios');
      // Redirect to iOS App Store
      window.location.href = APP_STORE_URL;
    } else {
      setDevice('desktop');
    }
  }, []);

  if (device === 'ios' || device === 'android') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 mb-4 flex items-center justify-center">
             <span className="text-white font-bold text-2xl">H</span>
          </div>
          <p className="text-lg font-medium text-gray-700">Redirecting you to the App Store...</p>
        </div>
      </div>
    );
  }

  // Desktop fallback view
  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-indigo-50 to-purple-50 pt-20 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8 text-center border border-gray-100">
        <div className="mx-auto h-20 w-20 bg-indigo-600 rounded-3xl shadow-lg flex items-center justify-center mb-6">
          <span className="text-white font-bold text-4xl">H</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You've been invited to HashView!
        </h1>
        
        <p className="text-gray-600 mb-8">
          Discover amazing food and earn rewards. Use the invite code below when you sign up to get started.
        </p>

        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
          <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Your Referral Code</p>
          <div className="text-4xl font-black text-indigo-600 tracking-widest bg-indigo-50 py-3 rounded-xl">
            {code}
          </div>
          <p className="text-xs text-gray-400 mt-3">Copy this code and enter it during registration</p>
        </div>

        <div className="space-y-4">
          <a
            href={APP_STORE_URL}
            className="flex items-center justify-center w-full rounded-xl bg-black px-4 py-3 text-white font-semibold hover:bg-gray-800 transition-colors"
          >
            Download on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            className="flex items-center justify-center w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
