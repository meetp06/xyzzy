import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { Courses } from './components/Courses';
import { Tutors } from './components/Tutors';
import { Pricing } from './components/Pricing';
import { Blog } from './components/Blog';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="subjects" element={
            <div className="pt-24 min-h-screen bg-black/80 backdrop-blur-3xl">
              <Courses />
            </div>
          } />
          <Route path="tutors" element={
            <div className="pt-24 min-h-screen bg-black/80 backdrop-blur-3xl">
              <Tutors />
            </div>
          } />
          <Route path="pricing" element={
            <div className="pt-24 min-h-screen bg-black/80 backdrop-blur-3xl">
              <Pricing />
            </div>
          } />
          <Route path="blog" element={
            <div className="pt-24 min-h-screen bg-black/80 backdrop-blur-3xl">
              <Blog />
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
