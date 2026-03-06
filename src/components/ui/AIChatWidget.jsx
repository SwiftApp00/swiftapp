import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Bot, Loader2, ExternalLink } from 'lucide-react';
import { chatService } from '../../services/geminiService';
import { Button } from './Button';

export function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', content: "Olá! Sou o SwiftBot. Precisa de ajuda com uma mudança ou transporte em Dublin? Posso te ajudar com um orçamento rápido!" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showWhatsAppButton, setShowWhatsAppButton] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            if (messages.length > 4) setShowWhatsAppButton(true);
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const history = messages.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const aiResponse = await chatService.sendMessage(history, userMsg);

        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);

        if (messages.length > 3 || aiResponse.toLowerCase().includes('orçamento') || aiResponse.toLowerCase().includes('humano') || aiResponse.toLowerCase().includes('atendente')) {
            setShowWhatsAppButton(true);
        }
    };

    const generateWhatsAppLink = () => {
        const summary = messages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' | ');
        const text = `Olá! Estava conversando com seu assistente de IA. Aqui está um resumo do meu pedido: ${summary}`;
        return `https://wa.me/353833758839?text=${encodeURIComponent(text)}`;
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 text-left">
                    {/* Header */}
                    <div className="bg-[#8B0000] p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold">SwiftBot</h3>
                                <p className="text-xs text-red-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    Online | Assistente IA
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                                        ? 'bg-[#8B0000] text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-[#8B0000]" />
                                    <span className="text-xs text-gray-500">SwiftBot está pensando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer / Input */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        {showWhatsAppButton && (
                            <a
                                href={generateWhatsAppLink()}
                                target="_blank"
                                rel="noreferrer"
                                className="mb-3 flex items-center justify-center gap-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] shadow-md"
                            >
                                <ExternalLink size={16} />
                                Falar com Atendente no WhatsApp
                            </a>
                        )}
                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="flex-grow bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#8B0000] outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="bg-[#8B0000] text-white p-2 rounded-xl disabled:opacity-50 hover:bg-[#640A15] transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-white text-[#8B0000] rotate-90' : 'bg-[#8B0000]'
                    }`}
            >
                {isOpen ? (
                    <X size={32} />
                ) : (
                    <img
                        src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/icone_whatsapp.png"
                        alt="WhatsApp"
                        className="w-16 h-16 drop-shadow-2xl"
                    />
                )}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
                        1
                    </span>
                )}
            </button>
        </div>
    );
}
