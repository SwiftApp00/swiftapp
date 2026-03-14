/**
 * Security Utilities for Client-Facing Components
 * Input validation, sanitization, rate limiting, CSRF, IP logging
 */

// ============================================================
// 1. DATA SANITIZATION
// ============================================================

/**
 * Strips HTML tags, script injections, and dangerous patterns from a string.
 */
export const sanitizeInput = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/<[^>]*>/g, '')                         // Strip HTML tags
        .replace(/javascript:/gi, '')                     // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '')                       // Remove event handlers (onclick=, onerror=, etc.)
        .replace(/data:\s*text\/html/gi, '')              // Block data:text/html
        .replace(/['";]\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|UNION|SELECT)\b/gi, '') // SQL patterns
        .replace(/--/g, '')                               // SQL comment
        .trim();
};

/**
 * Sanitize an entire object's string values (shallow).
 */
export const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'object' ? sanitizeObject(item) : typeof item === 'string' ? sanitizeInput(item) : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};


// ============================================================
// 2. INPUT VALIDATION
// ============================================================

const VALIDATORS = {
    email: {
        regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        message: 'Please enter a valid email address.',
    },
    name: {
        validate: (val) => val && val.trim().length >= 2 && val.trim().length <= 100,
        message: 'Name must be between 2 and 100 characters.',
    },
    phone: {
        regex: /^[+]?[\d\s()-]{7,20}$/,
        message: 'Please enter a valid phone number.',
    },
    eircode: {
        regex: /^[A-Z]\d[\dW]\s?\w{4}$/i,
        message: 'Please enter a valid Irish Eircode (e.g. D01 AB12).',
    },
    date: {
        validate: (val) => !val || !isNaN(Date.parse(val)),
        message: 'Please enter a valid date.',
    },
    maxLength: (max) => ({
        validate: (val) => !val || String(val).length <= max,
        message: `Maximum ${max} characters allowed.`,
    }),
};

/**
 * Validates a value against a named validator.
 * @returns {{ valid: boolean, message?: string }}
 */
export const validateField = (type, value, options = {}) => {
    const validator = typeof type === 'string' ? VALIDATORS[type] : type;
    if (!validator) return { valid: true };

    if (validator.regex) {
        const valid = validator.regex.test(value);
        return { valid, message: valid ? undefined : validator.message };
    }
    if (validator.validate) {
        const valid = validator.validate(value);
        return { valid, message: valid ? undefined : validator.message };
    }
    return { valid: true };
};

/**
 * Validate the entire service request form.
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export const validateServiceRequestForm = (form) => {
    const errors = {};

    // Required fields
    if (!form.client_name?.trim()) errors.client_name = 'Name is required.';
    else {
        const r = validateField('name', form.client_name);
        if (!r.valid) errors.client_name = r.message;
    }

    if (!form.client_email?.trim()) errors.client_email = 'Email is required.';
    else {
        const r = validateField('email', form.client_email);
        if (!r.valid) errors.client_email = r.message;
    }

    if (form.client_whatsapp) {
        const r = validateField('phone', form.client_whatsapp);
        if (!r.valid) errors.client_whatsapp = r.message;
    }

    // Pickup city required
    if (!form.pickup_city?.trim()) errors.pickup_city = 'Pickup city is required.';

    // Delivery city required
    if (!form.delivery_city?.trim()) errors.delivery_city = 'Delivery city is required.';

    // Service type required
    if (!form.service_type) errors.service_type = 'Please select a service type.';

    // Max length checks
    const lengthChecks = {
        client_name: 100, client_email: 120, client_whatsapp: 20,
        residential_street: 200, pickup_street: 200, delivery_street: 200,
        residential_apartment: 20, pickup_apartment: 20, delivery_apartment: 20,
        service_type_other: 500,
    };

    for (const [field, max] of Object.entries(lengthChecks)) {
        if (form[field] && String(form[field]).length > max) {
            errors[field] = `Maximum ${max} characters allowed.`;
        }
    }

    return { valid: Object.keys(errors).length === 0, errors };
};


// ============================================================
// 3. RATE LIMITING (Client-side)
// ============================================================

const RATE_LIMIT_KEY_PREFIX = 'swift_rl_';

/**
 * Check if an action is rate-limited.
 * @param {string} action - Action name (e.g. 'form_submit', 'chat_message')
 * @param {number} maxAttempts - Max attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remainingMs?: number }}
 */
export const checkRateLimit = (action, maxAttempts, windowMs) => {
    const key = RATE_LIMIT_KEY_PREFIX + action;
    const now = Date.now();

    try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        // Filter to only timestamps within the window
        const recent = stored.filter(ts => now - ts < windowMs);

        if (recent.length >= maxAttempts) {
            const oldestInWindow = Math.min(...recent);
            const remainingMs = windowMs - (now - oldestInWindow);
            return { allowed: false, remainingMs };
        }

        // Record this attempt
        recent.push(now);
        localStorage.setItem(key, JSON.stringify(recent));
        return { allowed: true };
    } catch {
        return { allowed: true }; // Fail open if localStorage is unavailable
    }
};

/**
 * Reset rate limit for an action (e.g., after successful submission confirmation).
 */
export const resetRateLimit = (action) => {
    try {
        localStorage.removeItem(RATE_LIMIT_KEY_PREFIX + action);
    } catch { /* ignore */ }
};


// ============================================================
// 4. CSRF TOKEN
// ============================================================

const CSRF_KEY = 'swift_csrf_token';

/**
 * Generate a random CSRF token and store it in sessionStorage.
 * Returns the token.
 */
export const generateCsrfToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(CSRF_KEY, token);
    return token;
};

/**
 * Get the current CSRF token (or generate one if none exists).
 */
export const getCsrfToken = () => {
    let token = sessionStorage.getItem(CSRF_KEY);
    if (!token) token = generateCsrfToken();
    return token;
};

/**
 * Validate a CSRF token against the stored one.
 */
export const validateCsrfToken = (token) => {
    const stored = sessionStorage.getItem(CSRF_KEY);
    return stored && stored === token;
};


// ============================================================
// 5. IP CAPTURE (for logging)
// ============================================================

let cachedIp = null;

/**
 * Fetch the client's public IP address (cached).
 * @returns {Promise<string|null>}
 */
export const getClientIp = async () => {
    if (cachedIp) return cachedIp;
    try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        cachedIp = data.ip || null;
        return cachedIp;
    } catch {
        return null; // Non-blocking — don't break the form if IP capture fails
    }
};


// ============================================================
// 6. INPUT LENGTH LIMITS (for HTML maxLength attributes)
// ============================================================

export const INPUT_LIMITS = {
    name: 100,
    email: 120,
    phone: 20,
    street: 200,
    houseNumber: 20,
    apartment: 20,
    area: 100,
    city: 100,
    county: 100,
    eircode: 8,
    chatMessage: 500,
    serviceTypeOther: 500,
};
