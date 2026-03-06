import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';

export function Leads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setLeads(data);
        setLoading(false);
    };

    const handleConvert = async (id) => {
        const { error } = await supabase
            .from('leads')
            .update({ status: 'converted' })
            .eq('id', id);

        if (!error) {
            alert('Lead Converted to Client Successfully!');
            fetchLeads();
        }
    };

    const columns = [
        { header: 'Created', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
        { header: 'Name', accessor: 'name' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Moving', accessor: 'items_to_move' },
        {
            header: 'Status', accessor: 'status', render: (row) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'converted' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {row.status.toUpperCase()}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
                <Button onClick={fetchLeads} variant="outline" size="sm">Refresh</Button>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading leads...</div>
            ) : (
                <Table
                    columns={columns}
                    data={leads}
                    keyExtractor={(row) => row.id}
                    actions={(row) => (
                        row.status !== 'converted' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleConvert(row.id)}
                            >
                                Convert to Client
                            </Button>
                        )
                    )}
                />
            )}
        </div>
    );
}
