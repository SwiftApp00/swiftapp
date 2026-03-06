import { supabase } from './supabaseClient';

const getApiKey = () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) return null;
    return key.trim().replace(/['"]/g, '');
};

const SYSTEM_INSTRUCTION = `
You are "SwiftBot", the AI assistant for "Swift Transport & Solutions" (Dublin's premier transport service).
TONE: Professional, helpful, concise, English only.

GOAL: Qualify leads for removals or deliveries by capturing:
1. Name
2. List of Items (What is being moved?)
3. Pickup Address
4. Delivery Address
5. Preferred Date

CRITICAL RULES:
- Ask only ONE question at a time.
- Identify yourself as SwiftBot from "Swift Transport & Solutions".
- If the user asks to speak to a human or asks something you don't know, append "[SHOW_WHATSAPP]" to your message.
- Once (and only once) you have ALL 5 pieces of information, append a hidden lead tag at the very end of your message in exactly this format:
[SAVE_LEAD: {"name": "...", "items_to_move": "...", "pickup_address": "...", "delivery_address": "...", "preferred_date": "YYYY-MM-DD"}]
- Also append "[SHOW_WHATSAPP]" after the lead tag to let them finalize.
`;

export const chatService = {
    async saveLead(leadData) {
        try {
            const { error } = await supabase
                .from('leads')
                .insert([
                    {
                        name: leadData.name,
                        items_to_move: leadData.items_to_move,
                        pickup_address: leadData.pickup_address,
                        delivery_address: leadData.delivery_address,
                        preferred_date: leadData.preferred_date || null,
                        status: 'new'
                    }
                ]);
            if (error) throw error;
            console.log("Lead saved successfully to CRM");
            return true;
        } catch (error) {
            console.error("Error saving lead to CRM:", error);
            return false;
        }
    },

    async sendMessage(chatHistory, userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) return "API Key Missing. Please check Cloudflare settings.";

        // Verified available models based on user account list
        const strategies = [
            { ver: 'v1beta', mod: 'gemini-2.5-flash' },       // Newest Flash
            { ver: 'v1beta', mod: 'gemini-2.0-flash-lite' },  // Lite version (better quota usually)
            { ver: 'v1beta', mod: 'gemini-3-flash-preview' }, // Preview 3.0
            { ver: 'v1beta', mod: 'gemini-flash-latest' },    // Latest generic
            { ver: 'v1beta', mod: 'gemini-2.0-flash' }        // Fallback (returning 429 currently)
        ];

        for (const strategy of strategies) {
            try {
                const url = `https://generativelanguage.googleapis.com/${strategy.ver}/models/${strategy.mod}:generateContent?key=${apiKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: SYSTEM_INSTRUCTION + "\n\nUser Message: " + userMessage }]
                            }
                        ],
                        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    if (response.status === 429) {
                        console.warn(`Quota exceeded for ${strategy.mod}, trying next...`);
                        continue;
                    }
                    console.warn(`Gemini strategy ${strategy.ver}/${strategy.mod} failed:`, errData.error?.message);
                    continue;
                }

                const data = await response.json();
                const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (aiText) return aiText;
            } catch (e) {
                console.error(`Gemini connection error (${strategy.mod}):`, e);
            }
        }

        return "SwiftBot is experiencing high demand! ☕ Our AI service is currently at capacity (Error 429). Please try again in 30 seconds or click the button below to talk with us directly on WhatsApp!";
    }
};