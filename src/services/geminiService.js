import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) return null;
    return key.trim().replace(/['"]/g, '');
};

const SYSTEM_INSTRUCTION = `
You are "SwiftBot", the AI for SwiftApp (Dublin Transport).
Helpful, professional, English.
Ask for Name, Items, Addresses, Date for quotes.
Encourage using the WhatsApp button for finalization.
`;

export const chatService = {
    async sendMessage(chatHistory, userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) return "API Key Missing. Please check Cloudflare settings.";

        try {
            const genAI = new GoogleGenerativeAI(apiKey);

            // Using 'gemini-1.5-flash' which corresponds to "Gemini Flash Latest" in many regions
            // or 'gemini-1.5-flash-latest' for the explicit pointer.
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash-latest",
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const chat = model.startChat({
                history: chatHistory,
                generationConfig: { maxOutputTokens: 500 },
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error:", error);

            // Fallback to the most basic model name if the latest alias fails
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(SYSTEM_INSTRUCTION + "\n\nUser: " + userMessage);
                const response = await result.response;
                return response.text();
            } catch (innerError) {
                console.error("All models failed:", innerError);
                return `Connection Error: ${innerError.message?.substring(0, 100)}`;
            }
        }
    }
};
