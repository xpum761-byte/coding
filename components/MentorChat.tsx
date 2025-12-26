
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatProject } from '../types';
import { getGeminiMentorStream, FilePart } from '../services/geminiService';

interface MentorChatProps {
  activeProject: ChatProject;
  onUpdateProject: (projectId: string, messages: ChatMessage[]) => void;
  onBackToHistory: () => void;
  onCreateNew: () => void;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    alert('Kode disalin!');
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/50 text-[10px] font-bold text-slate-400 border-b border-slate-800">
        <span className="uppercase tracking-widest">{language || 'code'}</span>
        <button onClick={handleCopy} className="hover:text-white transition-colors">COPY</button>
      </div>
      <div className="p-3 overflow-x-auto">
        <pre className="code-font text-xs text-blue-100"><code>{code.trim()}</code></pre>
      </div>
    </div>
  );
};

const MessageRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2.5">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          return <CodeBlock key={index} code={match?.[2] || ''} language={match?.[1] || 'code'} />;
        }
        return <p key={index} className="whitespace-pre-wrap leading-relaxed text-[13px]">{part}</p>;
      })}
    </div>
  );
};

interface AttachedFile {
  name: string;
  data: string; // base64 for images
  mimeType: string;
  isText: boolean;
  content?: string; // string content for text files
}

const MentorChat: React.FC<MentorChatProps> = ({ activeProject, onUpdateProject, onBackToHistory, onCreateNew }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeProject.messages, isLoading, streamingText]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.css') || file.name.endsWith('.html');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setAttachedFile({ name: file.name, data: base64, mimeType: file.type, isText: false });
      };
      reader.readAsDataURL(file);
    } else if (isText) {
      const text = await file.text();
      setAttachedFile({ name: file.name, data: '', mimeType: file.type, isText: true, content: text });
    } else {
      alert("Tipe file tidak didukung (Gunakan Gambar atau File Teks/Code)");
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;

    let finalContent = input.trim();
    let filePart: FilePart | undefined;

    if (attachedFile) {
      if (attachedFile.isText) {
        finalContent += `\n\n[Menganalisis File: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
      } else {
        filePart = { inlineData: { data: attachedFile.data, mimeType: attachedFile.mimeType } };
        if (!finalContent) finalContent = `Analisis gambar ini: ${attachedFile.name}`;
      }
    }

    const userMsg: ChatMessage = { role: 'user', content: finalContent, timestamp: Date.now() };
    const updatedMessages = [...activeProject.messages, userMsg];
    
    onUpdateProject(activeProject.id, updatedMessages);
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);
    setStreamingText('');

    try {
      await getGeminiMentorStream(
        updatedMessages, 
        (chunk) => setStreamingText(p => p + chunk), 
        (fullText) => {
          onUpdateProject(activeProject.id, [...updatedMessages, { role: 'model', content: fullText, timestamp: Date.now() }]);
          setStreamingText('');
          setIsLoading(false);
        },
        filePart
      );
    } catch (err) {
      setIsLoading(false);
      setStreamingText("Maaf, terjadi gangguan koneksi.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <header className="flex-none p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBackToHistory} className="p-2 text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h3 className="text-xs font-bold text-white truncate max-w-[140px]">{activeProject.title}</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Mentor Aktif</span>
            </div>
          </div>
        </div>
        <button onClick={onCreateNew} className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors active:scale-95">Baru</button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#020617_100%)]">
        {activeProject.messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass text-slate-100 rounded-tl-none'}`}>
              <MessageRenderer content={msg.content} />
            </div>
          </div>
        ))}
        {(isLoading || streamingText) && (
          <div className="flex justify-start animate-in">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 glass text-slate-100 rounded-tl-none">
              {streamingText ? <MessageRenderer content={streamingText} /> : (
                <div className="flex gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-none p-3 bg-slate-900 border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto space-y-2">
          {attachedFile && (
            <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg border border-slate-700 animate-in">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="bg-blue-600/20 p-1.5 rounded text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span className="text-[11px] text-slate-300 truncate">{attachedFile.name}</span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="p-1 hover:text-rose-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-end">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,text/*,.js,.ts,.tsx,.html,.css,.json,.py"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all active:scale-90"
              title="Upload File"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            
            <textarea
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Tulis pesan atau tempel kode..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-[13px] focus:outline-none focus:border-blue-500/50 transition-all resize-none text-slate-200 placeholder:text-slate-600"
            />
            
            <button 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !attachedFile)} 
              className={`p-3.5 rounded-xl shadow-lg transition-all active:scale-90 ${isLoading || (!input.trim() && !attachedFile) ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorChat;
