import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';

const POSTS = [
  {
    title: "Demystifying Neural Networks",
    category: "Deep Learning",
    readTime: "8 min read",
    excerpt: "Before you dive into the code, it's crucial to understand the high-level architecture. We break down nodes, layers, and backpropagation in an intuitive way.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Quantum Physics for Beginners",
    category: "Physics",
    readTime: "12 min read",
    excerpt: "Understanding the fundamental rules of the universe, from superposition to quantum entanglement, with practical analogies.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "The Future of Synthetic Biology",
    category: "Biology",
    readTime: "10 min read",
    excerpt: "How engineered biology is solving some of the world's most devastating problems in medicine and environmental sustainability.",
    image: "https://images.unsplash.com/photo-1530210124550-912dc1381cb8?auto=format&fit=crop&q=80&w=800"
  }
];

export function Blog() {
  return (
    <section className="py-12 lg:py-16 px-10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-heading mb-4 select-none">Latest Insights</h2>
        <p className="text-white/60 mb-16 max-w-xl font-light">
          Deep dives into complex subjects, crafted to spark curiosity and fuel your learning journey.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {POSTS.map((post) => (
            <div key={post.title} className="liquid-glass rounded-[2.5rem] overflow-hidden group cursor-pointer hover:-translate-y-2 transition-all duration-500 border border-white/5 hover:border-white/10">
              <div className="h-56 overflow-hidden relative">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10" />
                <img src={post.image} alt={post.title} className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-5 left-5 z-20 flex gap-2">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-white/20 text-white shadow-sm">
                    {post.category}
                  </span>
                </div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 text-white/40 text-xs font-medium mb-4">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                </div>
                <h3 className="text-2xl font-medium mb-3 leading-tight group-hover:text-white/90 transition-colors drop-shadow-sm">{post.title}</h3>
                <p className="text-white/50 text-sm font-light mb-8 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  Read article <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

