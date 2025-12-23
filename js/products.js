// Products Module

const Products = {
    currentCursor: null,
    previousCursor: null,

    // Load products list
    async loadProducts(cursor = null, filters = {}) {
        UI.showLoading();
        try {
            let endpoint = '/api/v1/products/';
            const params = new URLSearchParams();
            
            if (cursor) params.append('cursor', cursor);
            if (filters.search) params.append('search', filters.search);
            if (filters.category) params.append('category', filters.category);
            if (filters.stock_status) params.append('stock_status', filters.stock_status);
            if (filters.min_price) params.append('min_price', filters.min_price);
            if (filters.max_price) params.append('max_price', filters.max_price);

            const queryString = params.toString();
            if (queryString) endpoint += `?${queryString}`;

            const data = await API.get(endpoint);
            this.renderProducts(data.results);
            this.updatePagination(data.next, data.previous);
        } catch (error) {
            console.error('Error loading products:', error);
            UI.showError('Failed to load products');
        } finally {
            UI.hideLoading();
        }
    },

    // Render products table
    renderProducts(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-box"></i>
                            <p>No products found</p>
                            <a href="product-form.html" class="btn btn-primary">Add First Product</a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td><strong>${product.sku}</strong></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${UI.formatCurrency(product.cost_price)}</td>
                <td>${UI.formatCurrency(product.selling_price)}</td>
                <td>${product.stock_qty}</td>
                <td>${UI.getStatusBadge(product.stock_status)}</td>
                <td>
                    <div class="btn-group">
                        <a href="product-form.html?id=${product.id}" class="btn btn-sm btn-outline-primary btn-action">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <button onclick="Products.deleteProduct(${product.id}, '${product.name}')" 
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

        // Extract cursor from URL
        const extractCursor = (url) => {
            if (!url) return null;
            const match = url.match(/cursor=([^&]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        };

        this.currentCursor = extractCursor(next);
        this.previousCursor = extractCursor(previous);

        container.innerHTML = `
            <button class="btn btn-outline-primary" 
                    onclick="Products.loadPrevious()" 
                    ${!previous ? 'disabled' : ''}>
                <i class="bi bi-chevron-left me-1"></i>Previous
            </button>
            <button class="btn btn-outline-primary" 
                    onclick="Products.loadNext()" 
                    ${!next ? 'disabled' : ''}>
                Next<i class="bi bi-chevron-right ms-1"></i>
            </button>
        `;
    },

    loadNext() {
        if (this.currentCursor) {
            this.loadProducts(this.currentCursor, this.getFilters());
        }
    },

    loadPrevious() {
        if (this.previousCursor) {
            this.loadProducts(this.previousCursor, this.getFilters());
        }
    },

    // Get current filter values
    getFilters() {
        return {
            search: document.getElementById('searchInput')?.value || '',
            category: document.getElementById('categoryFilter')?.value || '',
            stock_status: document.getElementById('stockStatusFilter')?.value || '',
            min_price: document.getElementById('minPriceFilter')?.value || '',
            max_price: document.getElementById('maxPriceFilter')?.value || ''
        };
    },

    // Apply filters
    applyFilters() {
        this.loadProducts(null, this.getFilters());
    },

    // Reset filters
    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('stockStatusFilter').value = '';
        document.getElementById('minPriceFilter').value = '';
        document.getElementById('maxPriceFilter').value = '';
        this.loadProducts();
    },

    // Delete product
    async deleteProduct(id, name) {
        if (!UI.confirmDelete(name)) return;

        UI.showLoading();
        try {
            await API.delete(`/api/v1/products/${id}/`);
            UI.showSuccess('Product deleted successfully');
            this.loadProducts(null, this.getFilters());
        } catch (error) {
            console.error('Error deleting product:', error);
            UI.showError('Failed to delete product');
        } finally {
            UI.hideLoading();
        }
    },

    // Load single product for editing
    async loadProduct(id) {
        UI.showLoading();
        try {
            const product = await API.get(`/api/v1/products/${id}/`);
            this.populateForm(product);
        } catch (error) {
            console.error('Error loading product:', error);
            UI.showError('Failed to load product');
        } finally {
            UI.hideLoading();
        }
    },

    // Populate form with product data
    populateForm(product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('sku').value = product.sku;
        document.getElementById('name').value = product.name;
        document.getElementById('category').value = product.category;
        document.getElementById('costPrice').value = product.cost_price;
        document.getElementById('sellingPrice').value = product.selling_price;
        document.getElementById('stockQty').value = product.stock_qty;
        
        // Disable SKU field when editing
        document.getElementById('sku').disabled = true;
        
        // Update page title
        document.getElementById('formTitle').textContent = 'Edit Product';
        document.getElementById('pageTitle').textContent = 'Edit Product';
    },

    // Save product (create or update)
    async saveProduct(formData) {
        UI.showLoading();
        try {
            const productId = formData.get('productId');
            
            // Prepare data object
            const data = {
                name: formData.get('name'),
                category: formData.get('category'),
                cost_price: formData.get('costPrice'),
                selling_price: formData.get('sellingPrice'),
                stock_qty: parseInt(formData.get('stockQty'))
            };

            if (productId) {
                // Update existing product
                await API.put(`/api/v1/products/${productId}/`, data);
                UI.showSuccess('Product updated successfully');
            } else {
                // Create new product
                data.sku = formData.get('sku');
                await API.post('/api/v1/products/', data);
                UI.showSuccess('Product created successfully');
            }
            
            // Redirect to products list
            setTimeout(() => {
                window.location.href = 'products.html';
            }, 1000);
        } catch (error) {
            console.error('Error saving product:', error);
            const errorMessage = ErrorParser.fromError(error);
            UI.showError(errorMessage);
        } finally {
            UI.hideLoading();
        }
    }
};

// Initialize products page
function initProductsPage() {
    if (!requireAuth()) return;
    initLogoutButton();
    
    // Load products on page load
    Products.loadProducts();

    // Filter form submit
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            Products.applyFilters();
        });
    }
}

// Initialize product form page
function initProductForm() {
    if (!requireAuth()) return;
    initLogoutButton();

    const productId = getUrlParam('id');
    if (productId) {
        Products.loadProduct(productId);
    }

    // Form submit
    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            Products.saveProduct(new FormData(form));
        });
    }
}
