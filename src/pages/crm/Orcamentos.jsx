import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { generateQuotePDF } from '../../services/pdfService';
import { Download, Mail, Pencil, Loader2, Percent, CheckCircle2, Calendar as CalendarIcon, Clock, CheckCircle, X as XIcon } from 'lucide-react';
import { isOverlap } from '../../utils/securityUtils';

const TIME_OPTIONS = [];
for (let h = 7; h <= 20; h++) {
    const hour = h < 10 ? `0${h}` : `${h}`;
    TIME_OPTIONS.push(`${hour}:00`);
    TIME_OPTIONS.push(`${hour}:30`);
}

export function Orcamentos() {
    const location = useLocation();
    const [quotes, setQuotes] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingQuoteId, setEditingQuoteId] = useState(null);
    const [form, setForm] = useState({ client_id: '', description: '', price: '', service_date: '' });
    const [quoteItems, setQuoteItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [hasVat, setHasVat] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Email confirmation dialog
    const [showEmailConfirm, setShowEmailConfirm] = useState(false);
    const [savedQuoteData, setSavedQuoteData] = useState(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // Detail view
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Scheduling
    const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
    const [schedulingQuote, setSchedulingQuote] = useState(null);
    const [scheduleTimes, setScheduleTimes] = useState({ date: '', start: '09:00', end: '12:00' });
    const [isCheckingOverlap, setIsCheckingOverlap] = useState(false);
    const [overlapError, setOverlapError] = useState(null);

    useEffect(() => {
        fetchQuotes();
        fetchClients();
    }, []);

    // Handle deep linked quote from Dashboard
    useEffect(() => {
        if (location.state?.selectedQuoteId && quotes.length > 0) {
            const quote = quotes.find(q => q.id === location.state.selectedQuoteId);
            if (quote) {
                setSelectedQuote(quote);
                setIsDetailOpen(true);
            }
        }
    }, [location.state, quotes]);

    const fetchQuotes = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('quotes')
            .select('*, clients(*), schedules(*)')
            .order('created_at', { ascending: false });
        if (data) setQuotes(data);
        setLoading(false);
    };

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name, email').order('name');
        if (data) setClients(data);
    };

    const handleStatusChange = async (id, status) => {
        if (status === 'approved') {
            const quote = quotes.find(q => q.id === id);
            setSchedulingQuote(quote);
            // Default to service_date or today
            const baseDate = quote.service_date || new Date().toISOString().split('T')[0];
            setScheduleTimes({
                date: baseDate,
                start: '09:00',
                end: '12:00'
            });
            setIsSchedulingOpen(true);
            return;
        }

        const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
        if (!error) fetchQuotes();
    };

    const handleConfirmSchedule = async (type) => {
        // type: 'only_approve' or 'schedule'
        if (type === 'only_approve') {
            await supabase.from('quotes').update({ status: 'approved' }).eq('id', schedulingQuote.id);
            setIsSchedulingOpen(false);
            fetchQuotes();
            return;
        }

        // Check overlap
        setIsCheckingOverlap(true);
        setOverlapError(null);
        try {
            const [y, mm, d] = scheduleTimes.date.split('-').map(Number);
            const [h1, m1] = scheduleTimes.start.split(':').map(Number);
            const [h2, m2] = scheduleTimes.end.split(':').map(Number);

            const startDate = new Date(y, mm - 1, d, h1, m1);
            const endDate = new Date(y, mm - 1, d, h2, m2);

            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();

            const { data: existingSchedules, error: fetchError } = await supabase
                .from('schedules')
                .select('*');
            
            if (fetchError) throw fetchError;

            const hasOverlap = existingSchedules.some(s => 
                isOverlap(startISO, endISO, s.start_time, s.end_time)
            );

            if (hasOverlap) {
                setOverlapError('There is already a service scheduled for this time slot. Please choose another time.');
                return;
            }

            // Save schedule
            const { error: scheduleError } = await supabase.from('schedules').insert([{
                quote_id: schedulingQuote.id,
                start_time: startISO,
                end_time: endISO,
                description: schedulingQuote.description
            }]);

            if (scheduleError) throw scheduleError;

            // Update quote status to scheduled
            await supabase.from('quotes').update({ status: 'scheduled' }).eq('id', schedulingQuote.id);
            
            setIsSchedulingOpen(false);
            fetchQuotes();
            alert('Service scheduled successfully!');
        } catch (err) {
            console.error(err);
            alert('Error creating schedule.');
        } finally {
            setIsCheckingOverlap(false);
        }
    };

    // Calculations
    const calcSubtotal = () => quoteItems.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1), 0);
    const calcDiscountAmount = () => calcSubtotal() * (Number(discountPercent) || 0) / 100;
    const calcVat = () => hasVat ? (calcSubtotal() - calcDiscountAmount()) * 0.23 : 0;
    const calcTotal = () => calcSubtotal() - calcDiscountAmount() + calcVat();

    const updateQuoteItem = (index, field, value) => {
        const updated = [...quoteItems];
        updated[index] = { ...updated[index], [field]: value };
        setQuoteItems(updated);
    };

    const addQuoteItem = () => {
        setQuoteItems([...quoteItems, { description: '', quantity: 1, unit_price: 0 }]);
    };

    const removeQuoteItem = (index) => {
        if (quoteItems.length <= 1) return;
        setQuoteItems(quoteItems.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setForm({ client_id: '', description: '', price: '', service_date: '' });
        setQuoteItems([{ description: '', quantity: 1, unit_price: 0 }]);
        setDiscountPercent(0);
        setHasVat(true);
        setIsEditing(false);
        setEditingQuoteId(null);
    };

    const openCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEdit = (quote) => {
        setIsEditing(true);
        setEditingQuoteId(quote.id);
        setForm({
            client_id: quote.client_id || '',
            description: quote.description || '',
            price: quote.price || '',
            service_date: quote.service_date || '',
        });
        setQuoteItems(
            (quote.items && quote.items.length > 0)
                ? quote.items.map(i => ({ description: i.description || '', quantity: i.quantity || 1, unit_price: i.unit_price || 0 }))
                : [{ description: quote.description || '', quantity: 1, unit_price: Number(quote.price) || 0 }]
        );
        setDiscountPercent(quote.discount_percent || 0);
        setHasVat(quote.vat_amount == null ? true : Number(quote.vat_amount) > 0);
        setIsModalOpen(true);
    };

    const handleRowClick = (row) => {
        setSelectedQuote(row);
        setIsDetailOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const finalItems = quoteItems.map(item => ({
                description: item.description,
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                total: (Number(item.unit_price) || 0) * (Number(item.quantity) || 1),
            }));

            const subtotal = calcSubtotal();
            const discountAmt = calcDiscountAmount();
            const vat = calcVat();
            const total = calcTotal();

            const payload = {
                client_id: form.client_id,
                description: form.description || quoteItems[0]?.description || 'Service',
                items: finalItems,
                service_date: form.service_date,
                subtotal,
                discount_percent: Number(discountPercent) || 0,
                discount_amount: discountAmt,
                vat_amount: vat,
                total,
            };

            let savedQuote = null;

            if (isEditing && editingQuoteId) {
                const { data, error } = await supabase.from('quotes').update(payload).eq('id', editingQuoteId).select('*, clients(*)').single();
                if (error) throw error;
                savedQuote = data;
            } else {
                const { data: qNumData } = await supabase.rpc('generate_quote_number');
                payload.quote_number = qNumData || `QT-${new Date().getFullYear()}-MANUAL`;
                payload.status = 'pending';

                const { data, error } = await supabase.from('quotes').insert([payload]).select('*, clients(*)').single();
                if (error) throw error;
                savedQuote = data;
            }

            setIsModalOpen(false);
            resetForm();
            fetchQuotes();

            // Show email confirmation
            setSavedQuoteData(savedQuote);
            setShowEmailConfirm(true);
        } catch (err) {
            console.error(err);
            alert('Error saving quote: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!savedQuoteData) return;
        setIsSendingEmail(true);

        try {
            const client = savedQuoteData.clients;
            if (!client?.email) {
                alert('Client has no email address.');
                return;
            }

            // Generate PDF as base64
            const pdfBase64 = generateQuotePDF(savedQuoteData, client, { returnBase64: true });

            // Call edge function to send email
            const { error } = await supabase.functions.invoke('send-service-request-emails', {
                body: {
                    type: 'quote',
                    client_name: client.name,
                    client_email: client.email,
                    quote_number: savedQuoteData.quote_number,
                    total: savedQuoteData.total,
                    pdf_base64: pdfBase64,
                }
            });

            if (error) console.error('Email send error:', error);

            // Log the email send in the quote
            const now = new Date().toISOString();
            const emailLogs = [...(savedQuoteData.email_logs || []), {
                sent_at: now,
                recipient: client.email,
                type: 'quote_pdf',
            }];

            await supabase.from('quotes').update({ email_logs: emailLogs }).eq('id', savedQuoteData.id);

            alert('Email sent successfully!');
            setShowEmailConfirm(false);
            setSavedQuoteData(null);
            fetchQuotes();
        } catch (err) {
            console.error('Email error:', err);
            alert('Error sending email: ' + (err.message || 'Unknown'));
        } finally {
            setIsSendingEmail(false);
        }
    };

    const columns = [
        { header: 'Number', accessor: 'quote_number', render: (row) => <span className="font-mono text-xs font-bold">{row.quote_number}</span> },
        { header: 'Client', accessor: 'client_id', render: (row) => row.clients?.name || 'Unknown' },
        { header: 'Service', accessor: 'description' },
        { header: 'Total (€)', accessor: 'total', render: (row) => <span className="font-bold text-gray-900">€{Number(row.total || row.price || 0).toFixed(2)}</span> },
        { header: 'Date', accessor: 'service_date', render: (row) => row.service_date ? new Date(row.service_date).toLocaleDateString() : '-' },
        {
            header: 'Status', accessor: 'status', render: (row) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'approved' ? 'bg-green-100 text-green-700' :
                    row.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        row.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            row.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                                row.status === 'completed' ? 'bg-gray-800 text-white' :
                                    'bg-gray-100 text-gray-700'
                    }`}>
                    {row.status?.toUpperCase()}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
                <div className="flex gap-2">
                    <Button onClick={openCreate}>Create Quote</Button>
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
                    onRowClick={handleRowClick}
                    actions={(row) => (
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            {row.status === 'pending' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(row.id, 'sent')}>Mark Sent</Button>}
                            {row.status === 'sent' && (
                                <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(row.id, 'approved')}>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleStatusChange(row.id, 'rejected')}>Reject</Button>
                                </>
                            )}
                            {row.status === 'scheduled' && (
                                <Button size="sm" className="bg-gray-900 hover:bg-black text-white" onClick={() => handleStatusChange(row.id, 'completed')}>
                                    <CheckCircle size={14} className="mr-1" /> Finalizar
                                </Button>
                            )}
                            <Button size="sm" variant="outline" title="Edit" onClick={() => openEdit(row)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" title="Download PDF" onClick={() => generateQuotePDF(row, row.clients)}>
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" title="Send Email" onClick={() => { setSavedQuoteData(row); setShowEmailConfirm(true); }}>
                                <Mail className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                />
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={isEditing ? 'Edit Quote' : 'Create New Quote'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Client"
                        id="client_id"
                        type="select"
                        required
                        value={form.client_id}
                        onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    >
                        <option value="">Select a client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                    </Input>

                    <Input
                        label="Service Date"
                        id="service_date"
                        type="date"
                        required
                        value={form.service_date}
                        onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                    />

                    {/* Items with pricing */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase">Items</label>
                        {quoteItems.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                                <input
                                    className="col-span-5 px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-red-200 outline-none"
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={(e) => updateQuoteItem(idx, 'description', e.target.value)}
                                    required
                                />
                                <input
                                    type="number" min="1"
                                    className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-red-200 outline-none"
                                    value={item.quantity}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateQuoteItem(idx, 'quantity', e.target.value)}
                                />
                                <input
                                    type="number" min="0" step="0.01"
                                    className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-red-200 outline-none"
                                    value={item.unit_price}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateQuoteItem(idx, 'unit_price', e.target.value)}
                                    placeholder="€"
                                />
                                <span className="col-span-2 text-sm font-bold text-right">
                                    €{((Number(item.unit_price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                                </span>
                                <button type="button" className="col-span-1 text-gray-400 hover:text-red-500 text-center" onClick={() => removeQuoteItem(idx)}>
                                    <XIcon size={14} />
                                </button>
                            </div>
                        ))}
                        <button type="button" className="text-sm font-semibold text-[#8B0000] hover:text-red-900" onClick={addQuoteItem}>+ Add item</button>
                    </div>

                    {/* Discount */}
                    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <Percent size={16} className="text-yellow-600" />
                        <label className="text-xs font-semibold text-yellow-700">Discount</label>
                        <input
                            type="number" min="0" max="100" step="0.5"
                            className="w-20 px-2 py-1.5 border border-yellow-300 rounded-md text-sm text-center focus:ring-2 focus:ring-yellow-200 outline-none"
                            value={discountPercent}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setDiscountPercent(e.target.value)}
                        />
                        <span className="text-xs text-yellow-600">%</span>
                        {Number(discountPercent) > 0 && (
                            <span className="text-sm font-bold text-yellow-700 ml-auto">-€{calcDiscountAmount().toFixed(2)}</span>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium">€{calcSubtotal().toFixed(2)}</span>
                        </div>
                        {Number(discountPercent) > 0 && (
                            <div className="flex justify-between text-sm text-yellow-700">
                                <span>Discount ({discountPercent}%)</span>
                                <span className="font-medium">-€{calcDiscountAmount().toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className={hasVat ? "text-gray-500" : "text-gray-400"}>VAT (23%)</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={hasVat} onChange={() => setHasVat(!hasVat)} />
                                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#8B0000]"></div>
                                </label>
                            </div>
                            <span className={hasVat ? "font-medium" : "font-medium text-gray-400 line-through"}>€{calcVat().toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between">
                            <span className="text-lg font-bold">TOTAL</span>
                            <span className="text-lg font-bold text-[#8B0000]">€{calcTotal().toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            {isSaving ? 'Saving...' : isEditing ? 'Update Quote' : 'Save Quote'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Detail View Modal */}
            <Modal isOpen={isDetailOpen} onClose={() => { setIsDetailOpen(false); setSelectedQuote(null); }} title="Quote Details">
                {selectedQuote && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-bold text-gray-600">{selectedQuote.quote_number}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedQuote.status === 'approved' ? 'bg-green-100 text-green-700' :
                                selectedQuote.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    selectedQuote.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {selectedQuote.status?.toUpperCase()}
                            </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                            <p className="text-xs text-gray-400 font-bold uppercase">Client</p>
                            <p className="text-sm font-medium">{selectedQuote.clients?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{selectedQuote.clients?.email}</p>
                        </div>

                        {selectedQuote.status === 'scheduled' && selectedQuote.schedules && selectedQuote.schedules.length > 0 && (
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1">
                                <p className="text-xs text-purple-400 font-bold uppercase flex items-center gap-1">
                                    <Clock size={12} /> Scheduled Service
                                </p>
                                <p className="text-sm font-bold text-purple-900">
                                    {new Date(selectedQuote.schedules[0].start_time).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-purple-700">
                                    {new Date(selectedQuote.schedules[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                    {' - '}
                                    {new Date(selectedQuote.schedules[0].end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <p className="text-xs text-gray-400 font-bold uppercase">Items</p>
                            {(selectedQuote.items || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-50">
                                    <span>{item.description} <span className="text-gray-400">(x{item.quantity})</span></span>
                                    <span className="font-medium">€{Number(item.total || 0).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>€{Number(selectedQuote.subtotal || 0).toFixed(2)}</span></div>
                            {Number(selectedQuote.discount_percent) > 0 && (
                                <div className="flex justify-between text-sm text-yellow-700">
                                    <span>Discount ({selectedQuote.discount_percent}%)</span>
                                    <span>-€{Number(selectedQuote.discount_amount || 0).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm"><span className="text-gray-500">VAT (23%)</span><span>€{Number(selectedQuote.vat_amount || 0).toFixed(2)}</span></div>
                            <div className="border-t pt-2 flex justify-between"><span className="font-bold">TOTAL</span><span className="font-bold text-[#8B0000]">€{Number(selectedQuote.total || 0).toFixed(2)}</span></div>
                        </div>

                        {/* Email logs */}
                        {selectedQuote.email_logs && selectedQuote.email_logs.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400 font-bold uppercase">Email History</p>
                                {selectedQuote.email_logs.map((log, idx) => (
                                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-gray-50">
                                        <span className="text-gray-600">📧 {log.recipient}</span>
                                        <span className="text-gray-400">{new Date(log.sent_at).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => { openEdit(selectedQuote); setIsDetailOpen(false); }}>
                                <Pencil size={14} className="mr-1" /> Edit
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => generateQuotePDF(selectedQuote, selectedQuote.clients)}>
                                <Download size={14} className="mr-1" /> PDF
                            </Button>
                            <Button className="flex-1 bg-[#8B0000] hover:bg-red-900" onClick={() => { setSavedQuoteData(selectedQuote); setShowEmailConfirm(true); setIsDetailOpen(false); }}>
                                <Mail size={14} className="mr-1" /> Email
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Email Confirmation Dialog */}
            <Modal isOpen={showEmailConfirm} onClose={() => { setShowEmailConfirm(false); setSavedQuoteData(null); }} title="Send Quote by Email?">
                {savedQuoteData && (
                    <div className="space-y-4 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                            <Mail size={28} className="text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">
                            Send quote <strong>{savedQuoteData.quote_number}</strong> to <strong>{savedQuoteData.clients?.email || 'client'}</strong>?
                        </p>
                        <p className="text-xs text-gray-400">A PDF will be generated and sent as attachment.</p>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setShowEmailConfirm(false); setSavedQuoteData(null); }}>
                                No, Skip
                            </Button>
                            <Button
                                className="flex-1 bg-[#8B0000] hover:bg-red-900"
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                            >
                                {isSendingEmail ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
                                {isSendingEmail ? 'Sending...' : 'Yes, Send'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Scheduling Modal */}
            <Modal isOpen={isSchedulingOpen} onClose={() => setIsSchedulingOpen(false)} title="Schedule Service?">
                {schedulingQuote && (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                            <CheckCircle2 className="text-green-600" size={24} />
                            <div>
                                <p className="text-sm font-bold text-green-800">Quote Approved!</p>
                                <p className="text-xs text-green-600">Would you like to schedule this service in the calendar now?</p>
                            </div>
                        </div>

                        <div className="space-y-3 p-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                    <CalendarIcon size={12} /> Service Date
                                </label>
                                <input 
                                    type="date" 
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 outline-none text-sm"
                                    value={scheduleTimes.date}
                                    onChange={(e) => setScheduleTimes({ ...scheduleTimes, date: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <Clock size={12} /> Start Time
                                    </label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 outline-none text-sm bg-white"
                                        value={scheduleTimes.start}
                                        onChange={(e) => setScheduleTimes({ ...scheduleTimes, start: e.target.value })}
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <Clock size={12} /> End Time (Forecast)
                                    </label>
                                    <select 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 outline-none text-sm bg-white"
                                        value={scheduleTimes.end}
                                        onChange={(e) => setScheduleTimes({ ...scheduleTimes, end: e.target.value })}
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            {overlapError && (
                                <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                                    ⚠️ {overlapError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => handleConfirmSchedule('only_approve')}>
                                No, Just Approve
                            </Button>
                            <Button 
                                className="flex-1 bg-[#8B0000] hover:bg-red-900"
                                onClick={() => handleConfirmSchedule('schedule')}
                                disabled={isCheckingOverlap || !scheduleTimes.date || !scheduleTimes.start || !scheduleTimes.end}
                            >
                                {isCheckingOverlap ? <Loader2 size={16} className="animate-spin mr-2" /> : <CalendarIcon size={16} className="mr-2" />}
                                {isCheckingOverlap ? 'Checking...' : 'Schedule Service'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
