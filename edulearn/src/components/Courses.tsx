import React from 'react';
import { ArrowRight, Brain, Dna, Atom } from 'lucide-react';

const COURSES = [
  {
    title: 'Artificial Intelligence',
    description: 'Neural networks, machine learning, and ethics of AI.',
    icon: Brain,
    color: 'from-blue-500/20 to-blue-900/20',
  },
  {
    title: 'Biology',
    description: 'Genetics, cellular structures, and evolutionary biology.',
    icon: Dna,
    color: 'from-emerald-500/20 to-emerald-900/20',
  },
  {
    title: 'Physics',
    description: 'Quantum mechanics, relativity, and thermodynamics.',
    icon: Atom,
    color: 'from-purple-500/20 to-purple-900/20',
  }
];

export function Courses() {
  return (
    <section className="py-12 lg:py-16 px-10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-heading mb-4 select-none">Explore Subjects</h2>
        <p className="text-white/60 mb-16 max-w-xl font-light">
          Dive into our expertly crafted curriculums designed to adapt to your learning pace and style.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COURSES.map((course) => (
            <div key={course.title} className={`liquid-glass p-8 rounded-[2rem] group cursor-pointer hover:bg-white/[0.03] transition-colors duration-500 relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${course.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              <div className="relative z-10">
                <course.icon className="w-10 h-10 mb-6 text-white/80 group-hover:text-white transition-colors" strokeWidth={1.5} />
                <h3 className="text-2xl font-medium mb-3">{course.title}</h3>
                <p className="text-white/50 font-light text-sm leading-relaxed mb-8">
                  {course.description}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-white/50 group-hover:text-white transition-colors">
                  <span>View curriculum</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
