import React, { useState } from 'react';
import { Headphones, TrendingUp, Share2, Calculator, Users, ChevronLeft, ChevronRight, Globe, Clock, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Agent Data
const agents = [
  {
    id: 'finn',
    name: 'FINN_V1',
    role: 'SYS.BOOKKEEPING',
    icon: Calculator,
    tagline: 'Zero-error financial ops',
    stats: { speed: '<1hr reconciliations', languages: '5 protocols', reliability: '100% accuracy' },
    color: 'text-cyan-400',
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    bar: 'bg-cyan-400'
  },
  {
    id: 'rex',
    name: 'REX_V2',
    role: 'SYS.SALES_SDR',
    icon: TrendingUp,
    tagline: 'Closes 3x more qualified leads',
    stats: { speed: '<5min outreach', languages: '8 protocols', reliability: '24/7 prospecting' },
    color: 'text-rose-500',
    border: 'border-rose-500/50',
    bg: 'bg-rose-500/10',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    bar: 'bg-rose-500'
  },
  {
    id: 'ava',
    name: 'AVA_CORE',
    role: 'SYS.SUPPORT',
    icon: Headphones,
    tagline: 'Resolves 95% tickets on contact',
    stats: { speed: '<2min response', languages: '12 protocols', reliability: '99.9% uptime' },
    color: 'text-fuchsia-400',
    border: 'border-fuchsia-500/50',
    bg: 'bg-fuchsia-500/10',
    glow: 'shadow-[0_0_15px_rgba(232,121,249,0.3)]',
    bar: 'bg-fuchsia-400'
  },
  {
    id: 'maya',
    name: 'MAYA_NET',
    role: 'SYS.SOCIAL',
    icon: Share2,
    tagline: 'Your brand, always on',
    stats: { speed: 'Real-time sync', languages: '15 protocols', reliability: '100% brand safe' },
    color: 'text-emerald-400',
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]',
    bar: 'bg-emerald-400'
  },
  {
    id: 'harper',
    name: 'HARPER_HR',
    role: 'SYS.RECRUITING',
    icon: Users,
    tagline: 'Screens 200 candidates/day',
    stats: { speed: 'Instant screening', languages: '10 protocols', reliability: 'Unbiased match' },
    color: 'text-amber-400',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',
    bar: 'bg-amber-400'
  }
];

