import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Plus, Search, MapPin, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

// Irish Eircode Routing Key → City / County mapping
// The first 3 characters of an Eircode identify the area
const EIRCODE_ROUTING_KEYS = {
    'A41': { city: 'Portlaoise', county: 'County Laois' },
    'A63': { city: 'Portlaoise', county: 'County Laois' },
    'A67': { city: 'Mountmellick', county: 'County Laois' },
    'A75': { city: 'Abbeyleix', county: 'County Laois' },
    'A81': { city: 'Tullamore', county: 'County Offaly' },
    'A83': { city: 'Birr', county: 'County Offaly' },
    'A85': { city: 'Edenderry', county: 'County Offaly' },
    'A86': { city: 'Banagher', county: 'County Offaly' },
    'A91': { city: 'Ennis', county: 'County Clare' },
    'A92': { city: 'Longford', county: 'County Longford' },
    'A94': { city: 'Blackrock', county: 'County Dublin' },
    'A96': { city: 'Glenageary', county: 'County Dublin' },
    'A98': { city: 'Bray', county: 'County Wicklow' },
    'C15': { city: 'Maynooth', county: 'County Kildare' },
    'D01': { city: 'Dublin 1', county: 'County Dublin' },
    'D02': { city: 'Dublin 2', county: 'County Dublin' },
    'D03': { city: 'Dublin 3', county: 'County Dublin' },
    'D04': { city: 'Dublin 4', county: 'County Dublin' },
    'D05': { city: 'Dublin 5', county: 'County Dublin' },
    'D06': { city: 'Dublin 6', county: 'County Dublin' },
    'D6W': { city: 'Dublin 6W', county: 'County Dublin' },
    'D07': { city: 'Dublin 7', county: 'County Dublin' },
    'D08': { city: 'Dublin 8', county: 'County Dublin' },
    'D09': { city: 'Dublin 9', county: 'County Dublin' },
    'D10': { city: 'Dublin 10', county: 'County Dublin' },
    'D11': { city: 'Dublin 11', county: 'County Dublin' },
    'D12': { city: 'Dublin 12', county: 'County Dublin' },
    'D13': { city: 'Dublin 13', county: 'County Dublin' },
    'D14': { city: 'Dublin 14', county: 'County Dublin' },
    'D15': { city: 'Dublin 15', county: 'County Dublin' },
    'D16': { city: 'Dublin 16', county: 'County Dublin' },
    'D17': { city: 'Dublin 17', county: 'County Dublin' },
    'D18': { city: 'Dublin 18', county: 'County Dublin' },
    'D20': { city: 'Dublin 20', county: 'County Dublin' },
    'D22': { city: 'Dublin 22', county: 'County Dublin' },
    'D24': { city: 'Dublin 24', county: 'County Dublin' },
    'E21': { city: 'Baltinglass', county: 'County Wicklow' },
    'E25': { city: 'Arklow', county: 'County Wicklow' },
    'E32': { city: 'Athy', county: 'County Kildare' },
    'E34': { city: 'Castledermot', county: 'County Kildare' },
    'E41': { city: 'Carlow', county: 'County Carlow' },
    'E45': { city: 'Bagenalstown', county: 'County Carlow' },
    'E53': { city: 'Enniscorthy', county: 'County Wexford' },
    'E91': { city: 'Wexford', county: 'County Wexford' },
    'F12': { city: 'Castlebar', county: 'County Mayo' },
    'F23': { city: 'Claremorris', county: 'County Mayo' },
    'F25': { city: 'Westport', county: 'County Mayo' },
    'F26': { city: 'Ballina', county: 'County Mayo' },
    'F28': { city: 'Belmullet', county: 'County Mayo' },
    'F31': { city: 'Ballinrobe', county: 'County Mayo' },
    'F35': { city: 'Knock', county: 'County Mayo' },
    'F42': { city: 'Ballaghaderreen', county: 'County Roscommon' },
    'F45': { city: 'Roscommon', county: 'County Roscommon' },
    'F52': { city: 'Strokestown', county: 'County Roscommon' },
    'F56': { city: 'Castlerea', county: 'County Roscommon' },
    'F91': { city: 'Galway', county: 'County Galway' },
    'F92': { city: 'Galway', county: 'County Galway' },
    'F93': { city: 'Galway', county: 'County Galway' },
    'F94': { city: 'Galway', county: 'County Galway' },
    'H12': { city: 'Sligo', county: 'County Sligo' },
    'H14': { city: 'Tubbercurry', county: 'County Sligo' },
    'H16': { city: 'Ballymote', county: 'County Sligo' },
    'H18': { city: 'Carrick-on-Shannon', county: 'County Leitrim' },
    'H23': { city: 'Cavan', county: 'County Cavan' },
    'H53': { city: 'Monaghan', county: 'County Monaghan' },
    'H54': { city: 'Clones', county: 'County Monaghan' },
    'H62': { city: 'Dundalk', county: 'County Louth' },
    'H65': { city: 'Navan', county: 'County Meath' },
    'H71': { city: 'Donegal', county: 'County Donegal' },
    'H91': { city: 'Galway', county: 'County Galway' },
    'K32': { city: 'Swords', county: 'County Dublin' },
    'K34': { city: 'Skerries', county: 'County Dublin' },
    'K36': { city: 'Malahide', county: 'County Dublin' },
    'K45': { city: 'Naas', county: 'County Kildare' },
    'K56': { city: 'Clane', county: 'County Kildare' },
    'K67': { city: 'Newbridge', county: 'County Kildare' },
    'K78': { city: 'Kildare', county: 'County Kildare' },
    'N37': { city: 'Athlone', county: 'County Westmeath' },
    'N39': { city: 'Moate', county: 'County Westmeath' },
    'N41': { city: 'Mullingar', county: 'County Westmeath' },
    'N91': { city: 'Mullingar', county: 'County Westmeath' },
    'P12': { city: 'Cork', county: 'County Cork' },
    'P14': { city: 'Cork', county: 'County Cork' },
    'P17': { city: 'Carrigaline', county: 'County Cork' },
    'P24': { city: 'Youghal', county: 'County Cork' },
    'P25': { city: 'Midleton', county: 'County Cork' },
    'P31': { city: 'Cork', county: 'County Cork' },
    'P32': { city: 'Mallow', county: 'County Cork' },
    'P36': { city: 'Fermoy', county: 'County Cork' },
    'P43': { city: 'Mitchelstown', county: 'County Cork' },
    'P47': { city: 'Macroom', county: 'County Cork' },
    'P51': { city: 'Cork', county: 'County Cork' },
    'P56': { city: 'Cobh', county: 'County Cork' },
    'P61': { city: 'Bantry', county: 'County Cork' },
    'P67': { city: 'Bandon', county: 'County Cork' },
    'P72': { city: 'Skibbereen', county: 'County Cork' },
    'P75': { city: 'Clonakilty', county: 'County Cork' },
    'P81': { city: 'Dunmanway', county: 'County Cork' },
    'P85': { city: 'Kinsale', county: 'County Cork' },
    'R14': { city: 'Gorey', county: 'County Wexford' },
    'R21': { city: 'New Ross', county: 'County Wexford' },
    'R32': { city: 'Kilkenny', county: 'County Kilkenny' },
    'R35': { city: 'Thomastown', county: 'County Kilkenny' },
    'R42': { city: 'Tipperary', county: 'County Tipperary' },
    'R45': { city: 'Cashel', county: 'County Tipperary' },
    'R56': { city: 'Thurles', county: 'County Tipperary' },
    'R93': { city: 'Carlow', county: 'County Carlow' },
    'R95': { city: 'Kilkenny', county: 'County Kilkenny' },
    'T12': { city: 'Cork', county: 'County Cork' },
    'T23': { city: 'Cork', county: 'County Cork' },
    'T34': { city: 'Dungarvan', county: 'County Waterford' },
    'T45': { city: 'Clonmel', county: 'County Tipperary' },
    'T56': { city: 'Nenagh', county: 'County Tipperary' },
    'V14': { city: 'Listowel', county: 'County Kerry' },
    'V15': { city: 'Tralee', county: 'County Kerry' },
    'V23': { city: 'Cahersiveen', county: 'County Kerry' },
    'V31': { city: 'Castlemaine', county: 'County Kerry' },
    'V35': { city: 'Killorglin', county: 'County Kerry' },
    'V42': { city: 'Newcastle West', county: 'County Limerick' },
    'V63': { city: 'Dingle', county: 'County Kerry' },
    'V92': { city: 'Killarney', county: 'County Kerry' },
    'V93': { city: 'Kenmare', county: 'County Kerry' },
    'V94': { city: 'Limerick', county: 'County Limerick' },
    'V95': { city: 'Limerick', county: 'County Limerick' },
    'W12': { city: 'Wicklow', county: 'County Wicklow' },
    'W23': { city: 'Greystones', county: 'County Wicklow' },
    'W34': { city: 'Dunlavin', county: 'County Wicklow' },
    'W91': { city: 'Waterford', county: 'County Waterford' },
    'X35': { city: 'Roscrea', county: 'County Tipperary' },
    'X42': { city: 'Waterford', county: 'County Waterford' },
    'X91': { city: 'Waterford', county: 'County Waterford' },
    'Y14': { city: 'Drogheda', county: 'County Louth' },
    'Y21': { city: 'Navan', county: 'County Meath' },
    'Y25': { city: 'Trim', county: 'County Meath' },
    'Y34': { city: 'Dundalk', county: 'County Louth' },
    'Y35': { city: 'Wexford', county: 'County Wexford' },
};

