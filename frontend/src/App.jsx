import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import FertilizerForm from './components/FertilizerForm'

const API = 'http://127.0.0.1:8000'
const AuthContext = createContext(null)

function mapArticle(raw) {
  // Prefer Mongo _id (hex or {$oid}) as primary id for routes
  const mongoId = (typeof raw._id === 'string' && raw._id) || (raw._id?.$oid ? String(raw._id.$oid) : '')
  const id = mongoId || raw.id || raw.slug || ''
  const title = raw.title || raw.name || 'Untitled'
  const image = raw.image || raw.image_url || raw.imageUrl || raw.cover || 'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?w=800&q=80'
  // Prefer explicit excerpt when present for short description
  const description = raw.excerpt || raw.description || raw.summary || raw.content || raw.body || ''
  const content = raw.content || raw.body || description
  const publishedAt = raw.publishedAt || raw.createdAt || raw.date || raw.created_at || raw.updatedAt || null
  const author = raw.author || raw.createdBy || raw.user || 'Admin'
  return { id, title, image, description, content, publishedAt, author }
}

function extractArticlesArray(d) {
  if (Array.isArray(d)) return d
  if (!d || typeof d !== 'object') return []
  if (Array.isArray(d.items)) return d.items
  if (Array.isArray(d.articles)) return d.articles
  if (Array.isArray(d.data)) return d.data
  if (Array.isArray(d.results)) return d.results
  if (Array.isArray(d.docs)) return d.docs
  if (Array.isArray(d.records)) return d.records
  return []
}

function formatDate(dt) {
  try { if (!dt) return ''; const d = new Date(dt); if (isNaN(d)) return String(dt); return d.toLocaleDateString() } catch { return '' }
}



