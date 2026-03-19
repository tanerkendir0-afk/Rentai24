import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/language";
import { AnalyticsProvider } from "@/lib/analytics";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import CookieConsent from "@/components/cookie-consent";
import OnboardingDialog from "@/components/onboarding-dialog";
import NpsSurvey from "@/components/nps-survey";
import Home from "@/pages/home";
import Workers from "@/pages/workers";
import WorkerProfile from "@/pages/worker-profile";
import HowItWorks from "@/pages/how-it-works";
import Pricing from "@/pages/pricing";
import Demo from "@/pages/demo";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Settings from "@/pages/settings";
import GuidePage from "@/pages/guide";
import Automations from "@/pages/automations";
import NotFound from "@/pages/not-found";

const ADMIN_ROUTE = `/${import.meta.env.VITE_ADMIN_PATH}`;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workers" component={Workers} />
      <Route path="/workers/:slug" component={WorkerProfile} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/demo">{() => <Demo />}</Route>
      <Route path="/chat">{() => <Demo isWorkspace={true} />}</Route>
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/guide" component={GuidePage} />
      <Route path="/automations" component={Automations} />
      <Route path={ADMIN_ROUTE} component={Admin} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const hideFooter = location.startsWith("/chat") || location.startsWith("/demo");
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailConnected = params.get("gmail_connected");
    const gmailError = params.get("gmail_error");
    if (gmailConnected) {
      toast({ title: "Gmail Connected", description: `Successfully connected ${gmailConnected}` });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/gmail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-status"] });
      window.history.replaceState({}, "", "/settings");
      setLocation("/settings");
    } else if (gmailError) {
      toast({ title: "Gmail Connection Failed", description: decodeURIComponent(gmailError), variant: "destructive" });
      window.history.replaceState({}, "", "/settings");
      setLocation("/settings");
    }
  }, []);

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main>
          <Router />
        </main>
        {!hideFooter && <Footer />}
        <CookieConsent />
        <OnboardingDialog />
        <NpsSurvey />
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <AnalyticsProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </AnalyticsProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
