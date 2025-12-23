// API Configuration and Utilities
const API_BASE_URL = 'http://localhost:8000';

// Token Management
const TokenManager = {
    getAccessToken: () => localStorage.getItem('access_token'),
    getRefreshToken: () => localStorage.getItem('refresh_token'),
    setTokens: (access, refresh) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },
    clearTokens: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },
    isAuthenticated: () => !!localStorage.getItem('access_token')
};

// Generic DRF Error Parser
// Handles various Django REST Framework error response formats
const ErrorParser = {
    /**
     * Parse DRF error response into human-readable messages
     * Handles: {field: [errors]}, {detail: "error"}, {non_field_errors: []}, strings, arrays
     */
    parse(error) {
        // If it's already a string, try to parse as JSON
        if (typeof error === 'string') {
            try {
                error = JSON.parse(error);
            } catch (e) {
                return error; // Return as-is if not JSON
            }
        }

        // If null or undefined
        if (!error) {
            return 'An unexpected error occurred';
        }

        // If it's an array, join the messages
        if (Array.isArray(error)) {
            return error.map(e => this.parse(e)).join('. ');
        }

        // If it's an object, process each field
        if (typeof error === 'object') {
            const messages = [];

            for (const [key, value] of Object.entries(error)) {
                // Skip empty values
                if (!value) continue;

                // Handle common DRF keys
                if (key === 'detail') {
                    messages.push(this.parse(value));
                } else if (key === 'non_field_errors') {
                    messages.push(this.parse(value));
                } else if (key === 'message') {
                    messages.push(this.parse(value));
                } else {
                    // Field-specific error - format nicely
                    const fieldName = this.formatFieldName(key);
                    const fieldErrors = this.parse(value);
                    messages.push(`${fieldName}: ${fieldErrors}`);
                }
            }

            return messages.length > 0 ? messages.join('. ') : 'An error occurred';
        }

        // Fallback for primitives
        return String(error);
    },

    /**
     * Convert snake_case field names to Title Case
     */
    formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    },

    /**
     * Extract errors from an Error object or response
     */
    fromError(error) {
        if (error instanceof Error) {
            return this.parse(error.message);
        }
        return this.parse(error);
    }
};

// API Request Helper
const API = {
    // Make authenticated request
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = TokenManager.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            let response = await fetch(url, {
                ...options,
                headers
            });

            // If 401, try to refresh token
            if (response.status === 401 && TokenManager.getRefreshToken()) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${TokenManager.getAccessToken()}`;
                    response = await fetch(url, { ...options, headers });
                } else {
                    // Refresh failed, redirect to login
                    TokenManager.clearTokens();
                    window.location.href = 'login.html';
                    return null;
                }
            }

            return response;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    // Refresh access token
    async refreshToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: TokenManager.getRefreshToken() })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    },

    // GET request
    async get(endpoint) {
        const response = await this.request(endpoint, { method: 'GET' });
        if (response && response.ok) {
            return await response.json();
        }
        throw new Error(`GET ${endpoint} failed`);
    },

    // POST request
    async post(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (response && (response.ok || response.status === 201)) {
            return await response.json();
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorData) || `POST ${endpoint} failed`);
    },

    // PUT request
    async put(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (response && response.ok) {
            return await response.json();
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorData) || `PUT ${endpoint} failed`);
    },

    // PATCH request
    async patch(endpoint, data) {
        const response = await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (response && response.ok) {
            return await response.json();
        }
        throw new Error(`PATCH ${endpoint} failed`);
    },

    // DELETE request
    async delete(endpoint) {
        const response = await this.request(endpoint, { method: 'DELETE' });
        if (response && (response.ok || response.status === 204)) {
            return true;
        }
        throw new Error(`DELETE ${endpoint} failed`);
    },

    // POST with FormData (for file uploads)
    async postFormData(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = TokenManager.getAccessToken();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });

        if (response.ok || response.status === 201) {
            return await response.json();
        }
        throw new Error(`POST ${endpoint} failed`);
    },

    // PUT with FormData (for file uploads)
    async putFormData(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = TokenManager.getAccessToken();
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });

        if (response.ok) {
            return await response.json();
        }
        throw new Error(`PUT ${endpoint} failed`);
    }
};

// Authentication Check
function requireAuth() {
    if (!TokenManager.isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// UI Helpers
const UI = {
    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loadingOverlay';
        overlay.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.remove();
    },

    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    },

    showError(message) {
        this.showAlert(message, 'danger');
    },

    showSuccess(message) {
        this.showAlert(message, 'success');
    },

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    getStatusBadge(status) {
        const badges = {
            'IN_STOCK': '<span class="badge badge-in-stock">In Stock</span>',
            'LOW_STOCK': '<span class="badge badge-low-stock">Low Stock</span>',
            'OUT_OF_STOCK': '<span class="badge badge-out-of-stock">Out of Stock</span>',
            'PENDING': '<span class="badge badge-pending">Pending</span>',
            'CONFIRMED': '<span class="badge badge-confirmed">Confirmed</span>',
            'CANCELLED': '<span class="badge badge-cancelled">Cancelled</span>'
        };
        return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
    },

    confirmDelete(itemName) {
        return confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`);
    }
};

// URL Parameter Helper
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
