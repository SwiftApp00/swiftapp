import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { getDistanceBetweenEircodes } from '../../services/distanceService';
import translations from '../../i18n/formTranslations';
import { Loader2, CheckCircle2, MapPin, Truck, Package, Wrench, ParkingCircle, Calendar } from 'lucide-react';

// Eircode routing key map (first 3 chars → City/County)
const EIRCODE_ROUTING_KEYS = {
    'A41': { city: 'Portlaoise', county: 'County Laois' }, 'A63': { city: 'Portlaoise', county: 'County Laois' },
    'A75': { city: 'Abbeyleix', county: 'County Laois' }, 'A81': { city: 'Tullamore', county: 'County Offaly' },
    'A86': { city: 'Banagher', county: 'County Offaly' }, 'A91': { city: 'Ennis', county: 'County Clare' },
    'A92': { city: 'Longford', county: 'County Longford' }, 'A94': { city: 'Blackrock', county: 'County Dublin' },
    'A96': { city: 'Glenageary', county: 'County Dublin' }, 'A98': { city: 'Bray', county: 'County Wicklow' },
    'C15': { city: 'Maynooth', county: 'County Kildare' },
    'D01': { city: 'Dublin 1', county: 'County Dublin' }, 'D02': { city: 'Dublin 2', county: 'County Dublin' },
    'D03': { city: 'Dublin 3', county: 'County Dublin' }, 'D04': { city: 'Dublin 4', county: 'County Dublin' },
    'D05': { city: 'Dublin 5', county: 'County Dublin' }, 'D06': { city: 'Dublin 6', county: 'County Dublin' },
    'D6W': { city: 'Dublin 6W', county: 'County Dublin' }, 'D07': { city: 'Dublin 7', county: 'County Dublin' },
    'D08': { city: 'Dublin 8', county: 'County Dublin' }, 'D09': { city: 'Dublin 9', county: 'County Dublin' },
    'D10': { city: 'Dublin 10', county: 'County Dublin' }, 'D11': { city: 'Dublin 11', county: 'County Dublin' },
    'D12': { city: 'Dublin 12', county: 'County Dublin' }, 'D13': { city: 'Dublin 13', county: 'County Dublin' },
    'D14': { city: 'Dublin 14', county: 'County Dublin' }, 'D15': { city: 'Dublin 15', county: 'County Dublin' },
    'D16': { city: 'Dublin 16', county: 'County Dublin' }, 'D17': { city: 'Dublin 17', county: 'County Dublin' },
    'D18': { city: 'Dublin 18', county: 'County Dublin' }, 'D20': { city: 'Dublin 20', county: 'County Dublin' },
    'D22': { city: 'Dublin 22', county: 'County Dublin' }, 'D24': { city: 'Dublin 24', county: 'County Dublin' },
    'E21': { city: 'Baltinglass', county: 'County Wicklow' }, 'E25': { city: 'Arklow', county: 'County Wicklow' },
    'E32': { city: 'Athy', county: 'County Kildare' }, 'E41': { city: 'Carlow', county: 'County Carlow' },
    'E53': { city: 'Enniscorthy', county: 'County Wexford' }, 'E91': { city: 'Wexford', county: 'County Wexford' },
    'F12': { city: 'Castlebar', county: 'County Mayo' }, 'F26': { city: 'Ballina', county: 'County Mayo' },
    'F42': { city: 'Ballaghaderreen', county: 'County Roscommon' }, 'F45': { city: 'Roscommon', county: 'County Roscommon' },
    'F91': { city: 'Galway', county: 'County Galway' }, 'F92': { city: 'Galway', county: 'County Galway' },
    'H12': { city: 'Sligo', county: 'County Sligo' }, 'H18': { city: 'Carrick-on-Shannon', county: 'County Leitrim' },
    'H23': { city: 'Cavan', county: 'County Cavan' }, 'H53': { city: 'Monaghan', county: 'County Monaghan' },
    'H62': { city: 'Dundalk', county: 'County Louth' }, 'H65': { city: 'Navan', county: 'County Meath' },
    'K32': { city: 'Swords', county: 'County Dublin' }, 'K36': { city: 'Malahide', county: 'County Dublin' },
    'K45': { city: 'Naas', county: 'County Kildare' }, 'K67': { city: 'Newbridge', county: 'County Kildare' },
    'N37': { city: 'Athlone', county: 'County Westmeath' }, 'N41': { city: 'Mullingar', county: 'County Westmeath' },
    'P12': { city: 'Cork', county: 'County Cork' }, 'P14': { city: 'Cork', county: 'County Cork' },
    'P31': { city: 'Cork', county: 'County Cork' }, 'P51': { city: 'Cork', county: 'County Cork' },
    'T12': { city: 'Cork', county: 'County Cork' }, 'T23': { city: 'Cork', county: 'County Cork' },
    'T34': { city: 'Dungarvan', county: 'County Waterford' }, 'T45': { city: 'Clonmel', county: 'County Tipperary' },
    'V14': { city: 'Listowel', county: 'County Kerry' }, 'V15': { city: 'Tralee', county: 'County Kerry' },
    'V92': { city: 'Killarney', county: 'County Kerry' }, 'V94': { city: 'Limerick', county: 'County Limerick' },
    'V95': { city: 'Limerick', county: 'County Limerick' },
    'W12': { city: 'Wicklow', county: 'County Wicklow' }, 'W23': { city: 'Greystones', county: 'County Wicklow' },
    'W91': { city: 'Waterford', county: 'County Waterford' }, 'X91': { city: 'Waterford', county: 'County Waterford' },
    'Y14': { city: 'Drogheda', county: 'County Louth' }, 'Y21': { city: 'Navan', county: 'County Meath' },
    'Y25': { city: 'Trim', county: 'County Meath' }, 'Y34': { city: 'Dundalk', county: 'County Louth' },
    'Y35': { city: 'Wexford', county: 'County Wexford' }, 'R32': { city: 'Kilkenny', county: 'County Kilkenny' },
    'R95': { city: 'Kilkenny', county: 'County Kilkenny' }, 'R93': { city: 'Carlow', county: 'County Carlow' },
};

