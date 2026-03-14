import { useState, useEffect, useMemo } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export type PwaPlatform = "ios-safari" | "macos-safari" | "firefox" | "other" | null;

function detectPlatform(): PwaPlatform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isNonSafariIOSBrowser = /crios|fxios|edgios/i.test(ua);
  const isMac = /Macintosh|MacIntel/.test(ua) && navigator.maxTouchPoints <= 1;
  const isFirefox = /firefox/i.test(ua);
  const isChromium = /chrome|chromium|edg/i.test(ua) && !isIOS;

  if (isIOS && isSafari && !isNonSafariIOSBrowser) return "ios-safari";
  if (isIOS && isNonSafariIOSBrowser) return "other";
  if (isChromium) return null;
  if (isMac && isSafari) return "macos-safari";
  if (isFirefox) return "firefox";
  return "other";
}

const PROMPT_DETECTION_DELAY_MS = 1500;

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [promptCheckComplete, setPromptCheckComplete] = useState(false);

  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as NavigatorStandalone).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      setIsStandalone(true);
      setPromptCheckComplete(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPromptCheckComplete(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    const timer = setTimeout(() => {
      setPromptCheckComplete(true);
    }, PROMPT_DETECTION_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  };

  const canInstall = !!deferredPrompt && !isInstalled;
  const showManualGuide = promptCheckComplete && !canInstall && !isInstalled && !isStandalone && platform !== null;

  return {
    canInstall,
    isInstalled,
    install,
    showManualGuide,
    platform,
  };
}
