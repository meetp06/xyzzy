import React from 'react';
import { Star } from 'lucide-react';

const TUTORS = [
  {
    name: 'Jane Doe',
    subject: 'AI & Machine Learning',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256'
  },
  {
    name: 'Dr. Smith',
    subject: 'Quantum Physics',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256'
  },
  {
    name: 'Emily R.',
    subject: 'Cellular Biology',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256'
  }
];

export function Tutors() {
  return (
    <section className="py-12 lg:py-16 px-10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-heading mb-4 select-none">World-Class Tutors</h2>
        <p className="text-white/60 mb-16 max-w-xl font-light">
          Learn directly from experts who tailor their approach to your unique goals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TUTORS.map((tutor) => (
            <div key={tutor.name} className="liquid-glass p-8 rounded-[2rem] flex flex-col items-center text-center group cursor-pointer hover:bg-white/[0.03] transition-colors duration-500">
              <img 
                src={tutor.image} 
                alt={tutor.name} 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover mb-6 border border-white/20 p-1.5 group-hover:scale-105 group-hover:border-white/40 transition-all duration-500 shadow-xl"
              />
              <h3 className="text-xl font-medium mb-1">{tutor.name}</h3>
              <p className="text-white/50 text-sm font-light mb-4">{tutor.subject}</p>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
                <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                <span className="text-sm font-medium text-white/90">{tutor.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
