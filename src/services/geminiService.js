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

        // Strategies to try based on the user's specific AI Studio list (Gemini 3.x/2.x)
        const strategies = [
            { ver: 'v1beta', mod: 'gemini-2.0-flash' },
            { ver: 'v1beta', mod: 'gemini-2.0-flash-lite-preview-02-05' },
            { ver: 'v1beta', mod: 'gemini-3-flash-preview' },
            { ver: 'v1beta', mod: 'gemini-3.1-flash-lite-preview' },
            { ver: 'v1beta', mod: 'gemini-1.5-flash' },
            { ver: 'v1', mod: 'gemini-1.5-flash' }
        ];

        for (const strategy of strategies) {
            try {
                const url = `https://generativelanguage.googleapis.com/${strategy.ver}/models/${strategy.mod}:generateContent?key=${apiKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: SYSTEM_INSTRUCTION + "\n\nUser Message: " + userMessage }]
                            }
                        ],
                        generationConfig: {
                            maxOutputTokens: 500,
                            temperature: 0.7,
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (aiText) return aiText;
                }

                const errData = await response.json().catch(() => ({}));
                console.warn(`Gemini strategy ${strategy.ver}/${strategy.mod} failed:`, errData.error?.message);
            } catch (e) {
                console.error(`Gemini connection error (${strategy.mod}):`, e);
            }
        }

        return "I'm sorry, I'm having trouble connecting to my service right now. Please verify if your API Key is active in Google AI Studio or click the button below to talk with us directly on WhatsApp!";
    }
};