export function Clientes() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearchingEircode, setIsSearchingEircode] = useState(false);
    const [isSearchingDeliveryEircode, setIsSearchingDeliveryEircode] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    const [formData, setFormData] = useState({
        identification: '',
        identification_type: '',
        name: '',
        eircode: '',
        street: '',
        house_number: '',
        apartment: '',
        area: '',
        city: '',
        county: '',
        delivery_eircode: '',
        delivery_street: '',
        delivery_house_number: '',
        delivery_apartment: '',
        delivery_area: '',
        delivery_city: '',
        delivery_county: '',
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
            street: client.street || '',
            house_number: client.house_number || '',
            apartment: client.apartment || '',
            area: client.area || '',
            city: client.city || '',
            county: client.county || '',
            delivery_eircode: client.delivery_eircode || '',
            delivery_street: client.delivery_street || '',
            delivery_house_number: client.delivery_house_number || '',
            delivery_apartment: client.delivery_apartment || '',
            delivery_area: client.delivery_area || '',
            delivery_city: client.delivery_city || '',
            delivery_county: client.delivery_county || '',
            whatsapp: client.whatsapp || '',
            email: client.email || '',
            instagram: client.instagram || ''
        });
        setHasSearched(true);
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

    const handleEircodeChange = async (e, type = 'main') => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 3) {
            val = val.slice(0, 3) + ' ' + val.slice(3, 7);
        }

        if (type === 'main') {
            setFormData(prev => ({ ...prev, eircode: val }));
            const cleanVal = val.replace(/\s/g, '');
            if (cleanVal.length === 7) searchAddress(cleanVal, 'main');
        } else {
            setFormData(prev => ({ ...prev, delivery_eircode: val }));
            const cleanVal = val.replace(/\s/g, '');
            if (cleanVal.length === 7) searchAddress(cleanVal, 'delivery');
        }
    };

    const searchAddress = async (eircode, type) => {
        if (type === 'main') setIsSearchingEircode(true);
        else setIsSearchingDeliveryEircode(true);

        // Step 1: Get city/county from routing key (first 3 chars) — instant and reliable
        const routingKey = eircode.substring(0, 3).toUpperCase();
        const localData = EIRCODE_ROUTING_KEYS[routingKey];

        const baseData = {
            street: '',
            house_number: '',
            city: localData?.city || '',
            county: localData?.county || '',
            area: ''
        };

        try {
            // Step 2: Try Nominatim for street-level detail (may or may not work)
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${eircode}&countrycodes=ie&format=json&addressdetails=1`);
            const data = await res.json();

            if (data && data.length > 0) {
                const addr = data[0].address;
                // Merge Nominatim data on top of local data
                baseData.street = addr.road || addr.pedestrian || addr.cycleway || addr.path || '';
                baseData.house_number = addr.house_number || '';
                baseData.area = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || '';
                // Nominatim city/county overrides local if available
                if (addr.city || addr.town || addr.village) {
                    baseData.city = addr.city || addr.town || addr.village || baseData.city;
                }
                if (addr.county) {
                    baseData.county = addr.county || baseData.county;
                }
            }
        } catch (err) {
            console.error("Nominatim error:", err);
        }

        // Apply data to form
        if (type === 'main') {
            setHasSearched(true);
            setFormData(prev => ({
                ...prev,
                street: baseData.street || prev.street,
                house_number: baseData.house_number || prev.house_number,
                city: baseData.city || prev.city,
                county: baseData.county || prev.county,
                area: baseData.area || prev.area
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                delivery_street: baseData.street || prev.delivery_street,
                delivery_house_number: baseData.house_number || prev.delivery_house_number,
                delivery_city: baseData.city || prev.delivery_city,
                delivery_county: baseData.county || prev.delivery_county,
                delivery_area: baseData.area || prev.delivery_area
            }));
        }

        if (type === 'main') setIsSearchingEircode(false);
        else setIsSearchingDeliveryEircode(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            name: formData.name,
            identification: formData.identification,
            identification_type: formData.identification_type,
            eircode: formData.eircode,
            street: formData.street,
            house_number: formData.house_number,
            apartment: formData.apartment,
            area: formData.area,
            city: formData.city,
            county: formData.county,
            delivery_eircode: formData.delivery_eircode,
            delivery_street: formData.delivery_street,
            delivery_house_number: formData.delivery_house_number,
            delivery_apartment: formData.delivery_apartment,
            delivery_area: formData.delivery_area,
            delivery_city: formData.delivery_city,
            delivery_county: formData.delivery_county,
            whatsapp: formData.whatsapp,
            email: formData.email,
            instagram: formData.instagram
        };

        try {
            if (editingClient) {
                const { error } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', editingClient.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('clients')
                    .insert([payload]);
                if (error) throw error;
            }

            handleCloseModal();
            fetchClients();
        } catch (err) {
            console.error("Save client error:", err);
            alert("Error saving client.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingClient || !window.confirm("Are you sure?")) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('clients').delete().eq('id', editingClient.id);
            if (error) throw error;
            handleCloseModal();
            fetchClients();
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        setHasSearched(false);
        setFormData({
            identification: '', identification_type: '', name: '',
            eircode: '', street: '', house_number: '', apartment: '', area: '', city: '', county: '',
            delivery_eircode: '', delivery_street: '', delivery_house_number: '', delivery_apartment: '', delivery_area: '', delivery_city: '', delivery_county: '',
            whatsapp: '', email: '', instagram: ''
        });
    };

    const isIdValid = formData.identification_type === 'Company / Legal Entity' || formData.identification_type === 'Individual / Natural Person';
    const isEircodeValid = formData.eircode.replace(/\s/g, '').length === 7;
    const showEircode = isIdValid || editingClient;
    const showRestOfForm = (isEircodeValid && hasSearched) || editingClient;

    const columns = [
        { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
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
                    <p className="text-sm text-gray-500">Manage your customers (Click row to edit)</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                        <Plus size={18} /> Add New Client
                    </Button>
                    <Button onClick={fetchClients} variant="outline" size="sm">Refresh</Button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
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
                        {/* 1. Identification */}
                        <div className={`p-4 rounded-xl border transition-all ${isIdValid ? 'bg-green-50/30 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <Input
                                label="Identification (ID)"
                                placeholder="7 numbers + 1 letter or 1-6 numbers"
                                value={formData.identification}
                                onChange={handleIdChange}
                                required
                            />
                            {formData.identification && (
                                <div className={`text-xs font-bold mt-2 flex items-center gap-1.5 ${isIdValid ? 'text-green-600' : 'text-[#8B0000]'}`}>
                                    {isIdValid ? <CheckCircle2 size={12} /> : <Search size={12} />}
                                    {isIdValid ? `Validated: ${formData.identification_type}` : `Type Detected: ${formData.identification_type}`}
                                </div>
                            )}
                        </div>

                        {/* 2. Main Address Section */}
                        {showEircode && (
                            <div className={`space-y-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 duration-500 ${showRestOfForm ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-50'}`}>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={14} /> Main Address
                                </h4>

                                <div className="relative">
                                    <Input
                                        label="Eircode"
                                        placeholder="XXX XXXX"
                                        value={formData.eircode}
                                        onChange={(e) => handleEircodeChange(e, 'main')}
                                        maxLength={8}
                                        required
                                    />
                                    {isSearchingEircode && (
                                        <div className="absolute right-3 bottom-0.5">
                                            <Loader2 size={16} className="animate-spin text-[#8B0000]" />
                                        </div>
                                    )}
                                </div>

                                {showRestOfForm && (
                                    <div className="space-y-3 pt-2 border-t border-gray-100 animate-in fade-in duration-300">
                                        <Input
                                            label="Street / Road / Avenue"
                                            value={formData.street}
                                            onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="House Number / Name"
                                                value={formData.house_number}
                                                onChange={(e) => setFormData(prev => ({ ...prev, house_number: e.target.value }))}
                                            />
                                            <Input
                                                label="Apartment / Unit / Floor"
                                                value={formData.apartment}
                                                onChange={(e) => setFormData(prev => ({ ...prev, apartment: e.target.value }))}
                                            />
                                        </div>
                                        <Input
                                            label="Area / District"
                                            value={formData.area}
                                            onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="City / Town"
                                                value={formData.city}
                                                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                                required
                                            />
                                            <Input
                                                label="County"
                                                value={formData.county}
                                                onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Delivery Address Section */}
                        {showRestOfForm && (
                            <div className="space-y-4 p-4 rounded-xl border border-blue-100 bg-blue-50/10 animate-in fade-in slide-in-from-top-4 duration-500">
                                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={14} /> Delivery Address
                                </h4>

                                <div className="relative">
                                    <Input
                                        label="Delivery Eircode"
                                        placeholder="XXX XXXX"
                                        value={formData.delivery_eircode}
                                        onChange={(e) => handleEircodeChange(e, 'delivery')}
                                        maxLength={8}
                                    />
                                    {isSearchingDeliveryEircode && (
                                        <div className="absolute right-3 bottom-0.5">
                                            <Loader2 size={16} className="animate-spin text-blue-600" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-2 border-t border-blue-50">
                                    <Input
                                        label="Delivery Street"
                                        value={formData.delivery_street}
                                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_street: e.target.value }))}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="House Number / Name"
                                            value={formData.delivery_house_number}
                                            onChange={(e) => setFormData(prev => ({ ...prev, delivery_house_number: e.target.value }))}
                                        />
                                        <Input
                                            label="Apartment / Unit / Floor"
                                            value={formData.delivery_apartment}
                                            onChange={(e) => setFormData(prev => ({ ...prev, delivery_apartment: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="City / Town"
                                            value={formData.delivery_city}
                                            onChange={(e) => setFormData(prev => ({ ...prev, delivery_city: e.target.value }))}
                                        />
                                        <Input
                                            label="County"
                                            value={formData.delivery_county}
                                            onChange={(e) => setFormData(prev => ({ ...prev, delivery_county: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Personal Info */}
                        {showRestOfForm && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 pt-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Information</h4>
                                <Input
                                    label="Full Name / Company Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="WhatsApp"
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                                    />
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                                <Input
                                    label="Instagram"
                                    placeholder="@username"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                        {editingClient && (
                            <Button
                                type="button"
                                variant="outline"
                                className="text-red-600 border-red-100 hover:bg-red-50"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                <Trash2 size={18} />
                            </Button>
                        )}
                        <div className="flex-1 flex gap-3">
                            <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>Cancel</Button>
                            {showRestOfForm && (
                                <Button type="submit" className="flex-1 bg-[#8B0000] hover:bg-red-900" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingClient ? 'Update' : 'Register')}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
