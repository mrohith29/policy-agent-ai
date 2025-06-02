// API configuration
const getApiBaseUrl = () => {
    // In development, use the local backend
    if (import.meta.env.DEV) {
        return 'http://localhost:8000/api';
    }
    // In production, use relative URL (same domain)
    return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}; 