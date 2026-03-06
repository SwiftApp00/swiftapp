import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Card } from '../../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, Banknote, Inbox } from 'lucide-react';

export function Dashboard() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalClients: 0,
        totalQuotes: 0,
        revenue: 0,
    });

    // Dummy chart data for now
    const data = [
        { name: 'Mon', leads: 4 },
        { name: 'Tue', leads: 3 },
        { name: 'Wed', leads: 2 },
        { name: 'Thu', leads: 7 },
        { name: 'Fri', leads: 5 },
        { name: 'Sat', leads: 1 },
        { name: 'Sun', leads: 2 },
    ];

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        // Note: in a real app, this would be a custom DB function or a combined backend query
        const [leadsRes, clientsRes, quotesRes, financeRes] = await Promise.all([
            supabase.from('leads').select('id', { count: 'exact', head: true }),
            supabase.from('clients').select('id', { count: 'exact', head: true }),
            supabase.from('quotes').select('id', { count: 'exact', head: true }),
            supabase.from('finance').select('amount').eq('type', 'receivable'),
        ]);

        const totalRevenue = financeRes.data
            ? financeRes.data.reduce((sum, item) => sum + Number(item.amount || 0), 0)
            : 0;

        setStats({
            totalLeads: leadsRes.count || 0,
            totalClients: clientsRes.count || 0,
            totalQuotes: quotesRes.count || 0,
            revenue: totalRevenue,
        });
    };

    const statCards = [
        { title: 'Total Leads', value: stats.totalLeads, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Sent Quotes', value: stats.totalQuotes, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
        { title: 'Revenue (Receivables)', value: `€${stats.revenue.toLocaleString()}`, icon: Banknote, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <Card key={idx} className="p-6 flex items-center gap-4 border-l-4" style={{ borderLeftColor: stat.title === 'Revenue (Receivables)' ? '#8B0000' : '' }}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Leads This Week</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="leads" fill="#8B0000" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
