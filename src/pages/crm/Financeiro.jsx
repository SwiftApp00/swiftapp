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
        { header: 'Number', accessor: 'finance_number', render: (row) => <span className="font-mono text-xs font-bold text-gray-600">{row.finance_number || '-'}</span> },
        { header: 'Quote', accessor: 'quote_id', render: (row) => <span className="font-mono text-xs font-bold text-blue-600">{row.quotes?.quote_number || '-'}</span> },
        { header: 'Client', accessor: 'client_name', render: (row) => row.quotes?.clients?.name || '-' },
        { header: 'Description', accessor: 'description', render: (row) => row.description || row.quotes?.description || 'No description' },
        { header: 'Amount', accessor: 'amount', render: (row) => <span className="font-bold text-gray-900">€{Number(row.amount || 0).toFixed(2)}</span> },
        { header: 'Approved Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
        {
            header: 'Status', accessor: 'status', render: (row) => (
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${row.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
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
