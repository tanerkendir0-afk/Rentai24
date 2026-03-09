import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import Calisanlar from "@/pages/calisanlar";
import NasilCalisir from "@/pages/nasil-calisir";
import Fiyatlandirma from "@/pages/fiyatlandirma";
import Demo from "@/pages/demo";
import Hakkimizda from "@/pages/hakkimizda";
import Iletisim from "@/pages/iletisim";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/calisanlar" component={Calisanlar} />
      <Route path="/nasil-calisir" component={NasilCalisir} />
      <Route path="/fiyatlandirma" component={Fiyatlandirma} />
      <Route path="/demo" component={Demo} />
      <Route path="/hakkimizda" component={Hakkimizda} />
      <Route path="/iletisim" component={Iletisim} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="min-h-screen bg-background text-foreground">
          <Navbar />
          <main>
            <Router />
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
