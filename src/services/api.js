
const API_BASE = '';

let logoutHandler = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    window.location.href = '/login';
};

export const setLogoutHandler = (handler) => {
    logoutHandler = handler;
};

const handleResponse = async (response) => {
    if (response.status === 401 || response.status === 403) {
        // If we have a token and get 401/403, it means the session is invalid/expired
        const token = localStorage.getItem('nexus_token');
        const isLoginRequest = response.url.includes('/api/login');
        
        if (token && !isLoginRequest) {
            logoutHandler();
            throw new Error('Session expired');
        }
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
};

const getHeaders = () => {
    const token = localStorage.getItem('nexus_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    get: async (url) => {
        const response = await fetch(`${API_BASE}${url}`, {
            headers: getHeaders()
        });
        return handleResponse(response);
    },
    post: async (url, data) => {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    put: async (url, data) => {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    delete: async (url) => {
        const response = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(response);
    }
};
