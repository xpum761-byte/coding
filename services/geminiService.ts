
import { GoogleGenAI } from "@google/genai";
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

export const getGeminiMentorStream = async (
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string, sources?: any[]) => void,
  filePart?: FilePart
): Promise<void> => {
  try {
    // Mengambil API Key dari environment variable
    let apiKey = '';
    
    try {
      apiKey = process.env.API_KEY || '';
    } catch (e) {
      console.warn("Process.env tidak dapat diakses langsung.");
    }

    if (!apiKey) {
      const errorMsg = `[ERROR] API Key tidak ditemukan. 
      
Jika Anda di Vercel:
1. Pastikan sudah menambah variabel 'API_KEY' di Settings > Environment Variables.
2. Anda WAJIB melakukan 'Redeploy' setelah menambah variabel tersebut.
3. Pastikan tidak ada spasi di awal/akhir kunci.`;
      
      onComplete(errorMsg);
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
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

    if (filePart && contents.length > 0) {
      const lastUserMsg = [...contents].reverse().find(c => c.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push(filePart as any);
      }
    }

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
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

/**
 * SYSTEM INSTRUCTION DIPERINGKAS
 * (WAJIB untuk hemat token)
 */
const SYSTEM_INSTRUCTION = `
Anda adalah Senior Software Engineer.
Tugas Anda:
1. Analisa bug & error kode secara teknis
2. Jelaskan akar masalah
3. Berikan solusi yang BENAR dan AMAN

Jawaban harus teknis, ringkas, dan presisi.
Jangan menambahkan basa-basi.
`;

export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * BATASI HISTORY (ANTI JEBOL TOKEN)
 */
const MAX_HISTORY = 4;

/**
 * STREAMING GEMINI YANG AMAN KUOTA
 */
export const getGeminiMentorStream = async (
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  filePart?: FilePart,
  retryCount = 0
): Promise<void> => {

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 30_000; // 30 detik

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.API_KEY!,
    });

    /**
     * TRIM HISTORY
     */
    const contents = history
      .slice(-MAX_HISTORY)
      .map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

    /**
     * FILE HANYA DITEMPEL KE PESAN USER TERAKHIR
     */
    if (filePart && contents.length > 0) {
      const last = contents[contents.length - 1];
      if (last.role === "user") {
        last.parts.push(filePart as any);
      }
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    });

    let fullText = "";

    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(chunk.text);
      }
    }

    onComplete(fullText);

  } catch (err: any) {
    /**
     * HANDLE 429 QUOTA
     */
    if (
      (err.message?.includes("429") || err.message?.includes("quota")) &&
      retryCount < MAX_RETRIES
    ) {
      onChunk(`\n[SISTEM] Kuota penuh. Retry ${retryCount + 1}/${MAX_RETRIES}...\n`);
      await sleep(RETRY_DELAY);
      return getGeminiMentorStream(
        history,
        onChunk,
        onComplete,
        filePart,
        retryCount + 1
      );
    }

    console.error("Gemini Error:", err);
    onChunk("\n[ERROR] Analisa gagal (quota / API error)");
    onComplete("ERROR");
  }
};
