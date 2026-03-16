import { supabase } from './supabaseClient';

/**
 * Logs an action to the audit_logs table.
 * @param {string} action - The action performed (e.g., 'DELETE', 'CREATE', 'UPDATE')
 * @param {string} module - The system module (e.g., 'Leads', 'Quotes')
 * @param {Object} details - Additional details about the action
 */
export const logAction = async (action, module, details = {}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('audit_logs').insert([{
            user_id: user?.id || null,
            action,
            module,
            details
        }]);
    } catch (err) {
        console.error('Audit Logging Error:', err);
    }
};
