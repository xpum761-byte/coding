
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CourseCard from './components/CourseCard';
import MentorChat from './components/MentorChat';
import { AppSection, Course, ChatProject, ChatMessage } from './types';

const COURSES: Course[] = [
  { id: '1', title: 'Dasar Pemrograman Web', description: 'Pelajari HTML, CSS, dan dasar JavaScript untuk membangun website pertamamu.', icon: '🌐', level: 'Pemula', tags: ['Web', 'Frontend', 'HTML'] },
  { id: '2', title: 'React.js Masterclass', description: 'Kuasai library JavaScript terpopuler untuk membangun aplikasi modern berskala besar.', icon: '⚛️', level: 'Menengah', tags: ['React', 'JavaScript', 'UI'] },
  { id: '3', title: 'Python untuk Data Science', description: 'Analisis data, visualisasi, dan dasar-dasar machine learning menggunakan Python.', icon: '🐍', level: 'Pemula', tags: ['Data', 'Python', 'ML'] },
  { id: '4', title: 'Node.js & Backend Architecture', description: 'Bangun API yang tangguh dan pelajari manajemen database server-side.', icon: '🚀', level: 'Menengah', tags: ['Backend', 'Node', 'API'] },
  { id: '5', title: 'Mobile App with Flutter', description: 'Buat aplikasi Android dan iOS dari satu codebase menggunakan framework Dart.', icon: '📱', level: 'Pemula', tags: ['Mobile', 'Flutter', 'Dart'] },
  { id: '6', title: 'Cloud Computing Essentials', description: 'Pahami infrastruktur cloud AWS, GCP, dan cara deploy aplikasi ke produksi.', icon: '☁️', level: 'Lanjut', tags: ['Cloud', 'DevOps', 'AWS'] }
];

