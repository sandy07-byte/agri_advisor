import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, API } from '../context/AuthContext'
import './FarmerDashboard.css'

const CROPS = [
    'Rice', 'Maize', 'Jute', 'Cotton', 'Coconut', 'Papaya', 'Orange', 'Apple', 'Muskmelon',
    'Watermelon', 'Grapes', 'Mango', 'Banana', 'Pomegranate', 'Lentil', 'Blackgram', 'Mungbean',
    'Mothbeans', 'Pigeonpeas', 'Kidneybeans', 'Chickpea', 'Coffee'
]

export default function FarmerDashboard() {
    const { token } = useAuth()
    const nav = useNavigate()
    // ...existing code...
    // --- Yield Prediction State ---
    const SEASONS = ['Rabi', 'Kharif', 'Zaid']
    const STATES = ['Uttar Pradesh', 'West Bengal', 'Karnataka', 'Punjab', 'Maharashtra', 'Gujarat', 'Tamil Nadu', 'Andhra Pradesh', 'Bihar', 'Rajasthan']
    const [yieldForm, setYieldForm] = useState({
        Area: '',
        Annual_Rainfall: '',
        Fertilizer: '',
        Pesticide: '',
        Crop: CROPS[0],
        Season: SEASONS[0],
        State: STATES[0]
    })
    const [yieldLoading, setYieldLoading] = useState(false)
    const [yieldError, setYieldError] = useState('')
    const [yieldSuccess, setYieldSuccess] = useState('')
    const [yieldResult, setYieldResult] = useState(null)
    const [yieldHistory, setYieldHistory] = useState([])

    // Main Dashboard State
    const [loading, setLoading] = useState(true)
    const [errors, setErrors] = useState({})
    const [profile, setProfile] = useState(null)
    const [weather, setWeather] = useState(null)
    const [history, setHistory] = useState([])
    const [prices, setPrices] = useState([])
    const [formData, setFormData] = useState({
        N: '', P: '', K: '', pH: '', moisture: '', temperature: '', crop_type: CROPS[0], soil_type: 'Loamy'
    })
    const SOILS = ['Loamy', 'Sandy', 'Clay', 'Black', 'Red', 'Alluvial']

    const handleYieldChange = e => {
        const { name, value } = e.target
        setYieldForm(prev => ({ ...prev, [name]: value }))
    }

    const handleYieldSubmit = async e => {
        e.preventDefault()
        setYieldLoading(true)
        setYieldError('')
        setYieldSuccess('')
        setCropRecError('')
        setCropRecResult(null)
        try {
            const payload = {
                Area: parseFloat(yieldForm.Area),
                Annual_Rainfall: parseFloat(yieldForm.Annual_Rainfall),
                Fertilizer: parseFloat(yieldForm.Fertilizer),
                Pesticide: parseFloat(yieldForm.Pesticide),
                Crop: yieldForm.Crop,
                Season: yieldForm.Season,
                State: yieldForm.State
            }
            const res = await fetch(`${API}/api/yield/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Prediction failed')
            setYieldResult(data)
            setYieldSuccess('✅ Prediction successful!')
            setYieldHistory(prev => [{ ...payload, ...data, ts: new Date().toISOString() }, ...prev])

            // Auto-fetch Smart Crop Recommendation using same inputs
            try {
                setCropRecLoading(true)
                const cropRecPayload = {
                    state: yieldForm.State,
                    area: parseFloat(yieldForm.Area),
                    rainfall: parseFloat(yieldForm.Annual_Rainfall),
                    fertilizer: parseFloat(yieldForm.Fertilizer),
                    pesticide: parseFloat(yieldForm.Pesticide),
                    season: yieldForm.Season
                }
                const cropRecRes = await fetch(`${API}/api/crop/recommend`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(cropRecPayload)
                })
                const cropRecData = await cropRecRes.json()
                if (cropRecRes.ok) {
                    setCropRecResult(cropRecData)
                } else {
                    setCropRecError('Could not load crop recommendations')
                }
            } catch (cropErr) {
                console.warn('Crop recommendation fetch failed:', cropErr)
                setCropRecError('Could not load crop recommendations')
            } finally {
                setCropRecLoading(false)
            }
        } catch (err) {
            setYieldError('❌ ' + err.message)
            setYieldResult(null)
        } finally {
            setYieldLoading(false)
        }
    }

    const [formLoading, setFormLoading] = useState(false)
    const [formSuccess, setFormSuccess] = useState('')

    // Soil Analysis State
    const [soilAnalysis, setSoilAnalysis] = useState(null)
    const [soilHistory, setSoilHistory] = useState([])

    // Live Mandi Market Prices State
    const [mandiPrices, setMandiPrices] = useState(null)
    const [mandiLoading, setMandiLoading] = useState(false)
    const [mandiError, setMandiError] = useState('')
    const [estimatedRevenue, setEstimatedRevenue] = useState(null)
    const [selectedMandiCrop, setSelectedMandiCrop] = useState(CROPS[0])

    // Smart Crop Recommendation State (auto-populated from yield form)
    const [cropRecLoading, setCropRecLoading] = useState(false)
    const [cropRecError, setCropRecError] = useState('')
    const [cropRecResult, setCropRecResult] = useState(null)

    // Authentication Check
    useEffect(() => {
        if (!token) nav('/login')
    }, [token, nav])

    // Fetch Dashboard Data
    useEffect(() => {
        if (!token) return
        fetchDashboardData()
    }, [token])

    const fetchDashboardData = async () => {
        console.log('📊 [Dashboard] Fetching dashboard data...')
        setLoading(true)
        setErrors({})

        try {
            const headers = { Authorization: `Bearer ${token}` }

            // Fetch Profile
            try {
                console.log('👤 [Dashboard] Fetching profile...')
                const res = await fetch(`${API}/api/me`, { headers })
                if (!res.ok) throw new Error('Failed to fetch profile')
                const data = await res.json()
                console.log('👤 [Dashboard] Profile loaded:', data.email, '| Location:', data.location || 'NOT SET')
                setProfile(data)

                // Fetch Weather - handle both new object format and legacy string
                const locationStr = data.location
                    ? (typeof data.location === 'object'
                        ? (data.location.district || data.location.state)
                        : data.location)
                    : null;
                if (locationStr) {
                    try {
                        console.log('🌡️ [Dashboard] Fetching weather for:', locationStr)
                        const weatherRes = await fetch(`${API}/api/weather/${encodeURIComponent(locationStr)}`)
                        if (weatherRes.ok) {
                            const weatherData = await weatherRes.json()
                            console.log('🌡️ [Dashboard] Weather loaded:', weatherData.temperature + '°C')
                            setWeather(weatherData)
                            setFormData(prev => ({ ...prev, temperature: weatherData.temperature || '' }))
                        } else {
                            console.warn('🌡️ [Dashboard] Weather API error:', weatherRes.status)
                            setErrors(prev => ({ ...prev, weather: 'Weather data unavailable' }))
                        }
                    } catch (err) {
                        console.warn('🌡️ [Dashboard] Weather fetch failed:', err.message)
                        setErrors(prev => ({ ...prev, weather: 'Weather unavailable: ' + err.message }))
                    }
                } else {
                    console.warn('⚠️ [Dashboard] Location not set! User needs to set location in Settings')
                    setErrors(prev => ({ ...prev, weather: '⚠️ Location not set - Click Settings ⚙️ to set location' }))
                }
            } catch (err) {
                console.error('Profile fetch failed:', err)
                setErrors(prev => ({ ...prev, profile: err.message }))
                return
            }

            // Fetch History
            try {
                console.log('📜 [Dashboard] Fetching history from:', `${API}/api/history`)
                const histRes = await fetch(`${API}/api/history`, { headers })
                if (histRes.ok) {
                    const histData = await histRes.json()
                    console.log('📜 [Dashboard] History received:', histData?.length || 0, 'items')
                    if (histData?.length > 0) {
                        console.log('📜 [Dashboard] Latest recommendation:', histData[0]?.output?.name)
                    }
                    setHistory(Array.isArray(histData) ? histData : [])
                } else {
                    console.warn('📜 [Dashboard] History fetch failed:', histRes.status, histRes.statusText)
                }
            } catch (err) {
                console.error('❌ [Dashboard] History fetch error:', err)
            }

            // Fetch Prices
            try {
                const priceRes = await fetch(`${API}/api/prices`)
                if (priceRes.ok) {
                    const priceData = await priceRes.json()
                    setPrices(Array.isArray(priceData) ? priceData : [])
                }
            } catch (err) {
                console.warn('Prices fetch failed:', err)
            }
        } finally {
            setLoading(false)
        }
    }

    // Fetch Live Mandi Market Prices
    const fetchMandiPrices = async (crop = selectedMandiCrop) => {
        console.log('💰 [Mandi] Fetching prices for:', crop)
        setMandiLoading(true)
        setMandiError('')

        try {
            const res = await fetch(`${API}/api/market/prices?commodity=${encodeURIComponent(crop)}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.detail || `Failed to fetch mandi prices (${res.status})`)
            }

            const data = await res.json()
            console.log('💰 [Mandi] Prices received:', data.records_found || data.total_records, 'records', data.fallback_used ? '(fallback used)' : '')
            setMandiPrices(data)

            // Calculate estimated revenue if we have yield prediction from last recommendation
            if (lastRec?.output?.predicted_yield && data.average_price > 0) {
                const yieldTons = parseFloat(lastRec.output.predicted_yield) || 0
                const pricePerQuintal = data.average_price
                const yieldQuintals = yieldTons * 10
                const revenue = yieldQuintals * pricePerQuintal
                setEstimatedRevenue({
                    yield_tons: yieldTons,
                    yield_quintals: yieldQuintals,
                    price_per_quintal: pricePerQuintal,
                    estimated_revenue: Math.round(revenue)
                })
            } else {
                setEstimatedRevenue(null)
            }
        } catch (err) {
            console.error('❌ [Mandi] Error:', err.message)
            setMandiError(err.message)
            setMandiPrices(null)
        } finally {
            setMandiLoading(false)
        }
    }

    // Fetch mandi prices when crop selection changes
    useEffect(() => {
        if (token && selectedMandiCrop) {
            fetchMandiPrices(selectedMandiCrop)
        }
    }, [token, selectedMandiCrop])

    // Form Handlers
    const handleFormChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleRecommendationSubmit = async (e) => {
        e.preventDefault()
        setFormLoading(true)
        setFormSuccess('')
        setErrors(prev => ({ ...prev, recommendation: '' }))

        try {
            console.log('📊 [Recommendation] Submitting with data:', {
                N: parseFloat(formData.N) || 0,
                P: parseFloat(formData.P) || 0,
                K: parseFloat(formData.K) || 0,
                pH: parseFloat(formData.pH) || 0,
                moisture: parseFloat(formData.moisture) || 0,
                temperature: parseFloat(formData.temperature) || 0,
                crop_type: formData.crop_type,
                soil_type: formData.soil_type
            })

            const payload = {
                N: parseFloat(formData.N) || 0,
                P: parseFloat(formData.P) || 0,
                K: parseFloat(formData.K) || 0,
                pH: parseFloat(formData.pH) || 0,
                moisture: parseFloat(formData.moisture) || 0,
                temperature: formData.temperature ? parseFloat(formData.temperature) : 25,  // Default to 25°C if not set
                crop_type: formData.crop_type || CROPS[0],
                soil_type: formData.soil_type || SOILS[0]
            }

            console.log('📤 [Recommendation] Fetching from:', `${API}/api/recommend/`)
            console.log('🔐 [Recommendation] Token:', token?.substring(0, 20) + '...')

            const res = await fetch(`${API}/api/recommend/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            console.log('📨 [Recommendation] Response status:', res.status)

            const data = await res.json()
            console.log('📦 [Recommendation] Response data:', data)

            if (!res.ok) {
                throw new Error(`Server error: ${data?.detail || 'Failed to get recommendation'}`)
            }

            console.log('✅ [Recommendation] Success! Fertilizer:', data.fertilizer)
            setFormSuccess(`✅ Recommendation saved! 🌾 ${data.fertilizer}`)

            // Also call soil analysis
            console.log('🔬 [Soil] Analyzing soil...')
            try {
                const soilRes = await fetch(`${API}/api/soil/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        N: payload.N,
                        P: payload.P,
                        K: payload.K,
                        pH: payload.pH,
                        crop_type: payload.crop_type,
                        soil_type: payload.soil_type
                    })
                })
                if (soilRes.ok) {
                    const soilData = await soilRes.json()
                    setSoilAnalysis(soilData)
                    console.log('✅ [Soil] Analysis complete:', soilData)
                }
            } catch (soilErr) {
                console.warn('⚠️ [Soil] Analysis failed:', soilErr)
            }

            setFormData({ N: '', P: '', K: '', pH: '', moisture: '', temperature: weather?.temperature || '', crop_type: CROPS[0], soil_type: SOILS[0] })

            // Refresh dashboard
            console.log('🔄 [Recommendation] Refreshing dashboard...')
            setTimeout(() => fetchDashboardData(), 1500)
        } catch (err) {
            console.error('❌ [Recommendation] Error:', err.message)
            setErrors(prev => ({ ...prev, recommendation: `Error: ${err.message}` }))
        } finally {
            setFormLoading(false)
        }
    }

    // Fetch soil history
    const fetchSoilHistory = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` }
            const res = await fetch(`${API}/api/soil/history`, { headers })
            if (res.ok) {
                const data = await res.json()
                setSoilHistory(Array.isArray(data) ? data : [])
            }
        } catch (err) {
            setSoilHistory([])
        }
    }

    // Show/hide soil history modal
    const [showSoilHistory, setShowSoilHistory] = useState(false)
    useEffect(() => {
        if (showSoilHistory) fetchSoilHistory()
    }, [showSoilHistory])

    // Utility Functions
    const formatDate = (dt) => {
        try {
            if (!dt) return ''
            const d = new Date(dt)
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        } catch {
            return ''
        }
    }

    const formatTime = (dt) => {
        try {
            if (!dt) return ''
            const d = new Date(dt)
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        } catch {
            return ''
        }
    }

    const getPHStatus = (pH) => {
        if (!pH) return 'Unknown'
        if (pH < 6.5) return 'Acidic'
        if (pH > 7.5) return 'Alkaline'
        return 'Neutral'
    }

    const getHealthStatus = (pH) => {
        const status = getPHStatus(pH)
        return status === 'Neutral' ? '✅ Optimal' : status === 'Acidic' ? '⚠️ Acidic' : '⚠️ Alkaline'
    }

    const lastRec = history && history.length > 0 ? history[0] : null
    const lastNPK = lastRec?.input || {}

    if (!token) return null

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">🌾 Loading your dashboard...</div>
            </div>
        )
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="farmer-dashboard">
            <style>{dashboardStyles}</style>

            {/* Header */}
            <div className="farmer-header">
                <div className="header-content">
                    <h1 className="header-title">🌾 Farmer Dashboard</h1>
                    <div className="header-buttons">
                        <button className="header-btn" onClick={() => nav('/profile-settings')}>⚙️ Settings</button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">

                {/* TOP SECTION: Welcome + Weather + Today */}
                <div className="top-grid">
                    {/* Welcome Card */}
                    <div className="dashboard-card welcome-card">
                        <div className="card-header">
                            <h2 className="card-title">👋 Welcome</h2>
                        </div>
                        <div className="card-body">
                            {profile ? (
                                <>
                                    <p className="welcome-text">Hello, <strong>{profile.name}</strong>! 🙏</p>
                                    <p className="meta-text">📧 {profile.email}</p>
                                    <p className="meta-text">📍 {
                                        profile.location
                                            ? (typeof profile.location === 'object'
                                                ? `${profile.location.district || ''}, ${profile.location.state || ''}`.replace(/^, |, $/g, '')
                                                : profile.location)
                                            : 'Location not set'
                                    }</p>
                                    <p className="date-text">{today}</p>
                                </>
                            ) : (
                                <p className="error-text">Unable to load profile</p>
                            )}
                        </div>
                    </div>

                    {/* Weather Card */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h2 className="card-title">🌤️ Weather Today</h2>
                        </div>
                        <div className="card-body">
                            {weather ? (
                                <div className="weather-grid">
                                    <div className="weather-item">
                                        <p className="weather-label">Temperature</p>
                                        <p className="weather-value">{weather.temperature}°C</p>
                                    </div>
                                    <div className="weather-item">
                                        <p className="weather-label">Humidity</p>
                                        <p className="weather-value">{weather.humidity}%</p>
                                    </div>
                                    <div className="weather-item">
                                        <p className="weather-label">Wind Speed</p>
                                        <p className="weather-value">{weather.wind_speed} m/s</p>
                                    </div>
                                    <div className="weather-item">
                                        <p className="weather-label">Condition</p>
                                        <p className="weather-value">{weather.description}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="error-text">{errors.weather || '📍 Weather data unavailable'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* RECOMMENDATION FORM SECTION */}
                <div className="dashboard-card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">🌿 Make New Recommendation</h2>
                    </div>
                    <div className="card-body">
                        {formSuccess && <div className="success-message">{formSuccess}</div>}
                        {errors.recommendation && <div className="error-message">{errors.recommendation}</div>}

                        <form onSubmit={handleRecommendationSubmit} className="form-container">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nitrogen (N)</label>
                                    <input type="number" name="N" value={formData.N} onChange={handleFormChange} placeholder="e.g., 60" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phosphorus (P)</label>
                                    <input type="number" name="P" value={formData.P} onChange={handleFormChange} placeholder="e.g., 40" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Potassium (K)</label>
                                    <input type="number" name="K" value={formData.K} onChange={handleFormChange} placeholder="e.g., 30" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">pH Level</label>
                                    <input type="number" name="pH" step="0.1" value={formData.pH} onChange={handleFormChange} placeholder="e.g., 7.0" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Moisture (%)</label>
                                    <input type="number" name="moisture" value={formData.moisture} onChange={handleFormChange} placeholder="e.g., 45" className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Temperature (°C)</label>
                                    <input type="number" name="temperature" value={formData.temperature} onChange={handleFormChange} placeholder="Auto-filled" step="0.1" className="form-input" disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Crop Type</label>
                                    <select name="crop_type" value={formData.crop_type} onChange={handleFormChange} className="form-select">
                                        {CROPS.map(crop => <option key={crop} value={crop}>{crop}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Soil Type</label>
                                    <select name="soil_type" value={formData.soil_type} onChange={handleFormChange} className="form-select">
                                        {SOILS.map(soil => <option key={soil} value={soil}>{soil}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="submit-btn" style={{ opacity: formLoading ? 0.6 : 1 }} disabled={formLoading}>
                                {formLoading ? '⏳ Processing...' : '✨ Get Recommendation'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* CROP YIELD PREDICTION SECTION */}
                <div className="dashboard-card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">🌾 Crop Yield Prediction</h2>
                    </div>
                    <div className="card-body">
                        {yieldSuccess && <div className="success-message">{yieldSuccess}</div>}
                        {yieldError && <div className="error-message">{yieldError}</div>}
                        <form onSubmit={handleYieldSubmit} className="form-container">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Area (hectares)</label>
                                    <input type="number" name="Area" value={yieldForm.Area} onChange={handleYieldChange} className="form-input" required min="0" step="0.01" placeholder="e.g., 5.0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Annual Rainfall (mm)</label>
                                    <input type="number" name="Annual_Rainfall" value={yieldForm.Annual_Rainfall} onChange={handleYieldChange} className="form-input" required min="0" step="0.01" placeholder="e.g., 1200" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fertilizer (kg/ha)</label>
                                    <input type="number" name="Fertilizer" value={yieldForm.Fertilizer} onChange={handleYieldChange} className="form-input" required min="0" step="0.01" placeholder="e.g., 150" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Pesticide (kg/ha)</label>
                                    <input type="number" name="Pesticide" value={yieldForm.Pesticide} onChange={handleYieldChange} className="form-input" required min="0" step="0.01" placeholder="e.g., 10" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Crop</label>
                                    <select name="Crop" value={yieldForm.Crop} onChange={handleYieldChange} className="form-select" required>
                                        {CROPS.map(crop => <option key={crop} value={crop}>{crop}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Season</label>
                                    <select name="Season" value={yieldForm.Season} onChange={handleYieldChange} className="form-select" required>
                                        {SEASONS.map(season => <option key={season} value={season}>{season}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State</label>
                                    <select name="State" value={yieldForm.State} onChange={handleYieldChange} className="form-select" required>
                                        {STATES.map(state => <option key={state} value={state}>{state}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="submit-btn" style={{ opacity: yieldLoading ? 0.6 : 1 }} disabled={yieldLoading}>
                                {yieldLoading ? '⏳ Predicting...' : '🔮 Predict Yield'}
                            </button>
                        </form>
                        {yieldResult && (
                            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f1f8e9', borderRadius: '8px', border: '1px solid #c5e1a5', textAlign: 'center' }}>
                                <p style={{ fontSize: '16px', color: '#2e7d32', fontWeight: '600', margin: 0 }}>Predicted Yield</p>
                                <p style={{ fontSize: '32px', color: '#388e3c', fontWeight: '700', margin: '8px 0' }}>{yieldResult.predicted_yield.toFixed(2)} {yieldResult.unit}</p>
                            </div>
                        )}
                        {yieldHistory.length > 0 && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
                                <p style={{ fontSize: '14px', fontWeight: '600', color: '#558b2f', marginBottom: '12px' }}>📊 Recent Predictions</p>
                                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                    {yieldHistory.slice(0, 3).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '6px', marginBottom: '8px', fontSize: '13px' }}>
                                            <span>{item.Crop} | {item.Season} | {item.State}</span>
                                            <span style={{ fontWeight: '600', color: '#388e3c' }}>{item.predicted_yield?.toFixed(2)} {item.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SMART CROP RECOMMENDATION SECTION */}
                <div className="dashboard-card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">💰 Smart Crop Recommendation</h2>
                    </div>
                    <div className="card-body">
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                            Most profitable crops based on your yield prediction inputs above
                        </p>
                        {cropRecError && <div className="error-message">{cropRecError}</div>}

                        {cropRecLoading && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                ⏳ Analyzing crops for best profitability...
                            </div>
                        )}

                        {!cropRecResult && !cropRecLoading && !cropRecError && (
                            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                                <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                                    📊 Submit the Crop Yield Prediction form above to see smart crop recommendations
                                </p>
                            </div>
                        )}

                        {cropRecResult && (
                            <div style={{ marginTop: '24px' }}>
                                {/* Top Recommendation Card */}
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: '#e8f5e9',
                                    borderRadius: '12px',
                                    border: '2px solid #4caf50',
                                    textAlign: 'center',
                                    marginBottom: '20px'
                                }}>
                                    <p style={{ fontSize: '14px', color: '#388e3c', fontWeight: '600', margin: '0 0 8px 0' }}>🏆 Recommended Crop</p>
                                    <p style={{ fontSize: '36px', color: '#2e7d32', fontWeight: '700', margin: '0 0 16px 0' }}>
                                        {cropRecResult.recommended_crop}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px 0' }}>Expected Yield</p>
                                            <p style={{ fontSize: '18px', fontWeight: '700', color: '#2e7d32', margin: 0 }}>
                                                {cropRecResult.predicted_yield} t/ha
                                            </p>
                                        </div>
                                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px 0' }}>Market Price</p>
                                            <p style={{ fontSize: '18px', fontWeight: '700', color: '#e65100', margin: 0 }}>
                                                ₹{cropRecResult.market_price?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px 0' }}>Est. Profit</p>
                                            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1565c0', margin: 0 }}>
                                                ₹{cropRecResult.estimated_profit?.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Crops List */}
                                {cropRecResult.top_crops && cropRecResult.top_crops.length > 1 && (
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#558b2f', marginBottom: '12px' }}>
                                            📊 Top {Math.min(cropRecResult.top_crops.length, 5)} Profitable Crops
                                        </p>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {cropRecResult.top_crops.slice(0, 5).map((crop, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        backgroundColor: idx === 0 ? '#f1f8e9' : '#f5f5f5',
                                                        borderRadius: '8px',
                                                        marginBottom: '8px',
                                                        border: idx === 0 ? '1px solid #c5e1a5' : '1px solid #e0e0e0'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            backgroundColor: idx === 0 ? '#4caf50' : '#bdbdbd',
                                                            color: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            fontWeight: '700'
                                                        }}>
                                                            {idx + 1}
                                                        </span>
                                                        <div>
                                                            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#333' }}>{crop.crop}</p>
                                                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
                                                                Yield: {crop.yield} t/ha | Price: ₹{crop.price?.toLocaleString()}/q
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1565c0' }}>
                                                            ₹{crop.profit?.toLocaleString()}
                                                        </p>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>estimated</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* MIDDLE SECTION: Latest Recommendation + Soil Health */}
                <div className="middle-grid">
                    {/* Latest Recommendation */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h2 className="card-title">🌿 Latest Recommendation</h2>
                        </div>
                        <div className="card-body">
                            {lastRec ? (
                                <>
                                    <p style={{ fontSize: '20px', color: '#2e7d32', marginBottom: '12px' }}>
                                        Fertilizer: <strong>{lastRec.output?.name || 'N/A'}</strong>
                                    </p>
                                    <div className="soil-metrics">
                                        <div className="metric-box">
                                            <p className="metric-label">Nitrogen</p>
                                            <p className="metric-value">{lastRec.input?.N || 'N/A'}</p>
                                        </div>
                                        <div className="metric-box">
                                            <p className="metric-label">Phosphorus</p>
                                            <p className="metric-value">{lastRec.input?.P || 'N/A'}</p>
                                        </div>
                                        <div className="metric-box">
                                            <p className="metric-label">Potassium</p>
                                            <p className="metric-value">{lastRec.input?.K || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0', fontSize: '13px', color: '#666' }}>
                                        <p>🌾 <strong>Crop:</strong> {lastRec.input?.crop_type || 'N/A'} | <strong>Soil:</strong> {lastRec.input?.soil_type || 'N/A'}</p>
                                        <p>📅 <strong>Date:</strong> {formatDate(lastRec.ts)} at {formatTime(lastRec.ts)}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="empty-text">📋 No recommendations yet. Fill the form above to get started!</p>
                            )}
                        </div>
                    </div>

                    {/* Soil Health Analytics */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h2 className="card-title">🌱 Soil Health Analysis</h2>
                            {soilAnalysis && (
                                <button className="header-btn" onClick={() => setShowSoilHistory(true)}>
                                    📋 History
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            {soilAnalysis ? (
                                <>
                                    {/* Score Display */}
                                    <div style={{
                                        textAlign: 'center',
                                        marginBottom: '16px',
                                        padding: '16px',
                                        backgroundColor: '#f1f8e9',
                                        borderRadius: '8px'
                                    }}>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>Soil Health Score</p>
                                        <p style={{
                                            fontSize: '36px',
                                            fontWeight: 'bold',
                                            color: soilAnalysis.score >= 70 ? '#2e7d32' : soilAnalysis.score >= 50 ? '#f57c00' : '#c62828',
                                            margin: 0
                                        }}>
                                            {soilAnalysis.score}/100
                                        </p>
                                    </div>

                                    {/* Nutrient Metrics */}
                                    <div className="soil-metrics">
                                        <div className="metric-box">
                                            <p className="metric-label">Nitrogen (N)</p>
                                            <p className="metric-value" style={{
                                                color: soilAnalysis.status.N === 'Optimal' ? '#2e7d32' : soilAnalysis.status.N === 'Deficient' ? '#c62828' : '#f57c00'
                                            }}>
                                                {soilAnalysis.status.N}
                                            </p>
                                        </div>
                                        <div className="metric-box">
                                            <p className="metric-label">Phosphorus (P)</p>
                                            <p className="metric-value" style={{
                                                color: soilAnalysis.status.P === 'Optimal' ? '#2e7d32' : soilAnalysis.status.P === 'Deficient' ? '#c62828' : '#f57c00'
                                            }}>
                                                {soilAnalysis.status.P}
                                            </p>
                                        </div>
                                        <div className="metric-box">
                                            <p className="metric-label">Potassium (K)</p>
                                            <p className="metric-value" style={{
                                                color: soilAnalysis.status.K === 'Optimal' ? '#2e7d32' : soilAnalysis.status.K === 'Deficient' ? '#c62828' : '#f57c00'
                                            }}>
                                                {soilAnalysis.status.K}
                                            </p>
                                        </div>
                                        <div className="metric-box">
                                            <p className="metric-label">pH Level</p>
                                            <p className="metric-value" style={{
                                                color: soilAnalysis.status.pH === 'Neutral' ? '#2e7d32' : '#f57c00'
                                            }}>
                                                {soilAnalysis.status.pH}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Suggestions */}
                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        backgroundColor: '#fff3e0',
                                        borderRadius: '6px',
                                        border: '1px solid #ffe0b2'
                                    }}>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#e65100', margin: '0 0 8px 0' }}>💡 Suggestions:</p>
                                        {soilAnalysis.suggestions.map((sugg, idx) => (
                                            <p key={idx} style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>• {sugg}</p>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="empty-text">📊 No soil analysis yet. Submit the form above to analyze your soil.</p>
                            )}
                        </div>
                    </div>

                    {/* Soil History Modal */}
                    {showSoilHistory && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ background: 'white', borderRadius: 10, padding: 32, minWidth: 400, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
                                <h2 style={{ marginTop: 0 }}>🧪 Soil Analysis History</h2>
                                <button style={{ float: 'right', marginTop: -32, marginRight: -16, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowSoilHistory(false)}>✖️</button>
                                {soilHistory.length === 0 ? (
                                    <p>No soil analyses found.</p>
                                ) : (
                                    <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f5f5f5' }}>
                                                <th>Date</th>
                                                <th>N</th>
                                                <th>P</th>
                                                <th>K</th>
                                                <th>pH</th>
                                                <th>Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {soilHistory.map((item, idx) => (
                                                <tr key={item._id || idx} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td>{formatDate(item.created_at)}</td>
                                                    <td>{item.N}</td>
                                                    <td>{item.P}</td>
                                                    <td>{item.K}</td>
                                                    <td>{item.pH}</td>
                                                    <td>{item.score}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM SECTION: History + Market Prices */}
                <div className="bottom-grid">
                    {/* Recommendation History */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h2 className="card-title">📋 Recommendation History</h2>
                        </div>
                        <div className="card-body">
                            {history && history.length > 0 ? (
                                <div className="history-list">
                                    {history.slice(0, 5).map((rec, idx) => (
                                        <div key={idx} className="history-row">
                                            <div>
                                                <p className="history-date">{formatDate(rec.ts)}</p>
                                                <p className="history-detail">🌾 {rec.input?.crop_type} | 🌱 {rec.input?.soil_type}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '12px', color: '#2e7d32', fontWeight: '600', margin: '6px 0 0 0' }}>
                                                    {rec.output?.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-text">📭 No history yet. Make your first recommendation!</p>
                            )}
                        </div>
                    </div>

                    {/* Live Mandi Market Prices */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h2 className="card-title">💰 Live Market Prices</h2>
                            <select
                                value={selectedMandiCrop}
                                onChange={(e) => setSelectedMandiCrop(e.target.value)}
                                className="form-select"
                                style={{ marginLeft: 'auto', maxWidth: '120px', padding: '6px 8px' }}
                            >
                                {CROPS.map(crop => <option key={crop} value={crop}>{crop}</option>)}
                            </select>
                        </div>
                        <div className="card-body">
                            {mandiLoading ? (
                                <p className="empty-text">⏳ Loading market prices...</p>
                            ) : mandiError ? (
                                <p className="error-text">❌ {mandiError}</p>
                            ) : mandiPrices && mandiPrices.records?.length > 0 ? (
                                <>
                                    {/* Fallback Message */}
                                    {mandiPrices.fallback_used && (
                                        <div style={{
                                            backgroundColor: '#fff8e1',
                                            borderRadius: '6px',
                                            padding: '10px 12px',
                                            marginBottom: '12px',
                                            border: '1px solid #ffecb3',
                                            fontSize: '12px',
                                            color: '#f57c00'
                                        }}>
                                            ℹ️ {mandiPrices.message || 'Showing state-wide prices (no data for your district)'}
                                        </div>
                                    )}

                                    {/* Average Price Summary */}
                                    <div style={{
                                        backgroundColor: '#e8f5e9',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '16px',
                                        textAlign: 'center',
                                        border: '1px solid #a5d6a7'
                                    }}>
                                        <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px 0' }}>
                                            📍 {mandiPrices.district !== 'All' ? `${mandiPrices.district}, ` : ''}{mandiPrices.state}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#388e3c', margin: '0 0 4px 0' }}>
                                            Average Price ({mandiPrices.records_found || mandiPrices.total_records} markets)
                                        </p>
                                        <p style={{ fontSize: '28px', fontWeight: '700', color: '#2e7d32', margin: 0 }}>
                                            ₹ {mandiPrices.average_price?.toLocaleString() || 0}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 0' }}>per quintal</p>
                                    </div>

                                    {/* Estimated Revenue */}
                                    {estimatedRevenue && (
                                        <div style={{
                                            backgroundColor: '#fff3e0',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            marginBottom: '16px',
                                            border: '1px solid #ffe0b2'
                                        }}>
                                            <p style={{ fontSize: '12px', color: '#e65100', margin: '0 0 8px 0', fontWeight: '600' }}>
                                                📊 Estimated Revenue
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
                                                        Yield: {estimatedRevenue.yield_tons} tons ({estimatedRevenue.yield_quintals} quintals)
                                                    </p>
                                                    <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0 0' }}>
                                                        Price: ₹{estimatedRevenue.price_per_quintal?.toLocaleString()}/quintal
                                                    </p>
                                                </div>
                                                <p style={{ fontSize: '20px', fontWeight: '700', color: '#e65100', margin: 0 }}>
                                                    ₹ {estimatedRevenue.estimated_revenue?.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Market Records Table */}
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f5f5f5' }}>
                                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Market</th>
                                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>State</th>
                                                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Modal Price</th>
                                                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mandiPrices.records.slice(0, 5).map((record, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '8px' }}>{record.market || 'N/A'}</td>
                                                        <td style={{ padding: '8px' }}>{record.state || 'N/A'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#e65100' }}>
                                                            ₹ {parseFloat(record.modal_price || 0).toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'right', color: '#666' }}>
                                                            {record.arrival_date || 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button
                                        onClick={() => fetchMandiPrices(selectedMandiCrop)}
                                        style={{
                                            marginTop: '12px',
                                            padding: '8px 16px',
                                            backgroundColor: '#f5f5f5',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            width: '100%'
                                        }}
                                    >
                                        🔄 Refresh Prices
                                    </button>
                                </>
                            ) : (
                                <p className="empty-text">💲 No market data available for {selectedMandiCrop}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Styles
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    },
    header: {
        backgroundColor: '#2e7d32',
        color: 'white',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    headerContent: {
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '32px',
        margin: 0,
        fontWeight: '700',
    },
    headerButtons: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    settingsBtn: {
        padding: '10px 20px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        border: '1px solid white',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'background-color 0.2s',
    },
    content: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
    },
    topGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
    },
    middleGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '24px',
    },
    bottomGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    cardHeader: {
        backgroundColor: '#f5f5f5',
        padding: '16px',
        borderBottom: '2px solid #2e7d32',
    },
    cardTitle: {
        fontSize: '18px',
        margin: 0,
        fontWeight: '600',
        color: '#333',
    },
    cardBody: {
        padding: '20px',
    },
    welcomeText: {
        fontSize: '20px',
        margin: '0 0 12px 0',
        color: '#333',
    },
    metaText: {
        fontSize: '14px',
        color: '#666',
        margin: '6px 0',
    },
    dateText: {
        fontSize: '12px',
        color: '#999',
        marginTop: '12px',
    },
    weatherGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
    },
    weatherItem: {
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        textAlign: 'center',
    },
    label: {
        fontSize: '12px',
        color: '#999',
        margin: '0 0 4px 0',
        textTransform: 'uppercase',
    },
    value: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#2e7d32',
        margin: 0,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
    },
    input: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
    },
    select: {
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
        backgroundColor: 'white',
        cursor: 'pointer',
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
        alignSelf: 'flex-start',
    },
    successMessage: {
        padding: '12px',
        backgroundColor: '#c8e6c9',
        color: '#2e7d32',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '14px',
    },
    errorMessage: {
        padding: '12px',
        backgroundColor: '#ffcdd2',
        color: '#c62828',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '14px',
    },
    soilMetrics: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
    },
    metricBox: {
        padding: '12px',
        backgroundColor: '#f1f8e9',
        borderRadius: '6px',
        textAlign: 'center',
        border: '1px solid #c5e1a5',
    },
    metricLabel: {
        fontSize: '12px',
        color: '#558b2f',
        margin: '0 0 6px 0',
        fontWeight: '600',
    },
    metricValue: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#2e7d32',
        margin: 0,
    },
    emptyText: {
        fontSize: '14px',
        color: '#999',
        fontStyle: 'italic',
        margin: 0,
    },
    errorText: {
        fontSize: '14px',
        color: '#d32f2f',
        margin: 0,
    },
    historyTable: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    historyRow: {
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyDate: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#2e7d32',
        margin: 0,
    },
    historyDetail: {
        fontSize: '12px',
        color: '#666',
        margin: '6px 0 0 0',
    },
    priceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
    },
    priceCard: {
        padding: '12px',
        backgroundColor: '#fff3e0',
        borderRadius: '6px',
        textAlign: 'center',
        border: '1px solid #ffe0b2',
    },
    commodityName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 6px 0',
    },
    priceValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#e65100',
        margin: '0 0 4px 0',
    },
    priceUnit: {
        fontSize: '11px',
        color: '#999',
        margin: 0,
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666',
        backgroundColor: '#f5f5f5',
    },
}

const dashboardStyles = `
  button:hover:not(:disabled) {
    background-color: #1b5e20 !important;
  }
  button:disabled {
    cursor: not-allowed;
  }
  input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`