export function RosterCyber() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [glitch, setGlitch] = useState(false);

  const handleNext = () => {
    triggerGlitch();
    setActiveIndex((prev) => (prev + 1) % agents.length);
  };

  const handlePrev = () => {
    triggerGlitch();
    setActiveIndex((prev) => (prev - 1 + agents.length) % agents.length);
  };

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-mono selection:bg-cyan-500/30 selection:text-cyan-200 text-slate-300 flex flex-col">
      {/* Background Matrix/Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)',
             backgroundSize: '30px 30px'
           }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />

      {/* Header */}
      <div className="relative z-30 pt-16 pb-4 w-full px-8 flex flex-col items-center border-b border-cyan-900/50 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-7xl flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 text-sm tracking-[0.2em] uppercase font-bold">Terminal // REQUISITION_SYSTEM</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-white uppercase">
              Deploy_Agent<span className="animate-pulse text-cyan-500">_</span>
            </h1>
          </div>
          <div className="text-xs md:text-sm text-slate-500 text-right uppercase tracking-widest border border-slate-800 p-2 bg-slate-900/50">
            <div>STATUS: <span className="text-emerald-400">ONLINE</span></div>
            <div>UPLINK: <span className="text-emerald-400">SECURE</span></div>
            <div>AVAILABLE_UNITS: 05</div>
          </div>
        </div>
      </div>

      {/* Roster Showcase */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center perspective-[1500px] mt-4 mb-12 w-full">
        
        {/* Navigation Controls */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full max-w-[1400px] px-4 md:px-12 flex justify-between pointer-events-none z-50">
          <button 
            onClick={handlePrev}
            className="pointer-events-auto p-4 border border-cyan-500/30 bg-black/80 text-cyan-500 hover:bg-cyan-900/30 hover:text-cyan-300 transition-colors focus:outline-none hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleNext}
            className="pointer-events-auto p-4 border border-cyan-500/30 bg-black/80 text-cyan-500 hover:bg-cyan-900/30 hover:text-cyan-300 transition-colors focus:outline-none hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Character Cards */}
        <div className={cn("relative w-full max-w-6xl h-[600px] flex items-center justify-center transform-style-3d transition-transform duration-200", glitch && "translate-x-1 -translate-y-1 opacity-90")}>
          {agents.map((agent, index) => {
            let offset = index - activeIndex;
            if (offset > 2) offset -= agents.length;
            if (offset < -2) offset += agents.length;

            const isActive = offset === 0;

            let transform = 'translate3d(0, 0, 0) scale(1)';
            let zIndex = 10;
            let opacity = 1;
            let filter = 'blur(0px) grayscale(0%)';

            if (isActive) {
              transform = 'translate3d(0, 0, 0) scale(1)';
              zIndex = 30;
              opacity = 1;
            } else if (offset === -1) {
              transform = 'translate3d(-55%, 0, -250px) scale(0.85) rotateY(20deg)';
              zIndex = 20;
              opacity = 0.5;
              filter = 'blur(2px) grayscale(50%)';
            } else if (offset === 1) {
              transform = 'translate3d(55%, 0, -250px) scale(0.85) rotateY(-20deg)';
              zIndex = 20;
              opacity = 0.5;
              filter = 'blur(2px) grayscale(50%)';
            } else if (offset === -2) {
              transform = 'translate3d(-90%, 0, -500px) scale(0.7) rotateY(35deg)';
              zIndex = 10;
              opacity = 0.2;
              filter = 'blur(4px) grayscale(80%)';
            } else if (offset === 2) {
              transform = 'translate3d(90%, 0, -500px) scale(0.7) rotateY(-35deg)';
              zIndex = 10;
              opacity = 0.2;
              filter = 'blur(4px) grayscale(80%)';
            }

            const Icon = agent.icon;

            return (
              <div 
                key={agent.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "absolute top-1/2 left-1/2 -mt-[300px] -ml-[200px] w-[400px] h-[600px] transition-all duration-500 ease-out cursor-pointer group",
                )}
                style={{ transform, zIndex, opacity, filter }}
              >
                {/* Card Container */}
                <div className={cn(
                  "relative w-full h-full bg-black/90 border-2 flex flex-col overflow-hidden transition-all",
                  isActive ? cn(agent.border, agent.glow) : "border-slate-800"
                )}>
                  
                  {/* Scanline overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50"></div>

                  {/* Top Bar */}
                  <div className={cn("h-8 flex items-center justify-between px-3 border-b border-inherit", isActive ? agent.bg : "bg-slate-900")}>
                    <div className="flex gap-2 items-center">
                      <div className={cn("w-2 h-2 rounded-full", isActive ? cn("animate-pulse", agent.bar) : "bg-slate-600")} />
                      <div className="text-[10px] uppercase tracking-widest text-slate-400">SYS_PROFILE // {agent.id.toUpperCase()}</div>
                    </div>
                    <div className="text-[10px] text-slate-500">v2.4.1</div>
                  </div>

                  {/* Header / Icon */}
                  <div className="flex flex-col items-center mt-8 mb-4">
                    <div className={cn("relative w-24 h-24 flex items-center justify-center border", isActive ? agent.border : "border-slate-800")}>
                      <div className={cn("absolute inset-0 opacity-20", isActive ? agent.bg : "bg-slate-800")} />
                      {isActive && (
                        <>
                          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current m-1" style={{ color: 'inherit' }} />
                          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current m-1" style={{ color: 'inherit' }} />
                          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current m-1" style={{ color: 'inherit' }} />
                          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current m-1" style={{ color: 'inherit' }} />
                        </>
                      )}
                      <Icon className={cn("w-10 h-10", isActive ? agent.color : "text-slate-600")} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 pb-6 flex-1 flex flex-col z-10 relative">
                    <div className="text-center mb-6">
                      <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-1">{agent.name}</h2>
                      <p className={cn("text-xs font-bold uppercase tracking-[0.2em]", isActive ? agent.color : "text-slate-500")}>
                        {agent.role}
                      </p>
                    </div>
                    
                    {isActive ? (
                      <div className="flex-1 flex flex-col">
                        <div className="border border-slate-800 p-3 mb-6 bg-slate-900/30 text-xs">
                          <span className="text-slate-500 mr-2">&gt; OBJECTIVE:</span>
                          <span className="text-slate-300 uppercase">"{agent.tagline}"</span>
                        </div>
                        
                        {/* Stats Matrix */}
                        <div className="flex-1 flex flex-col gap-3">
                          <div className="text-[10px] text-slate-500 tracking-widest border-b border-slate-800 pb-1">PERFORMANCE_METRICS</div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Clock className="w-3 h-3" /> SPEED
                            </div>
                            <div className={agent.color}>{agent.stats.speed}</div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Globe className="w-3 h-3" /> PROTOCOLS
                            </div>
                            <div className={agent.color}>{agent.stats.languages}</div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              <ShieldCheck className="w-3 h-3" /> RELIABILITY
                            </div>
                            <div className={agent.color}>{agent.stats.reliability}</div>
                          </div>
                        </div>

                        {/* CTA */}
                        <button className={cn(
                          "w-full py-4 mt-6 uppercase tracking-widest text-xs font-bold border flex items-center justify-center gap-2 group transition-all",
                          agent.border,
                          "hover:bg-opacity-20 hover:text-white",
                          agent.color,
                          "hover:bg-current bg-transparent"
                        )}>
                          <span>&gt;&gt; DEPLOY_UNIT</span>
                          <span className="opacity-50 group-hover:opacity-100 transition-opacity">[$49/MO]</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-xs tracking-widest text-slate-600 border border-slate-800 px-4 py-2 uppercase">
                          [ ENCRYPTED ]
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="relative z-30 flex justify-center gap-4 pb-8">
        {agents.map((agent, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className="flex flex-col items-center gap-2 group focus:outline-none"
            aria-label={`Select agent ${idx + 1}`}
          >
            <div className={cn(
              "w-8 h-1 transition-all duration-300 border border-transparent",
              activeIndex === idx 
                ? cn(agent.bar, agent.glow) 
                : "bg-slate-800 hover:bg-slate-700 border-slate-700"
            )} />
            <span className={cn(
              "text-[8px] uppercase tracking-widest transition-colors",
              activeIndex === idx ? agent.color : "text-slate-600 group-hover:text-slate-400"
            )}>
              0{idx + 1}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
