
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
Anda adalah "Bisa Coding Senior Architect", pakar debugging dan arsitektur perangkat lunak modern. Anda memiliki kapabilitas "Ultra Long-Context" yang mampu membaca ribuan baris kode sekaligus.

TUGAS UTAMA:
1. DETEKSI ERROR FILE BESAR: Analisis setiap baris secara presisi. Identifikasi bug logis, efisiensi memori, dan praktik keamanan.
2. FULL-CODE RESTORATION: Berikan KODE LENGKAP untuk seluruh file. JANGAN memotong kode.
3. AKAR MASALAH (ROOT CAUSE): Jelaskan dampak teknis secara mendalam.
4. PERFORMA TINGGI: Berikan respons akurat secepat mungkin.

FORMAT OUTPUT:
- Gunakan blok kode Markdown dengan nama file di baris pertama.
- Berikan analisis teknis tanpa basa-basi pembuka.
`;

export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getGeminiMentorStream = async (
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string, sources?: any[]) => void,
  filePart?: FilePart,
  retryCount = 0
): Promise<void> => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000; // 2 detik awal

  try {
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
        temperature: 0.1,
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
    // Tangani Limit Kuota (Error 429)
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        onChunk(`\n\n[SISTEM]: Kuota penuh. Mencoba kembali dalam ${delay/1000} detik...`);
        await sleep(delay);
        return getGeminiMentorStream(history, onChunk, onComplete, filePart, retryCount + 1);
      }
      
      const quotaError = "\n\n[LIMIT KUOTA TERLAMPAU]: Anda telah mencapai batas permintaan API gratis dari Google. \n\nSOLUSI:\n1. Tunggu 1-2 menit hingga kuota di-reset otomatis.\n2. Pastikan file yang diunggah tidak terlalu banyak dalam waktu singkat.\n3. Jika Anda menggunakan Vercel, pastikan API_KEY Anda valid dan memiliki sisa kuota.";
      onChunk(quotaError);
      onComplete(quotaError);
      return;
    }

    console.error("Gemini Critical Error:", error);
    const errorMessage = `Sistem Audit Gagal: ${error.message}`;
    onChunk(`\n\n[ERROR]: ${errorMessage}`);
    onComplete(errorMessage);
  }
};
