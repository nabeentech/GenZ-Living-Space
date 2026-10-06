import React from "react";
import { Star, Quote } from "lucide-react";

export const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: "Tanmay Bhatia",
      role: "AI Engineer & Founder",
      hostel: "Madhapur - 01",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      content:
        "Moved here for 2 months to launch our YC application. The rooftop Wi-Fi is insane (850+ Mbps), met 3 other founders in the cafe, and the quiet hours are strictly honored. 10/10 living space.",
      rating: 5,
    },

    {
      name: "Rishi Menon",
      role: "Full-Stack Nomad",
      hostel: "Madhapur - 01",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      content:
        "Swimming pool breaks between pull requests and sunset acoustic jams by the pool deck. The community manager makes you feel at home on day one. Best workation experience in India.",
      rating: 5,
    },
  ];

  return (
    <section id="community" className="py-24 bg-[#07090E] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-pink-400 bg-pink-950/60 border border-pink-500/30 px-3.5 py-1.5 rounded-full">
            Resident Stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Loved By <span className="gradient-text-coral">10,000+ Creators</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Hear from developers, creators, and nomads who call GenZ Living Space their home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="glass-panel p-8 rounded-3xl border border-slate-800/80 bg-[#101626]/80 flex flex-col justify-between relative"
            >
              <Quote className="w-10 h-10 text-indigo-500/20 absolute top-6 right-6" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-1">
                  {[...Array(r.rating)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  "{r.content}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-slate-800/70 mt-6">
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="w-11 h-11 rounded-full object-cover border border-indigo-500/40"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">{r.name}</h4>
                  <p className="text-xs text-slate-400">
                    {r.role} • <span className="text-indigo-400">{r.hostel}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
