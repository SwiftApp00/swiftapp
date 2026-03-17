import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { 
    Trash2, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    ArrowUpRight, 
    ArrowDownRight,
    Wallet,
    BarChart3,
    RefreshCw,
    PieChart,
    CircleDollarSign,
    Receipt
} from 'lucide-react';
import { logAction } from '../../services/auditLogger';

export function Financeiro() {
    const [allRecords, setAllRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'receivable' | 'payable'

    useEffect(() => {
        fetchAllRecords();
    }, []);

    const fetchAllRecords = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('finance')
            .select(`
                *,
                quotes (
                    quote_number,
                    description,
                    clients (
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (data) setAllRecords(data);
        setLoading(false);
    };

    // Computed data
    const stats = useMemo(() => {
        const receivables = allRecords.filter(r => r.type === 'receivable');
        const payables = allRecords.filter(r => r.type === 'payable');

        const totalReceivable = receivables.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const totalPayable = payables.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const balance = totalReceivable - totalPayable;

        const paidReceivables = receivables.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const pendingReceivables = receivables.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const paidPayables = payables.filter(r => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const pendingPayables = payables.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount || 0), 0);

        // Monthly data for chart (last 6 months)
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const month = d.toLocaleString('en', { month: 'short' });
            const year = d.getFullYear();
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            const monthRecords = allRecords.filter(r => {
                const date = new Date(r.created_at);
                return date >= monthStart && date <= monthEnd;
            });

            const inflows = monthRecords.filter(r => r.type === 'receivable').reduce((sum, r) => sum + Number(r.amount || 0), 0);
            const outflows = monthRecords.filter(r => r.type === 'payable').reduce((sum, r) => sum + Number(r.amount || 0), 0);

            monthlyData.push({ month: `${month} ${year}`, inflows, outflows, balance: inflows - outflows });
        }

        return {
            totalReceivable,
            totalPayable,
            balance,
            paidReceivables,
            pendingReceivables,
            paidPayables,
            pendingPayables,
            totalRecords: allRecords.length,
            paidRecords: allRecords.filter(r => r.status === 'paid').length,
            pendingRecords: allRecords.filter(r => r.status === 'pending').length,
            monthlyData,
            receivables,
            payables
        };
    }, [allRecords]);

    const handleMarkPaid = async (id) => {
        const { error } = await supabase.from('finance').update({ status: 'paid' }).eq('id', id);
        if (!error) {
            await logAction('UPDATE_STATUS', 'Finance', { record_id: id, new_status: 'paid' });
            fetchAllRecords();
        }
    };

    const handleDelete = async (id, number) => {
        if (!window.confirm(`Are you sure you want to permanently delete record "${number || id}"? This action cannot be undone.`)) return;
        try {
            const { error } = await supabase.from('finance').delete().eq('id', id);
            if (error) throw error;
            await logAction('DELETE', 'Finance', { record_id: id, record_number: number });
            fetchAllRecords();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting financial record.');
        }
    };

    const columns = [
        { header: 'Number', accessor: 'finance_number', render: (row) => <span className="font-mono text-xs font-bold text-gray-600">{row.finance_number || '-'}</span> },
        { header: 'Quote', accessor: 'quote_id', render: (row) => <span className="font-mono text-xs font-bold text-blue-600">{row.quotes?.quote_number || '-'}</span> },
        { header: 'Client', accessor: 'client_name', render: (row) => row.quotes?.clients?.name || '-' },
        { header: 'Description', accessor: 'description', render: (row) => row.description || row.quotes?.description || 'No description' },
        { header: 'Amount', accessor: 'amount', render: (row) => <span className="font-bold text-gray-900">€{Number(row.amount || 0).toFixed(2)}</span> },
        { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString('en-GB') },
        {
            header: 'Status', accessor: 'status', render: (row) => (
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${row.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {row.status.toUpperCase()}
                </span>
            )
        },
    ];

    // Simple bar chart component
    const MiniBarChart = ({ data }) => {
        const maxVal = Math.max(...data.map(d => Math.max(d.inflows, d.outflows)), 1);
        return (
            <div className="flex items-end gap-3 h-40 px-2">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-end gap-1 w-full h-32">
                            <div
                                className="flex-1 rounded-t-md transition-all duration-500"
                                style={{
                                    height: `${(d.inflows / maxVal) * 100}%`,
                                    background: 'linear-gradient(to top, #166534, #22c55e)',
                                    minHeight: d.inflows > 0 ? '4px' : '0'
                                }}
                                title={`Inflows: €${d.inflows.toFixed(2)}`}
                            />
                            <div
                                className="flex-1 rounded-t-md transition-all duration-500"
                                style={{
                                    height: `${(d.outflows / maxVal) * 100}%`,
                                    background: 'linear-gradient(to top, #7f1d1d, #dc2626)',
                                    minHeight: d.outflows > 0 ? '4px' : '0'
                                }}
                                title={`Outflows: €${d.outflows.toFixed(2)}`}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{d.month.split(' ')[0]}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Donut chart component
    const DonutChart = ({ paid, pending, total }) => {
        const paidPercent = total > 0 ? (paid / total) * 100 : 0;
        const pendingPercent = total > 0 ? (pending / total) * 100 : 0;
        const circumference = 2 * Math.PI * 54;
        const paidDash = (paidPercent / 100) * circumference;
        const pendingDash = (pendingPercent / 100) * circumference;

        return (
            <div className="relative flex items-center justify-center">
                <svg width="140" height="140" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                    <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke="#22c55e"
                        strokeWidth="12"
                        strokeDasharray={`${paidDash} ${circumference}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                    />
                    <circle
                        cx="60" cy="60" r="54" fill="none"
                        stroke="#ca8a04"
                        strokeWidth="12"
                        strokeDasharray={`${pendingDash} ${circumference}`}
                        strokeDashoffset={-paidDash}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-800">€{total.toFixed(0)}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Total</span>
                </div>
            </div>
        );
    };

    const filteredRecords = useMemo(() => {
        if (activeView === 'receivable') return stats.receivables;
        if (activeView === 'payable') return stats.payables;
        return allRecords;
    }, [activeView, allRecords, stats]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CircleDollarSign size={24} /> Finance
                    </h1>
                    <p className="text-sm text-gray-500">Financial overview and transaction management</p>
                </div>
                <Button onClick={fetchAllRecords} variant="outline" size="sm">
                    <RefreshCw size={16} className="mr-2" /> Refresh
                </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-gray-200">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'receivable', label: 'Accounts Receivable', icon: TrendingUp },
                    { id: 'payable', label: 'Accounts Payable', icon: TrendingDown },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`pb-4 px-2 font-medium flex items-center gap-2 transition-all ${
                            activeView === t.id
                                ? 'text-[#8B0000] border-b-2 border-[#8B0000]'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveView(t.id)}
                    >
                        <t.icon size={18} />
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading records...</div>
            ) : (
                <>
                    {/* Dashboard View */}
                    {activeView === 'dashboard' && (
                        <div className="space-y-6">
                            {/* KPI Cards Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Available Balance */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Available Balance</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.balance.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-2">
                                                <span className={`flex items-center gap-0.5 text-xs font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {stats.balance >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    {stats.totalRecords} records
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
                                            <Wallet size={22} className="text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Inflows */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Inflows (Receivable)</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.totalReceivable.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-2">
                                                <span className="flex items-center gap-0.5 text-xs font-bold text-green-600">
                                                    <ArrowUpRight size={14} />
                                                    {stats.receivables.length} transactions
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)' }}>
                                            <TrendingUp size={22} className="text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Outflows */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Outflows (Payable)</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.totalPayable.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-2">
                                                <span className="flex items-center gap-0.5 text-xs font-bold text-red-600">
                                                    <ArrowDownRight size={14} />
                                                    {stats.payables.length} transactions
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fef2f2, #fecaca)' }}>
                                            <TrendingDown size={22} className="text-red-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                                {/* Cashflow Chart */}
                                <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={20} className="text-gray-500" />
                                            <h3 className="text-lg font-bold text-gray-900">Cashflow</h3>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} />
                                                <span className="text-gray-500">Inflows</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-sm" style={{ background: '#dc2626' }} />
                                                <span className="text-gray-500">Outflows</span>
                                            </div>
                                        </div>
                                    </div>
                                    <MiniBarChart data={stats.monthlyData} />
                                </div>

                                {/* Status Donut */}
                                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <PieChart size={20} className="text-gray-500" />
                                        <h3 className="text-lg font-bold text-gray-900">Payment Status</h3>
                                    </div>
                                    <div className="flex flex-col items-center gap-4">
                                        <DonutChart
                                            paid={stats.paidReceivables + stats.paidPayables}
                                            pending={stats.pendingReceivables + stats.pendingPayables}
                                            total={stats.totalReceivable + stats.totalPayable}
                                        />
                                        <div className="w-full space-y-3 px-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                                    <span className="text-sm text-gray-600">Paid</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-800">€{(stats.paidReceivables + stats.paidPayables).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-yellow-600" />
                                                    <span className="text-sm text-gray-600">Pending</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-800">€{(stats.pendingReceivables + stats.pendingPayables).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Receipt size={20} className="text-gray-500" />
                                        <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                                    </div>
                                </div>
                                <Table
                                    columns={[
                                        ...columns.slice(0, 3),
                                        { header: 'Type', accessor: 'type', render: (row) => (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                row.type === 'receivable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {row.type === 'receivable' ? 'Inflow' : 'Outflow'}
                                            </span>
                                        )},
                                        columns[4], // Amount
                                        columns[5], // Date
                                        columns[6], // Status
                                    ]}
                                    data={allRecords.slice(0, 5)}
                                    keyExtractor={(row) => row.id}
                                    actions={(row) => (
                                        <div className="flex gap-2">
                                            {row.status === 'pending' && (
                                                <Button size="sm" variant="secondary" onClick={() => handleMarkPaid(row.id)}>
                                                    Mark Paid
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Table Views (Receivable / Payable) */}
                    {(activeView === 'receivable' || activeView === 'payable') && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <Table
                                columns={columns}
                                data={filteredRecords}
                                keyExtractor={(row) => row.id}
                                actions={(row) => (
                                    <div className="flex gap-2">
                                        {row.status === 'pending' && (
                                            <Button size="sm" variant="secondary" onClick={() => handleMarkPaid(row.id)}>
                                                Mark Paid
                                            </Button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(row.id, row.finance_number)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Delete Record"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
