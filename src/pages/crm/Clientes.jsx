import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Plus, Search, MapPin, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

export function Clientes() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearchingEircode, setIsSearchingEircode] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

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

    const handleRowClick = (client) => {
        setEditingClient(client);
        setFormData({
            identification: client.identification || '',
            identification_type: client.identification_type || '',
            name: client.name || '',
            eircode: client.eircode || '',
            address: client.address || '',
            whatsapp: client.whatsapp || '',
            email: client.email || '',
            instagram: client.instagram || ''
        });
        setIsModalOpen(true);
    };

    const handleIdChange = (e) => {
        const val = e.target.value.toUpperCase();
        setFormData(prev => ({ ...prev, identification: val }));

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
            } else {
                alert("Eircode not found. Please enter address manually.");
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
            if (editingClient) {
                const { error } = await supabase
                    .from('clients')
                    .update({
                        name: formData.name,
                        identification: formData.identification,
                        identification_type: formData.identification_type,
                        eircode: formData.eircode,
                        address: formData.address,
                        whatsapp: formData.whatsapp,
                        email: formData.email,
                        instagram: formData.instagram
                    })
                    .eq('id', editingClient.id);
                if (error) throw error;
            } else {
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
            }

            handleCloseModal();
            fetchClients();
        } catch (err) {
            console.error("Save client error:", err);
            alert("Error saving client. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingClient || !window.confirm("Are you sure you want to delete this client?")) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', editingClient.id);
            if (error) throw error;
            handleCloseModal();
            fetchClients();
        } catch (err) {
            console.error("Delete client error:", err);
            alert("Error deleting client.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
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
    };

    const isIdValid = formData.identification_type === 'Company / Legal Entity' || formData.identification_type === 'Individual / Natural Person';
    const isEircodeValid = formData.eircode.replace(/\s/g, '').length === 7;
    const showEircode = isIdValid || editingClient;
    const showRestOfForm = (isEircodeValid && formData.address) || editingClient;

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
                    <p className="text-sm text-gray-500">Manage your customers and business partners (Click a row to edit)</p>
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
                    onRowClick={handleRowClick}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingClient ? "Edit Client" : "Register New Client"}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-6 pt-2">
                        {/* 1. Identification Section */}
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${isIdValid ? 'bg-green-50/30 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <Input
                                label="Identification (ID)"
                                placeholder="7 numbers + 1 letter or 1-6 numbers"
                                value={formData.identification}
                                onChange={handleIdChange}
                                required
                            />
                            {formData.identification && (
                                <div className={`text-xs font-bold mt-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 ${isIdValid ? 'text-green-600' : 'text-[#8B0000]'}`}>
                                    {isIdValid ? <CheckCircle2 size={12} /> : <Search size={12} />}
                                    {isIdValid ? `Validated: ${formData.identification_type}` : `Type Detected: ${formData.identification_type}`}
                                </div>
                            )}
                        </div>

                        {/* 2. Eircode Section - Progressive Reveal */}
                        {showEircode && (
                            <div className={`space-y-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 duration-500 ${showRestOfForm ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-50'}`}>
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
                                        <div className="absolute right-3 bottom-0.5">
                                            <Loader2 size={16} className="animate-spin text-[#8B0000]" />
                                        </div>
                                    )}
                                </div>
                                {formData.address && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <Input
                                            label="Full Address (Auto-filled)"
                                            type="textarea"
                                            value={formData.address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                            required
                                            inputClassName="bg-white/50"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. The Rest - Final Reveal */}
                        {showRestOfForm && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <Input
                                    label="Full Name / Company Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    className="md:col-span-2"
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
                                    className="md:col-span-2"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                        {editingClient && (
                            <Button
                                type="button"
                                variant="outline"
                                className="flex items-center gap-2 text-red-600 border-red-100 hover:bg-red-50"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                <Trash2 size={18} />
                                Delete
                            </Button>
                        )}
                        <div className="flex-1 flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={handleCloseModal}
                            >
                                Cancel
                            </Button>
                            {showRestOfForm && (
                                <Button
                                    type="submit"
                                    className="flex-1 bg-[#8B0000] hover:bg-red-900"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (editingClient ? 'Update Client' : 'Register Client')}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
