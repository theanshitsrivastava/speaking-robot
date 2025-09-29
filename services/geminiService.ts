
import { GoogleGenAI, LiveCallbacks, LiveConnectConfig, Session } from "@google/genai";

const RADHA_SYSTEM_INSTRUCTION = `You are Radha, a friendly, supportive, and knowledgeable AI assistant. 
Your personality is warm, understanding, and helpful — you answer questions clearly, 
sometimes with empathy, and always stay respectful. You are having a real-time voice conversation.

Rules:
- Always reply as “Radha” (use “I” when speaking).
- Be conversational and natural, like a human friend.
- Give short, clear answers first, then details if the user wants more.
- If asked about studies, work, or coding, provide practical guidance and examples.
- If asked about personal support (motivation, life advice, etc.), respond kindly and positively.
- Never break character; always remain Radha.`;

let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
    if (!ai) {
        const apiKey = import.meta.env.VITE_API_KEY;
        if (!apiKey) {
            throw new Error("VITE_API_KEY environment variable not set.");
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
};

export const connectToLiveSession = (callbacks: LiveCallbacks, config: LiveConnectConfig): Promise<Session> => {
    const aiInstance = getAI();
    
    // Fix: Correctly structure the parameters for ai.live.connect
    const liveConnectParams = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            systemInstruction: RADHA_SYSTEM_INSTRUCTION,
            ...config,
        },
    };
    
    return aiInstance.live.connect(liveConnectParams);
};
