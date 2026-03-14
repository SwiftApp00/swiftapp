import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { generateQuotePDF } from '../../services/pdfService';
import { ClipboardList, Eye, FileText, Loader2, MapPin, Truck, Wrench, ParkingCircle, Calendar, User, Package, Percent, Mail } from 'lucide-react';

export function ServiceRequests() {
    const location = useLocation();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Email confirmation state
    const [showEmailConfirm, setShowEmailConfirm] = useState(false);
    const [savedQuoteData, setSavedQuoteData] = useState(null);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // Quote generation modal state
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [quoteItems, setQuoteItems] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [hasVat, setHasVat] = useState(true);

    useEffect(() => { fetchRequests(); }, []);

    // Handle incoming filter from Dashboard
    useEffect(() => {
        if (location.state?.status) {
            setStatusFilter(location.state.status);
        }
    }, [location.state]);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('service_requests')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setRequests(data);
        setLoading(false);
    };

    const handleRowClick = (row) => {
        setSelectedRequest(row);
        setIsModalOpen(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            new: 'bg-blue-100 text-blue-800',
            quoted: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            completed: 'bg-gray-100 text-gray-800',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.new}`}>
                {status?.charAt(0).toUpperCase() + status?.slice(1)}
            </span>
        );
    };

    const getServiceLabel = (type) => {
        const labels = { house_removal: '🏠 House Removal', waste_removal: '🗑️ Waste Removal', transport: '📦 Transport', other: '📝 Other' };
        return labels[type] || type;
    };

    const getAssemblyTypeLabel = (type) => {
        const labels = {
            none: '—  None',
            assembly_only: '🔧 Assembly',
            disassembly_only: '🔩 Disassembly',
            both: '🔧🔩 Both',
        };
        return labels[type] || type || '—';
    };

    // Open the quote generation modal with pre-filled items
    const handleOpenQuoteModal = () => {
        const sr = selectedRequest;
        if (!sr) return;

        const items = [];

        // Main service item
        items.push({
            description: `${getServiceLabel(sr.service_type)}${sr.service_type_other ? `: ${sr.service_type_other}` : ''}`,
            quantity: 1,
            unit_price: 0,
        });

        // Furniture items from the items jsonb
        if (sr.items && Array.isArray(sr.items)) {
            sr.items.forEach((item) => {
                if (item.description?.trim()) {
                    const assemblyLabel = item.assembly_type && item.assembly_type !== 'none'
                        ? ` (${getAssemblyTypeLabel(item.assembly_type)})`
                        : '';
                    items.push({
                        description: `${item.description}${assemblyLabel}`,
                        quantity: item.quantity || 1,
                        unit_price: 0,
                    });
                }
            });
        }

        setQuoteItems(items);
        setDiscountPercent(0);
        setHasVat(true);
        setIsQuoteModalOpen(true);
    };

    const updateQuoteItem = (index, field, value) => {
        const updated = [...quoteItems];
        updated[index] = { ...updated[index], [field]: value };
        setQuoteItems(updated);
    };

    // Calculate totals
    const calcSubtotal = () => quoteItems.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1), 0);
    const calcDiscountAmount = () => calcSubtotal() * (Number(discountPercent) || 0) / 100;
    const calcVat = () => hasVat ? (calcSubtotal() - calcDiscountAmount()) * 0.23 : 0;
    const calcTotal = () => calcSubtotal() - calcDiscountAmount() + calcVat();

    const handleSaveQuote = async () => {
        if (!selectedRequest) return;
        setIsGenerating(true);
        const sr = selectedRequest;

        try {
            // 1. Upsert client by email
            const clientPayload = {
                name: sr.client_name,
                email: sr.client_email,
                phone: sr.client_phone || null,
                whatsapp: sr.client_whatsapp || null,
                eircode: sr.residential_eircode || null,
                street: sr.residential_street || null,
                house_number: sr.residential_house_number || null,
                apartment: sr.residential_apartment || null,
                area: sr.residential_area || null,
                city: sr.residential_city || null,
                county: sr.residential_county || null,
                delivery_eircode: sr.delivery_eircode || null,
                delivery_street: sr.delivery_street || null,
                delivery_house_number: sr.delivery_house_number || null,
                delivery_apartment: sr.delivery_apartment || null,
                delivery_area: sr.delivery_area || null,
                delivery_city: sr.delivery_city || null,
                delivery_county: sr.delivery_county || null,
            };

            // Try to find existing client by email first
            let clientId = null;
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('email', sr.client_email)
                .maybeSingle();

            if (existingClient) {
                clientId = existingClient.id;
                // Update existing client
                await supabase.from('clients').update(clientPayload).eq('id', clientId);
            } else {
                // Insert new client
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert([clientPayload])
                    .select()
                    .single();
                if (clientError) throw clientError;
                clientId = newClient.id;
            }

            // 2. Prepare items
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

            // 3. Get quote number
            const { data: qNumData } = await supabase.rpc('generate_quote_number');
            const qNumber = qNumData || `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // 4. Create quote
            const { data: createdQuote, error: quoteError } = await supabase
                .from('quotes')
                .insert([{
                    client_id: clientId,
                    quote_number: qNumber,
                    description: getServiceLabel(sr.service_type),
                    items: finalItems,
                    status: 'pending',
                    service_date: sr.preferred_date,
                    subtotal,
                    discount_percent: Number(discountPercent) || 0,
                    discount_amount: discountAmt,
                    vat_amount: vat,
                    total,
                }])
                .select('*, clients(*)')
                .single();

            if (quoteError) throw quoteError;

            // 5. Update service request status
            await supabase
                .from('service_requests')
                .update({ status: 'quoted' })
                .eq('id', sr.id);

            setIsQuoteModalOpen(false);
            setIsModalOpen(false);
            fetchRequests();

            // Show email confirmation dialog
            setSavedQuoteData(createdQuote);
            setShowEmailConfirm(true);
        } catch (err) {
            console.error('Generate quote error:', err);
            alert('Error generating quote: ' + (err.message || 'Unknown error'));
        } finally {
            setIsGenerating(false);
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

            // Log the email in the quote
            const now = new Date().toISOString();
            const emailLogs = [...(savedQuoteData.email_logs || []), {
                sent_at: now,
                recipient: client.email,
                type: 'quote_pdf',
            }];

            await supabase.from('quotes').update({ email_logs: emailLogs, status: 'sent' }).eq('id', savedQuoteData.id);

            alert('Email sent successfully!');
            setShowEmailConfirm(false);
            setSavedQuoteData(null);
            fetchRequests();
        } catch (err) {
            console.error('Email error:', err);
            alert('Error sending email: ' + (err.message || 'Unknown'));
        } finally {
            setIsSendingEmail(false);
        }
    };

    const columns = [
        { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
        { header: 'Client', accessor: 'client_name' },
        { header: 'Service', accessor: 'service_type', render: (row) => getServiceLabel(row.service_type) },
        { header: 'Pickup', accessor: 'pickup_city' },
        { header: 'Delivery', accessor: 'delivery_city' },
        { header: 'Status', accessor: 'status', render: (row) => getStatusBadge(row.status) },
    ];

    const sr = selectedRequest;

    const DetailRow = ({ label, value }) => value ? (
        <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <span className="text-sm text-gray-800 font-medium text-right max-w-[60%]">{value}</span>
        </div>
    ) : null;

    const formatAddress = (prefix) => {
        if (!sr) return '';
        const parts = [
            sr[`${prefix}_house_number`],
            sr[`${prefix}_street`],
            sr[`${prefix}_apartment`] ? `Apt ${sr[`${prefix}_apartment`]}` : '',
            sr[`${prefix}_area`],
            sr[`${prefix}_city`],
            sr[`${prefix}_county`],
            sr[`${prefix}_eircode`],
        ].filter(Boolean);
        return parts.join(', ');
    };

    return (
        <div className="space-y-6 animate-fade-in pl-4 md:pl-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList size={24} /> Service Requests
                    </h1>
                    <p className="text-sm text-gray-500">View and manage incoming service requests (Click row to view)</p>
                </div>
                <Button onClick={fetchRequests} variant="outline" size="sm">Refresh</Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'All', count: requests.length },
                    { id: 'new', label: 'New', count: requests.filter(r => r.status === 'new').length },
                    { id: 'quoted', label: 'Quoted', count: requests.filter(r => r.status === 'quoted').length },
                    { id: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
                    { id: 'completed', label: 'Completed', count: requests.filter(r => r.status === 'completed').length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                            statusFilter === tab.id
                                ? 'bg-[#8B0000] text-white shadow-md'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] ${
                            statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">
                    <Loader2 className="animate-spin mr-2" /> Loading...
                </div>
            ) : requests.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <ClipboardList size={48} />
                    <p>No service requests yet.</p>
                    <p className="text-xs">Share the public form link: <code className="bg-gray-100 px-2 py-1 rounded">/request</code></p>
                </div>
            ) : (
                <Table
                    columns={columns}
                    data={requests.filter(r => statusFilter === 'all' || r.status === statusFilter)}
                    keyExtractor={(row) => row.id}
                    onRowClick={handleRowClick}
                />
            )}

            {/* Detail Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedRequest(null); }}
                title="Service Request Details"
            >
                {sr && (
                    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Status</span>
                            {getStatusBadge(sr.status)}
                        </div>

                        {/* Client Info */}
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <User size={12} /> Client Information
                            </h4>
                            <DetailRow label="Name" value={sr.client_name} />
                            <DetailRow label="Email" value={sr.client_email} />
                            <DetailRow label="Phone" value={sr.client_phone} />
                            <DetailRow label="WhatsApp" value={sr.client_whatsapp} />
                            <DetailRow label="Residential" value={formatAddress('residential')} />
                        </div>

                        {/* Pickup */}
                        <div className="p-3 rounded-xl bg-green-50/30 border border-green-100 space-y-1">
                            <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <MapPin size={12} /> Pickup Address
                            </h4>
                            {sr.pickup_same_as_residential && (
                                <p className="text-xs text-green-600 italic mb-1">Same as residential address</p>
                            )}
                            <DetailRow label="Address" value={formatAddress('pickup')} />
                            <DetailRow label="Access" value={sr.pickup_access === 'stairs' ? `🪜 Stairs — Floor ${sr.pickup_floor}` : '🛗 Elevator'} />
                        </div>

                        {/* Delivery */}
                        <div className="p-3 rounded-xl bg-blue-50/30 border border-blue-100 space-y-1">
                            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <MapPin size={12} /> Delivery Address
                            </h4>
                            <DetailRow label="Address" value={formatAddress('delivery')} />
                            <DetailRow label="Access" value={sr.delivery_access === 'stairs' ? `🪜 Stairs — Floor ${sr.delivery_floor}` : '🛗 Elevator'} />
                        </div>

                        {/* Service */}
                        <div className="p-3 rounded-xl bg-orange-50/30 border border-orange-100 space-y-1">
                            <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <Truck size={12} /> Service Details
                            </h4>
                            <DetailRow label="Type" value={getServiceLabel(sr.service_type)} />
                            {sr.service_type_other && <DetailRow label="Description" value={sr.service_type_other} />}
                            <DetailRow label="Items" value={sr.includes_furniture ? '🛋️ Includes furniture' : '🧳 Bags & boxes only'} />
                        </div>

                        {/* Furniture Items with Assembly Type */}
                        {sr.items && Array.isArray(sr.items) && sr.items.length > 0 && (
                            <div className="p-3 rounded-xl bg-purple-50/30 border border-purple-100 space-y-1">
                                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Wrench size={12} /> Items & Assembly
                                </h4>
                                {sr.items.map((item, idx) => (
                                    item.description?.trim() && (
                                        <div key={idx} className="flex justify-between py-1.5 border-b border-purple-50">
                                            <span className="text-sm text-gray-800 font-medium">
                                                {item.description} <span className="text-xs text-gray-400">(x{item.quantity || 1})</span>
                                            </span>
                                            <span className="text-xs text-purple-600 font-semibold">
                                                {getAssemblyTypeLabel(item.assembly_type)}
                                            </span>
                                        </div>
                                    )
                                ))}
                                <DetailRow label="Needs Assembly" value={sr.needs_assembly ? '✅ Yes' : '❌ No'} />
                            </div>
                        )}

                        {/* Legacy assembly display (for old records without items jsonb) */}
                        {(!sr.items || !Array.isArray(sr.items) || sr.items.length === 0) && sr.needs_assembly && (
                            <div className="p-3 rounded-xl bg-purple-50/30 border border-purple-100 space-y-1">
                                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Wrench size={12} /> Assembly & Disassembly
                                </h4>
                                <DetailRow label="Items" value={sr.assembly_items} />
                                <DetailRow label="Type" value={sr.assembly_type} />
                            </div>
                        )}

                        {/* Additional */}
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <Calendar size={12} /> Additional Info
                            </h4>
                            <DetailRow label="Parking" value={sr.has_parking ? '✅ Yes' : '❌ No'} />
                            <DetailRow label="Preferred Date" value={sr.preferred_date ? new Date(sr.preferred_date).toLocaleDateString() : '-'} />
                            <DetailRow label="Preferred Time" value={sr.preferred_time || '-'} />
                            {sr.distance_km && <DetailRow label="Distance" value={`${sr.distance_km} km`} />}
                        </div>

                        {/* Generate Quote Button */}
                        {sr.status === 'new' && (
                            <Button
                                onClick={handleOpenQuoteModal}
                                className="w-full bg-[#8B0000] hover:bg-red-900 flex items-center justify-center gap-2"
                            >
                                <FileText size={18} />
                                Generate Quote
                            </Button>
                        )}
                    </div>
                )}
            </Modal>

            {/* Quote Generation Modal */}
            <Modal
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                title="Generate Quote — Set Prices"
            >
                <div className="space-y-4">
                    {/* Items Table */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase px-1">
                            <span className="col-span-5">Description</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-2 text-center">Unit €</span>
                            <span className="col-span-3 text-right">Total €</span>
                        </div>
                        {quoteItems.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                                <div className="col-span-5 flex flex-col">
                                    <span className="text-sm text-gray-800 font-medium break-words">
                                        {item.description.split(' (')[0]}
                                    </span>
                                    {item.description.includes(' (') && (
                                        <span className="text-xs text-gray-500 mt-0.5">
                                            {item.description.substring(item.description.indexOf(' (')).replace(/[()]/g, '').trim()}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number" min="1"
                                    className="col-span-2 w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-red-200 outline-none"
                                    value={item.quantity}
                                    onChange={(e) => updateQuoteItem(idx, 'quantity', e.target.value)}
                                />
                                <input
                                    type="number" min="0" step="0.01"
                                    className="col-span-2 w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-red-200 outline-none"
                                    value={item.unit_price}
                                    onChange={(e) => updateQuoteItem(idx, 'unit_price', e.target.value)}
                                    placeholder="0.00"
                                />
                                <span className="col-span-3 text-sm text-gray-800 font-bold text-right">
                                    €{((Number(item.unit_price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Discount */}
                    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <Percent size={16} className="text-yellow-600" />
                        <div className="flex items-center gap-2 flex-1">
                            <label className="text-xs font-semibold text-yellow-700">Discount</label>
                            <input
                                type="number" min="0" max="100" step="0.5"
                                className="w-20 px-2 py-1.5 border border-yellow-300 rounded-md text-sm text-center focus:ring-2 focus:ring-yellow-200 outline-none"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                                placeholder="0"
                            />
                            <span className="text-xs text-yellow-600">%</span>
                        </div>
                        {Number(discountPercent) > 0 && (
                            <span className="text-sm font-bold text-yellow-700">
                                -€{calcDiscountAmount().toFixed(2)}
                            </span>
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
                            <span className="text-lg font-bold text-gray-900">TOTAL</span>
                            <span className="text-lg font-bold text-[#8B0000]">€{calcTotal().toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setIsQuoteModalOpen(false)}>Cancel</Button>
                        <Button
                            className="flex-1 bg-[#8B0000] hover:bg-red-900"
                            onClick={handleSaveQuote}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            {isGenerating ? 'Saving...' : 'Save Quote'}
                        </Button>
                    </div>
                </div>
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
        </div>
    );
}
