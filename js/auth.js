// Authentication Module

const Auth = {
    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                TokenManager.setTokens(data.access, data.refresh);
                return { success: true };
            } else {
                const error = await response.json().catch(() => ({}));
                return { 
                    success: false, 
                    error: error.detail || 'Invalid email or password' 
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: 'Network error. Please check your connection.' 
            };
        }
    },

    // Logout user
    async logout() {
        try {
            const refreshToken = TokenManager.getRefreshToken();
            if (refreshToken) {
                await fetch(`${API_BASE_URL}/api/v1/auth/logout/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${TokenManager.getAccessToken()}`
                    },
                    body: JSON.stringify({ refresh: refreshToken })
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            TokenManager.clearTokens();
            window.location.href = 'login.html';
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        return TokenManager.isAuthenticated();
    }
};

// Handle login form submission
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('loginError');

        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
        errorDiv.classList.add('d-none');

        const result = await Auth.login(email, password);

        if (result.success) {
            window.location.href = 'dashboard.html';
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('d-none');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Sign In';
        }
    });
}

// Handle logout button
function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
}
