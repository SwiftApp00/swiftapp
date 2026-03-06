import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Truck,
    Home,
    Store,
    Package,
    WashingMachine,
    Trash2,
    MessageCircle,
    CheckCircle2
} from 'lucide-react';

const services = [
    { icon: Home, title: 'Home & Office Moves', desc: 'Stress-free residential and corporate relocation.' },
    { icon: Store, title: 'Store Pickups', desc: 'Bought something big? We pick it up and deliver it safely.' },
    { icon: Package, title: 'Parcel & Furniture Collection', desc: 'Secure transport for your valuable items.' },
    { icon: WashingMachine, title: 'Appliance Transport', desc: 'Careful handling of heavy white goods.' },
    { icon: Trash2, title: 'Waste & Item Disposal', desc: 'Responsible disposal and clearance services.' }
];

export function Landing() {
    const [showWhatsApp, setShowWhatsApp] = useState(false);
    const [form, setForm] = useState({
        name: '', phone: '', email: '', items_to_move: '', pickup_address: '', delivery_address: '', preferred_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWhatsApp(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.id]: e.target.value });
    };

    const handleQuoteSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: sbError } = await supabase
                .from('leads')
                .insert([form]);

            if (sbError) throw sbError;

            setSuccess(true);
            setForm({ name: '', phone: '', email: '', items_to_move: '', pickup_address: '', delivery_address: '', preferred_date: '' });
            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            console.error(err);
            setError('Failed to send quote request. Please try again or contact us via WhatsApp.');
        } finally {
            setLoading(false);
        }
    };

    const whatsappLink = `https://wa.me/353833758839?text=${encodeURIComponent("Hello, I would like to request a transport quote.")}`;

    return (
        <div className="min-h-screen flex flex-col pt-20">
            <Navbar />

            <main className="flex-grow">
                {/* HERO SECTION */}
                <section className="relative text-white py-24 md:py-32 overflow-hidden">
                    {/* Mobile Background */}
                    <div className="absolute inset-0 bg-[url('https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/hero_mobile.png')] bg-cover bg-center bg-fixed md:hidden" />

                    {/* Desktop Background */}
                    <div className="absolute inset-0 hidden md:block bg-[url('https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/ChatGPT%20Image%206%20de%20mar.%20de%202026,%2000_24_13.png')] bg-cover bg-center bg-fixed" />

                    {/* Dark overlay for text readability on both versions */}
                    <div className="absolute inset-0 bg-black/60 md:bg-black/50" />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-2xl [text-shadow:_0_4px_16px_rgb(0_0_0_/_80%)]">
                            Serving Dublin and <br className="hidden md:block" /> Nearby Areas
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto mb-10 drop-shadow-lg [text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]">
                            Fast, reliable and affordable transport solutions for your every need.
                        </p>
                        <a href="#quote" className="inline-block">
                            <Button size="lg" className="relative overflow-hidden bg-[#8B0000] text-white hover:bg-[#640A15] border border-red-500/30 text-xl px-12 py-5 shadow-[0_0_30px_rgba(139,0,0,0.5)] hover:shadow-[0_0_45px_rgba(139,0,0,0.8)] transition-all duration-300 transform hover:-translate-y-1 group">
                                <span className="relative z-10 font-bold uppercase tracking-wider">Get a Quote Now</span>
                                <div className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine pointer-events-none" />
                            </Button>
                        </a>
                    </div>
                </section>

                {/* SERVICES SECTION */}
                <section id="services" className="py-20 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
                            <div className="w-20 h-1 bg-[#8B0000] mx-auto rounded-full mb-6" />
                            <p className="text-lg text-gray-600">
                                We handle everything from single item pickups to full house moves with professionalism and care.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
                            {services.map((Service, idx) => (
                                <Card
                                    key={idx}
                                    className="p-8 border-t-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(139,0,0,0.12)] text-center md:text-left flex flex-col items-center md:items-start group transition-all duration-500 ease-out transform hover:-translate-y-2 relative overflow-hidden"
                                >
                                    {/* Premium Gradient Top Border Effect */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-800 via-red-500 to-red-800 opacity-80 group-hover:opacity-100 transition-opacity" />

                                    {/* Subtle Background Glow on Hover */}
                                    <div className="absolute -inset-1 bg-gradient-to-b from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-red-50 border border-red-100 shadow-sm flex items-center justify-center text-[#8B0000] group-hover:bg-[#8B0000] group-hover:text-white mb-6 group-hover:scale-110 transition-all duration-500">
                                        <Service.icon size={28} strokeWidth={2} />
                                    </div>
                                    <h3 className="relative z-10 text-xl font-bold tracking-tight text-gray-900 mb-3 group-hover:text-[#8B0000] transition-colors">{Service.title}</h3>
                                    <p className="relative z-10 text-gray-500 leading-relaxed font-medium">{Service.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* QUOTE SECTION */}
                <section id="quote" className="py-20 relative overflow-hidden bg-gray-50">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <Card className="p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_48px_80px_-16px_rgba(0,0,0,0.2)] transition-all duration-500 relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/40 transform hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-50" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#8B0000]/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none opacity-30" />

                            <div className="text-center mb-10 relative z-10">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Get a Quote – Fast & Easy</h2>
                                <p className="text-gray-600">Send us a message with what you need, and we'll reply with a quick, fair quote!</p>
                            </div>

                            {success && (
                                <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-3">
                                    <CheckCircle2 className="flex-shrink-0" />
                                    <p><strong>Success!</strong> Your quote request has been sent. We will contact you shortly.</p>
                                </div>
                            )}

                            {error && (
                                <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleQuoteSubmit} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input id="name" label="Full Name" required value={form.name} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />
                                    <Input id="phone" label="Phone Number" required value={form.phone} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />
                                </div>

                                <Input id="email" type="email" label="Email Address" value={form.email} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />

                                <Input id="items_to_move" type="textarea" label="What do you need to move?" placeholder="E.g., 1 Sofa, 2 Beds, 10 Boxes..." required value={form.items_to_move} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input id="pickup_address" label="Pickup Address" required value={form.pickup_address} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />
                                    <Input id="delivery_address" label="Delivery Address" required value={form.delivery_address} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />
                                </div>

                                <Input id="preferred_date" type="date" label="Preferred Date" required value={form.preferred_date} onChange={handleInputChange} inputClassName="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-[#8B0000] focus:border-[#8B0000]" />

                                <div className="pt-4 text-center">
                                    <Button type="submit" size="lg" className="w-full md:w-auto px-12" disabled={loading}>
                                        {loading ? 'Sending Request...' : 'Get My Quote'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </section>
            </main>

            <Footer />

            {/* Floating WhatsApp Button */}
            <div className={`fixed bottom-6 flex flex-col items-end right-6 z-50 transition-all duration-500 transform ${showWhatsApp ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                {/* Chat Bubble Tooltip */}
                <div className="bg-white text-gray-800 text-sm p-3 rounded-lg shadow-xl mb-3 border border-gray-100 relative max-w-[200px] animate-bounce">
                    Hi! Need help with a move? We can give you a quick quote.
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45" />
                </div>

                {/* Main Button */}
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:scale-110 transition-transform flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-green-300 rounded-full animate-heartbeat"
                    aria-label="Chat on WhatsApp"
                >
                    <img
                        src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/icone_whatsapp.png"
                        alt="WhatsApp"
                        className="w-16 h-16 drop-shadow-2xl"
                    />
                </a>
            </div>
        </div>
    );
}
