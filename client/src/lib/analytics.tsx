import { useEffect, useRef, createContext, useContext, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

interface AnalyticsContextType {
  trackEvent: (eventName: string, eventCategory: string, metadata?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

function sendBeacon(url: string, data: unknown) {
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const lastPath = useRef<string>("");
  const enterTime = useRef<number>(Date.now());

  const hasConsent = useCallback(() => {
    const cookieConsent = localStorage.getItem("cookie_consent");
    if (cookieConsent !== "accepted") return false;
    return true;
  }, []);

  useEffect(() => {
    if (!hasConsent()) return;

    if (lastPath.current && lastPath.current !== location) {
      const duration = Math.round((Date.now() - enterTime.current) / 1000);
      sendBeacon("/api/analytics/pageview", {
        path: lastPath.current,
        duration,
        referrer: document.referrer || null,
      });
    }

    lastPath.current = location;
    enterTime.current = Date.now();

    return () => {};
  }, [location, hasConsent]);

  useEffect(() => {
    if (!hasConsent()) return;

    const handleBeforeUnload = () => {
      if (lastPath.current) {
        const duration = Math.round((Date.now() - enterTime.current) / 1000);
        sendBeacon("/api/analytics/pageview", {
          path: lastPath.current,
          duration,
          referrer: document.referrer || null,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasConsent]);

  const trackEvent = useCallback(
    (eventName: string, eventCategory: string, metadata?: Record<string, unknown>) => {
      if (!hasConsent()) return;
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, eventCategory, metadata }),
        credentials: "include",
      }).catch(() => {});
    },
    [hasConsent]
  );

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
