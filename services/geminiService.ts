
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `Anda adalah "Bisa Coding Mentor". 
Jawablah pertanyaan coding dengan Bahasa Indonesia yang santai, jelas, dan selalu berikan contoh kode lengkap. 
Gunakan markdown untuk format jawaban.`;

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
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key tidak ditemukan. Silakan konfigurasi API Key Anda.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Pastikan percakapan dimulai dari 'user' (Syarat mutlak API Gemini)
    const rawContents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const firstUserIndex = rawContents.findIndex(c => c.role === 'user');
    if (firstUserIndex === -1) {
      onComplete("[ERROR] Belum ada pesan dari Anda.");
      return;
    }

    const contents = rawContents.slice(firstUserIndex);

    // Sisipkan file ke pesan user terakhir jika ada
    if (filePart && contents.length > 0) {
      const lastUserMsg = [...contents].reverse().find(c => c.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push(filePart as any);
      }
    }

    // Menggunakan gemini-3-flash-preview untuk respon yang jauh lebih cepat
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
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

    if (!fullText) {
      throw new Error("AI memberikan respon kosong.");
    }

    onComplete(fullText, finalSources);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    const errorMsg = error.message || "Koneksi ke AI gagal.";
    onComplete(`[ERROR] Maaf, saya sedang tidak bisa menjawab. ${errorMsg}`);
  }
};
