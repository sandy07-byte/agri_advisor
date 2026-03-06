import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Indian states list for profile settings dropdown
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

export default function ProfileSettings() {
    const nav = useNavigate()
    const token = localStorage.getItem('token')

    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        state: '',
        district: ''
    })

    useEffect(() => {
        if (!token) {
            nav('/login')
            return
        }
        fetchProfile()
    }, [token, nav])

    const fetchProfile = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API}/api/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) throw new Error('Failed to fetch profile')
            const data = await res.json()
            setProfile(data)

            // Handle backward compatibility for location format
            let state = ''
            let district = ''
            if (data.location) {
                if (typeof data.location === 'string') {
                    // Old format: string
                    state = data.location
                } else if (typeof data.location === 'object') {
                    // New format: object
                    state = data.location.state || ''
                    district = data.location.district || ''
                }
            }

            setFormData({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                state: state,
                district: district
            })
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage('')
        setError('')

        try {
            // Note: Assuming there's an update profile endpoint
            // If not available in backend, you may need to add it
            const res = await fetch(`${API}/api/me/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                // If update endpoint doesn't exist, show message
                throw new Error('Profile update endpoint not available. Please update location during registration.')
            }

            const data = await res.json()
            setProfile(data)
            setMessage('✅ Profile updated successfully!')
            setTimeout(() => nav('/dashboard'), 1500)
        } catch (err) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingText}>Loading...</div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>👤 Profile Settings</h1>
                    <button style={styles.backBtn} onClick={() => nav('/dashboard')}>← Back to Dashboard</button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {message && <div style={styles.successMessage}>{message}</div>}
                    {error && <div style={styles.errorMessage}>{error}</div>}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Your full name"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            style={styles.input}
                            disabled
                            placeholder="Your email"
                        />
                        <p style={styles.hint}>Email cannot be changed</p>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Your phone number"
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>📍 State *</label>
                        <select
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        >
                            <option value="">-- Select State --</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <p style={styles.hint}>State is used for location-based market prices</p>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>📍 District *</label>
                        <input
                            type="text"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="e.g., Hyderabad, Pune, Chennai"
                            required
                        />
                        <p style={styles.hint}>District is used for more accurate market prices</p>
                    </div>

                    <button type="submit" style={{ ...styles.button, opacity: isSaving ? 0.6 : 1 }} disabled={isSaving}>
                        {isSaving ? '⏳ Saving...' : '💾 Save Profile'}
                    </button>
                </form>
            </div>

            {/* Alternative: Quick Fix */}
            <div style={styles.quickFixCard}>
                <h3 style={styles.quickFixTitle}>⚡ Quick Fix</h3>
                <p style={styles.quickFixText}>
                    If the update doesn't work, your backend may not have the update endpoint yet.
                    You can re-register with your location, or contact your administrator.
                </p>
            </div>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '500px',
        overflow: 'hidden',
        marginBottom: '20px',
    },
    header: {
        backgroundColor: '#2e7d32',
        color: 'white',
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '24px',
        margin: 0,
        fontWeight: '700',
    },
    backBtn: {
        padding: '8px 16px',
        backgroundColor: 'white',
        color: '#2e7d32',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
    },
    form: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
    },
    input: {
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
    },
    hint: {
        fontSize: '12px',
        color: '#999',
        margin: 0,
    },
    button: {
        padding: '12px 24px',
        backgroundColor: '#2e7d32',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        marginTop: '8px',
    },
    successMessage: {
        padding: '12px',
        backgroundColor: '#c8e6c9',
        color: '#2e7d32',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
    },
    errorMessage: {
        padding: '12px',
        backgroundColor: '#ffcdd2',
        color: '#c62828',
        borderRadius: '6px',
        fontSize: '14px',
    },
    loadingText: {
        fontSize: '18px',
        color: '#666',
    },
    quickFixCard: {
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '20px',
        maxWidth: '500px',
        borderLeft: '4px solid #ff9800',
    },
    quickFixTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#ff9800',
        margin: '0 0 12px 0',
    },
    quickFixText: {
        fontSize: '14px',
        color: '#666',
        margin: 0,
    },
}
