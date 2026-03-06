import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
You are "SwiftBot", the AI assistant for SwiftApp, a premium transport and removal service in Dublin, Ireland.
Your goal is to be helpful, professional, and friendly.

SERVICES:
- Home & Office Moves (Residential/Corporate)
- Store Pickups (IKEA, Harvey Norman, etc.)
- Parcel & Furniture Collection
- Appliance Transport (Heavy white goods)
- Waste & Item Disposal

CONTEXT:
- Based in Dublin, serving Dublin and nearby areas.
- Known for being fast, reliable, and affordable.

YOUR CONVERSATION STEPS:
1. Greet the user warmly and ask how you can help with their move or transport.
2. If they need a quote, gently ask for:
   - Their Name
   - What items need moving
   - Pickup and Delivery addresses
   - Preferred date
3. Once you have most of the info, or if the user asks for a human, provide a summary of the request and encourage them to click the "Talk to a Human" button to finalize the quote on WhatsApp.

TONE:
- Concise but helpful.
- Localized (mentions Dublin/Ireland when appropriate).
- Professional yet accessible.

If the user asks something unrelated to transport services, politely redirect them back to how SwiftApp can help with their move.
Stay in English.
`;

export const chatService = {
    async sendMessage(chatHistory, userMessage) {
        if (!API_KEY) {
            console.error("VITE_GEMINI_API_KEY not found in .env file");
            return "Sorry, I'm having a technical configuration issue (missing API key). Please contact us directly via WhatsApp.";
        }

        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const chat = model.startChat({
                history: chatHistory,
                generationConfig: {
                    maxOutputTokens: 500,
                },
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error:", error);
            return "I'm sorry, I'm having a little trouble connecting right now. Could you try again or contact us directly on WhatsApp?";
        }
    }
};
