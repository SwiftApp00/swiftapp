import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Plus, Search, MapPin, Loader2 } from 'lucide-react';

export function Clientes() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearchingEircode, setIsSearchingEircode] = useState(false);

    const [formData, setFormData] = useState({
        identification: '',
        identification_type: '',
        name: '',
        eircode: '',
        address: '',
        whatsapp: '',
        email: '',
        instagram: ''
    });

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

    const handleIdChange = (e) => {
        const val = e.target.value.toUpperCase();
        setFormData(prev => ({ ...prev, identification: val }));

        // Logic: 
        // Company: 1-6 digits
        // Individual: 7 numbers + 1-2 letters
        const digitsOnly = val.replace(/[^0-9]/g, '');
        const lettersOnly = val.replace(/[^A-Z]/g, '');

        if (val.length > 0) {
            if (/^\d{1,6}$/.test(val)) {
                setFormData(prev => ({ ...prev, identification_type: 'Company / Legal Entity' }));
            } else if (/^\d{7}[A-Z]{1,2}$/.test(val)) {
                setFormData(prev => ({ ...prev, identification_type: 'Individual / Natural Person' }));
            } else {
                setFormData(prev => ({ ...prev, identification_type: 'Checking...' }));
            }
        } else {
            setFormData(prev => ({ ...prev, identification_type: '' }));
        }
    };

    const handleEircodeChange = async (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 3) {
            val = val.slice(0, 3) + ' ' + val.slice(3, 7);
        }
        setFormData(prev => ({ ...prev, eircode: val }));

        // Nominatim Lookup when fully typed (7 characters excluding space)
        const cleanVal = val.replace(/\s/g, '');
        if (cleanVal.length === 7) {
            searchAddress(cleanVal);
        }
    };

    const searchAddress = async (eircode) => {
        setIsSearchingEircode(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${eircode},Ireland&format=json&addressdetails=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const result = data[0];
                setFormData(prev => ({ ...prev, address: result.display_name }));
            }
        } catch (err) {
            console.error("Nominatim error:", err);
        } finally {
            setIsSearchingEircode(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('clients')
                .insert([{
                    name: formData.name,
                    identification: formData.identification,
                    identification_type: formData.identification_type,
                    eircode: formData.eircode,
                    address: formData.address,
                    whatsapp: formData.whatsapp,
                    email: formData.email,
                    instagram: formData.instagram
                }]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({
                identification: '',
                identification_type: '',
                name: '',
                eircode: '',
                address: '',
                whatsapp: '',
                email: '',
                instagram: ''
            });
            fetchClients();
        } catch (err) {
            console.error("Save client error:", err);
            alert("Error saving client. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { header: 'Client Since', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
        { header: 'Name', accessor: 'name' },
        { header: 'Type', accessor: 'identification_type' },
        { header: 'Eircode', accessor: 'eircode' },
        { header: 'Email', accessor: 'email' },
    ];

    return (
        <div className="space-y-6 animate-fade-in pl-4 md:pl-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-sm text-gray-500">Manage your customers and business partners</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                        <Plus size={18} />
                        Add New Client
                    </Button>
                    <Button onClick={fetchClients} variant="outline" size="sm">Refresh</Button>
                </div>
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Register New Client"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4 pt-2">
                        {/* ID Section */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                            <Input
                                label="Identification (ID)"
                                placeholder="7 numbers + 1 letter or 1-6 numbers"
                                value={formData.identification}
                                onChange={handleIdChange}
                                required
                            />
                            {formData.identification && (
                                <div className="text-xs font-bold text-[#8B0000] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                                    <Search size={12} />
                                    Type Detected: {formData.identification_type}
                                </div>
                            )}
                        </div>

                        {/* Address Section */}
                        <div className="space-y-3 p-4 bg-red-50/30 rounded-xl border border-red-50">
                            <div className="relative">
                                <Input
                                    label="Eircode"
                                    placeholder="XXX XXXX"
                                    value={formData.eircode}
                                    onChange={handleEircodeChange}
                                    maxLength={8}
                                    required
                                />
                                {isSearchingEircode && (
                                    <div className="absolute right-3 bottom-2.5">
                                        <Loader2 size={16} className="animate-spin text-[#8B0000]" />
                                    </div>
                                )}
                            </div>
                            <Input
                                label="Full Address"
                                type="textarea"
                                placeholder="Auto-filled via Eircode lookup..."
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Full Name / Company Name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                            <Input
                                label="WhatsApp"
                                placeholder="+353 ..."
                                value={formData.whatsapp}
                                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <Input
                                label="Instagram"
                                placeholder="@username"
                                value={formData.instagram}
                                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 size={18} className="animate-spin" />
                                    Saving...
                                </div>
                            ) : 'Register Client'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
