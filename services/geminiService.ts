import { GoogleGenAI } from "@google/genai";

export const generateCreativeTitle = async (apiKey: string, brandContext: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a marketing expert for a clothing brand. 
        The user wants a short, punchy, viral TikTok overlay text (maximum 5-6 words).
        Context/Vibe: ${brandContext || "Trendy streetwear, new collection drop"}.
        Output ONLY the text, nothing else. No quotes.`,
    });
    
    return response.text?.trim() ?? '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};