
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
Anda adalah "Bisa Coding Senior Architect", pakar debugging dan arsitektur perangkat lunak modern. Anda memiliki kapabilitas "Ultra Long-Context" yang mampu membaca ribuan baris kode sekaligus.

TUGAS UTAMA:
1. DETEKSI ERROR FILE BESAR: User akan memberikan file kode yang mungkin sangat panjang. Analisis setiap baris secara presisi. Identifikasi bug logis, efisiensi memori, dan praktik keamanan.
2. FULL-CODE RESTORATION: Jika Anda menyarankan perbaikan, Anda WAJIB memberikan KODE LENGKAP untuk seluruh file tersebut. JANGAN memotong kode dengan "...". User harus bisa menyalin blok kode Anda dan langsung melakukan overwrite pada file mereka.
3. AKAR MASALAH (ROOT CAUSE): Jelaskan mengapa error terjadi secara teknis namun mudah dimengerti. Sertakan dampak jangka panjang jika tidak diperbaiki.
4. PERFORMA TINGGI: Gunakan Gemini 3 Flash untuk memberikan respons secepat kilat tanpa mengurangi akurasi arsitektur.

FORMAT OUTPUT:
- Gunakan blok kode Markdown yang mencantumkan nama file di baris pertama blok tersebut.
- Jika ada banyak file yang terdampak, tampilkan semuanya secara utuh.
- Langsung berikan analisis teknis tanpa basa-basi pembuka.
`;

export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export const getGeminiMentorStream = async (
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string, sources?: any[]) => void,
  filePart?: FilePart
): Promise<void> => {
  try {
    // API KEY diambil secara eksklusif dari environment variable (Vercel/Cloud)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (filePart && contents.length > 0) {
      const lastMessage = contents[contents.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.parts.push(filePart as any);
      }
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // Konsistensi maksimal untuk kode engineering
        thinkingConfig: { thinkingBudget: 4000 },
        tools: [{ googleSearch: {} }]
      },
    });

    let fullText = "";
    let finalSources: any[] = [];

    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
      
      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        finalSources = chunk.candidates[0].groundingMetadata.groundingChunks;
      }
    }

    onComplete(fullText, finalSources);
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    const errorMessage = `Sistem Audit Gagal: ${error.message}`;
    onChunk(`\n\n[CRITICAL]: ${errorMessage}. Pastikan API_KEY sudah dikonfigurasi di environment variables.`);
    onComplete(errorMessage);
  }
};
