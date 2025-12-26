
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import MentorChat from './components/MentorChat';
import { AppSection, ChatProject, ChatMessage } from './types';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'model',
  content: 'Halo! Saya Senior Architect Bisa Coding. Apa yang ingin kita kerjakan hari ini?',
  timestamp: Date.now()
};

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Load data hanya sekali saat start
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bisacoding_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setProjects(parsed);
        }
      }
    } catch (e) {
      console.warn("Gagal memuat riwayat:", e);
    }
    // Set mount ke false setelah pembacaan pertama selesai
    setTimeout(() => { isInitialMount.current = false; }, 100);
  }, []);

  // Simpan data setiap kali projects berubah, tapi jangan saat mount awal
  useEffect(() => {
    if (isInitialMount.current) return;
    
    try {
      localStorage.setItem('bisacoding_projects', JSON.stringify(projects));
    } catch (e) {
      console.error("Gagal menyimpan riwayat ke storage:", e);
    }
  }, [projects]);

  const createNewProject = () => {
    const newId = Date.now().toString();
    const newProject: ChatProject = {
      id: newId,
      title: 'Diskusi Baru',
      messages: [INITIAL_MESSAGE],
      updatedAt: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newId);
    setCurrentSection(AppSection.MENTOR);
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Langsung hapus tanpa konfirmasi sesuai permintaan user
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setCurrentSection(AppSection.HOME);
    }
  };

  const updateProjectMessages = useCallback((projectId: string, messages: ChatMessage[]) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        let title = p.title;
        if (title === 'Diskusi Baru' || title.length < 5) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.slice(0, 30).trim() + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return { ...p, messages, title, updatedAt: Date.now() };
      }
      return p;
    }));
  }, []);

  const renderContent = () => {
    if (currentSection === AppSection.MENTOR && activeProjectId) {
      const activeProject = projects.find(p => p.id === activeProjectId);
      if (activeProject) {
        return (
          <MentorChat 
            activeProject={activeProject} 
            onUpdateProject={updateProjectMessages}
            onBackToHistory={() => setCurrentSection(AppSection.HOME)}
            onCreateNew={createNewProject}
          />
        );
      }
    }

    return (
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
          <header className="text-center space-y-6 animate-in">
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Bisa Coding <br/>
              <span className="text-blue-500">Kapan Saja.</span>
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={createNewProject} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                Tanya Mentor AI
              </button>
            </div>
          </header>

          <section className="space-y-6 animate-in [animation-delay:0.1s]">
            <div className="flex justify-between items-center border-l-4 border-blue-600 pl-4">
              <h2 className="text-xl font-bold">Riwayat Diskusi</h2>
              {projects.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">{projects.length} Sesi</span>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl text-slate-500">
                <p className="text-sm">Belum ada riwayat percakapan.</p>
                <button onClick={createNewProject} className="mt-4 text-blue-500 font-bold text-xs hover:underline">Mulai Diskusi Pertama</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {projects.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => { setActiveProjectId(p.id); setCurrentSection(AppSection.MENTOR); }} 
                    className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl hover:border-blue-500/40 hover:bg-slate-900/60 transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div className="flex-1 mr-4 overflow-hidden">
                      <h3 className="font-bold text-slate-200 text-sm truncate">{p.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">
                        {new Date(p.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => deleteProject(e, p.id)}
                        className="p-2.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        aria-label="Hapus Diskusi"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                      <div className="p-2 text-slate-700 group-hover:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar currentSection={currentSection} setSection={setCurrentSection} />
      {renderContent()}
    </>
  );
};

export default App;