const initialForm = {
    client_name: '', client_email: '', client_whatsapp: '',
    residential_eircode: '', residential_street: '', residential_house_number: '',
    residential_apartment: '', residential_area: '', residential_city: '', residential_county: '',
    pickup_same_as_residential: false,
    pickup_eircode: '', pickup_street: '', pickup_house_number: '',
    pickup_apartment: '', pickup_area: '', pickup_city: '', pickup_county: '',
    pickup_access: 'elevator', pickup_floor: '',
    delivery_eircode: '', delivery_street: '', delivery_house_number: '',
    delivery_apartment: '', delivery_area: '', delivery_city: '', delivery_county: '',
    delivery_access: 'elevator', delivery_floor: '',
    service_type: '', service_type_other: '',
    includes_furniture: null,
    needs_assembly: null, assembly_items: '', assembly_type: '',
    has_parking: null,
    preferred_date: '', preferred_time: '',
};

export function ServiceRequestForm() {
    const [lang, setLang] = useState(() => localStorage.getItem('sr_lang') || 'en');
    const [form, setForm] = useState(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [searchingEircode, setSearchingEircode] = useState({});

    const t = translations[lang];

    const changeLang = (l) => { setLang(l); localStorage.setItem('sr_lang', l); };
    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    // Distance Calculation Logic
    useEffect(() => {
        const calculateDistance = async () => {
            const e1 = form.pickup_eircode?.replace(/\s/g, '');
            const e2 = form.delivery_eircode?.replace(/\s/g, '');

            if (e1?.length === 7 && e2?.length === 7) {
                const dist = await getDistanceBetweenEircodes(e1, e2);
                if (dist) {
                    setForm(prev => ({ ...prev, distance_km: dist }));
                }
            }
        };
        const timer = setTimeout(calculateDistance, 1000); // Debounce
        return () => clearTimeout(timer);
    }, [form.pickup_eircode, form.delivery_eircode]);

    // Eircode logic
    const handleEircode = async (val, prefix) => {
        let clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (clean.length > 3) clean = clean.slice(0, 3) + ' ' + clean.slice(3, 7);
        set(`${prefix}_eircode`, clean);

        const raw = clean.replace(/\s/g, '');
        if (raw.length === 7) {
            setSearchingEircode(prev => ({ ...prev, [prefix]: true }));
            const routingKey = raw.substring(0, 3);
            const local = EIRCODE_ROUTING_KEYS[routingKey];
            const base = { street: '', house_number: '', city: local?.city || '', county: local?.county || '', area: '' };

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${raw}&countrycodes=ie&format=json&addressdetails=1`);
                const data = await res.json();
                if (data?.length > 0) {
                    const addr = data[0].address;
                    base.street = addr.road || addr.pedestrian || addr.path || '';
                    base.house_number = addr.house_number || '';
                    base.area = addr.suburb || addr.neighbourhood || '';
                    if (addr.city || addr.town || addr.village) base.city = addr.city || addr.town || addr.village;
                    if (addr.county) base.county = addr.county;
                }
            } catch (e) { console.error(e); }

            setForm(prev => ({
                ...prev,
                [`${prefix}_street`]: base.street || prev[`${prefix}_street`],
                [`${prefix}_house_number`]: base.house_number || prev[`${prefix}_house_number`],
                [`${prefix}_area`]: base.area || prev[`${prefix}_area`],
                [`${prefix}_city`]: base.city || prev[`${prefix}_city`],
                [`${prefix}_county`]: base.county || prev[`${prefix}_county`],
            }));
            setSearchingEircode(prev => ({ ...prev, [prefix]: false }));
        }
    };

    const handleSameAsResidential = (checked) => {
        set('pickup_same_as_residential', checked);
        if (checked) {
            setForm(prev => ({
                ...prev,
                pickup_same_as_residential: true,
                pickup_eircode: prev.residential_eircode,
                pickup_street: prev.residential_street,
                pickup_house_number: prev.residential_house_number,
                pickup_apartment: prev.residential_apartment,
                pickup_area: prev.residential_area,
                pickup_city: prev.residential_city,
                pickup_county: prev.residential_county,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const params = new URLSearchParams(window.location.search);
            const leadId = params.get('lead_id');

            const { error } = await supabase.from('service_requests').insert([{
                ...form,
                lead_id: leadId || null,
            }]);
            if (error) throw error;

            // Trigger Email Notifications (Secondary, don't block on error)
            supabase.functions.invoke('send-service-request-emails', {
                body: {
                    client_name: form.client_name,
                    client_email: form.client_email,
                    service_type: form.service_type === 'other' ? form.service_type_other : form.service_type,
                    pickup_city: form.pickup_city,
                    delivery_city: form.delivery_city,
                }
            }).catch(e => console.error('Email trigger failed:', e));

            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Error submitting form. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reusable Address Block
    const AddressBlock = ({ prefix, disabled = false }) => (
        <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.eircode} *</label>
                <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                    placeholder={t.eircodePlaceholder} maxLength={8}
                    value={form[`${prefix}_eircode`]}
                    onChange={(e) => handleEircode(e.target.value, prefix)}
                />
                {searchingEircode[prefix] && <Loader2 size={14} className="animate-spin absolute right-3 top-8 text-red-600" />}
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.street}</label>
                <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                    value={form[`${prefix}_street`]} onChange={(e) => set(`${prefix}_street`, e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.houseNumber}</label>
                    <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                        value={form[`${prefix}_house_number`]} onChange={(e) => set(`${prefix}_house_number`, e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.apartment}</label>
                    <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                        value={form[`${prefix}_apartment`]} onChange={(e) => set(`${prefix}_apartment`, e.target.value)} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.area}</label>
                <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                    value={form[`${prefix}_area`]} onChange={(e) => set(`${prefix}_area`, e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.city} *</label>
                    <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                        value={form[`${prefix}_city`]} onChange={(e) => set(`${prefix}_city`, e.target.value)} required />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.county} *</label>
                    <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                        value={form[`${prefix}_county`]} onChange={(e) => set(`${prefix}_county`, e.target.value)} required />
                </div>
            </div>
        </div>
    );

    // Access type (Stairs / Elevator)
    const AccessBlock = ({ prefix }) => (
        <div className="space-y-3 pt-3 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-500">{t.accessType}</label>
            <div className="flex gap-3">
                <button type="button"
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form[`${prefix}_access`] === 'stairs' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    onClick={() => set(`${prefix}_access`, 'stairs')}>
                    🪜 {t.stairs}
                </button>
                <button type="button"
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form[`${prefix}_access`] === 'elevator' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    onClick={() => set(`${prefix}_access`, 'elevator')}>
                    🛗 {t.elevator}
                </button>
            </div>
            {form[`${prefix}_access`] === 'stairs' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.floorNumber} *</label>
                    <input type="number" min="0" max="30"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                        value={form[`${prefix}_floor`]} onChange={(e) => set(`${prefix}_floor`, e.target.value)} required />
                </div>
            )}
        </div>
    );

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center space-y-4 animate-in fade-in zoom-in duration-500">
                    <CheckCircle2 size={64} className="text-green-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900">{t.successTitle}</h2>
                    <p className="text-gray-500">{t.successMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 py-8 px-4">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                    <img src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png"
                        alt="Swift" className="h-16 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">{t.formTitle}</h1>
                    <p className="text-sm text-gray-500">{t.formSubtitle}</p>
                    {/* Language Toggle */}
                    <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => changeLang('en')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-[#8B0000] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            🇬🇧 EN
                        </button>
                        <button type="button" onClick={() => changeLang('pt')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${lang === 'pt' ? 'bg-[#8B0000] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            🇧🇷 PT-BR
                        </button>
                    </div>
                </div>

                {/* Section 1: Client Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        👤 {t.sectionClient}
                    </h3>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{t.fullName} *</label>
                        <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                            value={form.client_name} onChange={(e) => set('client_name', e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">{t.email} *</label>
                            <input type="email" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                                value={form.client_email} onChange={(e) => set('client_email', e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">{t.whatsapp}</label>
                            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-sm"
                                placeholder={t.whatsappPlaceholder} value={form.client_whatsapp} onChange={(e) => set('client_whatsapp', e.target.value)} />
                        </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 space-y-3">
                        <label className="block text-xs font-semibold text-gray-400 uppercase">{t.residentialAddress}</label>
                        <AddressBlock prefix="residential" />
                    </div>
                </div>

                {/* Section 2: Pickup Address */}
                <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider flex items-center gap-2">
                        <MapPin size={16} /> {t.sectionPickup}
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={form.pickup_same_as_residential}
                            onChange={(e) => handleSameAsResidential(e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-400" />
                        <span className="text-sm text-gray-600 group-hover:text-gray-800">{t.sameAsResidential}</span>
                    </label>
                    <AddressBlock prefix="pickup" disabled={form.pickup_same_as_residential} />
                    <AccessBlock prefix="pickup" />
                </div>

                {/* Section 3: Delivery Address */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                        <MapPin size={16} /> {t.sectionDelivery}
                    </h3>
                    <AddressBlock prefix="delivery" />
                    <AccessBlock prefix="delivery" />

                    {/* Distance Indicator */}
                    {form.distance_km && (
                        <div className="pt-2 animate-in fade-in zoom-in duration-500">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Truck size={16} className="animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{t.estimatedDistance}</span>
                                </div>
                                <span className="text-lg font-black text-blue-800">
                                    {form.distance_km} <span className="text-xs font-normal opacity-70">{t.km}</span>
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 4: Type of Service */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Truck size={16} /> {t.sectionService}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { key: 'house_removal', icon: '🏠', label: t.houseRemoval },
                            { key: 'waste_removal', icon: '🗑️', label: t.wasteRemoval },
                            { key: 'transport', icon: '📦', label: t.transport },
                            { key: 'other', icon: '📝', label: t.other },
                        ].map((opt) => (
                            <button key={opt.key} type="button"
                                className={`py-4 px-3 rounded-xl border-2 text-center transition-all ${form.service_type === opt.key
                                    ? 'border-[#8B0000] bg-red-50 text-[#8B0000] shadow-sm'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                onClick={() => set('service_type', opt.key)}>
                                <span className="text-2xl block mb-1">{opt.icon}</span>
                                <span className="text-xs font-semibold">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    {form.service_type === 'other' && (
                        <textarea className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 outline-none text-sm resize-none"
                            rows={3} placeholder={t.otherPlaceholder}
                            value={form.service_type_other} onChange={(e) => set('service_type_other', e.target.value)} />
                    )}
                </div>

                {/* Section 5: Items */}
                {form.service_type && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Package size={16} /> {t.sectionItems}
                        </h3>
                        <p className="text-sm text-gray-600">{t.itemsQuestion}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button type="button"
                                className={`p-4 rounded-xl border-2 text-left transition-all ${form.includes_furniture === true
                                    ? 'border-[#8B0000] bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                                onClick={() => set('includes_furniture', true)}>
                                <span className="text-2xl">🛋️</span>
                                <p className="text-sm font-semibold mt-2 text-gray-800">{t.yesFurniture}</p>
                                <p className="text-xs text-gray-400 mt-1">{t.furnitureExamples}</p>
                            </button>
                            <button type="button"
                                className={`p-4 rounded-xl border-2 text-left transition-all ${form.includes_furniture === false
                                    ? 'border-[#8B0000] bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                                onClick={() => set('includes_furniture', false)}>
                                <span className="text-2xl">🧳</span>
                                <p className="text-sm font-semibold mt-2 text-gray-800">{t.noBags}</p>
                                <p className="text-xs text-gray-400 mt-1">{t.bagsExamples}</p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Section 6: Assembly */}
                {form.includes_furniture !== null && (
                    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2">
                            <Wrench size={16} /> {t.sectionAssembly}
                        </h3>
                        <p className="text-sm text-gray-600">{t.assemblyQuestion}</p>
                        <div className="flex gap-3">
                            <button type="button"
                                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.needs_assembly === true ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                                onClick={() => set('needs_assembly', true)}>
                                ✅ {t.yes}
                            </button>
                            <button type="button"
                                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.needs_assembly === false ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
                                onClick={() => set('needs_assembly', false)}>
                                ❌ {t.no}
                            </button>
                        </div>
                        {form.needs_assembly === true && (
                            <div className="space-y-3 animate-in fade-in duration-300">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.assemblyItemsLabel}</label>
                                    <textarea className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none text-sm resize-none"
                                        rows={3} placeholder={t.assemblyItemsPlaceholder}
                                        value={form.assembly_items} onChange={(e) => set('assembly_items', e.target.value)} />
                                </div>
                                {form.assembly_items && (
                                    <div className="animate-in fade-in duration-300">
                                        <label className="block text-xs font-semibold text-gray-500 mb-2">{t.assemblyTypeQuestion}</label>
                                        <div className="flex gap-2">
                                            {[
                                                { key: 'assembly_only', label: t.assemblyOnly },
                                                { key: 'disassembly_only', label: t.disassemblyOnly },
                                                { key: 'both', label: t.both },
                                            ].map((opt) => (
                                                <button key={opt.key} type="button"
                                                    className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${form.assembly_type === opt.key
                                                        ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}
                                                    onClick={() => set('assembly_type', opt.key)}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Section 7: Additional Info */}
                {form.needs_assembly !== null && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Calendar size={16} /> {t.sectionAdditional}
                        </h3>
                        <div>
                            <p className="text-sm text-gray-600 mb-2">{t.parkingQuestion}</p>
                            <div className="flex gap-3">
                                <button type="button"
                                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.has_parking === true ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                                    onClick={() => set('has_parking', true)}>
                                    ✅ {t.yes}
                                </button>
                                <button type="button"
                                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${form.has_parking === false ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
                                    onClick={() => set('has_parking', false)}>
                                    ❌ {t.no}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.preferredDate}</label>
                                <input type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 outline-none text-sm"
                                    value={form.preferred_date} onChange={(e) => set('preferred_date', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.preferredTime}</label>
                                <input type="time" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 outline-none text-sm"
                                    value={form.preferred_time} onChange={(e) => set('preferred_time', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit */}
                {form.needs_assembly !== null && (
                    <button type="submit" disabled={isSubmitting}
                        className="w-full py-4 bg-[#8B0000] hover:bg-red-900 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 animate-in fade-in duration-500">
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : null}
                        {isSubmitting ? t.submitting : t.submit}
                    </button>
                )}
            </form>
        </div>
    );
}
