import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="h-screen w-full relative z-10 flex flex-col justify-between pt-[160px] pb-12 px-10">
      
      {/* Hero title */}
      <div 
        className={`w-full flex justify-center transition-all duration-1000 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <h1 className="hero-title select-none drop-shadow-2xl">EduLearn</h1>
      </div>

      {/* Bottom row */}
      <div className={`w-full flex flex-col md:flex-row items-center md:items-end justify-between transition-all duration-1000 delay-300 gap-8 md:gap-0 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
        
        <p className="text-sm font-body font-light text-white/75 max-w-[220px] leading-relaxed text-center md:text-left drop-shadow-lg">
          EduLearn's AI understands learning context, pacing, and style like a personal tutor would.
        </p>

        <div className="flex items-center gap-3 md:absolute md:left-1/2 md:-translate-x-1/2 md:bottom-12">
          <button className="group relative bg-white text-black text-sm font-body font-medium rounded-full px-6 py-3 overflow-hidden active:scale-[0.97] transition-all duration-200 shadow-[0_0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.25)] hover:scale-[1.03]">
            <span className="relative z-10">Start learning</span>
            <span className="absolute inset-0 bg-gradient-to-b from-white to-white/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
          
          <Link to="/subjects" className="liquid-glass group text-white text-sm font-body font-medium rounded-full px-6 py-3 active:scale-[0.97] transition-all duration-200 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_2px_rgba(255,255,255,0.07)]">
            Browse courses
          </Link>
        </div>

        <p className="text-sm font-body font-light text-white/75 max-w-[220px] leading-relaxed text-center md:text-right drop-shadow-lg">
          Describe what you want to learn — get a curriculum that actually fits.
        </p>
      </div>
    </section>
  );
}
