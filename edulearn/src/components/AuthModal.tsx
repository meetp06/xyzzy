import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'signIn' | 'signUp';
}

export function AuthModal({ isOpen, onClose, initialMode }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (isOpen) {
      // Small delay to ensure the DOM is ready for the transition
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={handleClose} 
      />
      
      <div 
        className={`relative w-full max-w-md liquid-glass-strong rounded-[2.5rem] p-10 border border-white/10 transition-all duration-500 transform ${
          isAnimating ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95'
        }`}
      >
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-4xl font-heading mb-2 text-white">
          {mode === 'signIn' ? 'Welcome back' : 'Start learning'}
        </h2>
        <p className="text-white/50 text-sm font-light mb-8">
          {mode === 'signIn' 
            ? 'Sign in to jump back into your curriculum.' 
            : 'Create an account to browse tailored courses.'}
        </p>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleClose(); }}>
          {mode === 'signUp' && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5 ml-1">Full Name</label>
              <input 
                type="text" 
                required
                placeholder="Alan Turing"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-colors"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 ml-1">Email</label>
            <input 
              type="email" 
              required
              placeholder="alan@turing.edu"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-colors"
            />
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              className="w-full relative group bg-white text-black text-sm font-body font-medium rounded-full px-6 py-4 overflow-hidden active:scale-[0.98] transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]"
            >
              <span className="relative z-10">
                {mode === 'signIn' ? 'Sign In' : 'Create Account'}
              </span>
              <span className="absolute inset-0 bg-gradient-to-b from-white to-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            {mode === 'signIn' 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
