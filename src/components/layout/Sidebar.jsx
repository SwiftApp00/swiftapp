import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import {
    LayoutDashboard,
    Users,
    FileText,
    Banknote,
    LogOut,
    Truck
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="w-64 bg-[#8B0000] text-red-100 flex flex-col h-screen fixed top-0 left-0 shadow-xl z-50">
            <div className="h-20 flex items-center px-6 border-b border-red-900/50">
                <div className="flex items-center gap-2">
                    <img
                        src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png"
                        alt="Swift Transport & Solutions"
                        className="h-10 w-auto object-contain brightness-0 invert"
                    />
                </div>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
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

            <div className="p-4 border-t border-red-900/50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-200 hover:bg-red-900/50 hover:text-white transition-colors"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </div>
    );
}
