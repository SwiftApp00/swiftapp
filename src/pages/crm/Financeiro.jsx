import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
    Trash2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Wallet, BarChart3, RefreshCw, PieChart, CircleDollarSign, Receipt,
    Plus, Eye, Edit3, Check, CheckCircle, AlertCircle, X, Download, Filter, Calendar, Tag, Loader2
} from 'lucide-react';
import { logAction } from '../../services/auditLogger';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizePdfText } from '../../utils/pdfUtils';

export function Financeiro() {
    const [allRecords, setAllRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('dashboard');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Create/Edit form
    const [form, setForm] = useState({ category: '', description: '', amount: '', due_date: '', customCategory: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Categories from DB
    const [categories, setCategories] = useState([]);

    // Filters
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchAllRecords();
    }, []);

    const fetchAllRecords = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('finance')
            .select(`*, quotes ( quote_number, description, clients ( name ) )`)
            .order('created_at', { ascending: false });

        if (data) {
            setAllRecords(data);
            // Extract unique categories
            const cats = [...new Set(data.map(r => r.category).filter(Boolean))];
            setCategories(cats);
        }
        setLoading(false);
    };

    // Auto-generate next number
    const generateNextNumber = (type) => {
        const prefix = type === 'payable' ? 'PAY' : 'REC';
        const year = new Date().getFullYear();
        const existing = allRecords
            .filter(r => r.finance_number && r.finance_number.startsWith(`${prefix}-${year}`))
            .map(r => parseInt(r.finance_number.split('-')[2]) || 0);
        const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
        return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
    };

    // Status logic: overdue if past due_date and not paid
    const getDisplayStatus = (record) => {
        if (record.status === 'paid') {
            return record.type === 'receivable' ? 'payment_received' : 'paid';
        }
        if (record.due_date && new Date(record.due_date) < new Date()) return 'overdue';
        if (record.status === 'pending') {
            return record.type === 'receivable' ? 'awaiting_payment' : 'pending';
        }
        return record.status || 'open';
    };

    const statusBadge = (status) => {
        const styles = {
            payment_received: 'bg-green-100 text-green-700',
            paid: 'bg-green-100 text-green-700',
            open: 'bg-blue-100 text-blue-700',
            pending: 'bg-yellow-100 text-yellow-700',
            awaiting_payment: 'bg-yellow-100 text-yellow-700',
            overdue: 'bg-red-100 text-red-700'
        };
        const labels = {
            payment_received: 'Payment Received',
            paid: 'Paid',
            open: 'Open',
            pending: 'Pending',
            awaiting_payment: 'Awaiting Payment',
            overdue: 'Overdue'
        };
        return (
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${styles[status] || styles.pending}`}>
                {labels[status] || status}
            </span>
        );
    };

    // CRUD
    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const chosenCategory = form.category === '__custom__' ? form.customCategory : form.category;
            const financeNumber = generateNextNumber('payable');
            const { error } = await supabase.from('finance').insert({
                finance_number: financeNumber,
                type: 'payable',
                category: chosenCategory,
                description: form.description,
                amount: Number(form.amount),
                due_date: form.due_date || null,
                status: 'open'
            });
            if (error) throw error;
            await logAction('CREATE', 'Finance', { finance_number: financeNumber, category: chosenCategory });
            setIsCreateModalOpen(false);
            resetForm();
            fetchAllRecords();
        } catch (err) {
            console.error(err);
            alert(`Error creating record: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedRecord) return;
        setIsSaving(true);
        try {
            const chosenCategory = form.category === '__custom__' ? form.customCategory : form.category;
            const { error } = await supabase.from('finance').update({
                category: chosenCategory,
                description: form.description,
                amount: Number(form.amount),
                due_date: form.due_date || null
            }).eq('id', selectedRecord.id);
            if (error) throw error;
            await logAction('UPDATE', 'Finance', { record_id: selectedRecord.id, finance_number: selectedRecord.finance_number });
            setIsEditModalOpen(false);
            resetForm();
            fetchAllRecords();
        } catch (err) {
            console.error(err);
            alert(`Error updating record: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkPaid = async (id) => {
        const { error } = await supabase.from('finance').update({ status: 'paid' }).eq('id', id);
        if (!error) {
            await logAction('UPDATE_STATUS', 'Finance', { record_id: id, new_status: 'paid' });
            fetchAllRecords();
        }
    };

    const handleDelete = async (id, number) => {
        if (!window.confirm(`Permanently delete "${number || id}"? This cannot be undone.`)) return;
        try {
            const { error } = await supabase.from('finance').delete().eq('id', id);
            if (error) throw error;
            await logAction('DELETE', 'Finance', { record_id: id, record_number: number });
            fetchAllRecords();
        } catch (err) {
            alert('Error deleting record.');
        }
    };

    const resetForm = () => setForm({ category: '', description: '', amount: '', due_date: '', customCategory: '' });

    const openView = (record) => { setSelectedRecord(record); setIsViewModalOpen(true); };
    const openEdit = (record) => {
        setSelectedRecord(record);
        const catExists = categories.includes(record.category);
        setForm({
            category: catExists ? record.category : (record.category ? '__custom__' : ''),
            customCategory: catExists ? '' : (record.category || ''),
            description: record.description || '',
            amount: record.amount || '',
            due_date: record.due_date || ''
        });
        setIsEditModalOpen(true);
    };

    // Filtering
    const getFilteredRecords = (type) => {
        let records = allRecords.filter(r => r.type === type);
        if (filterDateFrom) records = records.filter(r => new Date(r.created_at) >= new Date(filterDateFrom));
        if (filterDateTo) records = records.filter(r => new Date(r.created_at) <= new Date(filterDateTo + 'T23:59:59'));
        if (filterCategory) records = records.filter(r => r.category === filterCategory);
        if (filterStatus) records = records.filter(r => getDisplayStatus(r) === filterStatus);
        return records;
    };

    const clearFilters = () => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCategory(''); setFilterStatus(''); };

    // PDF Export
    const exportPDF = (type) => {
        const records = getFilteredRecords(type);
        const doc = new jsPDF();
        const BRAND = [139, 0, 0];

        doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Swift Transport - ${type === 'receivable' ? 'Accounts Receivable' : 'Accounts Payable'}`, 105, 13, { align: 'center' });

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 190, 28, { align: 'right' });

        let filterText = '';
        if (filterDateFrom || filterDateTo) filterText += `Date: ${filterDateFrom || '...'} to ${filterDateTo || '...'} `;
        if (filterCategory) filterText += `Category: ${filterCategory} `;
        if (filterStatus) filterText += `Status: ${filterStatus} `;
        if (filterText) doc.text(`Filters: ${filterText}`, 20, 28);

        const total = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        autoTable(doc, {
            startY: 35,
            head: [['#', 'Number', 'Category', 'Description', 'Amount (€)', 'Due Date', 'Status']],
            body: records.map((r, i) => [
                i + 1,
                r.finance_number || '-',
                sanitizePdfText(r.category || '-'),
                sanitizePdfText(r.description || r.quotes?.description || '-').substring(0, 40),
                Number(r.amount || 0).toFixed(2),
                r.due_date ? new Date(r.due_date).toLocaleDateString('en-GB') : '-',
                getDisplayStatus(r) === 'payment_received' ? 'PAYMENT RECEIVED' :
                getDisplayStatus(r) === 'awaiting_payment' ? 'AWAITING PAYMENT' :
                getDisplayStatus(r).toUpperCase()
            ]),
            headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 15, right: 15 },
            styles: { fontSize: 8 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
        doc.text(`TOTAL: €${total.toFixed(2)}`, 190, finalY, { align: 'right' });
        doc.text(`Records: ${records.length}`, 15, finalY);

        doc.save(`${type === 'receivable' ? 'Receivable' : 'Payable'}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // Stats
    const stats = useMemo(() => {
        const receivables = allRecords.filter(r => r.type === 'receivable');
        const payables = allRecords.filter(r => r.type === 'payable');
        const totalReceivable = receivables.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const totalPayable = payables.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const paidAll = allRecords.filter(r => r.status === 'paid' && r.type === 'receivable').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const paidPayableAll = allRecords.filter(r => r.status === 'paid' && r.type === 'payable').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const balance = paidAll - paidPayableAll;
        const awaitingPaymentAll = allRecords.filter(r => r.status === 'pending' && r.type === 'receivable').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const pendingAll = allRecords.filter(r => r.status !== 'paid' && !(r.status === 'pending' && r.type === 'receivable') && getDisplayStatus(r) !== 'overdue').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const awaitingPaymentCount = allRecords.filter(r => r.status === 'pending' && r.type === 'receivable').length;
        const paidPayableCount = allRecords.filter(r => r.status === 'paid' && r.type === 'payable').length;
        const pendingPayableAll = allRecords.filter(r => r.status !== 'paid' && r.type === 'payable' && getDisplayStatus(r) !== 'overdue').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const pendingPayableCount = allRecords.filter(r => r.status !== 'paid' && r.type === 'payable' && getDisplayStatus(r) !== 'overdue').length;
        const overdueAll = allRecords.filter(r => getDisplayStatus(r) === 'overdue').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const overduePayableCount = allRecords.filter(r => getDisplayStatus(r) === 'overdue' && r.type === 'payable').length;
        const paidReceivableCount = allRecords.filter(r => r.status === 'paid' && r.type === 'receivable').length;

        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const month = d.toLocaleString('en', { month: 'short' });
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            const mr = allRecords.filter(r => { const dt = new Date(r.created_at); return dt >= monthStart && dt <= monthEnd; });
            monthlyData.push({
                month,
                inflows: mr.filter(r => r.type === 'receivable').reduce((s, r) => s + Number(r.amount || 0), 0),
                outflows: mr.filter(r => r.type === 'payable').reduce((s, r) => s + Number(r.amount || 0), 0)
            });
        }

        return { totalReceivable, totalPayable, balance, paidAll, awaitingPaymentAll, pendingAll, awaitingPaymentCount, paidPayableAll, paidPayableCount, pendingPayableAll, pendingPayableCount, overdueAll, overduePayableCount, monthlyData, receivables, payables, paidReceivableCount };
    }, [allRecords]);

    // Columns for tables
    const makeColumns = (type) => {
        const cols = [
            { header: 'Number', accessor: 'finance_number', render: (row) => <span className="font-mono text-xs font-bold text-gray-600">{row.finance_number || '-'}</span> },
        ];
        if (type === 'receivable') {
            cols.push({ header: 'Quote', accessor: 'quote_id', render: (row) => <span className="font-mono text-xs font-bold text-blue-600">{row.quotes?.quote_number || '-'}</span> });
            cols.push({ header: 'Client', accessor: 'client_name', render: (row) => row.quotes?.clients?.name || '-' });
        }
        if (type === 'payable') {
            cols.push({ header: 'Category', accessor: 'category', render: (row) => (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">{row.category || '-'}</span>
            )});
        }
        cols.push({ header: 'Description', accessor: 'description', render: (row) => (
            <span className="text-sm text-gray-700 truncate max-w-[200px] block">{row.description || row.quotes?.description || '-'}</span>
        )});
        cols.push({ header: 'Amount', accessor: 'amount', render: (row) => <span className="font-bold text-gray-900">€{Number(row.amount || 0).toFixed(2)}</span> });
        cols.push({ header: 'Due Date', accessor: 'due_date', render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString('en-GB') : '-' });
        cols.push({ header: 'Status', accessor: 'status', render: (row) => statusBadge(getDisplayStatus(row)) });
        return cols;
    };

    // Filter bar component
    const FilterBar = ({ type }) => (
        <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">From</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]" />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">To</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]" />
            </div>
            {type === 'payable' && categories.length > 0 && (
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]">
                        <option value="">All</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]">
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="paid">Paid</option>
                    <option value="payment_received">Payment Received</option>
                    <option value="awaiting_payment">Awaiting Payment</option>
                    <option value="overdue">Overdue</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}><X size={14} className="mr-1" /> Clear</Button>
            <Button variant="outline" size="sm" onClick={() => exportPDF(type)}><Download size={14} className="mr-1" /> Export PDF</Button>
        </div>
    );

    // Mini Charts
    const MiniBarChart = ({ data }) => {
        const maxVal = Math.max(...data.map(d => Math.max(d.inflows, d.outflows)), 1);
        return (
            <div className="flex items-end gap-3 h-40 px-2">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-end gap-1 w-full h-32">
                            <div className="flex-1 rounded-t-md" style={{ height: `${(d.inflows / maxVal) * 100}%`, background: 'linear-gradient(to top, #166534, #22c55e)', minHeight: d.inflows > 0 ? '4px' : '0' }} title={`€${d.inflows.toFixed(2)}`} />
                            <div className="flex-1 rounded-t-md" style={{ height: `${(d.outflows / maxVal) * 100}%`, background: 'linear-gradient(to top, #7f1d1d, #dc2626)', minHeight: d.outflows > 0 ? '4px' : '0' }} title={`€${d.outflows.toFixed(2)}`} />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{d.month}</span>
                    </div>
                ))}
            </div>
        );
    };

    const DonutChart = ({ paid, awaiting, pending, paidPayable, overdue, total }) => {
        const circumference = 2 * Math.PI * 54;
        const paidDash = total > 0 ? (paid / total) * circumference : 0;
        const awaitingDash = total > 0 ? (awaiting / total) * circumference : 0;
        const pendingDash = total > 0 ? (pending / total) * circumference : 0;
        const paidPayableDash = total > 0 ? (paidPayable / total) * circumference : 0;
        const overdueDash = total > 0 ? (overdue / total) * circumference : 0;
        return (
            <div className="relative flex items-center justify-center">
                <svg width="140" height="140" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray={`${paidDash} ${circumference}`} strokeLinecap="round" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#eab308" strokeWidth="12" strokeDasharray={`${awaitingDash} ${circumference}`} strokeDashoffset={-paidDash} strokeLinecap="round" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#ea580c" strokeWidth="12" strokeDasharray={`${pendingDash} ${circumference}`} strokeDashoffset={-(paidDash + awaitingDash)} strokeLinecap="round" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#991b1b" strokeWidth="12" strokeDasharray={`${overdueDash} ${circumference}`} strokeDashoffset={-(paidDash + awaitingDash + pendingDash)} strokeLinecap="round" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${paidPayableDash} ${circumference}`} strokeDashoffset={-(paidDash + awaitingDash + pendingDash + overdueDash)} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-lg font-bold text-gray-800">€{total.toFixed(0)}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Total</span>
                </div>
            </div>
        );
    };



    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><CircleDollarSign size={24} /> Finance</h1>
                    <p className="text-sm text-gray-500">Financial overview and transaction management</p>
                </div>
                <Button onClick={fetchAllRecords} variant="outline" size="sm"><RefreshCw size={16} className="mr-2" /> Refresh</Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'receivable', label: 'Accounts Receivable', icon: TrendingUp },
                    { id: 'payable', label: 'Accounts Payable', icon: TrendingDown },
                ].map(t => (
                    <button key={t.id}
                        className={`pb-4 px-2 font-medium flex items-center gap-2 transition-all ${activeView === t.id ? 'text-[#8B0000] border-b-2 border-[#8B0000]' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => { setActiveView(t.id); clearFilters(); }}>
                        <t.icon size={18} />{t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">Loading records...</div>
            ) : (
                <>
                    {/* Dashboard */}
                    {activeView === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div 
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => { setActiveView('receivable'); setFilterStatus('awaiting_payment'); }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Awaiting Payment</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.awaitingPaymentAll.toFixed(2)}</p>
                                            <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-600 mt-2"><ArrowUpRight size={14} />{stats.awaitingPaymentCount} transactions</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fefce8, #fef08a)' }}><CircleDollarSign size={22} className="text-yellow-600" /></div>
                                    </div>
                                </div>
                                <div 
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => { setActiveView('receivable'); setFilterStatus('payment_received'); }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Payment Received</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.paidAll.toFixed(2)}</p>
                                            <span className="flex items-center gap-0.5 text-xs font-bold text-green-600 mt-2"><ArrowUpRight size={14} />{stats.paidReceivableCount} transactions</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)' }}><TrendingUp size={22} className="text-green-600" /></div>
                                    </div>
                                </div>
                                <div 
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => { setActiveView('payable'); setFilterStatus('pending'); }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Outflows (Payable)</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.pendingPayableAll.toFixed(2)}</p>
                                            <span className="flex items-center gap-0.5 text-xs font-bold text-red-600 mt-2"><ArrowDownRight size={14} />{stats.pendingPayableCount} transactions</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fef2f2, #fecaca)' }}><TrendingDown size={22} className="text-red-600" /></div>
                                    </div>
                                </div>
                                <div 
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => { setActiveView('payable'); setFilterStatus('paid'); }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Paid (Payable)</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">€{stats.paidPayableAll.toFixed(2)}</p>
                                            <span className="flex items-center gap-0.5 text-xs font-bold text-red-500 mt-2"><ArrowDownRight size={14} />{stats.paidPayableCount} transactions</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fef2f2, #fca5a5)' }}><CheckCircle size={22} className="text-red-500" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                                <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-center">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}><Wallet size={26} className="text-green-600" /></div>
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Available Balance</p>
                                        <p className="text-3xl font-bold text-gray-900">€{stats.balance.toFixed(2)}</p>
                                        <span className={`flex items-center gap-1 text-sm font-bold mt-4 ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stats.balance >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{allRecords.filter(r => r.status === 'paid').length} records
                                        </span>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2"><BarChart3 size={20} className="text-gray-500" /><h3 className="text-lg font-bold text-gray-900">Cashflow</h3></div>
                                        <div className="flex items-center gap-4 text-xs font-medium">
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} /><span className="text-gray-500">Inflows</span></div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: '#dc2626' }} /><span className="text-gray-500">Outflows</span></div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <MiniBarChart data={stats.monthlyData} />
                                    </div>
                                    {stats.overduePayableCount > 0 && (
                                        <div 
                                            onClick={() => { setActiveView('payable'); setFilterStatus('overdue'); }}
                                            className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                                    <AlertCircle size={16} className="text-red-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-red-900">Overdue Payables</p>
                                                    <p className="text-xs text-red-600">You have {stats.overduePayableCount} overdue account{stats.overduePayableCount > 1 ? 's' : ''} to pay.</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={16} className="text-red-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-2 mb-4"><PieChart size={20} className="text-gray-500" /><h3 className="text-lg font-bold text-gray-900">Payment Status</h3></div>
                                    <div className="flex flex-col items-center gap-4">
                                        <DonutChart paid={stats.paidAll} awaiting={stats.awaitingPaymentAll} pending={stats.pendingAll} overdue={stats.overdueAll} paidPayable={stats.paidPayableAll} total={stats.paidAll + stats.awaitingPaymentAll + stats.pendingAll + stats.overdueAll + stats.paidPayableAll} />
                                        <div className="w-full space-y-3 px-2">
                                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-sm text-gray-600">Payment Received</span></div><span className="text-sm font-bold text-gray-800">€{stats.paidAll.toFixed(2)}</span></div>
                                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span className="text-sm text-gray-600">Awaiting Payment</span></div><span className="text-sm font-bold text-gray-800">€{stats.awaitingPaymentAll.toFixed(2)}</span></div>
                                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-600" /><span className="text-sm text-gray-600">Pending/Open</span></div><span className="text-sm font-bold text-gray-800">€{stats.pendingAll.toFixed(2)}</span></div>
                                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#991b1b]" /><span className="text-sm text-gray-600">Overdue</span></div><span className="text-sm font-bold text-gray-800">€{stats.overdueAll.toFixed(2)}</span></div>
                                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-sm text-gray-600">Paid (Payable)</span></div><span className="text-sm font-bold text-gray-800">€{stats.paidPayableAll.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-4"><Receipt size={20} className="text-gray-500" /><h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3></div>
                                <Table
                                    columns={[
                                        { header: 'Number', accessor: 'finance_number', render: (row) => <span className="font-mono text-xs font-bold text-gray-600">{row.finance_number || '-'}</span> },
                                        { header: 'Type', accessor: 'type', render: (row) => (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.type === 'receivable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {row.type === 'receivable' ? 'Inflow' : 'Outflow'}
                                            </span>
                                        )},
                                        { header: 'Description', accessor: 'description', render: (row) => <span className="text-sm truncate max-w-[180px] block">{row.description || row.quotes?.description || '-'}</span> },
                                        { header: 'Amount', accessor: 'amount', render: (row) => <span className="font-bold text-gray-900">€{Number(row.amount || 0).toFixed(2)}</span> },
                                        { header: 'Status', accessor: 'status', render: (row) => statusBadge(getDisplayStatus(row)) },
                                    ]}
                                    data={allRecords.slice(0, 5)}
                                    keyExtractor={(row) => row.id}
                                    onRowClick={openView}
                                />
                            </div>
                        </div>
                    )}

                    {/* Receivable Tab */}
                    {activeView === 'receivable' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900">Accounts Receivable</h3>
                                <Button variant="outline" size="sm" onClick={() => exportPDF('receivable')}><Download size={14} className="mr-1" /> Export PDF</Button>
                            </div>
                            <FilterBar type="receivable" />
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <Table
                                    columns={makeColumns('receivable')}
                                    data={getFilteredRecords('receivable')}
                                    keyExtractor={(row) => row.id}
                                    onRowClick={openView}
                                    actions={(row) => (
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); openView(row); }} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="View"><Eye size={16} /></button>
                                            {getDisplayStatus(row) !== 'payment_received' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleMarkPaid(row.id); }} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Mark Paid"><Check size={16} /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id, row.finance_number); }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Payable Tab */}
                    {activeView === 'payable' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900">Accounts Payable</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => exportPDF('payable')}><Download size={14} className="mr-1" /> Export PDF</Button>
                                    <Button size="sm" onClick={() => { resetForm(); setIsCreateModalOpen(true); }}><Plus size={14} className="mr-1" /> New Payable</Button>
                                </div>
                            </div>
                            <FilterBar type="payable" />
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <Table
                                    columns={makeColumns('payable')}
                                    data={getFilteredRecords('payable')}
                                    keyExtractor={(row) => row.id}
                                    onRowClick={openView}
                                    actions={(row) => (
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); openView(row); }} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="View"><Eye size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit"><Edit3 size={16} /></button>
                                            {getDisplayStatus(row) !== 'paid' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleMarkPaid(row.id); }} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Mark Paid"><Check size={16} /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id, row.finance_number); }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="New Account Payable">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Category *</label>
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                            required className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]">
                            <option value="">Select a category...</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="__custom__">+ New category</option>
                        </select>
                    </div>
                    {form.category === '__custom__' && (
                        <Input label="New Category Name" placeholder="e.g. Fuel, Insurance, Maintenance..."
                            required value={form.customCategory} onChange={e => setForm({ ...form, customCategory: e.target.value })} />
                    )}
                    <Input label="Description *" placeholder="Describe the expense..." required
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Amount (€) *" type="number" step="0.01" min="0" placeholder="0.00" required
                            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Due Date</label>
                            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]" />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus size={16} className="mr-2" />}
                            Create Account Payable
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit ${selectedRecord?.finance_number || ''}`}>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Category *</label>
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                            required className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]">
                            <option value="">Select a category...</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="__custom__">+ New category</option>
                        </select>
                    </div>
                    {form.category === '__custom__' && (
                        <Input label="New Category Name" placeholder="e.g. Fuel, Insurance, Maintenance..."
                            required value={form.customCategory} onChange={e => setForm({ ...form, customCategory: e.target.value })} />
                    )}
                    <Input label="Description *" placeholder="Describe the expense..." required
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Amount (€) *" type="number" step="0.01" min="0" placeholder="0.00" required
                            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Due Date</label>
                            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]" />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Edit3 size={16} className="mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`${selectedRecord?.finance_number || 'Record Details'}`}>
                {selectedRecord && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Number</p>
                                <p className="text-sm font-bold text-gray-800 font-mono">{selectedRecord.finance_number || '-'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Type</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedRecord.type === 'receivable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {selectedRecord.type === 'receivable' ? 'Receivable' : 'Payable'}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Amount</p>
                                <p className="text-lg font-bold text-gray-900">€{Number(selectedRecord.amount || 0).toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                                {statusBadge(getDisplayStatus(selectedRecord))}
                            </div>
                            {selectedRecord.category && (
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Category</p>
                                    <p className="text-sm font-medium text-gray-700">{selectedRecord.category}</p>
                                </div>
                            )}
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Due Date</p>
                                <p className="text-sm font-medium text-gray-700">{selectedRecord.due_date ? new Date(selectedRecord.due_date).toLocaleDateString('en-GB') : 'Not set'}</p>
                            </div>
                            {selectedRecord.quotes?.quote_number && (
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Quote</p>
                                    <p className="text-sm font-bold text-blue-600 font-mono">{selectedRecord.quotes.quote_number}</p>
                                </div>
                            )}
                            {selectedRecord.quotes?.clients?.name && (
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Client</p>
                                    <p className="text-sm font-medium text-gray-700">{selectedRecord.quotes.clients.name}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Description</p>
                            <p className="text-sm text-gray-700 mt-1">{selectedRecord.description || selectedRecord.quotes?.description || 'No description'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Created</p>
                            <p className="text-sm text-gray-700">{new Date(selectedRecord.created_at).toLocaleString('en-GB')}</p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            {getDisplayStatus(selectedRecord) !== 'paid' && (
                                <Button className="flex-1" onClick={() => { handleMarkPaid(selectedRecord.id); setIsViewModalOpen(false); }}>
                                    <Check size={16} className="mr-2" /> Mark as Paid
                                </Button>
                            )}
                            {selectedRecord.type === 'payable' && (
                                <Button variant="outline" className="flex-1" onClick={() => { setIsViewModalOpen(false); openEdit(selectedRecord); }}>
                                    <Edit3 size={16} className="mr-2" /> Edit
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
