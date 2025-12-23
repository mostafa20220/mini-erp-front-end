// Orders Module

const Orders = {
    currentCursor: null,
    previousCursor: null,
    customers: [],
    products: [],

    // Load orders list
    async loadOrders(cursor = null, filters = {}) {
        UI.showLoading();
        try {
            let endpoint = '/api/v1/orders/';
            const params = new URLSearchParams();
            
            if (cursor) params.append('cursor', cursor);
            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.customer_id) params.append('customer_id', filters.customer_id);
            if (filters.order_date_from) params.append('order_date_from', filters.order_date_from);
            if (filters.order_date_to) params.append('order_date_to', filters.order_date_to);
            if (filters.min_amount) params.append('min_amount', filters.min_amount);
            if (filters.max_amount) params.append('max_amount', filters.max_amount);

            const queryString = params.toString();
            if (queryString) endpoint += `?${queryString}`;

            const data = await API.get(endpoint);
            this.renderOrders(data.results);
            this.updatePagination(data.next, data.previous);
        } catch (error) {
            console.error('Error loading orders:', error);
            UI.showError('Failed to load orders');
        } finally {
            UI.hideLoading();
        }
    },

    // Render orders table
    renderOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-cart"></i>
                            <p>No orders found</p>
                            <a href="order-form.html" class="btn btn-primary">Create First Order</a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td><strong>${order.order_number}</strong></td>
                <td>${order.customer}</td>
                <td>${UI.formatDate(order.order_date)}</td>
                <td>${UI.getStatusBadge(order.status)}</td>
                <td>${UI.formatCurrency(order.total_amount)}</td>
                <td>${order.created_by || '-'}</td>
                <td>
                    <div class="btn-group">
                        <a href="order-details.html?id=${order.id}" class="btn btn-sm btn-outline-info btn-action">
                            <i class="bi bi-eye"></i>
                        </a>
                        <button onclick="Orders.deleteOrder(${order.id}, '${order.order_number}')" 
                                class="btn btn-sm btn-outline-danger btn-action">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // Update pagination
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
                    onclick="Orders.loadPrevious()" 
                    ${!previous ? 'disabled' : ''}>
                <i class="bi bi-chevron-left me-1"></i>Previous
            </button>
            <button class="btn btn-outline-primary" 
                    onclick="Orders.loadNext()" 
                    ${!next ? 'disabled' : ''}>
                Next<i class="bi bi-chevron-right ms-1"></i>
            </button>
        `;
    },

    loadNext() {
        if (this.currentCursor) {
            this.loadOrders(this.currentCursor, this.getFilters());
        }
    },

    loadPrevious() {
        if (this.previousCursor) {
            this.loadOrders(this.previousCursor, this.getFilters());
        }
    },

    getFilters() {
        return {
            search: document.getElementById('searchInput')?.value || '',
            status: document.getElementById('statusFilter')?.value || '',
            order_date_from: document.getElementById('dateFromFilter')?.value || '',
            order_date_to: document.getElementById('dateToFilter')?.value || '',
            min_amount: document.getElementById('minAmountFilter')?.value || '',
            max_amount: document.getElementById('maxAmountFilter')?.value || ''
        };
    },

    applyFilters() {
        this.loadOrders(null, this.getFilters());
    },

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';
        document.getElementById('minAmountFilter').value = '';
        document.getElementById('maxAmountFilter').value = '';
        this.loadOrders();
    },

    // Delete order
    async deleteOrder(id, orderNumber) {
        if (!UI.confirmDelete(orderNumber)) return;

        UI.showLoading();
        try {
            await API.delete(`/api/v1/orders/${id}/`);
            UI.showSuccess('Order deleted successfully');
            this.loadOrders(null, this.getFilters());
        } catch (error) {
            console.error('Error deleting order:', error);
            UI.showError('Failed to delete order');
        } finally {
            UI.hideLoading();
        }
    },

    // Load order details
    async loadOrderDetails(id) {
        UI.showLoading();
        try {
            const order = await API.get(`/api/v1/orders/${id}/`);
            this.renderOrderDetails(order);
        } catch (error) {
            console.error('Error loading order:', error);
            UI.showError('Failed to load order details');
        } finally {
            UI.hideLoading();
        }
    },

    // Render order details
    renderOrderDetails(order) {
        document.getElementById('orderId').value = order.id;
        document.getElementById('orderNumber').textContent = order.order_number;
        document.getElementById('orderCustomer').textContent = order.customer;
        document.getElementById('orderDate').textContent = UI.formatDate(order.order_date);
        document.getElementById('orderStatus').value = order.status;
        document.getElementById('orderTotal').textContent = UI.formatCurrency(order.total_amount);
        document.getElementById('orderCreatedBy').textContent = order.created_by || '-';
        document.getElementById('orderCreatedAt').textContent = UI.formatDateTime(order.created_at);

        // Render items
        const itemsContainer = document.getElementById('orderItems');
        itemsContainer.innerHTML = order.items.map(item => `
            <tr>
                <td>${item.product_sku}</td>
                <td>${item.product_name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${UI.formatCurrency(item.price)}</td>
                <td class="text-end"><strong>${UI.formatCurrency(item.total_price)}</strong></td>
            </tr>
        `).join('');
    },

    // Update order status
    async updateStatus() {
        const orderId = document.getElementById('orderId').value;
        const status = document.getElementById('orderStatus').value;

        UI.showLoading();
        try {
            await API.put(`/api/v1/orders/${orderId}/`, { status });
            UI.showSuccess('Order status updated successfully');
        } catch (error) {
            console.error('Error updating status:', error);
            const errorMessage = ErrorParser.fromError(error);
            UI.showError(errorMessage);
        } finally {
            UI.hideLoading();
        }
    },

    // Load customers and products for order form
    async loadFormData() {
        try {
            const [customersData, productsData] = await Promise.all([
                API.get('/api/v1/customers/'),
                API.get('/api/v1/products/')
            ]);
            
            this.customers = customersData.results;
            this.products = productsData.results;

            // Populate customer select
            const customerSelect = document.getElementById('customerId');
            customerSelect.innerHTML = '<option value="">Select Customer...</option>' +
                this.customers.map(c => 
                    `<option value="${c.id}">${c.first_name} ${c.last_name} (${c.email})</option>`
                ).join('');

            // Add initial item row
            this.addItemRow();
        } catch (error) {
            console.error('Error loading form data:', error);
            UI.showError('Failed to load form data');
        }
    },

    // Add order item row
    addItemRow() {
        const container = document.getElementById('orderItemsContainer');
        const rowIndex = container.children.length;

        const row = document.createElement('div');
        row.className = 'order-item-row';
        row.innerHTML = `
            <div class="row g-2 align-items-end">
                <div class="col-md-5">
                    <label class="form-label">Product</label>
                    <select class="form-select product-select" name="items[${rowIndex}][product_id]" required 
                            onchange="Orders.updatePrice(this)">
                        <option value="">Select Product...</option>
                        ${this.products.map(p => 
                            `<option value="${p.id}" data-price="${p.selling_price}">${p.name} (${p.sku}) - ${UI.formatCurrency(p.selling_price)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-control quantity-input" name="items[${rowIndex}][quantity]" 
                           min="1" value="1" required onchange="Orders.updateRowTotal(this)">
                </div>
                <div class="col-md-2">
                    <label class="form-label">Price</label>
                    <input type="number" class="form-control price-input" name="items[${rowIndex}][price]" 
                           step="0.01" min="0" required onchange="Orders.updateRowTotal(this)">
                </div>
                <div class="col-md-2">
                    <label class="form-label">Total</label>
                    <input type="text" class="form-control row-total" readonly value="$0.00">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger w-100" onclick="Orders.removeItemRow(this)">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(row);
    },

    // Remove item row
    removeItemRow(btn) {
        const container = document.getElementById('orderItemsContainer');
        if (container.children.length > 1) {
            btn.closest('.order-item-row').remove();
            this.updateOrderTotal();
        } else {
            UI.showError('Order must have at least one item');
        }
    },

    // Update price when product selected
    updatePrice(select) {
        const selectedOption = select.options[select.selectedIndex];
        const price = selectedOption.dataset.price || 0;
        const row = select.closest('.order-item-row');
        row.querySelector('.price-input').value = price;
        this.updateRowTotal(row.querySelector('.quantity-input'));
    },

    // Update row total
    updateRowTotal(input) {
        const row = input.closest('.order-item-row');
        const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const total = quantity * price;
        row.querySelector('.row-total').value = UI.formatCurrency(total);
        this.updateOrderTotal();
    },

    // Update order total
    updateOrderTotal() {
        const rows = document.querySelectorAll('.order-item-row');
        let total = 0;
        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
            const price = parseFloat(row.querySelector('.price-input').value) || 0;
            total += quantity * price;
        });
        document.getElementById('orderTotalDisplay').textContent = UI.formatCurrency(total);
    },

    // Save order
    async saveOrder(form) {
        UI.showLoading();
        try {
            const customerId = parseInt(document.getElementById('customerId').value);
            const items = [];
            
            const rows = document.querySelectorAll('.order-item-row');
            rows.forEach(row => {
                const productId = parseInt(row.querySelector('.product-select').value);
                const quantity = parseInt(row.querySelector('.quantity-input').value);
                const price = row.querySelector('.price-input').value;
                
                if (productId && quantity) {
                    items.push({
                        product_id: productId,
                        quantity: quantity,
                        price: price
                    });
                }
            });

            if (items.length === 0) {
                UI.showError('Please add at least one item');
                UI.hideLoading();
                return;
            }

            await API.post('/api/v1/orders/', {
                customer_id: customerId,
                items: items
            });
            
            UI.showSuccess('Order created successfully');
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 1000);
        } catch (error) {
            console.error('Error saving order:', error);
            const errorMessage = ErrorParser.fromError(error);
            UI.showError(errorMessage);
        } finally {
            UI.hideLoading();
        }
    }
};

// Initialize orders page
function initOrdersPage() {
    if (!requireAuth()) return;
    initLogoutButton();

    // Check for status filter in URL
    const statusParam = getUrlParam('status');
    if (statusParam) {
        document.getElementById('statusFilter').value = statusParam;
    }
    
    Orders.loadOrders(null, Orders.getFilters());

    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            Orders.applyFilters();
        });
    }
}

// Initialize order form page
function initOrderForm() {
    if (!requireAuth()) return;
    initLogoutButton();
    Orders.loadFormData();

    const form = document.getElementById('orderForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            Orders.saveOrder(form);
        });
    }
}

// Initialize order details page
function initOrderDetails() {
    if (!requireAuth()) return;
    initLogoutButton();

    const orderId = getUrlParam('id');
    if (orderId) {
        Orders.loadOrderDetails(orderId);
    } else {
        window.location.href = 'orders.html';
    }
}
