
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
Anda adalah "Bisa Coding Senior Architect", pakar debugging dan arsitektur perangkat lunak modern.

TUGAS UTAMA:
1. DETEKSI ERROR: Jika user memberikan file kode atau log error, analisa secara mendalam. Identifikasi letak kesalahan logika, sintaks, atau arsitektur.
2. FULL-CODE REPLACEMENT: Jika Anda menemukan error, Anda WAJIB memberikan KODE LENGKAP untuk file tersebut. Jangan memberikan potongan kecil. User harus bisa langsung menyalin seluruh blok kode Anda untuk menggantikan file mereka yang rusak.
3. PENJELASAN AKURAT: Jelaskan "Root Cause" (akar masalah) dengan terminologi teknis yang tepat namun mudah dimengerti.
4. PERFORMA: Berikan jawaban yang padat, akurat, dan sangat cepat menggunakan Gemini 3 Flash.

ATURAN OUTPUT:
- Gunakan blok kode Markdown yang mencantumkan nama file di atasnya.
- Jika ada lebih dari satu file yang terdampak, berikan semua file tersebut secara utuh.
- Matikan basa-basi seperti "Tentu, saya akan membantu". Langsung ke inti analisis.
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
        temperature: 0.1, // Sangat rendah untuk akurasi kode maksimal
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
    console.error("Gemini Error:", error);
    const errorMessage = `Gagal melakukan audit kode: ${error.message}`;
    onChunk(`\n\n[CRITICAL ERROR]: ${errorMessage}`);
    onComplete(`[CRITICAL ERROR]: ${errorMessage}`);
  }
};