const INITIAL_MESSAGE: ChatMessage = {
  role: 'model',
  content: 'Halo! Saya Senior Architect Bisa Coding. Saya dioptimalkan untuk menganalisis codebase besar dan file kode yang sangat panjang. Silakan tempel kode Anda atau lampirkan file yang ingin diaudit.',
  timestamp: Date.now()
};

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKeyAndLoadData = async () => {
      // Cek apakah di lingkungan AI Studio
      if (typeof (window as any).aistudio !== 'undefined') {
        try {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          setHasApiKey(true); // Fallback jika terjadi error pada deteksi
        }
      } else {
        // Di Vercel atau environment standar, kita anggap API_KEY sudah ada di environment variables
        setHasApiKey(true);
      }

      const saved = localStorage.getItem('bisacoding_projects');
      if (saved) {
        try {
          setProjects(JSON.parse(saved));
        } catch (e) {
          console.error("Gagal memuat riwayat", e);
        }
      }
    };
    checkKeyAndLoadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('bisacoding_projects', JSON.stringify(projects));
  }, [projects]);

  const handleSelectKey = async () => {
    if (typeof (window as any).aistudio !== 'undefined') {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Gagal membuka pemilihan key", e);
      }
    }
  };

  const createNewProject = () => {
    const newProject: ChatProject = {
      id: Date.now().toString(),
      title: 'Analisis Proyek Baru',
      messages: [INITIAL_MESSAGE],
      updatedAt: Date.now()
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(newProject.id);
    setCurrentSection(AppSection.MENTOR);
  };

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentSection(AppSection.MENTOR);
  };

  const updateProjectMessages = (projectId: string, messages: ChatMessage[]) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        let title = p.title;
        if (title.includes('Proyek Baru') || title.includes('Analisis Proyek')) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.split('\n')[0].slice(0, 50).trim();
            if (firstUserMsg.content.length > 50) title += '...';
          }
        }
        return { ...p, messages, title, updatedAt: Date.now() };
      }
      return p;
    }));
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Hapus sesi ini secara permanen?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const deleteAllProjects = () => {
    if (window.confirm('PERINGATAN: Semua riwayat proyek akan dihapus secara permanen. Lanjutkan?')) {
      setProjects([]);
      setActiveProjectId(null);
      localStorage.removeItem('bisacoding_projects');
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-10 bg-slate-900 border border-slate-800 p-12 rounded-[48px] shadow-2xl animate-slide-in">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-full"></div>
            <div className="relative w-full h-full bg-slate-800 rounded-3xl flex items-center justify-center text-5xl border border-slate-700">🔐</div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white tracking-tight">Otentikasi Aman</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Silakan hubungkan API Key Anda melalui Google AI Studio untuk mengaktifkan fitur analisis.
            </p>
          </div>
          <button 
            onClick={handleSelectKey} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-600/30 active:scale-95"
          >
            Hubungkan API Key
          </button>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.HOME:
        return (
          <div className="space-y-24 py-16">
            <section className="text-center space-y-10 px-4">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-5 py-2 rounded-full text-[10px] font-black border border-emerald-500/20 mb-4 tracking-[0.2em] uppercase">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Node Arsitektur Terverifikasi
              </div>
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-white">
                Bisa <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500">Coding.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-400 max-w-4xl mx-auto leading-relaxed font-medium">
                Sistem Analisis Kode Performa Tinggi untuk Engineer Modern.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                <button onClick={() => setCurrentSection(AppSection.COURSES)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 rounded-2xl font-black text-xl shadow-2xl transition-all hover:-translate-y-1">
                  Jelajahi Kursus
                </button>
                <button onClick={createNewProject} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-12 py-6 rounded-2xl font-black text-xl transition-all border border-slate-800 hover:border-blue-500/50 flex items-center justify-center gap-4">
                  Tanya Mentor AI
                </button>
              </div>
            </section>

            <section className="max-w-[1600px] mx-auto px-6 space-y-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-900 pb-10">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-white flex items-center gap-4">
                    <div className="w-4 h-12 bg-blue-600 rounded-full"></div>
                    Workspace Utama
                  </h2>
                  <p className="text-slate-500 font-semibold tracking-wide">Analisis codebase Anda dalam skala besar.</p>
                </div>
                {projects.length > 0 && (
                   <div className="flex items-center gap-4">
                     <button 
                       onClick={deleteAllProjects}
                       className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-white bg-rose-500/5 px-4 py-2 rounded-xl border border-rose-500/10 transition-all hover:bg-rose-500"
                     >
                       Hapus Semua Riwayat
                     </button>
                     <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                       <span className="text-blue-500 font-black text-xl">{projects.length}</span>
                       <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Sesi</span>
                     </div>
                   </div>
                )}
              </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  <div 
                    onClick={createNewProject}
                    className="group border-2 border-dashed border-slate-800 rounded-[40px] p-10 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-600/5 transition-all cursor-pointer min-h-[300px]"
                  >
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <h3 className="font-black text-xl text-slate-500 group-hover:text-white">Mulai Sesi Baru</h3>
                  </div>

                  {projects.map((project) => (
                    <div 
                      key={project.id}
                      onClick={() => openProject(project.id)}
                      className="bg-slate-900/50 border border-slate-800/80 rounded-[40px] p-8 hover:border-blue-500 transition-all hover:shadow-2xl cursor-pointer group flex flex-col justify-between min-h-[300px]"
                    >
                      <div className="space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          </div>
                          <button onClick={(e) => deleteProject(e, project.id)} className="p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
                        </div>
                        <h3 className="text-xl font-black text-white line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">{project.title}</h3>
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          {new Date(project.updatedAt).toLocaleDateString('id-ID')}
                        </span>
                        <span className="text-blue-500 font-black text-xs">Lanjutkan →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center bg-slate-900/20 rounded-[64px] border border-slate-900/50">
                  <div className="text-8xl mb-10">🚀</div>
                  <h3 className="text-3xl font-black text-white mb-6">Siap Menganalisis Codebase Anda?</h3>
                  <button onClick={createNewProject} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black text-xl">Mulai Sekarang</button>
                </div>
              )}
            </section>
          </div>
        );

      case AppSection.COURSES:
        return (
          <div className="max-w-[1600px] mx-auto px-6 py-20 animate-slide-in">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-6xl font-black text-white tracking-tighter">Akademi Engineering</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg font-medium">Kurikulum mendalam untuk mencetak pengembang kelas atas.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {COURSES.map(course => <CourseCard key={course.id} course={course} />)}
            </div>
          </div>
        );

      case AppSection.MENTOR:
        const activeProject = projects.find(p => p.id === activeProjectId);
        return (
          <div className="h-[calc(100vh-80px)] w-full p-4 md:p-10 bg-slate-950 flex justify-center overflow-hidden">
            {activeProject ? (
              <MentorChat 
                activeProject={activeProject} 
                onUpdateProject={updateProjectMessages}
                onBackToHistory={() => setCurrentSection(AppSection.HOME)}
                onCreateNew={createNewProject}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 bg-slate-900/50 border border-slate-800 rounded-[48px] max-w-2xl">
                <div className="text-8xl mb-10">🤖</div>
                <h3 className="text-3xl font-black text-white mb-6">Sesi Berakhir</h3>
                <button onClick={() => setCurrentSection(AppSection.HOME)} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-lg">Ke Dashboard</button>
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600/30 selection:text-blue-200 overflow-x-hidden">
      <Navbar currentSection={currentSection} setSection={setCurrentSection} />
      <main className="flex-1">{renderSection()}</main>
      <footer className="border-t border-slate-900/50 py-16 bg-slate-950">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setCurrentSection(AppSection.HOME)}>
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-xl">B</div>
             <span className="font-black text-2xl tracking-tighter">Bisa Coding</span>
          </div>
          <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em]">© 2024 Bisa Coding • Senior Architecture Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
