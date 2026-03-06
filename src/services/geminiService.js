import { GoogleGenerativeAI } from "@google/generative-ai";

// We use a function to get the API Key to ensure we handle cases where 
// env variables might be loaded after the module evaluation (though rare in Vite)
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

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

Stay in English.
`;

export const chatService = {
    async sendMessage(chatHistory, userMessage) {
        const apiKey = getApiKey();

        if (!apiKey || apiKey === 'undefined' || apiKey === '') {
            console.error("VITE_GEMINI_API_KEY is missing or undefined. Check your .env file or Cloudflare Environment Variables.");
            return "Configuration Error: API Key is missing. If you are in production, make sure to add VITE_GEMINI_API_KEY to your Cloudflare/Vercel environment variables.";
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
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
            const text = response.text();

            if (!text) throw new Error("Empty response from Gemini API");

            return text;
        } catch (error) {
            console.error("DETAILED Gemini API Error:", error);

            // Provide more specific feedback if possible
            if (error.message?.includes('API_KEY_INVALID')) {
                return "Error: The provided API Key is invalid. Please check your Google AI Studio key.";
            }
            if (error.message?.includes('429')) {
                return "Error: Quota exceeded or too many requests. Please try again in secondary.";
            }

            return "I'm sorry, I'm having a little trouble connecting to my brain right now. Please try again or click the button below to talk directly with us on WhatsApp!";
        }
    }
};
