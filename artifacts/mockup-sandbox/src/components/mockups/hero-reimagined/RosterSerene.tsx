import React, { useState } from 'react';
import { Headphones, TrendingUp, Share2, Calculator, Users, ChevronLeft, ChevronRight, Zap, Globe, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Agent Data
const agents = [
  {
    id: 'finn',
    name: 'Finn',
    role: 'Bookkeeping',
    icon: Calculator,
    tagline: 'Zero-error financial ops',
    stats: { speed: '<1hr reconciliations', languages: '5 languages', reliability: '100% accuracy' },
  },
  {
    id: 'rex',
    name: 'Rex',
    role: 'Sales SDR',
    icon: TrendingUp,
    tagline: 'Closes 3x more qualified leads',
    stats: { speed: '<5min outreach', languages: '8 languages', reliability: '24/7 prospecting' },
  },
  {
    id: 'ava',
    name: 'Ava',
    role: 'Customer Support',
    icon: Headphones,
    tagline: 'I resolve 95% of tickets on first contact',
    stats: { speed: '<2min response', languages: '12 languages', reliability: '99.9% uptime' },
  },
  {
    id: 'maya',
    name: 'Maya',
    role: 'Social Media',
    icon: Share2,
    tagline: 'Your brand, always on',
    stats: { speed: 'Real-time monitoring', languages: '15 languages', reliability: '100% brand safe' },
  },
  {
    id: 'harper',
    name: 'Harper',
    role: 'HR Recruiting',
    icon: Users,
    tagline: 'Screens 200 candidates/day',
    stats: { speed: 'Instant screening', languages: '10 languages', reliability: 'Unbiased matching' },
  }
];

export function RosterSerene() {
  const [activeIndex, setActiveIndex] = useState(2); // Start with Ava (index 2)

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % agents.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + agents.length) % agents.length);
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-300 font-sans" style={{ backgroundColor: '#030305' }}>
      
      {/* Minimal Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-[#030305] to-transparent z-10"></div>
      </div>

      {/* Header */}
      <div className="relative z-30 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 mb-6 text-slate-500 text-xs tracking-[0.2em] uppercase">
          <span className="w-1 h-1 rounded-full bg-slate-500"></span>
          RentAI 24 Roster
          <span className="w-1 h-1 rounded-full bg-slate-500"></span>
        </div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-slate-100 mb-4">
          Augment your team.
        </h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto font-light leading-relaxed">
          Select a pre-trained specialist to instantly integrate with your workflow. Quiet competence, zero friction.
        </p>
      </div>

      {/* Roster Showcase */}
      <div className="relative z-20 h-[55vh] flex items-center justify-center perspective-[1200px] mt-4">
        
        {/* Navigation Arrows */}
        <button 
          onClick={handlePrev}
          className="absolute left-8 md:left-24 z-40 p-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-slate-600 hover:text-slate-300 focus:outline-none"
        >
          <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
        </button>

        <button 
          onClick={handleNext}
          className="absolute right-8 md:right-24 z-40 p-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-slate-600 hover:text-slate-300 focus:outline-none"
        >
          <ChevronRight className="w-5 h-5 stroke-[1.5]" />
        </button>

        {/* Character Cards */}
        <div className="relative w-full max-w-6xl h-full flex items-center justify-center transform-style-3d">
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
              transform = 'translate3d(-55%, 0, -150px) scale(0.85) rotateY(10deg)';
              zIndex = 20;
              opacity = 0.4;
              filter = 'blur(2px)';
            } else if (offset === 1) {
              transform = 'translate3d(55%, 0, -150px) scale(0.85) rotateY(-10deg)';
              zIndex = 20;
              opacity = 0.4;
              filter = 'blur(2px)';
            } else if (offset === -2) {
              transform = 'translate3d(-90%, 0, -300px) scale(0.7) rotateY(20deg)';
              zIndex = 10;
              opacity = 0.15;
              filter = 'blur(4px)';
            } else if (offset === 2) {
              transform = 'translate3d(90%, 0, -300px) scale(0.7) rotateY(-20deg)';
              zIndex = 10;
              opacity = 0.15;
              filter = 'blur(4px)';
            }

            const Icon = agent.icon;

            return (
              <div 
                key={agent.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "absolute top-1/2 left-1/2 -mt-[240px] -ml-[160px] w-[320px] h-[480px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group",
                  isActive ? "" : "hover:opacity-60"
                )}
                style={{ 
                  transform,
                  zIndex,
                  opacity,
                  filter
                }}
              >
                
                {/* Card Background & Border */}
                <div className={cn(
                  "relative w-full h-full rounded flex flex-col transition-all duration-700",
                  isActive ? "bg-[#09090D] border border-slate-800" : "bg-[#050508] border border-slate-900"
                )}>
                  
                  {/* Avatar/Icon Container */}
                  <div className="pt-12 pb-6 flex items-center justify-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-700",
                      isActive ? "bg-slate-900 text-slate-200" : "bg-transparent text-slate-700"
                    )}>
                      <Icon className="w-6 h-6 stroke-[1.5]" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="px-8 pb-8 flex-1 flex flex-col text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h2 className={cn(
                        "text-xl font-medium tracking-wide transition-colors duration-700",
                        isActive ? "text-slate-100" : "text-slate-500"
                      )}>{agent.name}</h2>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80"></span>
                      )}
                    </div>
                    
                    <p className="text-xs font-medium text-slate-500 tracking-widest uppercase mb-6">
                      {agent.role}
                    </p>
                    
                    {isActive ? (
                      <div className="flex-1 flex flex-col">
                        <p className="text-slate-400 font-light text-sm mb-8 leading-relaxed">"{agent.tagline}"</p>
                        
                        {/* Stats Minimal */}
                        <div className="flex flex-col gap-4 mb-auto text-left w-full mt-2">
                          <div className="flex items-center gap-4">
                            <Clock className="w-4 h-4 stroke-[1.5] text-slate-600" />
                            <span className="text-xs text-slate-400 font-light">{agent.stats.speed}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Globe className="w-4 h-4 stroke-[1.5] text-slate-600" />
                            <span className="text-xs text-slate-400 font-light">{agent.stats.languages}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <ShieldCheck className="w-4 h-4 stroke-[1.5] text-slate-600" />
                            <span className="text-xs text-slate-400 font-light">{agent.stats.reliability}</span>
                          </div>
                        </div>

                        {/* CTA Minimal */}
                        <button className="w-full py-3.5 mt-8 text-xs font-medium tracking-wider text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-slate-100 transition-colors bg-transparent uppercase">
                          Deploy Agent
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <span className="text-xs tracking-widest uppercase text-slate-600 font-medium">
                          Inspect
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Minimal Dots */}
      <div className="relative z-30 flex justify-center gap-4 pb-12 mt-12">
        {agents.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              "rounded-full transition-all duration-500 ease-out",
              activeIndex === idx 
                ? "w-1.5 h-1.5 bg-slate-400" 
                : "w-1 h-1 bg-slate-800 hover:bg-slate-600"
            )}
            aria-label={`Select agent ${idx + 1}`}
          />
        ))}
      </div>

    </div>
  );
}
