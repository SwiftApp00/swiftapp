import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import {
    LayoutDashboard,
    Users,
    FileText,
    Banknote,
    LogOut,
    Menu,
    X
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard', path: '/crm/dashboard', icon: LayoutDashboard },
    { name: 'Leads', path: '/crm/leads', icon: Users },
    { name: 'Clients', path: '/crm/clientes', icon: Users },
    { name: 'Quotes', path: '/crm/orcamentos', icon: FileText },
    { name: 'Finance', path: '/crm/financeiro', icon: Banknote },
];

export function Sidebar() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Header */}
            <div
                className="md:hidden fixed top-0 left-0 w-full h-16 flex items-center justify-between px-4 z-[60] shadow-md"
                style={{
                    backgroundImage: `linear-gradient(rgba(139, 0, 0, 0.8), rgba(139, 0, 0, 0.8)), url("https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/background.png")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="flex items-center gap-2">
                    <img
                        src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png"
                        alt="Swift Transport & Solutions"
                        className="h-8 w-auto object-contain brightness-0 invert"
                    />
                </div>
                <button
                    onClick={toggleMenu}
                    className="p-2 text-white hover:bg-red-800 rounded-lg transition-colors"
                    aria-label="Toggle Menu"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-[55] backdrop-blur-sm transition-opacity"
                    onClick={toggleMenu}
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`
                    w-64 text-red-100 flex flex-col h-screen fixed top-0 left-0 shadow-xl z-[58] transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                style={{
                    backgroundImage: `linear-gradient(rgba(139, 0, 0, 0.8), rgba(139, 0, 0, 0.8)), url("https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/background.png")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div className="h-20 flex items-center px-6 border-b border-red-900/50">
                    <div className="flex items-center gap-2">
                        <img
                            src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png"
                            alt="Swift Transport & Solutions"
                            className="h-10 w-auto object-contain brightness-0 invert"
                        />
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-white text-[#8B0000] font-semibold shadow-sm'
                                    : 'hover:bg-red-900/50 hover:text-white'
                                } `
                            }
                        >
                            <item.icon size={20} />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-red-900/50 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-200 hover:bg-red-900/50 hover:text-white transition-colors"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
}
