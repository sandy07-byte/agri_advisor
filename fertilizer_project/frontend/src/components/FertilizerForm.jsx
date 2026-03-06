import { useState, useEffect } from 'react'
import { API } from '../context/AuthContext'

const CROPS = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Barley', 'Soybean', 'Groundnut', 'Sunflower', 'Potato']
const SOILS = ['Sandy', 'Loamy', 'Clay', 'Silty', 'Peaty', 'Chalky', 'Saline']

const CROP_ICONS = {
  Wheat: '🌾', Rice: '🍚', Maize: '🌽', Cotton: '☁️', Sugarcane: '🎋',
  Barley: '🌿', Soybean: '🫘', Groundnut: '🥜', Sunflower: '🌻', Potato: '🥔'
}

export default function FertilizerForm() {
  const [form, setForm] = useState({ N: '', P: '', K: '', pH: '', moisture: '', temperature: '', crop_type: CROPS[0], soil_type: SOILS[0] })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('desc')
  const [focusedField, setFocusedField] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  // Animation trigger when result comes in
  useEffect(() => {
    if (result) {
      setShowResult(false)
      setTimeout(() => setShowResult(true), 50)
    }
  }, [result])

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setShowResult(false)
    try {
      const token = localStorage.getItem('token') || ''
      if (!token) {
        setError('Please login to get a recommendation.')
        return
      }
      const res = await fetch(`${API}/api/recommend/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          N: Number(form.N),
          P: Number(form.P),
          K: Number(form.K),
          pH: Number(form.pH),
          moisture: Number(form.moisture),
          temperature: Number(form.temperature),
          crop_type: form.crop_type,
          soil_type: form.soil_type,
        })
      })
      const ct = res.headers.get('content-type') || ''
      let data, text
      if (ct.includes('application/json')) {
        data = await res.json()
      } else {
        try { text = await res.text() } catch (_) { text = '' }
      }
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized. Please login again.')
        const msg = (data && (data.detail || data.message)) || text || `Request failed (${res.status})`
        throw new Error(msg)
      }
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getNutrientStatus = (value, type) => {
    const val = Number(value)
    if (!val) return { status: 'unknown', color: '#9ca3af' }
    const ranges = {
      N: { low: 40, high: 80 },
      P: { low: 20, high: 50 },
      K: { low: 100, high: 200 },
      pH: { low: 5.5, high: 7.5 },
      moisture: { low: 20, high: 60 },
      temperature: { low: 15, high: 35 }
    }
    const range = ranges[type]
    if (val < range.low) return { status: 'Low', color: '#ef4444' }
    if (val > range.high) return { status: 'High', color: '#f59e0b' }
    return { status: 'Optimal', color: '#22c55e' }
  }

  return (
    <div className="fertilizer-form-container">
      <form onSubmit={onSubmit} className="form fertilizer-form animated-form">
        <div className="form-header">
          <div className="form-icon-animated">🌱</div>
          <h2>Get Fertilizer Recommendation</h2>
          <p className="muted">Enter your soil and crop details to receive AI-powered suggestions.</p>
        </div>

        {/* Nutrient Inputs Section */}
        <div className="form-section">
          <h3 className="section-title">🧪 Soil Nutrients (mg/kg)</h3>
          <div className="grid-2">
            <div className={`input-group ${focusedField === 'N' ? 'focused' : ''}`}>
              <label>N (Nitrogen)</label>
              <div className="input-wrapper">
                <input
                  name="N"
                  type="number"
                  step="any"
                  value={form.N}
                  onChange={onChange}
                  onFocus={() => setFocusedField('N')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g., 50"
                  required
                />
                {form.N && (
                  <span className="nutrient-badge" style={{ backgroundColor: getNutrientStatus(form.N, 'N').color }}>
                    {getNutrientStatus(form.N, 'N').status}
                  </span>
                )}
              </div>
            </div>
            <div className={`input-group ${focusedField === 'P' ? 'focused' : ''}`}>
              <label>P (Phosphorus)</label>
              <div className="input-wrapper">
                <input
                  name="P"
                  type="number"
                  step="any"
                  value={form.P}
                  onChange={onChange}
                  onFocus={() => setFocusedField('P')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g., 35"
                  required
                />
                {form.P && (
                  <span className="nutrient-badge" style={{ backgroundColor: getNutrientStatus(form.P, 'P').color }}>
                    {getNutrientStatus(form.P, 'P').status}
                  </span>
                )}
              </div>
            </div>
            <div className={`input-group ${focusedField === 'K' ? 'focused' : ''}`}>
              <label>K (Potassium)</label>
              <div className="input-wrapper">
                <input
                  name="K"
                  type="number"
                  step="any"
                  value={form.K}
                  onChange={onChange}
                  onFocus={() => setFocusedField('K')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g., 150"
                  required
                />
                {form.K && (
                  <span className="nutrient-badge" style={{ backgroundColor: getNutrientStatus(form.K, 'K').color }}>
                    {getNutrientStatus(form.K, 'K').status}
                  </span>
                )}
              </div>
            </div>
            <div className={`input-group ${focusedField === 'pH' ? 'focused' : ''}`}>
              <label>pH Level</label>
              <div className="input-wrapper">
                <input
                  name="pH"
                  type="number"
                  step="any"
                  value={form.pH}
                  onChange={onChange}
                  onFocus={() => setFocusedField('pH')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g., 6.5"
                  min="0"
                  max="14"
                  required
                />
                {form.pH && (
                  <span className="nutrient-badge" style={{ backgroundColor: getNutrientStatus(form.pH, 'pH').color }}>
                    {getNutrientStatus(form.pH, 'pH').status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Conditions Section */}
        <div className="form-section">
          <h3 className="section-title">🌤️ Environmental Conditions</h3>
          <div className="grid-2">
            <div className={`input-group ${focusedField === 'moisture' ? 'focused' : ''}`}>
              <label>💧 Moisture (%)</label>
              <input
                name="moisture"
                type="number"
                step="any"
                value={form.moisture}
                onChange={onChange}
                onFocus={() => setFocusedField('moisture')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 45"
                required
              />
            </div>
            <div className={`input-group ${focusedField === 'temperature' ? 'focused' : ''}`}>
              <label>🌡️ Temperature (°C)</label>
              <input
                name="temperature"
                type="number"
                step="any"
                value={form.temperature}
                onChange={onChange}
                onFocus={() => setFocusedField('temperature')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 25"
                required
              />
            </div>
          </div>
        </div>

        {/* Crop Selection Section */}
        <div className="form-section">
          <h3 className="section-title">🌿 Crop & Soil Selection</h3>
          <div className="grid-2">
            <div className="input-group">
              <label>Crop Type</label>
              <div className="select-with-icon">
                <span className="select-icon">{CROP_ICONS[form.crop_type] || '🌱'}</span>
                <select name="crop_type" value={form.crop_type} onChange={onChange}>
                  {CROPS.map((c) => <option key={c} value={c}>{CROP_ICONS[c]} {c}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Soil Type</label>
              <div className="select-with-icon">
                <span className="select-icon">🏜️</span>
                <select name="soil_type" value={form.soil_type} onChange={onChange}>
                  {SOILS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn submit-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Analyzing Soil Data...
            </>
          ) : (
            <>
              <span className="btn-icon">🔬</span>
              Get Recommended Fertilizer
            </>
          )}
        </button>
        {error && <div className="error shake-animation" role="alert">⚠️ {error}</div>}
      </form>

      {result && (
        <div className={`result-card ${showResult ? 'show' : ''}`}>
          <div className="result-header">
            <div className="result-icon">🎯</div>
            <h2>{result.fertilizer}</h2>
            <span className="confidence-badge">AI Recommended</span>
          </div>

          {result.details?.image && (
            <div className="product-image-container">
              <img src={result.details.image} alt={result.fertilizer} loading="lazy" className="product-image" />
            </div>
          )}

          {/* Weather Alert Box */}
          {result.details?.weather_alert && (
            <div className="weather-alert animated-alert">
              <span className="alert-icon">⚠️</span>
              <div>
                <strong>Weather Alert</strong>
                <p>{result.details.weather_alert}</p>
              </div>
            </div>
          )}

          {/* Weather Information */}
          {result.details?.weather && (
            <div className="weather-info animated-card">
              <h4>📍 Current Weather Conditions</h4>
              <div className="weather-grid">
                <div className="weather-item">
                  <span className="weather-icon">🌡️</span>
                  <span className="weather-value">{result.details.weather.temperature}°C</span>
                  <span className="weather-label">Temperature</span>
                </div>
                <div className="weather-item">
                  <span className="weather-icon">💧</span>
                  <span className="weather-value">{result.details.weather.humidity}%</span>
                  <span className="weather-label">Humidity</span>
                </div>
                <div className="weather-item">
                  <span className="weather-icon">💨</span>
                  <span className="weather-value">{result.details.weather.wind_speed} m/s</span>
                  <span className="weather-label">Wind Speed</span>
                </div>
                <div className="weather-item">
                  <span className="weather-icon">☁️</span>
                  <span className="weather-value">{result.details.weather.description}</span>
                  <span className="weather-label">Conditions</span>
                </div>
              </div>
            </div>
          )}

          <div className="tabs animated-tabs">
            <button className={activeTab === 'desc' ? 'active' : ''} onClick={() => setActiveTab('desc')}>
              📋 Description
            </button>
            <button className={activeTab === 'usage' ? 'active' : ''} onClick={() => setActiveTab('usage')}>
              📖 Usage
            </button>
            <button className={activeTab === 'price' ? 'active' : ''} onClick={() => setActiveTab('price')}>
              💰 Price
            </button>
            <button className={activeTab === 'alts' ? 'active' : ''} onClick={() => setActiveTab('alts')}>
              🔄 Alternatives
            </button>
          </div>

          <div className="tab-content fade-in">
            {activeTab === 'desc' && <p>{result.details?.description || 'No description available.'}</p>}
            {activeTab === 'usage' && (
              <div className="usage-content">
                <p>{result.details?.application || 'Follow local agronomy recommendations.'}</p>
              </div>
            )}
            {activeTab === 'price' && (
              <div className="price-content">
                {result.details?.market ? (
                  <div className="price-info">
                    <span className="price-amount">{result.details.market.avg_price} {result.details.market.currency}</span>
                    <span className="price-unit">per {result.details.market.unit}</span>
                    {result.details.market.pack_sizes?.length > 0 && (
                      <div className="pack-sizes">
                        <strong>Available Packs:</strong> {result.details.market.pack_sizes.join(', ')} {result.details.market.unit}
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Pricing information not available.</p>
                )}
              </div>
            )}
            {activeTab === 'alts' && (
              <ul className="alternatives-list">
                {(result.details?.alternatives || []).length > 0 ? (
                  result.details.alternatives.map((a, i) => (
                    <li key={a} style={{ animationDelay: `${i * 0.1}s` }} className="alt-item">{a}</li>
                  ))
                ) : (
                  <li>No alternatives available.</li>
                )}
              </ul>
            )}
          </div>

          <div className="result-actions">
            <button className="btn secondary save-btn" onClick={() => alert('Recommendation saved to your history!')}>
              💾 Save Recommendation
            </button>
            <button className="btn secondary" onClick={() => window.print()}>
              🖨️ Print Report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
