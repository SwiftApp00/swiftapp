import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ClipboardList, Eye, FileText, Loader2, MapPin, Truck, Wrench, ParkingCircle, Calendar, User, Package } from 'lucide-react';

export function ServiceRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => { fetchRequests(); }, []);

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

    const handleGenerateQuote = async () => {
        if (!selectedRequest) return;
        setIsGenerating(true);
        const sr = selectedRequest;

        try {
            // 1. Upsert client
            const clientPayload = {
                name: sr.client_name,
                email: sr.client_email,
                phone: sr.client_phone,
                whatsapp: sr.client_whatsapp,
                eircode: sr.residential_eircode,
                street: sr.residential_street,
                house_number: sr.residential_house_number,
                apartment: sr.residential_apartment,
                area: sr.residential_area,
                city: sr.residential_city,
                county: sr.residential_county,
                delivery_eircode: sr.delivery_eircode,
                delivery_street: sr.delivery_street,
                delivery_house_number: sr.delivery_house_number,
                delivery_apartment: sr.delivery_apartment,
                delivery_area: sr.delivery_area,
                delivery_city: sr.delivery_city,
                delivery_county: sr.delivery_county,
            };

            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .insert([clientPayload])
                .select()
                .single();

            if (clientError) throw clientError;

            // 2. Prepare items for the quote
            const quoteItems = [
                {
                    description: `${getServiceLabel(sr.service_type)}${sr.service_type_other ? `: ${sr.service_type_other}` : ''}`,
                    quantity: 1,
                    unit_price: 0, // Manual entry needed in CRM later, but defaulting
                    total: 0
                }
            ];

            if (sr.needs_assembly) {
                quoteItems.push({
                    description: `Assembly/Disassembly: ${sr.assembly_items}`,
                    quantity: 1,
                    unit_price: 0,
                    total: 0
                });
            }

            // 3. Get next quote number
            const { data: qNumData } = await supabase.rpc('generate_quote_number');
            const qNumber = qNumData || `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // 4. Create quote
            const { error: quoteError } = await supabase
                .from('quotes')
                .insert([{
                    client_id: clientData.id,
                    quote_number: qNumber,
                    description: getServiceLabel(sr.service_type),
                    items: quoteItems,
                    status: 'pending',
                    service_date: sr.preferred_date,
                    subtotal: 0,
                    vat_amount: 0,
                    total: 0
                }]);

            if (quoteError) throw quoteError;

            // 5. Update service request status
            await supabase
                .from('service_requests')
                .update({ status: 'quoted' })
                .eq('id', sr.id);

            alert(`Quote ${qNumber} generated successfully! Check the Quotes section to set the price.`);
            setIsModalOpen(false);
            fetchRequests();
        } catch (err) {
            console.error('Generate quote error:', err);
            alert('Error generating quote.');
        } finally {
            setIsGenerating(false);
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
                    data={requests}
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

                        {/* Assembly */}
                        {sr.needs_assembly && (
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
                                onClick={handleGenerateQuote}
                                className="w-full bg-[#8B0000] hover:bg-red-900 flex items-center justify-center gap-2"
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                {isGenerating ? 'Generating...' : 'Generate Quote'}
                            </Button>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
