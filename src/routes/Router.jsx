import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public Public
import { Landing } from '../pages/Landing';
import { Login } from '../pages/Login';

// Layout Wrappers
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { CRMLayout } from '../components/layout/CRMLayout';

// CRM Pages
import { Dashboard } from '../pages/crm/Dashboard';
import { Leads } from '../pages/crm/Leads';
import { Clientes } from '../pages/crm/Clientes';
import { Orcamentos } from '../pages/crm/Orcamentos';
import { Financeiro } from '../pages/crm/Financeiro';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Protected CRM Routes */}
            <Route path="/crm" element={<ProtectedRoute />}>
                <Route element={<CRMLayout />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="orcamentos" element={<Orcamentos />} />
                    <Route path="financeiro" element={<Financeiro />} />
                    <Route path="" element={<Navigate to="/crm/dashboard" replace />} />
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
