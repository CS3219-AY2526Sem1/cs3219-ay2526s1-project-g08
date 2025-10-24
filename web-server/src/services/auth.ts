export function getAuthToken(): string {
    // Get token from cookie
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));

    if (tokenCookie) {
        return tokenCookie.split('=')[1];
    }

    // Fallback to localStorage if needed
    return localStorage.getItem('authToken') || '';
}
