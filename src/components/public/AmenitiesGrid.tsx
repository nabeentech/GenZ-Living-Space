import React from "react";
import {
  Wifi,
  Mic,
  Monitor,
  Coffee,
  ShieldCheck,
  Sparkles,
  Gamepad2,
  Waves,
  Shirt,
  UtensilsCrossed,
  Wind,
  Lock,
} from "lucide-react";

export const AmenitiesGrid: React.FC = () => {
  const items = [
    { icon: <Wifi className="w-5 h-5 text-cyan-400" />, label: "1 Gbps Optic Fiber" },
    { icon: <Mic className="w-5 h-5 text-pink-400" />, label: "Podcast & Stream Studio" },
    { icon: <Monitor className="w-5 h-5 text-indigo-400" />, label: "Ergonomic Desks" },
    { icon: <Coffee className="w-5 h-5 text-amber-400" />, label: "Artisan Rooftop Cafe" },
    { icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />, label: "Biometric Smart Access" },
    { icon: <Sparkles className="w-5 h-5 text-purple-400" />, label: "Daily Deep Cleaning" },
    { icon: <Gamepad2 className="w-5 h-5 text-rose-400" />, label: "PS5 & Arcade Lounge" },
    { icon: <Waves className="w-5 h-5 text-blue-400" />, label: "Pool & Yoga Deck" },
    { icon: <Shirt className="w-5 h-5 text-sky-400" />, label: "Self Laundromat" },
    { icon: <UtensilsCrossed className="w-5 h-5 text-orange-400" />, label: "Community Kitchen" },
    { icon: <Wind className="w-5 h-5 text-teal-400" />, label: "Inverter AC Climate" },
    { icon: <Lock className="w-5 h-5 text-yellow-400" />, label: "Digital RFID Lockers" },
  ];

  return (
    <section id="amenities" className="py-20 bg-[#07090E] border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3.5 py-1.5 rounded-full">
            All-Inclusive Perks
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Everything You Need. <span className="gradient-text-cyan">Zero Compromises.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Every booking includes full access to work amenities, lounges, high-speed fiber, and community facilities.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex flex-col items-center text-center gap-3 transition hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm">
                {item.icon}
              </div>
              <span className="text-xs font-semibold text-slate-200">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AmenitiesGrid;
