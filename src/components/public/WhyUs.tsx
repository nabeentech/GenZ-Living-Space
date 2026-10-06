import React from "react";
import { Zap, ShieldCheck, Users2, Sparkles, Wifi, HeartHandshake } from "lucide-react";

export const WhyUs: React.FC = () => {
  const features = [
    {
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      title: "Gigabit Fiber & Creator Pods",
      description: "Dedicated 1 Gbps fiber lines with secondary backup, ergonomic Herman Miller chairs, soundproof podcast booths, and 24/7 coding spaces.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-indigo-400" />,
      title: "Next-Gen Biometric Security",
      description: "Smart keyless entry, facial recognition elevator/room access, 24/7 female safety wardens, and individual biometric lockers.",
    },
    {
      icon: <Users2 className="w-6 h-6 text-pink-400" />,
      title: "Vibrant Community Living",
      description: "Weekly founder demo days, rooftop acoustic sessions, beach yoga retreats, gaming tournaments, and curated networking mixers.",
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      title: "Hotel Grade Cleanliness",
      description: "Medical-grade UV sanitization, daily housekeeping, premium bamboo fiber linens, and automated laundry services on every floor.",
    },
    {
      icon: <Wifi className="w-6 h-6 text-emerald-400" />,
      title: "Short & Long Term Flexibility",
      description: "Stay for a weekend hackerhouse or settle in for monthly workation memberships with refundable deposits and zero brokerage.",
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-purple-400" />,
      title: "Exclusive 4 Boutique Sanctuaries",
      description: "We are NOT an aggregator or marketplace. We exclusively own and obsessively manage both properties in Madhapur - HYD.",
    },
  ];

  return (
    <section id="why-us" className="py-24 relative overflow-hidden bg-[#0B0F19]">
      {/* Background glow circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1.5 rounded-full">
            The GenZ Standard
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Not A Hotel. <span className="gradient-text-primary">Your Next Creative Habitat.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Built from the ground up for the way modern creators live, work, and collaborate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-panel glass-panel-hover p-8 rounded-3xl border border-slate-800/80 bg-[#101626]/80 flex flex-col justify-between"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-6 shadow-md">
                {f.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
