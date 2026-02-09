
// lib/session.ts
interface UserData {
    name: string;
    user_id: string;
    account_type: string;
}

export function getSession(): UserData | null {
    if (typeof window === 'undefined') {
        return null; // Don't run on server side
    }
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        try {
            return JSON.parse(storedUser) as UserData;
        } catch (error) {
            console.error("Failed to parse user data from localStorage:", error);
            localStorage.removeItem('loggedInUser');
            return null;
        }
    }
    return null;
}
