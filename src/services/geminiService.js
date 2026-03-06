import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Você é o "SwiftBot", o assistente de IA da SwiftApp, uma empresa de transporte e mudanças em Dublin, Irlanda.
Seu objetivo é ser prestativo, profissional e amigável.

SERVIÇOS:
- Mudanças residenciais e comerciais (Home & Office Moves)
- Coleta em lojas (IKEA, Harvey Norman, etc.)
- Coleta de encomendas e móveis
- Transporte de eletrodomésticos (Appliance Transport)
- Descarte de itens e resíduos (Waste Disposal)

CONTEXTO:
- Baseado em Dublin, servindo Dublin e áreas próximas.
- Conhecido por ser rápido, confiável e acessível.

PASSOS DA CONVERSA:
1. Cumprimente o usuário calorosamente e pergunte como pode ajudar com a mudança ou transporte.
2. Se precisarem de um orçamento, peça gentilmente:
   - Nome dele(a)
   - Quais itens precisam ser movidos
   - Endereços de coleta e entrega
   - Data de preferência
3. Assim que tiver a maioria das informações, ou se o usuário pedir um humano, forneça um resumo do pedido e encoraje-o a clicar no botão "Falar com Atendente" para finalizar o orçamento no WhatsApp.

TOM DE VOZ:
- Conciso, mas útil.
- Familiarizado com Dublin/Irlanda.
- Profissional e acessível.

Responda sempre em Português, a menos que o usuário fale em Inglês.
Se o usuário perguntar algo não relacionado a transporte, redirecione-o educadamente para os serviços da SwiftApp.
`;

export const chatService = {
    async sendMessage(chatHistory, userMessage) {
        if (!API_KEY) {
            console.error("VITE_GEMINI_API_KEY não encontrada no arquivo .env");
            return "Desculpe, estou com uma falha de configuração técnica (chave API ausente). Por favor, entre em contato direto pelo WhatsApp.";
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
            console.error("Erro na API do Gemini:", error);
            return "Desculpa, estou tendo um pouco de dificuldade para me conectar agora. Você poderia tentar novamente ou entrar em contato diretamente conosco pelo WhatsApp?";
        }
    }
};
