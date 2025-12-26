
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

const YouTubeEmbed: React.FC<{ url: string }> = ({ url }) => {
  const getID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  const videoId = getID(url);
  if (!videoId) return null;

  return (
    <div className="my-8 rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl aspect-video bg-black relative group">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

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
      link.download = `bisacoding_full_fix_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP Generation Failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="my-8 p-6 bg-slate-900 border border-emerald-500/30 rounded-[32px] shadow-2xl animate-slide-in flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner text-2xl">✅</div>
        <div>
          <h4 className="text-lg font-black text-white">Full-Code Project Fix</h4>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{files.length} Files Corrected</p>
        </div>
      </div>
      <button 
        onClick={handleDownload} 
        disabled={isGenerating} 
        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
      >
        {isGenerating ? 'Packaging...' : 'Download Fixed Code'}
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
    <div className="my-6 rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{language || 'full-code'}</span>
        </div>
        <button onClick={handleCopy} className="text-[11px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
          {copied ? '✅ COPIED' : '📋 COPY FULL CODE'}
        </button>
      </div>
      <div className="p-6 overflow-x-auto custom-scrollbar">
        <pre className="code-font text-sm leading-relaxed text-blue-50/90 selection:bg-blue-500/40"><code>{code.trim()}</code></pre>
      </div>
    </div>
  );
};

const MessageRenderer: React.FC<{ content: string; sources?: any[] }> = ({ content, sources }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          return <CodeBlock key={index} code={match?.[2] || ''} language={match?.[1] || 'code'} />;
        }
        return <p key={index} className="whitespace-pre-wrap leading-relaxed text-slate-200 text-base font-medium">{part}</p>;
      })}
      
      {sources && sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-700/30">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">📚 Referensi Debugging</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source, i) => (
              source.web && (
                <a key={i} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl hover:border-blue-500/50 hover:bg-slate-800 transition-all flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-300 truncate">{source.web.title || "Docs"}</span>
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
        ? `${currentInput}\n\n[FILE UNTUK DIAUDIT: ${currentFile.name}]\n${currentFile.content}` 
        : currentInput || `Audit file: ${currentFile?.name}`,
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
    <div className="flex flex-col h-full bg-slate-900/40 overflow-hidden rounded-[48px] border border-slate-800 shadow-2xl max-w-5xl mx-auto w-full backdrop-blur-3xl">
      <div className="bg-slate-900/80 backdrop-blur-xl p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-6 overflow-hidden">
          <button onClick={onBackToHistory} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white uppercase tracking-widest truncate">{activeProject.title}</h3>
            <p className="text-[9px] text-emerald-400 font-black uppercase flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span> 
              {isLoading ? 'Architect Menganalisa Error...' : 'Sistem Audit Aktif'}
            </p>
          </div>
        </div>
        <button onClick={onCreateNew} className="bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>Baru</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar">
        {activeProject.messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
            <div className={`max-w-[92%] md:max-w-[85%] rounded-[32px] px-8 py-7 text-sm shadow-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-tl-none border border-slate-700/50'}`}>
              {msg.content === '' && msg.role === 'model' ? (
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>
                  <p className="text-[11px] text-slate-500 font-bold italic">Mencari akar masalah dan menyusun perbaikan kode utuh...</p>
                </div>
              ) : <MessageRenderer content={msg.content} sources={msg.sources} />}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 md:p-10 bg-slate-900/50 backdrop-blur-2xl border-t border-slate-800">
        <div className="max-w-4xl mx-auto space-y-6">
          {attachedFile && (
            <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-blue-500/30 w-fit animate-slide-in">
              <span className="text-xs text-slate-200 font-bold truncate max-w-[200px]">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-slate-500 hover:text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
          )}
          <div className="flex gap-5 items-end">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,text/*,.js,.ts,.tsx,.py,.html,.css,.json"/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-5 bg-slate-800 text-slate-400 hover:text-blue-500 rounded-3xl transition-all border border-slate-700 active:scale-90 shadow-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
            <textarea rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Tempel kode error atau log di sini..." className="w-full bg-slate-950 border border-slate-800 rounded-[32px] px-8 py-5 text-base focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner text-slate-100 placeholder:text-slate-700" disabled={isLoading}/>
            <button onClick={handleSend} disabled={isLoading || (!input.trim() && !attachedFile)} className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-3xl shadow-xl transition-all active:scale-90 disabled:bg-slate-800">{isLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorChat;
