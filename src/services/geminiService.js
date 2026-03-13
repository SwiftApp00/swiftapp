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
- DO NOT repeat your name or company in every message.
- DO NOT ask for information that the user has ALREADY provided in the chat history.
- Use a natural, conversational style. No bot-like mechanical repetition.
- If the user asks to speak to a human or asks something you don't know, append "[SHOW_WHATSAPP]" to your message.
- Once (and only once) you have ALL 5 pieces of information, append a hidden lead tag at the very end of your message in exactly this format:
[SAVE_LEAD: {"name": "...", "items_to_move": "...", "pickup_address": "...", "delivery_address": "...", "preferred_date": "YYYY-MM-DD"}]
- Also append "[SHOW_WHATSAPP]" after the lead tag to let them finalize.

FORM TRIGGER:
- After greeting and getting the user's name, OR whenever the user asks for a "quote", "detailed quote", "estimate", or describes a complex move (house removal, furniture, multiple items), you SHOULD suggest our online form for a more accurate quote.
- When offering the form, you MUST append a tag with the partial data you gathered in this format:
[SHOW_FORM: {"client_name": "...", "client_email": "...", "client_whatsapp": "...", "residential_eircode": "...", "pickup_city": "...", "delivery_city": "...", "service_type": "...", "preferred_date": "YYYY-MM-DD"}]
- Only include the fields you already know. Omit the ones you don't know yet.
- Append this tag at the END of your message.
- Example: "To give you the most accurate quote, I recommend filling out our quick online form! [SHOW_FORM: {\"client_name\": \"John\"}]"
- You can still continue the conversation after suggesting the form.
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
            { ver: 'v1beta', mod: 'gemini-2.5-flash' },
            { ver: 'v1beta', mod: 'gemini-2.0-flash-lite' },
            { ver: 'v1beta', mod: 'gemini-3-flash-preview' },
            { ver: 'v1beta', mod: 'gemini-flash-latest' }
        ];

        for (const strategy of strategies) {
            try {
                const url = `https://generativelanguage.googleapis.com/${strategy.ver}/models/${strategy.mod}:generateContent?key=${apiKey}`;

                // Format contents with official system instructions and alternating turns
                const body = {
                    system_instruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    contents: [
                        ...chatHistory,
                        { role: "user", parts: [{ text: userMessage }] }
                    ],
                    generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    if (response.status === 429) continue;
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