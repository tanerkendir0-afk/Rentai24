import React, { useState } from 'react';
import { Headphones, TrendingUp, Share2, Calculator, Users, ChevronLeft, ChevronRight, Zap, Globe, Clock, ShieldCheck } from 'lucide-react';
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
    color: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/20',
  },
  {
    id: 'rex',
    name: 'Rex',
    role: 'Sales SDR',
    icon: TrendingUp,
    tagline: 'Closes 3x more qualified leads',
    stats: { speed: '<5min outreach', languages: '8 languages', reliability: '24/7 prospecting' },
    color: 'from-orange-500 to-red-500',
    shadow: 'shadow-orange-500/20',
  },
  {
    id: 'ava',
    name: 'Ava',
    role: 'Customer Support Agent',
    icon: Headphones,
    tagline: 'I resolve 95% of tickets on first contact',
    stats: { speed: '<2min response', languages: '12 languages', reliability: '99.9% uptime' },
    color: 'from-blue-500 to-violet-500',
    shadow: 'shadow-blue-500/30',
  },
  {
    id: 'maya',
    name: 'Maya',
    role: 'Social Media Manager',
    icon: Share2,
    tagline: 'Your brand, always on',
    stats: { speed: 'Real-time monitoring', languages: '15 languages', reliability: '100% brand safe' },
    color: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-500/20',
  },
  {
    id: 'harper',
    name: 'Harper',
    role: 'HR Recruiting',
    icon: Users,
    tagline: 'Screens 200 candidates/day',
    stats: { speed: 'Instant screening', languages: '10 languages', reliability: 'Unbiased matching' },
    color: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-500/20',
  }
];

