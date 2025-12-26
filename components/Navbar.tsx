
import React from 'react';
import { AppSection } from '../types';

interface NavbarProps {
  currentSection: AppSection;
  setSection: (section: AppSection) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentSection, setSection }) => {
  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setSection(AppSection.HOME)}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            B
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Bisa Coding
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {[
            { id: AppSection.HOME, label: 'Beranda' },
            { id: AppSection.COURSES, label: 'Kursus' },
            { id: AppSection.MENTOR, label: 'Mentor AI' },
            { id: AppSection.COMMUNITY, label: 'Komunitas' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                currentSection === item.id ? 'text-blue-500' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all">
          Mulai Belajar
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
