import React, { useEffect, useState } from "react";
import {
  Headphones,
  TrendingUp,
  Share2,
  Calculator,
  CalendarCheck,
  Users,
  Activity,
  Wifi,
  Shield,
  Zap,
} from "lucide-react";

export function CommandCenter() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const workers = [
    {
      name: "Ava",
      role: "Customer Support",
      status: "Handling 12 tickets",
      color: "green",
      icon: <Headphones className="w-4 h-4 text-emerald-400" />,
      progress: 78,
    },
    {
      name: "Rex",
      role: "Sales SDR",
      status: "3 deals in pipeline",
      color: "green",
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      progress: 45,
    },
    {
      name: "Maya",
      role: "Social Media",
      status: "Posted 8 updates",
      color: "green",
      icon: <Share2 className="w-4 h-4 text-emerald-400" />,
      progress: 92,
    },
    {
      name: "Finn",
      role: "Bookkeeping",
      status: "47 invoices processed",
      color: "green",
      icon: <Calculator className="w-4 h-4 text-emerald-400" />,
      progress: 60,
    },
    {
      name: "Cal",
      role: "Scheduling",
      status: "18 meetings booked",
      color: "amber",
      icon: <CalendarCheck className="w-4 h-4 text-amber-400" />,
      progress: 88,
    },
    {
      name: "Harper",
      role: "HR Recruiting",
      status: "Screening 5 candidates",
      color: "green",
      icon: <Users className="w-4 h-4 text-emerald-400" />,
      progress: 30,
    },
  ];

  const getColorClass = (color: string) => {
    if (color === "green") return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
    if (color === "amber") return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    return "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
  };

  const getTextColorClass = (color: string) => {
    if (color === "green") return "text-emerald-400";
    if (color === "amber") return "text-amber-400";
    return "text-blue-400";
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-['Inter']"
      style={{ backgroundColor: "#0A0E27" }}
    >
      {/* Background Grid & Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
        
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            backgroundPosition: "center center",
          }}
        />
        
        {/* Radar/Scanner effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-blue-500/10 opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-blue-400/10 opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-blue-300/10 opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
        {/* Header */}
        <div
          className={`text-center transition-all duration-1000 transform ${
            mounted ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-medium tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Activity className="w-3 h-3 animate-pulse" />
            System Online
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight mb-8">
            Your AI Workforce. <br />
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
              Already Working.
            </span>
          </h1>
        </div>

        {/* Dashboard Panels */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          
          {/* Left Column: Network Status & Logs */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div
              className={`bg-[#0F1535]/80 backdrop-blur-md border border-blue-500/20 rounded-xl p-5 shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-1000 delay-100 ${
                mounted ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-blue-500/10">
                <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  Uplink Status
                </h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-blue-300 mb-1">
                    <span>Server Load</span>
                    <span>34%</span>
                  </div>
                  <div className="h-1.5 w-full bg-blue-950 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[34%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-blue-300 mb-1">
                    <span>Neural Network Sync</span>
                    <span>99.9%</span>
                  </div>
                  <div className="h-1.5 w-full bg-blue-950 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[99.9%]" />
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`bg-[#0F1535]/80 backdrop-blur-md border border-blue-500/20 rounded-xl p-5 flex-1 shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-1000 delay-200 ${
                mounted ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
              }`}
            >
              <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-indigo-400" />
                Live Log
              </h3>
              <div className="space-y-3 font-mono text-[10px] text-blue-400/70 overflow-hidden">
                <div className="flex gap-2">
                  <span className="text-emerald-500 opacity-70">[SYS]</span>
                  <span>Ava authenticated successfully</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-500 opacity-70">[NET]</span>
                  <span>Routing 12 inbound tickets...</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-amber-500 opacity-70">[WARN]</span>
                  <span>Cal experiencing high load</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-emerald-500 opacity-70">[SYS]</span>
                  <span>Rex closed deal #8942</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-indigo-500 opacity-70">[DB]</span>
                  <span>Finn syncing 47 records...</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-500 opacity-70">[NET]</span>
                  <span>Establishing secure connection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Active Agents */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div
              className={`bg-gradient-to-b from-[#11183E]/90 to-[#0F1535]/90 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(59,130,246,0.1)] transition-all duration-1000 delay-300 relative overflow-hidden ${
                mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
              }`}
            >
              {/* Decorative scanline */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50 animate-[scan_3s_ease-in-out_infinite]" />

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-white flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-400" />
                  Mission Control
                </h2>
                <div className="flex gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1 text-blue-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>5 ONLINE</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span>1 BUSY</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workers.map((worker, index) => (
                  <div
                    key={index}
                    className="group bg-[#0A0E27]/80 border border-blue-500/20 rounded-lg p-4 hover:border-blue-400/50 transition-colors duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-start justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-900/40 border border-blue-500/30 flex items-center justify-center">
                          {worker.icon}
                        </div>
                        <div>
                          <h4 className="text-white text-sm font-medium">{worker.name}</h4>
                          <span className="text-[10px] text-blue-300 uppercase tracking-wider block">
                            {worker.role}
                          </span>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getColorClass(worker.color)}`} />
                    </div>

                    <div className="space-y-2 relative z-10">
                      <div className={`text-xs font-medium ${getTextColorClass(worker.color)}`}>
                        {worker.status}
                      </div>
                      <div className="h-1 w-full bg-blue-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            worker.color === "green" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{
                            width: mounted ? `${worker.progress}%` : "0%",
                            transitionDelay: `${400 + index * 100}ms`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Performance Metrics */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div
              className={`bg-[#0F1535]/80 backdrop-blur-md border border-blue-500/20 rounded-xl p-5 shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-1000 delay-400 ${
                mounted ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
              }`}
            >
              <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-400" />
                Global Efficiency
              </h3>
              
              <div className="flex items-center justify-center py-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-blue-950"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="364.4"
                      strokeDashoffset={mounted ? "36.4" : "364.4"}
                      className="text-indigo-500 transition-all duration-1500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-light text-white">92</span>
                    <span className="text-[10px] text-blue-400 mt-1">SCORE</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`bg-[#0F1535]/80 backdrop-blur-md border border-blue-500/20 rounded-xl p-5 flex-1 shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-1000 delay-500 ${
                mounted ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
              }`}
            >
              <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Throughput
              </h3>
              <div className="h-full min-h-[120px] flex items-end justify-between gap-2 pt-4">
                {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                  <div key={i} className="w-full bg-blue-950 rounded-t-sm relative group">
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-sm transition-all duration-1000"
                      style={{
                        height: mounted ? `${height}%` : "0%",
                        transitionDelay: `${600 + i * 100}ms`,
                      }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {height * 12}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className={`mt-12 transition-all duration-1000 delay-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <button className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full font-medium text-white shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-blue-400 to-indigo-500 opacity-0 group-hover:opacity-20 animate-pulse" />
            
            {/* Edge glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full z-[-1] opacity-50 blur-sm group-hover:opacity-100 transition-opacity duration-500" />

            <span className="relative z-10 flex items-center gap-3">
              Take the Controls
              <svg
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(100px); }
          100% { transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