export function TheRoster() {
  const [activeIndex, setActiveIndex] = useState(2); // Start with Ava (index 2)

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % agents.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + agents.length) % agents.length);
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-50 font-sans" style={{ backgroundColor: '#0A0E27' }}>
      
      {/* Dramatic Background Lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen opacity-70 transition-all duration-700"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent"></div>
        {/* Stage Floor */}
        <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-black/80 via-[#0A0E27]/80 to-transparent z-10"></div>
        <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 w-[120vw] h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent blur-[2px]"></div>
      </div>

      {/* Header */}
      <div className="relative z-30 pt-16 pb-8 text-center">
        <p className="text-blue-400 font-medium tracking-widest uppercase text-sm mb-4 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" /> RentAI 24 Roster
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-2" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          Choose Your First AI Worker
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">Select a pre-trained specialist to instantly augment your team.</p>
      </div>

      {/* Roster Showcase */}
      <div className="relative z-20 h-[60vh] flex items-center justify-center perspective-[1200px] mt-8">
        
        {/* Navigation Arrows */}
        <button 
          onClick={handlePrev}
          className="absolute left-8 md:left-16 z-40 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all text-white hover:scale-110 focus:outline-none"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button 
          onClick={handleNext}
          className="absolute right-8 md:right-16 z-40 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all text-white hover:scale-110 focus:outline-none"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Character Cards */}
        <div className="relative w-full max-w-7xl h-full flex items-center justify-center transform-style-3d">
          {agents.map((agent, index) => {
            // Calculate relative position to active index
            let offset = index - activeIndex;
            
            // Handle wrap-around for smooth infinite-like visual feel (optional, but good for 5 items)
            if (offset > 2) offset -= agents.length;
            if (offset < -2) offset += agents.length;

            const isActive = offset === 0;
            const isFlanking1 = Math.abs(offset) === 1;
            const isFlanking2 = Math.abs(offset) === 2;

            // Compute transforms
            let transform = 'translate3d(0, 0, 0) scale(1)';
            let zIndex = 10;
            let opacity = 1;
            let filter = 'blur(0px)';

            if (isActive) {
              transform = 'translate3d(0, 0, 0) scale(1)';
              zIndex = 30;
              opacity = 1;
            } else if (offset === -1) {
              transform = 'translate3d(-60%, 0, -200px) scale(0.8) rotateY(15deg)';
              zIndex = 20;
              opacity = 0.6;
              filter = 'blur(2px)';
            } else if (offset === 1) {
              transform = 'translate3d(60%, 0, -200px) scale(0.8) rotateY(-15deg)';
              zIndex = 20;
              opacity = 0.6;
              filter = 'blur(2px)';
            } else if (offset === -2) {
              transform = 'translate3d(-100%, 0, -400px) scale(0.6) rotateY(25deg)';
              zIndex = 10;
              opacity = 0.3;
              filter = 'blur(4px)';
            } else if (offset === 2) {
              transform = 'translate3d(100%, 0, -400px) scale(0.6) rotateY(-25deg)';
              zIndex = 10;
              opacity = 0.3;
              filter = 'blur(4px)';
            }

            const Icon = agent.icon;

            return (
              <div 
                key={agent.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "absolute top-1/2 left-1/2 -mt-[250px] -ml-[180px] w-[360px] h-[500px] transition-all duration-700 ease-out cursor-pointer group",
                  isActive ? "ring-1 ring-white/20" : "hover:opacity-80"
                )}
                style={{ 
                  transform,
                  zIndex,
                  opacity,
                  filter
                }}
              >
                {/* Active Glow/Pulse */}
                {isActive && (
                  <div className={cn(
                    "absolute -inset-1 rounded-2xl blur-lg opacity-50 animate-pulse bg-gradient-to-br",
                    agent.color
                  )}></div>
                )}
                
                {/* Card Background & Border */}
                <div className={cn(
                  "relative w-full h-full rounded-2xl overflow-hidden backdrop-blur-xl border border-white/10 flex flex-col",
                  isActive ? "bg-black/40 shadow-2xl " + agent.shadow : "bg-black/60 shadow-lg"
                )}>
                  
                  {/* Card Header Pattern/Gradient */}
                  <div className={cn("h-32 w-full bg-gradient-to-br opacity-20 relative", agent.color)}>
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                  </div>

                  {/* Avatar/Icon Container */}
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-24 h-24 rounded-2xl bg-[#0A0E27] border border-white/20 flex items-center justify-center shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-300">
                    <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-md bg-gradient-to-br", agent.color)}></div>
                    <Icon className="w-10 h-10 text-white relative z-10" />
                  </div>

                  {/* Card Content */}
                  <div className="pt-14 px-6 pb-6 flex-1 flex flex-col text-center">
                    <h2 className="text-3xl font-bold text-white mb-1">{agent.name}</h2>
                    <p className={cn("text-sm font-semibold uppercase tracking-wider mb-4 bg-clip-text text-transparent bg-gradient-to-r", agent.color)}>
                      {agent.role}
                    </p>
                    
                    {isActive ? (
                      <>
                        <p className="text-slate-300 italic mb-6 text-sm">"{agent.tagline}"</p>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 gap-3 mb-auto text-left w-full mt-2">
                          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 border border-white/5">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-slate-200">{agent.stats.speed}</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 border border-white/5">
                            <Globe className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-slate-200">{agent.stats.languages}</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 border border-white/5">
                            <ShieldCheck className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-slate-200">{agent.stats.reliability}</span>
                          </div>
                        </div>

                        {/* CTA */}
                        <button className={cn(
                          "w-full py-4 mt-6 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r flex items-center justify-center gap-2",
                          agent.color
                        )}>
                          Rent Now — $49/mo
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button className="px-6 py-2 rounded-full bg-white/10 text-white text-sm font-medium border border-white/20 backdrop-blur-sm">
                          View Profile
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

      {/* Pagination Dots */}
      <div className="relative z-30 flex justify-center gap-3 pb-12 mt-8">
        {agents.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              activeIndex === idx ? "w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "w-2 bg-white/20 hover:bg-white/40"
            )}
            aria-label={`Select agent ${idx + 1}`}
          />
        ))}
      </div>

    </div>
  );
}
