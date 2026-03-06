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
            // Using RAW FETCH to the V1 Stable endpoint to bypass any SDK 404 issues
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: SYSTEM_INSTRUCTION + "\n\nUser Question: " + userMessage }]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 500,
                        temperature: 0.7,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini Raw API Error Response:", errorData);
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiText) throw new Error("Response was empty or blocked by safety filters.");

            return aiText;
        } catch (error) {
            console.error("Gemini Raw API Error:", error);

            // Final fallback: try Gemini Pro name if Flash is strictly not available
            if (error.message.includes("404") || error.message.includes("not found")) {
                return "Error 404: The model could not be found. Please check if your API Key supports 'gemini-1.5-flash' in Google AI Studio or try creating a new Key.";
            }

            return `Connection Error: ${error.message.substring(0, 100)}`;
        }
    }
};
