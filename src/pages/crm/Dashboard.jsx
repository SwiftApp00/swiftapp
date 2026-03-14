import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Card } from '../../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, Banknote, Inbox, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalClients: 0,
        totalQuotes: 0,
        revenue: 0,
    });
    const [schedules, setSchedules] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isCalendarLoading, setIsCalendarLoading] = useState(true);

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
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setIsCalendarLoading(true);
        const { data } = await supabase
            .from('schedules')
            .select('*, quotes(quote_number, clients(name))')
            .order('start_time', { ascending: true });
        if (data) setSchedules(data);
        setIsCalendarLoading(false);
    };

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

    // Calendar logic
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const changeMonth = (offset) => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        setCurrentDate(next);
    };

    const isSameDay = (d1, d2) => 
        d1.getFullYear() === d2.getFullYear() && 
        d1.getMonth() === d2.getMonth() && 
        d1.getDate() === d2.getDate();

    const getSchedulesForDay = (date) => 
        schedules.filter(s => isSameDay(new Date(s.start_time), date));

    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Padding for first week
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const selectedDaySchedules = getSchedulesForDay(selectedDate);

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Card */}
                <Card className="p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#8B0000]">
                                <CalendarIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Service Calendar</h3>
                                <p className="text-xs text-gray-500 font-medium">{monthName}</p>
                            </div>
                        </div>
                        <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                                <ChevronLeft size={18} />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-[#8B0000] hover:bg-white hover:shadow-sm rounded-lg transition-all">
                                Today
                            </button>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {days.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="h-24" />;
                            
                            const daySchedules = getSchedulesForDay(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(day)}
                                    className={`h-24 p-2 rounded-2xl border transition-all text-left flex flex-col relative overflow-hidden group ${
                                        isSelected 
                                            ? 'border-[#8B0000] bg-red-50 ring-2 ring-red-100' 
                                            : 'border-gray-100 hover:border-red-200 hover:bg-gray-50 bg-white'
                                    }`}
                                >
                                    <span className={`text-sm font-bold ${
                                        isToday 
                                            ? 'text-white bg-[#8B0000] w-6 h-6 rounded-full flex items-center justify-center -ml-0.5 -mt-0.5' 
                                            : isSelected ? 'text-[#8B0000]' : 'text-gray-900'
                                    }`}>
                                        {day.getDate()}
                                    </span>

                                    <div className="mt-1 space-y-1 overflow-hidden">
                                        {daySchedules.slice(0, 2).map((s, i) => (
                                            <div key={i} className="text-[9px] px-1.5 py-0.5 bg-white border border-gray-100 rounded text-gray-600 font-medium truncate shadow-xs">
                                                {s.quotes?.clients?.name || 'Service'}
                                            </div>
                                        ))}
                                        {daySchedules.length > 2 && (
                                            <div className="text-[8px] text-gray-400 font-bold pl-1">
                                                +{daySchedules.length - 2} more
                                            </div>
                                        )}
                                    </div>

                                    {daySchedules.length > 0 && !isSelected && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-[#8B0000] rounded-full ring-2 ring-white" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Day Details Sidebar */}
                <Card className="p-6 flex flex-col h-full bg-white/50 backdrop-blur-sm border-dashed">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {selectedDate.toLocaleDateString('default', { weekday: 'long' })}
                        </h3>
                        <p className="text-xs text-[#8B0000] font-bold">
                            {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'long' })}
                        </p>
                    </div>

                    <div className="flex-grow space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Availability Schedule</h4>
                        
                        {/* Hour by Hour View */}
                        {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(hour => {
                            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                            const activeSchedules = selectedDaySchedules.filter(s => {
                                const start = new Date(s.start_time).getHours();
                                const end = new Date(s.end_time).getHours();
                                return hour >= start && hour < end;
                            });

                            return (
                                <div key={hour} className="flex gap-4 group">
                                    <span className="text-[10px] font-bold text-gray-400 w-10 py-1">{timeStr}</span>
                                    <div className={`flex-grow min-h-[3rem] rounded-xl border-t transition-all pt-2 ${
                                        activeSchedules.length > 0 
                                            ? 'bg-red-50/50 border-t-red-100' 
                                            : 'border-t-gray-100'
                                    }`}>
                                        {activeSchedules.map((s, idx) => (
                                            <div 
                                                key={idx} 
                                                className="mb-2 p-2 bg-[#8B0000] text-white rounded-lg shadow-md animate-in slide-in-from-left-2 border-l-4 border-red-300 cursor-pointer hover:bg-red-900 transition-colors group/card"
                                                onClick={() => navigate('/crm/orcamentos', { state: { selectedQuoteId: s.quote_id } })}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">
                                                        {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-[9px] bg-white/20 px-1 rounded font-mono group-hover/card:bg-white/30">{s.quotes?.quote_number}</span>
                                                </div>
                                                <p className="text-xs font-bold truncate">{s.quotes?.clients?.name}</p>
                                                <p className="text-[9px] opacity-90 truncate">{s.description}</p>
                                            </div>
                                        ))}
                                        {activeSchedules.length === 0 && (
                                            <div className="flex items-center gap-2 text-xs text-gray-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                                <CheckCircle2 size={12} />
                                                Available Slot
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Leads Analysis Chart */}
                <Card className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Leads Analysis</h3>
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
