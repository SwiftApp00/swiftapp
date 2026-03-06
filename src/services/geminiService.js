import { GoogleGenerativeAI } from "@google/generative-ai";

// We use a function to get and sanitize the API Key
const getApiKey = () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) return null;
    return key.trim().replace(/['"]/g, ''); // Remove accidental quotes or spaces
};

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

        if (!apiKey) {
            console.error("VITE_GEMINI_API_KEY is missing. Check .env or Cloudflare Settings.");
            return "Configuration Error: API Key is missing. Please add VITE_GEMINI_API_KEY to your environment variables.";
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);

            // Try initialization without systemInstruction if first attempt fails, 
            // but let's first fix the model name to be the most compatible one.
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
            });

            // We can prepend the system instruction to the first message if needed, 
            // but keeping it in the config is better. Let's try again with config first.
            const modelWithInstruction = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const chat = modelWithInstruction.startChat({
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

            // If it's a 404 for gemini-1.5-flash, let's try gemini-pro as a fallback
            if (error.message?.includes('404') || error.message?.includes('not found')) {
                try {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
                    const chat = fallbackModel.startChat({ history: chatHistory });
                    const result = await chat.sendMessage("System: " + SYSTEM_INSTRUCTION + "\n\nUser: " + userMessage);
                    const response = await result.response;
                    return response.text();
                } catch (fallbackError) {
                    console.error("Fallback Model also failed:", fallbackError);
                    return "Connecting Error: The AI model 'gemini-1.5-flash' returned a 404 and fallback also failed. Please check if your API Key has access to Gemini 1.5 models in Google AI Studio.";
                }
            }

            return `I'm sorry, I'm having a little trouble connecting. error: ${error.message?.substring(0, 50)}...`;
        }
    }
};
