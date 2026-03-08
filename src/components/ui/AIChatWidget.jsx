import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Bot, Loader2, ExternalLink, ClipboardList } from 'lucide-react';
import { chatService } from '../../services/geminiService';
import { Button } from './Button';

export function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', content: "Hello! I am SwiftBot from Swift Transport & Solutions. I can help you with a quick quote for your move or delivery. To get started, may I have your name, please?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showWhatsAppButton, setShowWhatsAppButton] = useState(false);
    const [showFormButton, setShowFormButton] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const history = messages
            .slice(1) // Skip the initial bot greeting
            .map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        let aiResponse = await chatService.sendMessage(history, userMsg);

        // Artificial human-like delay (minimum 1.5s)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 1. Check for Lead Save Tag: [SAVE_LEAD: {...}]
        const leadMatch = aiResponse.match(/\[SAVE_LEAD:\s*({.*?})\]/);
        if (leadMatch) {
            try {
                const leadData = JSON.parse(leadMatch[1]);
                await chatService.saveLead(leadData);
            } catch (err) {
                console.error("Failed to parse lead data:", err);
            }
        }

        // 2. Check for WhatsApp Trigger: [SHOW_WHATSAPP]
        if (aiResponse.includes('[SHOW_WHATSAPP]')) {
            setShowWhatsAppButton(true);
        }

        // 3. Check for Form Trigger: [SHOW_FORM]
        if (aiResponse.includes('[SHOW_FORM]')) {
            setShowFormButton(true);
        }

        // 4. Sanitize Response (Remove tags)
        const cleanedResponse = aiResponse
            .replace(/\[SAVE_LEAD:\s*({.*?})\]/g, '')
            .replace(/\[SHOW_WHATSAPP\]/g, '')
            .replace(/\[SHOW_FORM\]/g, '')
            .trim();

        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'model', content: cleanedResponse || "I'm ready to help! Please let me know how I can assist you further." }]);
    };

    const generateWhatsAppLink = () => {
        const summary = messages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' | ');
        const text = `Hello! I was chatting with SwiftBot from Swift Transport & Solutions. Here is a summary of my request: ${summary}`;
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
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">SwiftBot</h3>
                                <p className="text-[10px] text-red-100 flex items-center gap-1 opacity-80">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    Swift Transport & Solutions
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm transition-all ${msg.role === 'user'
                                    ? 'bg-[#8B0000] text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 p-3 px-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[pulse_1s_infinite_0ms]" />
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[pulse_1s_infinite_200ms]" />
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[pulse_1s_infinite_400ms]" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer / Input */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        {showFormButton && (
                            <a
                                href="/request"
                                target="_blank"
                                rel="noreferrer"
                                className="mb-3 flex items-center justify-center gap-2 w-full py-2.5 bg-[#8B0000] hover:bg-red-900 text-white rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] shadow-md animate-in fade-in zoom-in duration-300"
                            >
                                <ClipboardList size={16} />
                                📋 Fill Out Service Request Form
                            </a>
                        )}
                        {showWhatsAppButton && (
                            <a
                                href={generateWhatsAppLink()}
                                target="_blank"
                                rel="noreferrer"
                                className="mb-3 flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] shadow-md animate-in fade-in zoom-in duration-300"
                            >
                                <ExternalLink size={16} />
                                Talk to a Human on WhatsApp
                            </a>
                        )}
                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Write a message..."
                                className="flex-grow bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#8B0000] outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="bg-[#8B0000] text-white p-2.5 rounded-xl disabled:opacity-50 hover:bg-[#640A15] transition-colors shadow-sm"
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
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-white text-[#8B0000] rotate-90' : 'bg-transparent'
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
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-bounce shadow-sm">
                        1
                    </span>
                )}
            </button>
        </div>
    );
}
