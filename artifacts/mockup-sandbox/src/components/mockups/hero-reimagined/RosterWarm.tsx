import React, { useState } from 'react';
import { Headphones, TrendingUp, Share2, Calculator, Users, ChevronLeft, ChevronRight, Zap, Globe, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';

// Agent Data
const agents = [
  {
    id: 'finn',
    name: 'Finn',
    role: 'Bookkeeping Assistant',
    icon: Calculator,
    tagline: 'Zero-error financial ops',
    stats: { speed: '<1hr reconciliations', languages: '5 languages', reliability: '100% accuracy' },
    color: 'from-[#8B5E34] to-[#634021]',
    accentText: 'text-[#D4A373]',
    shadow: 'shadow-[#8B5E34]/30',
  },
  {
    id: 'rex',
    name: 'Rex',
    role: 'Sales SDR',
    icon: TrendingUp,
    tagline: 'Closes 3x more qualified leads',
    stats: { speed: '<5min outreach', languages: '8 languages', reliability: '24/7 prospecting' },
    color: 'from-[#A64B2A] to-[#7B331A]',
    accentText: 'text-[#E07A5F]',
    shadow: 'shadow-[#A64B2A]/30',
  },
  {
    id: 'ava',
    name: 'Ava',
    role: 'Customer Support Agent',
    icon: Headphones,
    tagline: 'I resolve 95% of tickets on first contact',
    stats: { speed: '<2min response', languages: '12 languages', reliability: '99.9% uptime' },
    color: 'from-[#C48C3D] to-[#916222]',
    accentText: 'text-[#F4A261]',
    shadow: 'shadow-[#C48C3D]/30',
  },
  {
    id: 'maya',
    name: 'Maya',
    role: 'Social Media Manager',
    icon: Share2,
    tagline: 'Your brand, always on',
    stats: { speed: 'Real-time monitoring', languages: '15 languages', reliability: '100% brand safe' },
    color: 'from-[#9F5A63] to-[#733E45]',
    accentText: 'text-[#E5989B]',
    shadow: 'shadow-[#9F5A63]/30',
  },
  {
    id: 'harper',
    name: 'Harper',
    role: 'HR Recruiting',
    icon: Users,
    tagline: 'Screens 200 candidates/day',
    stats: { speed: 'Instant screening', languages: '10 languages', reliability: 'Unbiased matching' },
    color: 'from-[#6B705C] to-[#4A4E3D]',
    accentText: 'text-[#A5A58D]',
    shadow: 'shadow-[#6B705C]/30',
  }
];

export function RosterWarm() {
  const [activeIndex, setActiveIndex] = useState(2); // Start with Ava (index 2)

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % agents.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + agents.length) % agents.length);
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-[#FAEDCD] font-serif selection:bg-[#D4A373] selection:text-[#1A1614]" style={{ backgroundColor: '#1A1614' }}>
      
      {/* Warm Background Lighting & Texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
        
        {/* Ambient warm glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D4A373]/5 rounded-full blur-[140px] opacity-80 transition-all duration-700"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-[#4A3B32]/30 to-transparent"></div>
        
        {/* Floor lighting */}
        <div className="absolute bottom-0 left-0 w-full h-[35vh] bg-gradient-to-t from-[#0D0B0A] via-[#1A1614]/80 to-transparent z-10"></div>
        <div className="absolute bottom-[15vh] left-1/2 -translate-x-1/2 w-[80vw] h-[1px] bg-gradient-to-r from-transparent via-[#D4A373]/20 to-transparent blur-[1px]"></div>
      </div>

      {/* Header */}
      <div className="relative z-30 pt-20 pb-8 text-center">
        <p className="text-[#D4A373] font-sans font-medium tracking-[0.2em] uppercase text-xs mb-6 flex items-center justify-center gap-3">
          <HeartHandshake className="w-4 h-4" /> Welcome to RentAI 24
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-wide text-[#FEFAE0] mb-6" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          Meet Your New Colleagues
        </h1>
        <p className="text-[#CCD5AE]/70 font-sans text-lg max-w-xl mx-auto font-light leading-relaxed">
          Dedicated, highly-capable professionals ready to join your team and elevate your daily operations.
        </p>
      </div>

      {/* Roster Showcase */}
      <div className="relative z-20 h-[60vh] flex items-center justify-center perspective-[1400px] mt-4">
        
        {/* Navigation Arrows */}
        <button 
          onClick={handlePrev}
          className="absolute left-8 md:left-16 z-40 p-4 rounded-full bg-[#2A2421]/60 hover:bg-[#3A322D]/80 border border-[#D4A373]/20 backdrop-blur-md transition-all text-[#D4A373] hover:text-[#FEFAE0] hover:-translate-x-1 focus:outline-none shadow-lg"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
        </button>

        <button 
          onClick={handleNext}
          className="absolute right-8 md:right-16 z-40 p-4 rounded-full bg-[#2A2421]/60 hover:bg-[#3A322D]/80 border border-[#D4A373]/20 backdrop-blur-md transition-all text-[#D4A373] hover:text-[#FEFAE0] hover:translate-x-1 focus:outline-none shadow-lg"
        >
          <ChevronRight className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Character Cards */}
        <div className="relative w-full max-w-7xl h-full flex items-center justify-center transform-style-3d">
          {agents.map((agent, index) => {
            let offset = index - activeIndex;
            
            if (offset > 2) offset -= agents.length;
            if (offset < -2) offset += agents.length;

            const isActive = offset === 0;

            let transform = 'translate3d(0, 0, 0) scale(1)';
            let zIndex = 10;
            let opacity = 1;
            let filter = 'blur(0px)';

            if (isActive) {
              transform = 'translate3d(0, 0, 0) scale(1)';
              zIndex = 30;
              opacity = 1;
            } else if (offset === -1) {
              transform = 'translate3d(-55%, 0, -150px) scale(0.85) rotateY(12deg)';
              zIndex = 20;
              opacity = 0.5;
              filter = 'blur(1px)';
            } else if (offset === 1) {
              transform = 'translate3d(55%, 0, -150px) scale(0.85) rotateY(-12deg)';
              zIndex = 20;
              opacity = 0.5;
              filter = 'blur(1px)';
            } else if (offset === -2) {
              transform = 'translate3d(-90%, 0, -300px) scale(0.7) rotateY(20deg)';
              zIndex = 10;
              opacity = 0.2;
              filter = 'blur(3px)';
            } else if (offset === 2) {
              transform = 'translate3d(90%, 0, -300px) scale(0.7) rotateY(-20deg)';
              zIndex = 10;
              opacity = 0.2;
              filter = 'blur(3px)';
            }

            const Icon = agent.icon;

            return (
              <div 
                key={agent.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "absolute top-1/2 left-1/2 -mt-[260px] -ml-[190px] w-[380px] h-[520px] transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] cursor-pointer group",
                  isActive ? "" : "hover:opacity-70"
                )}
                style={{ 
                  transform,
                  zIndex,
                  opacity,
                  filter
                }}
              >
                {/* Subtle Ambient Glow */}
                {isActive && (
                  <div className={cn(
                    "absolute -inset-4 rounded-[2rem] blur-2xl opacity-20 transition-all duration-1000 bg-gradient-to-br",
                    agent.color
                  )}></div>
                )}
                
                {/* Card Body */}
                <div className={cn(
                  "relative w-full h-full rounded-[2rem] overflow-hidden flex flex-col transition-all duration-700",
                  isActive 
                    ? "bg-[#2A2421] shadow-2xl shadow-black/60 border border-[#D4A373]/20" 
                    : "bg-[#221D1A] shadow-xl border border-white/5"
                )}>
                  {/* Subtle paper texture overlay */}
                  <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                  
                  {/* Top Gradient Accent */}
                  <div className={cn(
                    "h-32 w-full bg-gradient-to-br opacity-40 transition-all duration-700 relative", 
                    agent.color
                  )}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#2A2421]"></div>
                  </div>

                  {/* Icon Frame */}
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#1A1614] border border-[#D4A373]/30 flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-105">
                    <div className={cn("absolute inset-0 rounded-full opacity-20 blur-sm bg-gradient-to-br", agent.color)}></div>
                    <Icon className={cn("w-8 h-8 relative z-10", agent.accentText)} strokeWidth={1.5} />
                  </div>

                  {/* Content Area */}
                  <div className="pt-10 px-8 pb-8 flex-1 flex flex-col items-center text-center relative z-10">
                    
                    {/* Welcome Badge (Only visible when active) */}
                    <div className={cn(
                      "mb-4 px-3 py-1 rounded-full border border-[#D4A373]/30 bg-[#1A1614]/50 backdrop-blur-sm transition-all duration-500 transform",
                      isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 hidden"
                    )}>
                      <span className="text-[10px] font-sans font-medium tracking-widest text-[#D4A373] uppercase">Ready to meet you</span>
                    </div>

                    <h2 className="text-3xl font-medium text-[#FEFAE0] mb-1 tracking-wide">{agent.name}</h2>
                    <p className={cn("text-xs font-sans tracking-[0.15em] uppercase mb-4 opacity-80", agent.accentText)}>
                      {agent.role}
                    </p>
                    
                    {isActive ? (
                      <div className="flex flex-col flex-1 w-full animate-in fade-in zoom-in-95 duration-500 delay-150 fill-mode-both">
                        <p className="text-[#CCD5AE]/80 font-serif italic mb-6 text-[15px] leading-relaxed relative">
                          <span className="text-2xl text-[#D4A373]/30 absolute -top-2 -left-3">"</span>
                          {agent.tagline}
                          <span className="text-2xl text-[#D4A373]/30 absolute -bottom-4 -right-2">"</span>
                        </p>
                        
                        {/* Stats - Conversational Style */}
                        <div className="flex flex-col gap-3 mb-auto text-left w-full mt-2 font-sans">
                          <div className="flex items-center gap-4 bg-[#1A1614]/40 rounded-xl p-3 border border-[#D4A373]/10 hover:border-[#D4A373]/30 transition-colors">
                            <Clock className={cn("w-4 h-4", agent.accentText)} />
                            <div>
                              <div className="text-[10px] text-[#CCD5AE]/50 uppercase tracking-wider mb-0.5">Speed</div>
                              <div className="text-sm text-[#FEFAE0]/90">{agent.stats.speed}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-[#1A1614]/40 rounded-xl p-3 border border-[#D4A373]/10 hover:border-[#D4A373]/30 transition-colors">
                            <Globe className={cn("w-4 h-4", agent.accentText)} />
                            <div>
                              <div className="text-[10px] text-[#CCD5AE]/50 uppercase tracking-wider mb-0.5">Fluency</div>
                              <div className="text-sm text-[#FEFAE0]/90">{agent.stats.languages}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-[#1A1614]/40 rounded-xl p-3 border border-[#D4A373]/10 hover:border-[#D4A373]/30 transition-colors">
                            <ShieldCheck className={cn("w-4 h-4", agent.accentText)} />
                            <div>
                              <div className="text-[10px] text-[#CCD5AE]/50 uppercase tracking-wider mb-0.5">Commitment</div>
                              <div className="text-sm text-[#FEFAE0]/90">{agent.stats.reliability}</div>
                            </div>
                          </div>
                        </div>

                        {/* CTA */}
                        <button className="w-full py-4 mt-6 rounded-xl font-sans font-medium text-[#1A1614] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#D4A373] hover:bg-[#E6B88A] flex items-center justify-center gap-2">
                          Welcome to the Team
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full">
                        <button className="px-6 py-2 rounded-full bg-[#1A1614]/80 text-[#D4A373] text-sm font-sans font-medium border border-[#D4A373]/30 backdrop-blur-sm hover:bg-[#1A1614] transition-colors">
                          Get Acquainted
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Indicators */}
      <div className="relative z-30 flex justify-center gap-4 pb-16 mt-6">
        {agents.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className="group py-2 px-1 flex flex-col items-center justify-center gap-2"
            aria-label={`Select agent ${idx + 1}`}
          >
            <span className={cn(
              "block h-1.5 rounded-full transition-all duration-500 ease-out",
              activeIndex === idx 
                ? "w-10 bg-[#D4A373] shadow-[0_0_12px_rgba(212,163,115,0.6)]" 
                : "w-2 bg-[#D4A373]/20 group-hover:bg-[#D4A373]/50 group-hover:w-4"
            )} />
          </button>
        ))}
      </div>

    </div>
  );
}
