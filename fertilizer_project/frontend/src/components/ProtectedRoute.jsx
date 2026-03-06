import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute component for role-based access control
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} [props.requiredRole] - Required role ('admin' or 'farmer'), if not provided just checks for authentication
 * @param {string} [props.redirectTo] - Where to redirect if unauthorized (default: '/login')
 */
export default function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }) {
    const { token, role } = useAuth()
    const location = useLocation()

    // Not authenticated
    if (!token) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />
    }

    // Role check if required
    if (requiredRole && role !== requiredRole) {
        // Redirect admin to admin dashboard, farmer to farmer dashboard
        const fallbackRoute = role === 'admin' ? '/admin' : '/dashboard'
        return <Navigate to={fallbackRoute} replace />
    }

    return children
}
