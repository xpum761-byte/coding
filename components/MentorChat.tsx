
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatProject } from '../types';
import { getGeminiMentorStream, FilePart } from '../services/geminiService';
import JSZip from 'jszip';

interface ProjectFile {
  path: string;
  content: string;
}

interface MentorChatProps {
  activeProject: ChatProject;
  onUpdateProject: (projectId: string, messages: ChatMessage[]) => void;
  onBackToHistory?: () => void;
  onCreateNew?: () => void;
}

const ZipDownloadCard: React.FC<{ files: ProjectFile[] }> = ({ files }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.path, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bisacoding_fix_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP Error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="my-8 p-8 bg-slate-900 border border-emerald-500/30 rounded-[40px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 animate-slide-in">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-emerald-600/10 rounded-3xl flex items-center justify-center text-4xl border border-emerald-500/20 shadow-inner">✅</div>
        <div>
          <h4 className="text-xl font-black text-white">Full-Code Restoration Pack</h4>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{files.length} Production Ready Files</p>
        </div>
      </div>
      <button 
        onClick={handleDownload} 
        disabled={isGenerating} 
        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
      >
        {isGenerating ? 'Mempersiapkan...' : 'Unduh Perbaikan'}
      </button>
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  
  if (language === 'json-project') {
    try {
      const files: ProjectFile[] = JSON.parse(code);
      return <ZipDownloadCard files={files} />;
    } catch (e) { return null; }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-8 rounded-[32px] overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
      <div className="flex items-center justify-between px-8 py-5 bg-slate-800/50 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{language || 'SOURCE CODE'}</span>
        </div>
        <button onClick={handleCopy} className="text-[11px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
          {copied ? '✅ BERHASIL DISALIN' : '📋 SALIN SEMUA KODE'}
        </button>
      </div>
      <div className="p-8 overflow-x-auto custom-scrollbar">
        <pre className="code-font text-sm leading-relaxed text-blue-50/90"><code>{code.trim()}</code></pre>
      </div>
    </div>
  );
};

const MessageRenderer: React.FC<{ content: string; sources?: any[] }> = ({ content, sources }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-6">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          return <CodeBlock key={index} code={match?.[2] || ''} language={match?.[1] || 'code'} />;
        }
        return <p key={index} className="whitespace-pre-wrap leading-relaxed text-slate-200 text-lg font-medium">{part}</p>;
      })}
      
      {sources && sources.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-700/30">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">📚 Referensi Teknis Terverifikasi</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source, i) => (
              source.web && (
                <a key={i} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800 transition-all flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 shrink-0 shadow-lg">🌐</div>
                  <span className="text-xs font-bold text-slate-300 truncate">{source.web.title || "Dokumentasi"}</span>
                </a>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MentorChat: React.FC<MentorChatProps> = ({ activeProject, onUpdateProject, onBackToHistory, onCreateNew }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; data: string; mimeType: string; isText: boolean; content?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeProject.messages, isLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      if (isImage) {
        setAttachedFile({ name: file.name, data: (reader.result as string).split(',')[1], mimeType: file.type, isText: false });
      } else {
        setAttachedFile({ name: file.name, data: '', mimeType: file.type, isText: true, content: reader.result as string });
      }
    };
    if (isImage) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;
    const currentInput = input;
    const currentFile = attachedFile;
    const userMsg: ChatMessage = {
      role: 'user',
      content: currentFile?.isText 
        ? `${currentInput}\n\n[FILE ANALISIS: ${currentFile.name}]\n${currentFile.content}` 
        : currentInput || `Analisis file: ${currentFile?.name}`,
      timestamp: Date.now()
    };
    const updatedMessages = [...activeProject.messages, userMsg];
    onUpdateProject(activeProject.id, [...updatedMessages, { role: 'model', content: '', timestamp: Date.now() }]);
    setInput(''); setAttachedFile(null); setIsLoading(true);
    try {
      let filePart: FilePart | undefined;
      if (currentFile && !currentFile.isText) {
        filePart = { inlineData: { data: currentFile.data, mimeType: currentFile.mimeType } };
      }
      let fullStreamedText = "";
      await getGeminiMentorStream(
        updatedMessages,
        (chunk) => {
          fullStreamedText += chunk;
          onUpdateProject(activeProject.id, [...updatedMessages, { role: 'model', content: fullStreamedText, timestamp: Date.now() }]);
        },
        (fullText, sources) => {
          onUpdateProject(activeProject.id, [...updatedMessages, { role: 'model', content: fullText, sources, timestamp: Date.now() }]);
          setIsLoading(false);
        },
        filePart
      );
    } catch (err) { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 overflow-hidden rounded-[56px] border border-slate-800 shadow-2xl max-w-[1600px] mx-auto w-full backdrop-blur-3xl">
      <div className="bg-slate-900/80 backdrop-blur-xl p-8 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-8 overflow-hidden">
          <button onClick={onBackToHistory} className="p-4 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg></button>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white uppercase tracking-widest truncate">{activeProject.title}</h3>
            <p className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span> 
              {isLoading ? 'Senior Architect Sedang Membedah Kode...' : 'Analisis Arsitektur Aktif'}
            </p>
          </div>
        </div>
        <button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>Baru</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 md:p-16 space-y-16 custom-scrollbar">
        {activeProject.messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
            <div className={`max-w-[95%] md:max-w-[88%] rounded-[48px] px-10 py-10 text-lg shadow-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-tl-none border border-slate-700/50'}`}>
              {msg.content === '' && msg.role === 'model' ? (
                <div className="flex flex-col gap-6 py-6">
                  <div className="flex gap-3"><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>
                  <p className="text-sm text-slate-500 font-bold italic">Membaca codebase dan merumuskan perbaikan arsitektur...</p>
                </div>
              ) : <MessageRenderer content={msg.content} sources={msg.sources} />}
            </div>
          </div>
        ))}
      </div>

      <div className="p-10 md:p-12 bg-slate-900/50 backdrop-blur-2xl border-t border-slate-800">
        <div className="max-w-6xl mx-auto space-y-8">
          {attachedFile && (
            <div className="flex items-center gap-6 bg-slate-800 p-5 rounded-3xl border border-blue-500/30 w-fit animate-slide-in shadow-xl">
              <span className="text-sm text-slate-200 font-bold">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-slate-500 hover:text-rose-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
          )}
          <div className="flex gap-6 items-end">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,text/*,.js,.ts,.tsx,.py,.html,.css,.json"/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-6 bg-slate-800 text-slate-400 hover:text-blue-500 rounded-[32px] transition-all border border-slate-700 active:scale-90 shadow-2xl flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
            <textarea rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px'; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Tempel file kode besar atau log error di sini..." className="w-full bg-slate-950 border border-slate-800 rounded-[32px] px-10 py-6 text-xl focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner text-slate-100 placeholder:text-slate-700 custom-scrollbar" disabled={isLoading}/>
            <button onClick={handleSend} disabled={isLoading || (!input.trim() && !attachedFile)} className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-[32px] shadow-2xl transition-all active:scale-90 disabled:bg-slate-800 flex-shrink-0">{isLoading ? <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorChat;
