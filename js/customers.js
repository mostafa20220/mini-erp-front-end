// Customers Module

const Customers = {
    currentCursor: null,
    previousCursor: null,

    // Load customers list
    async loadCustomers(cursor = null) {
        UI.showLoading();
        try {
            let endpoint = '/api/v1/customers/';
            if (cursor) {
                endpoint += `?cursor=${encodeURIComponent(cursor)}`;
            }

            const data = await API.get(endpoint);
            this.renderCustomers(data.results);
            this.updatePagination(data.next, data.previous);
        } catch (error) {
            console.error('Error loading customers:', error);
            UI.showError('Failed to load customers');
        } finally {
            UI.hideLoading();
        }
    },

    // Render customers table
    renderCustomers(customers) {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-people"></i>
                            <p>No customers found</p>
                            <a href="customer-form.html" class="btn btn-primary">Add First Customer</a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td><strong>${customer.customer_code || '-'}</strong></td>
                <td>${customer.first_name} ${customer.last_name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.address || '-'}</td>
                <td>${customer.opening_balance ? UI.formatCurrency(customer.opening_balance) : '-'}</td>
                <td>
                    <div class="btn-group">
                        <a href="customer-form.html?id=${customer.id}" class="btn btn-sm btn-outline-primary btn-action">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <button onclick="Customers.deleteCustomer(${customer.id}, '${customer.first_name} ${customer.last_name}')" 
                                class="btn btn-sm btn-outline-danger btn-action">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // Update pagination buttons
    updatePagination(next, previous) {
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        const extractCursor = (url) => {
            if (!url) return null;
            const match = url.match(/cursor=([^&]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        };

        this.currentCursor = extractCursor(next);
        this.previousCursor = extractCursor(previous);

        container.innerHTML = `
            <button class="btn btn-outline-primary" 
                    onclick="Customers.loadPrevious()" 
                    ${!previous ? 'disabled' : ''}>
                <i class="bi bi-chevron-left me-1"></i>Previous
            </button>
            <button class="btn btn-outline-primary" 
                    onclick="Customers.loadNext()" 
                    ${!next ? 'disabled' : ''}>
                Next<i class="bi bi-chevron-right ms-1"></i>
            </button>
        `;
    },

    loadNext() {
        if (this.currentCursor) {
            this.loadCustomers(this.currentCursor);
        }
    },

    loadPrevious() {
        if (this.previousCursor) {
            this.loadCustomers(this.previousCursor);
        }
    },

    // Delete customer
    async deleteCustomer(id, name) {
        if (!UI.confirmDelete(name)) return;

        UI.showLoading();
        try {
            await API.delete(`/api/v1/customers/${id}/`);
            UI.showSuccess('Customer deleted successfully');
            this.loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            UI.showError('Failed to delete customer');
        } finally {
            UI.hideLoading();
        }
    },

    // Load single customer for editing
    async loadCustomer(id) {
        UI.showLoading();
        try {
            const customer = await API.get(`/api/v1/customers/${id}/`);
            this.populateForm(customer);
        } catch (error) {
            console.error('Error loading customer:', error);
            UI.showError('Failed to load customer');
        } finally {
            UI.hideLoading();
        }
    },

    // Populate form with customer data
    populateForm(customer) {
        document.getElementById('customerId').value = customer.id;
        document.getElementById('email').value = customer.email;
        document.getElementById('customerCode').value = customer.customer_code || '';
        document.getElementById('firstName').value = customer.first_name;
        document.getElementById('lastName').value = customer.last_name;
        document.getElementById('phone').value = customer.phone || '';
        document.getElementById('address').value = customer.address || '';
        document.getElementById('openingBalance').value = customer.opening_balance || '';

        // Update page title
        document.getElementById('formTitle').textContent = 'Edit Customer';
        document.getElementById('pageTitle').textContent = 'Edit Customer';
    },

    // Save customer (create or update)
    async saveCustomer(formData) {
        UI.showLoading();
        try {
            const customerId = formData.get('customerId');
            
            const data = {
                email: formData.get('email'),
                customer_code: formData.get('customerCode') || null,
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
                phone: formData.get('phone') || null,
                address: formData.get('address') || null,
                opening_balance: formData.get('openingBalance') || null
            };

            if (customerId) {
                await API.put(`/api/v1/customers/${customerId}/`, data);
                UI.showSuccess('Customer updated successfully');
            } else {
                await API.post('/api/v1/customers/', data);
                UI.showSuccess('Customer created successfully');
            }
            
            setTimeout(() => {
                window.location.href = 'customers.html';
            }, 1000);
        } catch (error) {
            console.error('Error saving customer:', error);
            const errorMessage = ErrorParser.fromError(error);
            UI.showError(errorMessage);
        } finally {
            UI.hideLoading();
        }
    }
};

// Initialize customers page
function initCustomersPage() {
    if (!requireAuth()) return;
    initLogoutButton();
    Customers.loadCustomers();
}

// Initialize customer form page
function initCustomerForm() {
    if (!requireAuth()) return;
    initLogoutButton();

    const customerId = getUrlParam('id');
    if (customerId) {
        Customers.loadCustomer(customerId);
    }

    const form = document.getElementById('customerForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            Customers.saveCustomer(new FormData(form));
        });
    }
}
