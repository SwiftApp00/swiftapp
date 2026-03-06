import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabaseClient';

export function Navbar() {
    const [clickCount, setClickCount] = useState(0);

    const handleLogoClick = async () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount === 2) {
            setClickCount(0);
            const name = window.prompt("Create Admin Account - Full Name:");
            const email = window.prompt("Create Admin Account - Email:");
            const password = window.prompt("Create Admin Account - Password:");

            if (name && email && password) {
                try {
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                        email,
                        password,
                    });

                    if (authError) throw authError;

                    if (authData.user) {
                        // The trigger creates the profile, we elevate it and add the name
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .update({
                                role: 'admin',
                                full_name: name
                            })
                            .eq('id', authData.user.id);

                        if (profileError) throw profileError;

                        alert(`Admin account for ${name} created successfully!`);
                    }
                } catch (err) {
                    alert("Operation failed: " + err.message);
                }
            }
        }

        // Reset counter after short period
        setTimeout(() => setClickCount(0), 1000);
    };

    return (
        <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-40 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link to="/" onClick={handleLogoClick} className="hover:opacity-90 transition-opacity">
                        <img
                            src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png"
                            alt="Swift Transport & Solutions"
                            className="h-12 w-auto object-contain"
                        />
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex gap-8 items-center text-sm font-semibold text-gray-600">
                    <a href="#services" className="hover:text-[#8B0000] transition-colors">Services</a>
                    <a href="#quote" className="hover:text-[#8B0000] transition-colors">Get a Quote</a>
                    <a href="#contact" className="hover:text-[#8B0000] transition-colors">Contact</a>
                </nav>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <a href="#quote">
                        <Button variant="primary" className="shadow-lg shadow-red-900/20">
                            Get a Quote
                        </Button>
                    </a>
                </div>
            </div>
        </header>
    );
}