function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => u && setUser(u))
        .catch(() => {})
    } else {
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [token])

  const value = useMemo(() => ({ token, setToken, user, setUser }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function Navbar() {
  const { token, user, setToken } = useAuth()
  const nav = useNavigate()
  const logout = () => {
    setToken('')
    nav('/login')
  }
  return (
    <div className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand">AgriAdvisor</Link>
      </div>
      <div className="nav-center">
        {token ? <div className="nav-welcome">welcome to our portal</div> : null}
      </div>
      <div className="nav-right">
        {token ? (
          <>
            <span className="welcome">hii {user?.name || 'Farmer'}</span>
            <button className="btn secondary" onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/" className="btn secondary">Home</Link>
        )}
      </div>
    </div>
  )
}


function Home() {
  const { token } = useAuth()
  const [articles, setArticles] = useState([])
  const [techs, setTechs] = useState([])
  useEffect(() => {
    fetch(`${API}/api/articles`)
      .then((r) => r.json())
      .then((d) => {
        const list = extractArticlesArray(d).map(mapArticle)
        setArticles(list.slice(0,4))
      })
      .catch(() => setArticles([]))
  }, [])

  useEffect(() => {
    fetch(`${API}/api/techniques?limit=4`)
      .then((r) => r.json())
      .then((d) => {
        const list = extractArticlesArray(d).map(mapArticle)
        setTechs(list.slice(0,4))
      })
      .catch(() => setTechs([]))
  }, [])
  if (token) {
    return (
      <div className="logged-in">
        <section className="form-page">
          <div className="form-bg" />
          <div className="form-overlay" />
          <div className="form-center">
            <div className="features-inline" style={{ marginBottom: 12 }}>
              <div className="feature"><div className="icon">🎯</div><div><div className="title">Accurate</div><div className="desc">Data-driven guidance</div></div></div>
              <div className="feature"><div className="icon">🌿</div><div><div className="title">Sustainable</div><div className="desc">Protects soil health</div></div></div>
              <div className="feature"><div className="icon">💰</div><div><div className="title">Cost‑effective</div><div className="desc">Reduce input waste</div></div></div>
            </div>
            <div className="form-card form-card--over-image">
              <FertilizerForm />
            </div>
          </div>
        </section>
      </div>
    )
  }
  return (
    <div>
      <section className="hero">
        <div className="overlay" />
        <div className="animated-bg" />
        <div className="hero-content">
          <div className="logo-title">AgriAdvisor</div>
          <h1>Smart Fertilizer Recommendations for Better Harvests</h1>
          <p>Leverage soil readings and data-driven insights to get optimized fertilizer recommendations for better yields and sustainability.</p>
        </div>
      </section>
      <div className="marquee" aria-label="Fertilizer Recommendation">
        <div className="marquee-text">welcome to our fertilizer recommendation platform</div>
        <div className="marquee-right">
          <div className="dropdown">
            <Link to="/about" className="marquee-link">About Us ▾</Link>
            <div className="dropdown-menu">
              <Link to="/about">Overview</Link>
              <Link to="/about#mission">Our Mission</Link>
              <Link to="/about#story">Our Story</Link>
              <Link to="/about#impact">Our Impact</Link>
              <Link to="/about#articles">Articles</Link>
              <Link to="/about#contact">Contact</Link>
              <Link to="/about#tech">Our Tech Stack</Link>
            </div>
          </div>
        </div>
      </div>

      <section className="features-strip">
        <div className="feature"><div className="icon">🎯</div><div><div className="title">Accurate</div><div className="desc">Data-driven guidance</div></div></div>
        <div className="feature"><div className="icon">🌿</div><div><div className="title">Sustainable</div><div className="desc">Protects soil health</div></div></div>
        <div className="feature"><div className="icon">💰</div><div><div className="title">Cost‑effective</div><div className="desc">Reduce input waste</div></div></div>
      </section>

      {token ? (
        <section className="cta-card">
          <h2>Get quick recommendations</h2>
          <p>Enter your soil data below to get a personalized fertilizer recommendation.</p>
          <FertilizerForm />
        </section>
      ) : (
        <div className="cta-row">
          <section className="cta-card">
            <h2>Welcome to AgriAdvisor</h2>
            {/* <h1>welcome to our fertilizer recommendation platform</h1> */}
            <p>
          Our platform empowers farmers with data-driven fertilizer suggestions tailored to their soil and environmental conditions. Enter your soil readings, choose your crop, and get optimized recommendations designed to improve yield and soil health.Want to know more about how fertilizer recommendations work? Explore our interactive guides to understand how nutrients like Nitrogen (N), Phosphorus (P), and Potassium (K) impact your crops, and how smart data helps select the right fertilizer for every soil type.Beyond recommendations, AgriAdvisor helps farmers reduce costs, increase productivity, and promote sustainable farming practices. Whether you’re growing rice, wheat, or vegetables, our intelligent model learns from real-world data to provide accurate insights that make every harvest better.</p>

          <p>We’re not just a platform — we’re a growing community of farmers, agronomists, and innovators committed to transforming agriculture through knowledge and collaboration. With every recommendation, we aim to create a network of informed farmers who inspire change across generations.</p>
            
            <div className="cta-actions">
              <Link to="/login" className="btn">Login</Link>
              <Link to="/register" className="btn secondary">Register</Link>
            </div>
          </section>

          <section className="cta-card side-card">
            <h3>About Our Platform</h3>
            <p>
AgriAdvisor provides reliable, data-backed fertilizer recommendations tuned to your soil and crop needs. We combine soil metrics, local climate factors, and agronomic best practices to support smarter nutrient management and healthier harvests.
            </p>Join thousands of farmers using AgriAdvisor to make informed decisions, conserve resources, and protect soil fertility — because smart farming starts with the right fertilizer. 🌱
            <h3>Contact Us</h3>
            <p>Email: support@example.com</p>
            <p>Mobile: +91 98765 43210</p>
          </section>
        </div>
      )}

      <section className="container about-section" style={{ marginTop: 0 }}>
        <h2>Farming Techniques</h2>
        {techs.length === 0 && <p className="muted">No techniques yet.</p>}
        <div className="grid-articles">
          {techs.map((t) => (
            <div key={t.id} className="card technique-card">
              <img src={t.image} alt={t.title} loading="lazy" />
              <div className="card-body">
                <h4>{t.title}</h4>
                <p>{(t.description || t.content || '').slice(0, 120)}{(t.description || t.content || '').length > 120 ? '…' : ''}</p>
                <Link to={`/techniques/${t.id}`} className="btn">Explore →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer gradient-bg">
        <div>
          <strong>About</strong>
          <p>Decision support for smarter, sustainable fertilization.</p>
        </div>
        <div>
          <strong>Quick Links</strong>
          <p><Link to="/">Home</Link></p>
          <p><Link to="/about">About</Link></p>
        </div>
        <div>
          <strong>Contact</strong>
          <p>support@example.com</p>
          <div className="socials">
            <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer" className="social">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-3h2v-2.3c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.3l-.4 3h-1.9v7A10 10 0 0 0 22 12z"/></svg>
            </a>
            <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noreferrer" className="social">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 6.5a2.44 2.44 0 1 1 0-4.88 2.44 2.44 0 0 1 0 4.88zM2.5 22h8.07V9.38H2.5V22zM13.43 9.38V22H21.5v-6.78c0-3.62-1.93-5.3-4.5-5.3-2.08 0-3 .95-3.57 1.93V9.38h0z"/></svg>
            </a>
            <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noreferrer" className="social">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.2 1.7-2.1-.8.5-1.7.9-2.6 1.1A4.1 4.1 0 0 0 12 8.9c0 .3 0 .6.1 .9-3.4-.2-6.5-1.8-8.5-4.4-.4.6-.6 1.3-.6 2 0 1.4.7 2.6 1.8 3.3-.6 0-1.2-.2-1.7-.5v.1c0 2 1.5 3.7 3.4 4.1-.4.1-.8.2-1.2.2-.3 0-.6 0-.9-.1.6 1.7 2.1 2.9 4 3a8.2 8.2 0 0 1-5 1.7H3a11.6 11.6 0  0 0 6.3 1.8c7.6 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.4-1.2 2-2z"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          © AgriAdvisor 2025 | Designed with <span aria-hidden>❤️</span> for Farmers
        </div>
      </footer>
    </div>
  )
}

function About() {
  const location = useLocation()
  const [openIdx, setOpenIdx] = useState(null)
  const [contact, setContact] = useState({ name: '', email: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [aboutArticles, setAboutArticles] = useState([])

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('show') })
    }, { rootMargin: '0px 0px -10% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Scroll to hash target on navigation within About
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [location.hash])

  useEffect(() => {
    const counters = document.querySelectorAll('[data-count]')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target
          const target = Number(el.getAttribute('data-count') || '0')
          let cur = 0
          const step = Math.max(1, Math.round(target / 60))
          const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t) } el.textContent = String(cur) }, 20)
          io.unobserve(el)
        }
      })
    }, { threshold: 0.5 })
    counters.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Fetch About page articles (tagged via section=about)
  useEffect(() => {
    let active = true
    fetch(`${API}/api/articles?section=about&limit=4`)
      .then((r) => r.json())
      .then((d) => { if (active) setAboutArticles(extractArticlesArray(d).map(mapArticle)) })
      .catch(() => { if (active) setAboutArticles([]) })
    return () => { active = false }
  }, [])

  const onChange = (e) => setContact({ ...contact, [e.target.name]: e.target.value })
  const onSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setSaved(''); setError('')
    try {
      const r = await fetch(`${API}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Failed to submit')
      setSaved('Thanks! We received your message.')
      setContact({ name: '', email: '', message: '' })
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div>
      <section className="about-hero">
        <div className="about-hero-overlay" />
        <div className="about-hero-content">
          <h1>About AgriAdvisor</h1>
          <p>Empowering Farmers with Smart, Data-Driven Fertilizer Solutions</p>
        </div>
        <div className="about-hero-cta">
          <section className="cta-card" style={{ maxWidth: 360 }}>
            <h3>Get Fertilizer Recommendations</h3>
            <p>Login to start your personalized, data-driven fertilizer guidance for your soil and crop.</p>
            <div className="cta-actions">
              <Link to="/login" className="btn">Login</Link>
            </div>
          </section>
        </div>
      </section>

      <div className="about-links" aria-label="About Sections">
        <a href="#mission">Our Mission</a>
        <span>•</span>
        <a href="#story">Our Story</a>
        <span>•</span>
        <a href="#impact">Our Impact</a>
        <span>•</span>
        <a href="#articles">Articles</a>
        <span>•</span>
        <a href="#contact">Contact</a>
        <span>•</span>
        <a href="#tech">Our Tech Stack</a>
      </div>

      <div className="about-grid">
        <div className="about-main">
      <section className="container about-section reveal" id="mission">
        <h2>Our Mission</h2>
        <p>AgriAdvisor aims to make farming sustainable using AI-powered recommendations that deliver the right nutrients at the right time.</p>
        <div className="cards-3">
          <div className="mini-card"><div className="icon">🌱</div><div className="title">Sustainability</div><div className="desc">Eco-friendly nutrient planning that protects soil health.</div></div>
          <div className="mini-card"><div className="icon">⚙️</div><div className="title">Technology</div><div className="desc">AI from soil, weather, and agronomy data.</div></div>
          <div className="mini-card"><div className="icon">🌾</div><div className="title">Productivity</div><div className="desc">Improve yields while reducing waste.</div></div>
        </div>
      </section>

      <section className="container about-section reveal" id="story">
        <h2>Our Story</h2>
        <div className="timeline">
          <div className="tl-item"><div className="dot">💡</div><div className="tl-body"><div className="tl-title">Idea</div><div className="tl-desc">Helping farmers with data-informed guidance.</div></div></div>
          <div className="tl-item"><div className="dot">🧪</div><div className="tl-body"><div className="tl-title">Data Collection</div><div className="tl-desc">Soil tests, climate, and crop patterns.</div></div></div>
          <div className="tl-item"><div className="dot">🤖</div><div className="tl-body"><div className="tl-title">Model</div><div className="tl-desc">ML models trained and evaluated for accuracy.</div></div></div>
          <div className="tl-item"><div className="dot">🌍</div><div className="tl-body"><div className="tl-title">Impact</div><div className="tl-desc">Real-world recommendations increasing yields.</div></div></div>
        </div>
      </section>


      <section className="container about-section reveal" id="impact">
        <h2>Our Impact</h2>
        <div className="impact">
          <div className="impact-card"><div className="icon">✅</div><div className="value"><span data-count="98">0</span>%</div><div className="label">Model Accuracy</div></div>
          <div className="impact-card"><div className="icon">🧪</div><div className="value"><span data-count="500">0</span>+</div><div className="label">Fertilizers</div></div>
          <div className="impact-card"><div className="icon">🧑‍🌾</div><div className="value"><span data-count="5">0</span>+</div><div className="label">Soil Types</div></div>
        </div>
      </section>


      <section className="container about-section reveal" id="articles">
        <h2>Articles / Learning Hub</h2>
        {aboutArticles.length === 0 && (
          <p className="muted">No articles yet.</p>
        )}
        <div className="grid-articles">
          {aboutArticles.map((a) => (
            <Link key={a.id} to={`/articles/${a.id}`} className="card article-card">
              <img src={a.image} alt={a.title} />
              <div className="card-body"><h4>{a.title}</h4><button className="btn secondary">Read More</button></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container about-section reveal" id="contact">
        <h2>Contact Us</h2>
        <div className="contact-grid">
          <form onSubmit={onSubmit} className="form" style={{ maxWidth: '100%' }}>
            <label>Name</label>
            <input name="name" value={contact.name} onChange={onChange} required />
            <label>Email</label>
            <input name="email" type="email" value={contact.email} onChange={onChange} required />
            <label>Message</label>
            <textarea name="message" value={contact.message} onChange={onChange} required style={{ width: '100%', minHeight: 120, padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }} />
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Sending...' : 'Send'}</button>
            {saved && <div className="success" style={{ marginTop: 10, color: '#065f46' }}>{saved}</div>}
            {error && <div className="error" role="alert">{error}</div>}
          </form>
          <div className="contact-media">
            <img src="https://images.unsplash.com/photo-1472145246862-b24cf25c4a36?w=1000&q=80" alt="Farm" />
          </div>
        </div>
      </section>

      <section className="container about-section reveal" id="tech">
        <h2>Our Tech Stack</h2>
        <div className="tech-grid">
          <div className="tech"><div className="icon">⚛️</div><div className="name">React</div><div className="desc">UI library for the web app</div></div>
          <div className="tech"><div className="icon">🚀</div><div className="name">FastAPI</div><div className="desc">Backend auth and ML endpoints</div></div>
          <div className="tech"><div className="icon">🍃</div><div className="name">MongoDB</div><div className="desc">Stores users and history</div></div>
          <div className="tech"><div className="icon">📈</div><div className="name">Scikit-learn</div><div className="desc">Model training and inference</div></div>
          <div className="tech"><div className="icon">🐍</div><div className="name">Python</div><div className="desc">ML and data processing</div></div>
        </div>
      </section>
        </div>
      </div>

      <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
    </div>
  )
}

function Login() {
  const { setToken } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validate = () => {
    const errs = {}
    if (!form.email) errs.email = 'Email is required'
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    return errs
  }

  const onSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setSuccess('')
    const errs = validate(); setFieldErrors(errs)
    if (Object.keys(errs).length) { setLoading(false); return }
    try {
      const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Invalid email or password')
      setToken(d.access_token)
      setSuccess('✅ Login successful!')
      setTimeout(() => nav('/'), 2000)
    } catch (err) { setError(err.message || 'Login failed') } finally { setLoading(false) }
  }
  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden></div>
      <div className="auth-overlay" aria-hidden></div>
      <div className="auth-card animate-in">
        <div className="auth-panel">
          <div className="auth-panel-inner">
            {success && <div className="toast-success" role="status">{success}</div>}
            <h1>Welcome back</h1>
            <p className="muted">Enter your credentials to continue.</p>
            <form onSubmit={onSubmit} className="form">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={onChange} required aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <div className="error" role="alert">{fieldErrors.email}</div>}
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={onChange} required aria-invalid={!!fieldErrors.password} />
              <small className="hint">Use at least 8 characters with letters and numbers.</small>
              {fieldErrors.password && <div className="error" role="alert">{fieldErrors.password}</div>}
              <button type="submit" className="btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
              {error && <div className="error" role="alert">{error}</div>}
              <div className="auth-switch">Don’t have an account? <Link to="/register">Register</Link></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Register() {
  const { setToken } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', location: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email) errs.email = 'Email is required'
    const pw = form.password
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
      errs.password = 'Password must be 8+ chars and include letters and numbers'
    }
    return errs
  }

  const onSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setSuccess('')
    const errs = validate(); setFieldErrors(errs)
    if (Object.keys(errs).length) { setLoading(false); return }
    try {
      const r = await fetch(`${API}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Registration failed')
      setToken(d.access_token)
      setSuccess('✅ Registration successful! Redirecting to login...')
      setTimeout(() => nav('/login'), 2000)
    } catch (err) { setError(err.message || 'Registration failed') } finally { setLoading(false) }
  }
  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden></div>
      <div className="auth-overlay" aria-hidden></div>
      <div className="auth-card auth-card--register animate-in">
        <div className="auth-panel">
          <div className="auth-panel-inner">
            {success && <div className="toast-success" role="status">{success}</div>}
            <h1>Create your account</h1>
            <p className="muted">Join thousands of farmers improving yields sustainably.</p>
            <form onSubmit={onSubmit} className="form">
              <label>Name</label>
              <input name="name" value={form.name} onChange={onChange} required aria-invalid={!!fieldErrors.name} />
              {fieldErrors.name && <div className="error" role="alert">{fieldErrors.name}</div>}
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={onChange} required aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <div className="error" role="alert">{fieldErrors.email}</div>}
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={onChange} required aria-invalid={!!fieldErrors.password} />
              <small className="hint">Use 8+ characters with at least one letter and one number.</small>
              {fieldErrors.password && <div className="error" role="alert">{fieldErrors.password}</div>}
              <label>Phone (optional)</label>
              <input name="phone" value={form.phone} onChange={onChange} />
              <label>Location (optional)</label>
              <input name="location" value={form.location} onChange={onChange} />
              <button type="submit" className="btn" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
              {error && <div className="error" role="alert">{error}</div>}
              <div className="auth-switch">Already have an account? <Link to="/login">Login</Link></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}


