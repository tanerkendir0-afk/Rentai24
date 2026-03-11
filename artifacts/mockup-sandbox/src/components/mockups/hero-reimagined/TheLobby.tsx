import React from 'react';
import { 
  Headphones, 
  TrendingUp, 
  Share2, 
  Calculator, 
  CalendarCheck, 
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const workers = [
  { 
    name: 'Ava', 
    role: 'Customer Support Agent', 
    icon: Headphones,
    delay: '0ms',
    offset: 'md:translate-y-0',
    color: 'from-blue-400 to-blue-600'
  },
  { 
    name: 'Rex', 
    role: 'Sales Development Rep', 
    icon: TrendingUp,
    delay: '100ms',
    offset: 'md:translate-y-8',
    color: 'from-violet-400 to-purple-600'
  },
  { 
    name: 'Maya', 
    role: 'Social Media Manager', 
    icon: Share2,
    delay: '200ms',
    offset: 'md:translate-y-16',
    color: 'from-fuchsia-400 to-pink-600'
  },
  { 
    name: 'Finn', 
    role: 'Bookkeeping Assistant', 
    icon: Calculator,
    delay: '150ms',
    offset: 'md:translate-y-0',
    color: 'from-cyan-400 to-blue-500'
  },
  { 
    name: 'Cal', 
    role: 'Scheduling Coordinator', 
    icon: CalendarCheck,
    delay: '250ms',
    offset: 'md:translate-y-8',
    color: 'from-indigo-400 to-violet-500'
  },
  { 
    name: 'Harper', 
    role: 'HR & Recruiting Agent', 
    icon: Users,
    delay: '350ms',
    offset: 'md:translate-y-16',
    color: 'from-purple-400 to-fuchsia-500'
  },
];

export function TheLobby() {
  return (
    <div className="min-h-screen bg-[#0A0E27] text-white flex items-center relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Ambient Lighting Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Subtle Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 py-20 items-center">
        
        {/* Left Column: Copy & CTA (1/3 width on large screens) */}
        <div className="lg:col-span-4 flex flex-col items-start space-y-8 relative">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
            <span className="text-sm font-medium text-white/90 tracking-wide">Agents standing by</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Meet your new <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 drop-shadow-sm">
              AI workforce.
            </span>
          </h1>
          
          <p className="text-lg text-white/60 leading-relaxed max-w-md font-medium">
            Step into the lobby of the future. Rent pre-trained, specialized AI agents that seamlessly integrate into your team from day one.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] active:scale-[0.98]">
              <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative flex items-center justify-center gap-2 text-base">
                Hire your first agent
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            
            <button className="px-8 py-4 bg-[#12183A] hover:bg-[#1A2250] border border-white/10 hover:border-white/20 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-base shadow-sm">
              <Sparkles className="w-5 h-5 text-violet-400" />
              View Roster
            </button>
          </div>
        </div>

        {/* Right Column: AI Avatars Grid (2/3 width on large screens) */}
        <div className="lg:col-span-8 relative mt-12 lg:mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 relative">
            
            {/* Ambient glow behind grid */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

            {workers.map((worker) => {
              const Icon = worker.icon;
              return (
                <div 
                  key={worker.name}
                  className={`group relative p-[1px] rounded-[1.25rem] bg-gradient-to-b from-white/10 to-white/0 hover:from-blue-500/50 hover:to-violet-500/50 transition-all duration-500 z-10 ${worker.offset}`}
                  style={{ animationDelay: worker.delay }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-[1.25rem] blur-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                  
                  <div className="relative h-full bg-[#0E1332] hover:bg-[#12183A] backdrop-blur-xl rounded-2xl p-6 flex flex-col items-center text-center overflow-hidden transition-all duration-500 group-hover:-translate-y-2 shadow-lg group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                    
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/20 px-2 py-1 rounded-full border border-white/5">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/90">Available</span>
                    </div>

                    {/* Avatar / Portrait Orb */}
                    <div className="relative w-24 h-24 mt-6 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-out">
                      {/* Glow rings */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${worker.color} rounded-full opacity-10 group-hover:opacity-30 blur-lg transition-opacity duration-500`}></div>
                      <div className={`absolute inset-1 bg-gradient-to-br ${worker.color} rounded-full opacity-20 group-hover:opacity-40 blur-md transition-opacity duration-500`}></div>
                      <div className={`absolute inset-3 bg-gradient-to-br ${worker.color} rounded-full opacity-30 group-hover:opacity-50 blur-sm transition-opacity duration-500`}></div>
                      
                      {/* Inner circle */}
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-[#1A2250] to-[#0A0E27] border border-white/10 flex items-center justify-center shadow-inner z-10">
                        <Icon className="w-7 h-7 text-white/90 drop-shadow-md" strokeWidth={1.5} />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1.5 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-colors">{worker.name}</h3>
                    <p className="text-sm text-blue-200/60 font-medium leading-relaxed">{worker.role}</p>
                    
                    {/* Abstract reflection line */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
