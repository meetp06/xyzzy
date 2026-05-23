import React from 'react';
import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Basic',
    price: 20,
    features: ['Access to 2 subjects', 'Basic AI tutor support', 'Community access', 'Standard pacing'],
    popular: false
  },
  {
    name: 'Pro',
    price: 50,
    features: ['Unlimited subjects', 'Advanced AI tutoring', '1-on-1 human tutor sessions (2/mo)', 'Custom learning paths'],
    popular: true
  },
  {
    name: 'Elite',
    price: 100,
    features: ['Everything in Pro', 'Unlimited 1-on-1 sessions', 'Direct messaging with experts', 'Career path mapping'],
    popular: false
  }
];

export function Pricing() {
  return (
    <section className="py-12 lg:py-16 px-10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-heading mb-4 select-none">Invest in Your Mind</h2>
          <p className="text-white/60 max-w-xl mx-auto font-light">
            Simple, transparent pricing for transformative education.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center mt-20">
          {PLANS.map((plan) => (
            <div 
              key={plan.name} 
              className={`p-10 rounded-[2.5rem] relative transition-all duration-500 ${
                plan.popular 
                  ? 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/30 transform lg:-translate-y-6 shadow-[0_0_50px_rgba(255,255,255,0.15)] ring-1 ring-white/10' 
                  : 'liquid-glass hover:-translate-y-2'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-medium mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-heading">${plan.price}</span>
                <span className="text-white/50 text-sm font-light">/mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                    <Check className="w-5 h-5 text-white/40 shrink-0" />
                    <span className="font-light">{f}</span>
                  </li>
                ))}
              </ul>
              <button 
                className={`w-full py-4 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                  plan.popular 
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-[1.02]' 
                    : 'bg-white/10 text-white hover:bg-white/20 hover:scale-[1.02]'
                }`}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
