import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';

export function Financeiro() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('receivable'); // 'receivable' | 'payable'

    useEffect(() => {
        fetchRecords();
    }, [tab]);

    const fetchRecords = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('finance')
            .select('*, quotes(description)')
            .eq('type', tab)
            .order('created_at', { ascending: false });

        if (data) setRecords(data);
        setLoading(false);
    };

    const handleMarkPaid = async (id) => {
        const { error } = await supabase.from('finance').update({ status: 'paid' }).eq('id', id);
        if (!error) fetchRecords();
    };

    const columns = [
        { header: 'Description', accessor: 'description', render: (row) => row.description || row.quotes?.description || 'No description' },
        { header: 'Amount', accessor: 'amount', render: (row) => `€${row.amount}` },
        { header: 'Due Date', accessor: 'due_date', render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '-' },
        {
            header: 'Status', accessor: 'status', render: (row) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {row.status.toUpperCase()}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
                <Button onClick={fetchRecords} variant="outline" size="sm">Refresh</Button>
            </div>

            <div className="flex gap-4 border-b border-gray-200">
                <button
                    className={`pb-4 px-2 font-medium ${tab === 'receivable' ? 'text-[#8B0000] border-b-2 border-[#8B0000]' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTab('receivable')}
                >
                    Accounts Receivable
                </button>
                <button
                    className={`pb-4 px-2 font-medium ${tab === 'payable' ? 'text-[#8B0000] border-b-2 border-[#8B0000]' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTab('payable')}
                >
                    Accounts Payable
                </button>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading records...</div>
            ) : (
                <Table
                    columns={columns}
                    data={records}
                    keyExtractor={(row) => row.id}
                    actions={(row) => (
                        row.status === 'pending' && (
                            <Button size="sm" variant="secondary" onClick={() => handleMarkPaid(row.id)}>
                                Mark Paid
                            </Button>
                        )
                    )}
                />
            )}
        </div>
    );
}
