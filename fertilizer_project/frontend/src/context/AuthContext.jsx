import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const API = import.meta.env.VITE_API_URL || 'http://65.2.62.142:8000';

const AuthContext = createContext(null)

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token') || '')
    const [role, setRole] = useState(() => localStorage.getItem('role') || '')
    const [user, setUser] = useState(null)

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token)
            fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
                .then((r) => (r.ok ? r.json() : null))
                .then((u) => {
                    if (u) {
                        setUser(u)
                        // Update role from server response
                        if (u.role) {
                            setRole(u.role)
                            localStorage.setItem('role', u.role)
                        }
                    }
                })
                .catch(() => { })
        } else {
            localStorage.removeItem('token')
            localStorage.removeItem('role')
            setUser(null)
            setRole('')
        }
    }, [token])

    const logout = () => {
        setToken('')
        setRole('')
        setUser(null)
        localStorage.removeItem('token')
        localStorage.removeItem('role')
    }

    const value = useMemo(() => ({
        token,
        setToken,
        role,
        setRole,
        user,
        setUser,
        logout,
        isAdmin: role === 'admin',
        isFarmer: role === 'farmer'
    }), [token, role, user])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
