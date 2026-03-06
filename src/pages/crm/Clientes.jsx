import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';

export function Clientes() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setClients(data);
        setLoading(false);
    };

    const columns = [
        { header: 'Client Since', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
        { header: 'Name', accessor: 'name' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Email', accessor: 'email' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                <Button onClick={fetchClients} variant="outline" size="sm">Refresh</Button>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading clients...</div>
            ) : (
                <Table
                    columns={columns}
                    data={clients}
                    keyExtractor={(row) => row.id}
                />
            )}
        </div>
    );
}