function ArticlesIndex() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    fetch(`${API}/api/articles`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        let list = extractArticlesArray(d).map(mapArticle)
        if (!list.length) {
          list = getMockArticles()
        }
        setArticles(list)
      })
      .catch(() => {
        if (active) setArticles(getMockArticles())
      })
      .finally(() => setLoading(false))
    return () => { active = false }
  }, [])
  const isEmpty = !loading && articles.length === 0
  return (
    <div className="container">
      <h1>Articles</h1>
      {loading && <p>Loading...</p>}
      {isEmpty && <p className="muted">No articles available.</p>}
      <div className="grid-articles">
        {articles.map((a) => {
          const base = a.description || a.content || ''
          const excerpt = base.slice(0, 150) + (base.length > 150 ? '…' : '')
          return (
            <div key={a.id} className="card article-card">
              <img src={a.image} alt={a.title} loading="lazy" />
              <div className="card-body">
                <h4>{a.title}</h4>
                <p>{excerpt}</p>
                <Link to={`/articles/${a.id}`} className="btn secondary">Read More →</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ArticleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const loc = useLocation()
  const isTechnique = loc.pathname.startsWith('/techniques/')
  useEffect(() => {
    let active = true
    const base = isTechnique ? 'techniques' : 'articles'
    fetch(`${API}/api/${base}/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        const raw = d
        const mapped = raw ? mapArticle(raw) : null
        setArticle(mapped)
      })
      .catch(() => { if (active) setArticle(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, isTechnique])
  if (loading) return <div className="container"><p>Loading...</p></div>
  if (!article) return <div className="container"><p>Not found.</p></div>
  const brief = (article.description || article.content || '').slice(0, 180)
  return (
    <div className="fade-in">
      <section className="article-hero-banner" style={{ backgroundImage: `url(${article.image})` }}>
        <div className="article-hero-overlay" />
        <div className="article-hero-inner">
          <h1>{article.title}</h1>
          {article.publishedAt && <div className="muted">Published: {formatDate(article.publishedAt)}</div>}
          {brief && <p className="article-brief">{brief}{(article.description || article.content || '').length > 180 ? '…' : ''}</p>}
        </div>
      </section>

      <div className="container article-detail">
          <button className="btn secondary" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}>← Back to Home</button>
        <div className="article-content">
          <p>{article.content}</p>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  return (
    <div>
      <Navbar />
      <div className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/articles" element={<Navigate to="/" replace />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route path="/techniques/:id" element={<ArticleDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
