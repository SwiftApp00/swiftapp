import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { generateQuotePDF } from '../../services/pdfService';
import { Download, Mail } from 'lucide-react';

export function Orcamentos() {
    const [quotes, setQuotes] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ client_id: '', description: '', price: '', service_date: '' });

    useEffect(() => {
        fetchQuotes();
        fetchClients();
    }, []);

    const fetchQuotes = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('quotes')
            .select('*, clients(*)')
            .order('created_at', { ascending: false });
        if (data) setQuotes(data);
        setLoading(false);
    };

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name').order('name');
        if (data) setClients(data);
    };

    const handleStatusChange = async (id, status) => {
        const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
        if (!error) fetchQuotes();
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        // Use the DB function for numbering
        const { data: qNumData } = await supabase.rpc('generate_quote_number');
        const qNumber = qNumData || `QT-${new Date().getFullYear()}-MANUAL`;

        const subtotal = Number(form.price);
        const vat = subtotal * 0.23;
        const total = subtotal + vat;

        const payload = {
            ...form,
            quote_number: qNumber,
            items: [{ description: form.description, quantity: 1, unit_price: subtotal, total: subtotal }],
            subtotal,
            vat_amount: vat,
            total
        };

        const { error } = await supabase.from('quotes').insert([payload]);
        if (!error) {
            setIsModalOpen(false);
            setForm({ client_id: '', description: '', price: '', service_date: '' });
            fetchQuotes();
        }
    };

    const columns = [
        { header: 'Number', accessor: 'quote_number', render: (row) => <span className="font-mono text-xs font-bold">{row.quote_number}</span> },
        { header: 'Client', accessor: 'client_id', render: (row) => row.clients?.name || 'Unknown' },
        { header: 'Service', accessor: 'description' },
        { header: 'Total (€)', accessor: 'total', render: (row) => <span className="font-bold text-gray-900">€{Number(row.total || row.price || 0).toFixed(2)}</span> },
        { header: 'Date', accessor: 'service_date', render: (row) => new Date(row.service_date).toLocaleDateString() },
        {
            header: 'Status', accessor: 'status', render: (row) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'approved' ? 'bg-green-100 text-green-700' :
                    row.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        row.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                    }`}>
                    {row.status.toUpperCase()}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setIsModalOpen(true)}>Create Quote</Button>
                    <Button onClick={fetchQuotes} variant="outline">Refresh</Button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading quotes...</div>
            ) : (
                <Table
                    columns={columns}
                    data={quotes}
                    keyExtractor={(row) => row.id}
                    actions={(row) => (
                        <div className="flex space-x-2">
                            {row.status === 'pending' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(row.id, 'sent')}>Mark Sent</Button>}
                            {row.status === 'sent' && (
                                <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(row.id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleStatusChange(row.id, 'rejected')}>Reject</Button>
                                </>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                title="Download PDF"
                                onClick={() => generateQuotePDF(row, row.clients)}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                title="Send Email"
                                onClick={() => alert('Email sending to be implemented in Phase 4.2')}
                            >
                                <Mail className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                />
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Quote">
                <form onSubmit={handleCreate} className="space-y-4">
                    <Input
                        label="Client"
                        id="client_id"
                        type="select"
                        required
                        value={form.client_id}
                        onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    >
                        <option value="">Select a client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Input>
                    <Input
                        label="Description"
                        id="description"
                        required
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <Input
                        label="Price (€)"
                        id="price"
                        type="number"
                        required
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                    <Input
                        label="Service Date"
                        id="service_date"
                        type="date"
                        required
                        value={form.service_date}
                        onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                    />
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Quote</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
