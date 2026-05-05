"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Settings, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  hasCookieConsent,
  acceptAllCookies,
  rejectOptionalCookies,
  saveCookiePreferences,
  getCookiePreferences,
  type CookiePreferences,
} from "@/lib/cookies";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const consented = hasCookieConsent();
    if (!consented) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load existing preferences
      const saved = getCookiePreferences();
      if (saved) {
        setPreferences(saved);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    rejectOptionalCookies();
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    saveCookiePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSettingsOpen = () => {
    const saved = getCookiePreferences();
    if (saved) {
      setPreferences(saved);
    }
    setShowSettings(true);
  };

  if (!showBanner) {
    // Show a small settings button in corner
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={handleSettingsOpen}
        className="fixed bottom-4 left-4 z-50 p-3 rounded-full bg-hashview-purple text-white shadow-lg hover:bg-hashview-purple-dark transition-colors"
        aria-label="Cookie Settings"
      >
        <Settings size={20} />
      </motion.button>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-card border-t border-border shadow-2xl"
          >
            <div className="container mx-auto max-w-6xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                      <Cookie className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">We Use Cookies</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                    By clicking &quot;Accept All&quot;, you consent to our use of cookies. You can manage your preferences at any time.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleAcceptAll}
                      size="sm"
                      className="bg-gradient-to-r from-hashview-purple to-hashview-orange hover:opacity-90"
                    >
                      Accept All
                    </Button>
                    <Button
                      onClick={handleRejectAll}
                      variant="outline"
                      size="sm"
                    >
                      Reject Optional
                    </Button>
                    <Button
                      onClick={handleSettingsOpen}
                      variant="ghost"
                      size="sm"
                      className="text-hashview-purple"
                    >
                      <Settings size={16} className="mr-2" />
                      Customize
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleRejectAll}
                  variant="ghost"
                  size="icon"
                  className="md:absolute md:top-4 md:right-4"
                  aria-label="Close"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-hashview-purple" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are required for the website to function properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-hashview-purple" />
                  <Label htmlFor="essential" className="font-semibold cursor-pointer">
                    Essential Cookies
                  </Label>
                </div>
                <Switch
                  id="essential"
                  checked={preferences.essential}
                  disabled
                  className="opacity-50 cursor-not-allowed"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies are necessary for the website to function and cannot be disabled. They include authentication, security, and basic site functionality.
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-hashview-purple" />
                  <Label htmlFor="analytics" className="font-semibold cursor-pointer">
                    Analytics Cookies
                  </Label>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website performance.
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-hashview-purple" />
                  <Label htmlFor="marketing" className="font-semibold cursor-pointer">
                    Marketing Cookies
                  </Label>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies may be used to deliver personalized advertisements based on your browsing behavior. They help us measure the effectiveness of our marketing campaigns.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex gap-3">
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1 bg-gradient-to-r from-hashview-purple to-hashview-orange hover:opacity-90"
                >
                  <Check size={16} className="mr-2" />
                  Save Preferences
                </Button>
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                For more information about how we use cookies, please read our{" "}
                <a href="/privacy" className="text-hashview-purple hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

