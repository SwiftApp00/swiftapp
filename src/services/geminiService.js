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

            // Primary attempt: using 'gemini-pro' (Gemini 1.0) which is the most compatible globally
            const model = genAI.getGenerativeModel({
                model: "gemini-pro",
            });

            const chat = model.startChat({
                history: chatHistory,
                generationConfig: { maxOutputTokens: 500 },
            });

            // For gemini-pro (v1), we sometimes need to prepend instructions if using startChat
            // but let's try the standard way first.
            const result = await chat.sendMessage(SYSTEM_INSTRUCTION + "\n\nUser Message: " + userMessage);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error (Primary Failed):", error);

            // Fallback: Use the exact 'gemini-1.5-flash' but with simpler call
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(SYSTEM_INSTRUCTION + "\n\n" + userMessage);
                const response = await result.response;
                return response.text();
            } catch (innerError) {
                console.error("All models failed again:", innerError);
                return `Error context: ${innerError.message?.includes('404') ? 'Model not found for this API Key. Please check if your Google project has the Generative Language API enabled.' : innerError.message}`;
            }
        }
    }
};
