import { useState } from 'react'

const API = 'http://127.0.0.1:8000'

const CROPS = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane']
const SOILS = ['Sandy', 'Loamy', 'Clay', 'Silty', 'Peaty']

export default function FertilizerForm() {
  const [form, setForm] = useState({ N: '', P: '', K: '', pH: '', moisture: '', temperature: '', crop_type: CROPS[0], soil_type: SOILS[0] })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('desc')

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
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

  return (
    <div>
      <form onSubmit={onSubmit} className="form">
        <div className="form-header">
          <h2>Get Recommendation</h2>
          <p className="muted">Enter your soil and crop details to receive a data-driven fertilizer suggestion.</p>
        </div>
        <div className="grid-2">
          <div>
            <label>N (Nitrogen)</label>
            <input name="N" type="number" step="any" value={form.N} onChange={onChange} required />
          </div>
          <div>
            <label>P (Phosphorus)</label>
            <input name="P" type="number" step="any" value={form.P} onChange={onChange} required />
          </div>
          <div>
            <label>K (Potassium)</label>
            <input name="K" type="number" step="any" value={form.K} onChange={onChange} required />
          </div>
          <div>
            <label>pH</label>
            <input name="pH" type="number" step="any" value={form.pH} onChange={onChange} required />
          </div>
          <div>
            <label>Moisture</label>
            <input name="moisture" type="number" step="any" value={form.moisture} onChange={onChange} required />
          </div>
          <div>
            <label>Temperature</label>
            <input name="temperature" type="number" step="any" value={form.temperature} onChange={onChange} required />
          </div>
          <div>
            <label>Crop Type</label>
            <select name="crop_type" value={form.crop_type} onChange={onChange}>
              {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Soil Type</label>
            <select name="soil_type" value={form.soil_type} onChange={onChange}>
              {SOILS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn" disabled={loading}>{loading ? 'Getting recommendation...' : 'Get Recommended Fertilizer'}</button>
        {error && <div className="error" role="alert">{error}</div>}
      </form>

      {result && (
        <div className="result-card">
          <h2>{result.fertilizer}</h2>
          {result.details?.image && <img src={result.details.image} alt={result.fertilizer} loading="lazy" className="product-image" />}
          <div className="tabs">
            <button className={activeTab==='desc'? 'active':''} onClick={() => setActiveTab('desc')}>Description</button>
            <button className={activeTab==='usage'? 'active':''} onClick={() => setActiveTab('usage')}>Usage Guidelines</button>
            <button className={activeTab==='price'? 'active':''} onClick={() => setActiveTab('price')}>Market Price</button>
            <button className={activeTab==='alts'? 'active':''} onClick={() => setActiveTab('alts')}>Alternatives</button>
          </div>
          {activeTab === 'desc' && <p>{result.details?.description}</p>}
          {activeTab === 'usage' && <p>{result.details?.application || 'Follow local agronomy recommendations.'}</p>}
          {activeTab === 'price' && (
            <p>
              {result.details?.market ? (
                <>
                  Avg Price: {result.details.market.avg_price} {result.details.market.currency} / {result.details.market.unit}
                  {result.details.market.pack_sizes?.length ? ` • Packs: ${result.details.market.pack_sizes.join(', ')} ${result.details.market.unit}` : ''}
                </>
              ) : 'No pricing info'}
            </p>
          )}
          {activeTab === 'alts' && (
            <ul>
              {(result.details?.alternatives || []).map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          <button className="btn secondary" onClick={() => alert('Recommendation saved to your history.')}>Save Recommendation</button>
        </div>
      )}
    </div>
  )
}
