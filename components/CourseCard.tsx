
import React from 'react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/5 group cursor-pointer">
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {course.icon}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
          course.level === 'Pemula' ? 'bg-emerald-500/10 text-emerald-500' : 
          course.level === 'Menengah' ? 'bg-amber-500/10 text-amber-500' : 
          'bg-rose-500/10 text-rose-500'
        }`}>
          {course.level}
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-100 mb-2">{course.title}</h3>
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
        {course.description}
      </p>
      <div className="flex flex-wrap gap-2">
        {course.tags.map(tag => (
          <span key={tag} className="text-[11px] text-slate-500 bg-slate-800 px-2 py-1 rounded">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CourseCard;
