import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, API } from '../context/AuthContext'
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import './AdminDashboard.css'

// Color palette for charts
const COLORS = ['#2e7d32', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9', '#1b5e20', '#388e3c', '#66bb6a']

// Menu items for sidebar
const MENU_ITEMS = [
    { id: 'overview', label: 'Dashboard Overview', icon: '📊' },
    { id: 'farmers', label: 'Farmers', icon: '👨‍🌾' },
    { id: 'recommendations', label: 'Fertilizer Recommendations', icon: '🧪' },
    { id: 'soil-health', label: 'Soil Health Reports', icon: '🌱' },
    { id: 'yield-predictions', label: 'Crop Yield Predictions', icon: '📈' },
    { id: 'market-prices', label: 'Market Prices', icon: '💰' },
    { id: 'articles', label: 'Articles', icon: '📰' },
    { id: 'techniques', label: 'Farming Techniques', icon: '🚜' },
    { id: 'contacts', label: 'Contact Messages', icon: '📧' }
]

export default function AdminDashboard() {
    const { token } = useAuth()
    const nav = useNavigate()
    const [activeSection, setActiveSection] = useState('overview')
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    // Data states
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Section-specific data
    const [farmers, setFarmers] = useState([])
    const [farmersTotal, setFarmersTotal] = useState(0)
    const [farmerSearch, setFarmerSearch] = useState('')

    const [recommendations, setRecommendations] = useState([])
    const [recsTotal, setRecsTotal] = useState(0)

    const [soilReports, setSoilReports] = useState([])
    const [soilTotal, setSoilTotal] = useState(0)

    const [yieldPredictions, setYieldPredictions] = useState([])
    const [yieldTotal, setYieldTotal] = useState(0)

    const [marketPrices, setMarketPrices] = useState([])
    const [priceFilter, setPriceFilter] = useState({ state: '', commodity: '' })

    const [contacts, setContacts] = useState([])
    const [contactsTotal, setContactsTotal] = useState(0)

    const [articles, setArticles] = useState([])
    const [articlesTotal, setArticlesTotal] = useState(0)

    // Techniques state
    const [techniques, setTechniques] = useState([])
    const [techniquesTotal, setTechniquesTotal] = useState(0)

    // Create Article Form State
    const [showArticleForm, setShowArticleForm] = useState(false)
    const [articleForm, setArticleForm] = useState({
        title: '', author: '', excerpt: '', content: '', category: 'General', image_url: ''
    })
    const [articleLoading, setArticleLoading] = useState(false)
    const [articleSuccess, setArticleSuccess] = useState('')
    const [articleError, setArticleError] = useState('')

    // Create Technique Form State
    const [showTechniqueForm, setShowTechniqueForm] = useState(false)
    const [techniqueForm, setTechniqueForm] = useState({
        title: '', category: 'Soil Management', description: '', content: '', tags: '', image_url: ''
    })
    const [techniqueLoading, setTechniqueLoading] = useState(false)
    const [techniqueSuccess, setTechniqueSuccess] = useState('')
    const [techniqueError, setTechniqueError] = useState('')

    // Chart data
    const [fertilizerDist, setFertilizerDist] = useState({ labels: [], data: [] })
    const [yieldTrend, setYieldTrend] = useState({ labels: [], data: [] })
    const [cropPopularity, setCropPopularity] = useState({ labels: [], data: [] })

    // Auth headers helper
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    })

    // Fetch stats on mount
    useEffect(() => {
        if (token) {
            fetchStats()
            fetchChartData()
        }
    }, [token])

    // Fetch section-specific data when active section changes
    useEffect(() => {
        switch (activeSection) {
            case 'farmers':
                fetchFarmers()
                break
            case 'recommendations':
                fetchRecommendations()
                break
            case 'soil-health':
                fetchSoilReports()
                break
            case 'yield-predictions':
                fetchYieldPredictions()
                break
            case 'market-prices':
                fetchMarketPrices()
                break
            case 'contacts':
                fetchContacts()
                break
            case 'articles':
                fetchArticles()
                break
            case 'techniques':
                fetchTechniques()
                break
        }
    }, [activeSection])

    const fetchStats = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: getAuthHeaders()
            })
            if (!res.ok) throw new Error('Failed to fetch stats')
            const data = await res.json()
            setStats(data)
        } catch (err) {
            setError('Failed to fetch statistics')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const fetchChartData = async () => {
        try {
            const [fertRes, yieldRes, cropRes] = await Promise.all([
                fetch(`${API}/api/admin/charts/fertilizer-distribution`, { headers: getAuthHeaders() }),
                fetch(`${API}/api/admin/charts/yield-trend`, { headers: getAuthHeaders() }),
                fetch(`${API}/api/admin/charts/crop-popularity`, { headers: getAuthHeaders() })
            ])

            const fertData = fertRes.ok ? await fertRes.json() : { labels: [], data: [] }
            const yieldData = yieldRes.ok ? await yieldRes.json() : { labels: [], data: [] }
            const cropData = cropRes.ok ? await cropRes.json() : { labels: [], data: [] }

            setFertilizerDist(fertData || { labels: [], data: [] })
            setYieldTrend(yieldData || { labels: [], data: [] })
            setCropPopularity(cropData || { labels: [], data: [] })
        } catch (err) {
            console.error('Failed to fetch chart data:', err)
        }
    }

    const fetchFarmers = async () => {
        try {
            const url = farmerSearch
                ? `${API}/api/admin/farmers?search=${encodeURIComponent(farmerSearch)}`
                : `${API}/api/admin/farmers`
            const res = await fetch(url, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch farmers')
            const data = await res.json()
            setFarmers(data.farmers || [])
            setFarmersTotal(data.total || 0)
        } catch (err) {
            console.error('Failed to fetch farmers:', err)
        }
    }

    const deleteFarmer = async (id) => {
        if (!confirm('Are you sure you want to delete this farmer?')) return
        try {
            const res = await fetch(`${API}/api/admin/farmers/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            })
            if (res.ok) {
                fetchFarmers()
                fetchStats()
            }
        } catch (err) {
            console.error('Failed to delete farmer:', err)
        }
    }

    const fetchRecommendations = async () => {
        try {
            const res = await fetch(`${API}/api/admin/recommendations`, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch recommendations')
            const data = await res.json()
            setRecommendations(data.recommendations || [])
            setRecsTotal(data.total || 0)
        } catch (err) {
            console.error('Failed to fetch recommendations:', err)
        }
    }

    const fetchSoilReports = async () => {
        try {
            const res = await fetch(`${API}/api/admin/soil-health`, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch soil reports')
            const data = await res.json()
            setSoilReports(data.reports || [])
            setSoilTotal(data.total || 0)
        } catch (err) {
            console.error('Failed to fetch soil reports:', err)
        }
    }

    const fetchYieldPredictions = async () => {
        try {
            const res = await fetch(`${API}/api/admin/yield-predictions`, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch yield predictions')
            const data = await res.json()
            setYieldPredictions(data.predictions || [])
            setYieldTotal(data.total || 0)
        } catch (err) {
            console.error('Failed to fetch yield predictions:', err)
        }
    }

    const fetchMarketPrices = async () => {
        try {
            let url = `${API}/api/admin/market-prices?limit=100`
            if (priceFilter.state) url += `&state=${encodeURIComponent(priceFilter.state)}`
            if (priceFilter.commodity) url += `&commodity=${encodeURIComponent(priceFilter.commodity)}`
            const res = await fetch(url, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch market prices')
            const data = await res.json()
            setMarketPrices(data.prices || [])
        } catch (err) {
            console.error('Failed to fetch market prices:', err)
        }
    }

    const fetchContacts = async () => {
        try {
            const res = await fetch(`${API}/api/admin/contacts`, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch contacts')
            const data = await res.json()
            setContacts(data.contacts || [])
            setContactsTotal(data.total || 0)
        } catch (err) {
            console.error('Failed to fetch contacts:', err)
        }
    }

    const fetchArticles = async () => {
        try {
            const res = await fetch(`${API}/api/admin/articles`, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch articles')
            const data = await res.json()
            setArticles(data.articles || [])
            setArticlesTotal(data.total || 0)
        } catch (err) {
            console.error('Failed to fetch articles:', err)
        }
    }

    const fetchTechniques = async () => {
        try {
            const res = await fetch(`${API}/api/techniques`, { headers: getAuthHeaders() })
            if (!res.ok) throw new Error('Failed to fetch techniques')
            const data = await res.json()
            const techList = Array.isArray(data) ? data : (data.techniques || [])
            setTechniques(techList)
            setTechniquesTotal(techList.length)
        } catch (err) {
            console.error('Failed to fetch techniques:', err)
        }
    }

    // Create Article Handler
    const handleCreateArticle = async (e) => {
        e.preventDefault()
        setArticleLoading(true)
        setArticleError('')
        setArticleSuccess('')
        try {
            const payload = {
                ...articleForm,
                publishedAt: new Date().toISOString(),
                image: articleForm.image_url
            }
            const res = await fetch(`${API}/api/articles`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            })
            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.detail || 'Failed to create article')
            }
            setArticleSuccess('✅ Article created successfully!')
            setArticleForm({ title: '', author: '', excerpt: '', content: '', category: 'General', image_url: '' })
            fetchArticles()
            setTimeout(() => {
                setShowArticleForm(false)
                setArticleSuccess('')
            }, 2000)
        } catch (err) {
            setArticleError(err.message)
        } finally {
            setArticleLoading(false)
        }
    }

    // Create Technique Handler
    const handleCreateTechnique = async (e) => {
        e.preventDefault()
        setTechniqueLoading(true)
        setTechniqueError('')
        setTechniqueSuccess('')
        try {
            const payload = {
                ...techniqueForm,
                tags: techniqueForm.tags.split(',').map(t => t.trim()).filter(t => t),
                image: techniqueForm.image_url,
                createdAt: new Date().toISOString()
            }
            const res = await fetch(`${API}/api/techniques`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            })
            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.detail || 'Failed to create technique')
            }
            setTechniqueSuccess('✅ Technique created successfully!')
            setTechniqueForm({ title: '', category: 'Soil Management', description: '', content: '', tags: '', image_url: '' })
            fetchTechniques()
            setTimeout(() => {
                setShowTechniqueForm(false)
                setTechniqueSuccess('')
            }, 2000)
        } catch (err) {
            setTechniqueError(err.message)
        } finally {
            setTechniqueLoading(false)
        }
    }

    // Helper to format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        } catch {
            return dateStr
        }
    }

    // Prepare chart data with safe defaults
    const pieChartData = useMemo(() => {
        const labels = fertilizerDist?.labels || []
        const data = fertilizerDist?.data || []
        return labels.map((label, i) => ({
            name: label,
            value: data[i] || 0
        }))
    }, [fertilizerDist])

    const barChartData = useMemo(() => {
        const labels = cropPopularity?.labels || []
        const data = cropPopularity?.data || []
        return labels.map((label, i) => ({
            name: label,
            count: data[i] || 0
        }))
    }, [cropPopularity])

    const lineChartData = useMemo(() => {
        const labels = yieldTrend?.labels || []
        const data = yieldTrend?.data || []
        return labels.map((label, i) => ({
            date: label,
            yield: data[i] || 0
        }))
    }, [yieldTrend])

    // Render stat card
    const StatCard = ({ icon, title, value, color = '#2e7d32' }) => (
        <div className="admin-stat-card">
            <div className="stat-icon" style={{ backgroundColor: color + '20', color }}>{icon}</div>
            <div className="stat-info">
                <div className="stat-value">{value}</div>
                <div className="stat-title">{title}</div>
            </div>
        </div>
    )

    // Render overview section
    const renderOverview = () => (
        <div className="admin-overview">
            <h2>Dashboard Overview</h2>

            {/* Stats Cards */}
            <div className="stats-grid">
                <StatCard icon="👨‍🌾" title="Total Farmers" value={stats?.total_farmers || 0} color="#2e7d32" />
                <StatCard icon="🧪" title="Total Recommendations" value={stats?.total_recommendations || 0} color="#1976d2" />
                <StatCard icon="🌱" title="Soil Analyses" value={stats?.total_soil_analyses || 0} color="#ed6c02" />
                <StatCard icon="📈" title="Yield Predictions" value={stats?.total_yield_predictions || 0} color="#9c27b0" />
                <StatCard icon="📰" title="Total Articles" value={stats?.total_articles || 0} color="#0288d1" />
                <StatCard icon="📧" title="Contact Messages" value={stats?.total_contacts || 0} color="#d32f2f" />
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <h3>Analytics</h3>
                <div className="charts-grid">
                    {/* Fertilizer Distribution Pie Chart */}
                    <div className="chart-card">
                        <h4>Fertilizer Recommendation Distribution</h4>
                        {pieChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data">No data available</div>
                        )}
                    </div>

                    {/* Crop Popularity Bar Chart */}
                    <div className="chart-card">
                        <h4>Crop Popularity</h4>
                        {barChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#4caf50" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data">No data available</div>
                        )}
                    </div>

                    {/* Yield Trend Line Chart */}
                    <div className="chart-card full-width">
                        <h4>Yield Prediction Trend (Last 30 Days)</h4>
                        {lineChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={lineChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="yield" stroke="#2e7d32" strokeWidth={2} dot={{ fill: '#2e7d32' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data">No data available</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )

    // Render farmers section
    const renderFarmers = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>Farmers Management</h2>
                <span className="badge">{farmersTotal} total</span>
            </div>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchFarmers()}
                />
                <button onClick={fetchFarmers}>Search</button>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Location</th>
                            <th>Joined Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {farmers.length === 0 ? (
                            <tr><td colSpan="6" className="no-data">No farmers found</td></tr>
                        ) : (
                            farmers.map((farmer) => (
                                <tr key={farmer.id}>
                                    <td>{farmer.name}</td>
                                    <td>{farmer.email}</td>
                                    <td>{farmer.phone || '-'}</td>
                                    <td>{farmer.location?.state ? `${farmer.location.district || ''}, ${farmer.location.state}` : '-'}</td>
                                    <td>{formatDate(farmer.joined_date)}</td>
                                    <td>
                                        <button className="btn-danger btn-sm" onClick={() => deleteFarmer(farmer.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render recommendations section
    const renderRecommendations = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>Fertilizer Recommendations</h2>
                <span className="badge">{recsTotal} total</span>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Farmer</th>
                            <th>Crop</th>
                            <th>Soil Type</th>
                            <th>Recommended Fertilizer</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recommendations.length === 0 ? (
                            <tr><td colSpan="5" className="no-data">No recommendations found</td></tr>
                        ) : (
                            recommendations.map((rec) => (
                                <tr key={rec.id}>
                                    <td>{rec.farmer_email || '-'}</td>
                                    <td>{rec.crop || '-'}</td>
                                    <td>{rec.soil_type || '-'}</td>
                                    <td><span className="badge-green">{rec.fertilizer || '-'}</span></td>
                                    <td>{formatDate(rec.date)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render soil health section
    const renderSoilHealth = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>Soil Health Reports</h2>
                <span className="badge">{soilTotal} total</span>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Farmer</th>
                            <th>Score</th>
                            <th>Nitrogen (N)</th>
                            <th>Phosphorus (P)</th>
                            <th>Potassium (K)</th>
                            <th>pH</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {soilReports.length === 0 ? (
                            <tr><td colSpan="7" className="no-data">No soil reports found</td></tr>
                        ) : (
                            soilReports.map((report) => {
                                const scoreClass = report.score >= 70 ? 'optimal' : report.score >= 40 ? 'moderate' : 'deficient'
                                return (
                                    <tr key={report.id} className={`row-${scoreClass}`}>
                                        <td>{report.farmer_email || '-'}</td>
                                        <td><span className={`score-badge ${scoreClass}`}>{report.score}</span></td>
                                        <td>{report.nitrogen}</td>
                                        <td>{report.phosphorus}</td>
                                        <td>{report.potassium}</td>
                                        <td>{report.ph}</td>
                                        <td>{formatDate(report.date)}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render yield predictions section
    const renderYieldPredictions = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>Crop Yield Predictions</h2>
                <span className="badge">{yieldTotal} total</span>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Farmer</th>
                            <th>Crop</th>
                            <th>Predicted Yield</th>
                            <th>Area (ha)</th>
                            <th>State</th>
                            <th>Season</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {yieldPredictions.length === 0 ? (
                            <tr><td colSpan="7" className="no-data">No predictions found</td></tr>
                        ) : (
                            yieldPredictions.map((pred) => (
                                <tr key={pred.id}>
                                    <td>{pred.farmer_email || '-'}</td>
                                    <td>{pred.crop}</td>
                                    <td><strong>{pred.predicted_yield?.toFixed(2) || '-'}</strong> tons/ha</td>
                                    <td>{pred.area}</td>
                                    <td>{pred.state}</td>
                                    <td>{pred.season}</td>
                                    <td>{formatDate(pred.date)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render market prices section
    const renderMarketPrices = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>Market Prices</h2>
                <span className="badge">{marketPrices.length} records</span>
            </div>

            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Filter by state..."
                    value={priceFilter.state}
                    onChange={(e) => setPriceFilter(p => ({ ...p, state: e.target.value }))}
                />
                <input
                    type="text"
                    placeholder="Filter by commodity..."
                    value={priceFilter.commodity}
                    onChange={(e) => setPriceFilter(p => ({ ...p, commodity: e.target.value }))}
                />
                <button onClick={fetchMarketPrices}>Apply Filters</button>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Commodity</th>
                            <th>State</th>
                            <th>District</th>
                            <th>Market</th>
                            <th>Min Price</th>
                            <th>Max Price</th>
                            <th>Modal Price</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {marketPrices.length === 0 ? (
                            <tr><td colSpan="8" className="no-data">No market prices found</td></tr>
                        ) : (
                            marketPrices.map((price, idx) => (
                                <tr key={idx}>
                                    <td><strong>{price.commodity}</strong></td>
                                    <td>{price.state}</td>
                                    <td>{price.district}</td>
                                    <td>{price.market}</td>
                                    <td>₹{price.min_price}</td>
                                    <td>₹{price.max_price}</td>
                                    <td className="price-highlight">₹{price.modal_price}</td>
                                    <td>{price.arrival_date}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render articles section
    const renderArticles = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>📰 Articles</h2>
                <div className="header-actions">
                    <span className="badge">{articlesTotal} total</span>
                    <button className="create-btn" onClick={() => setShowArticleForm(!showArticleForm)}>
                        {showArticleForm ? '✖ Cancel' : '➕ Add Article'}
                    </button>
                </div>
            </div>

            {/* Create Article Form */}
            {showArticleForm && (
                <div className="create-form-container animate-slideDown">
                    <h3>📝 Create New Article</h3>
                    {articleSuccess && <div className="success-message">{articleSuccess}</div>}
                    {articleError && <div className="error-message">{articleError}</div>}
                    <form onSubmit={handleCreateArticle} className="create-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={articleForm.title}
                                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                                    placeholder="Article title"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Author *</label>
                                <input
                                    type="text"
                                    value={articleForm.author}
                                    onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                                    placeholder="Author name"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={articleForm.category}
                                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                                >
                                    <option value="General">General</option>
                                    <option value="Crop Management">Crop Management</option>
                                    <option value="Fertilizers">Fertilizers</option>
                                    <option value="Organic Farming">Organic Farming</option>
                                    <option value="Pest Control">Pest Control</option>
                                    <option value="Irrigation">Irrigation</option>
                                    <option value="Market Trends">Market Trends</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    value={articleForm.image_url}
                                    onChange={(e) => setArticleForm({ ...articleForm, image_url: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Excerpt/Summary *</label>
                            <textarea
                                value={articleForm.excerpt}
                                onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                                placeholder="Brief summary of the article (2-3 sentences)"
                                rows="2"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Full Content *</label>
                            <textarea
                                value={articleForm.content}
                                onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                                placeholder="Full article content... (Markdown supported)"
                                rows="6"
                                required
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={articleLoading}>
                            {articleLoading ? '⏳ Creating...' : '✅ Create Article'}
                        </button>
                    </form>
                </div>
            )}

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Excerpt</th>
                            <th>Published Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.length === 0 ? (
                            <tr><td colSpan="4" className="no-data">No articles found</td></tr>
                        ) : (
                            articles.map((article) => (
                                <tr key={article.id}>
                                    <td><strong>{article.title}</strong></td>
                                    <td>{article.author}</td>
                                    <td>{article.excerpt}...</td>
                                    <td>{formatDate(article.publishedAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render techniques section
    const renderTechniques = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>🚜 Farming Techniques</h2>
                <div className="header-actions">
                    <span className="badge">{techniquesTotal} total</span>
                    <button className="create-btn" onClick={() => setShowTechniqueForm(!showTechniqueForm)}>
                        {showTechniqueForm ? '✖ Cancel' : '➕ Add Technique'}
                    </button>
                </div>
            </div>

            {/* Create Technique Form */}
            {showTechniqueForm && (
                <div className="create-form-container animate-slideDown">
                    <h3>🌿 Create New Farming Technique</h3>
                    {techniqueSuccess && <div className="success-message">{techniqueSuccess}</div>}
                    {techniqueError && <div className="error-message">{techniqueError}</div>}
                    <form onSubmit={handleCreateTechnique} className="create-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={techniqueForm.title}
                                    onChange={(e) => setTechniqueForm({ ...techniqueForm, title: e.target.value })}
                                    placeholder="Technique title"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={techniqueForm.category}
                                    onChange={(e) => setTechniqueForm({ ...techniqueForm, category: e.target.value })}
                                    required
                                >
                                    <option value="Soil Management">Soil Management</option>
                                    <option value="Crop Rotation">Crop Rotation</option>
                                    <option value="Irrigation">Irrigation</option>
                                    <option value="Pest Management">Pest Management</option>
                                    <option value="Organic Farming">Organic Farming</option>
                                    <option value="Fertigation">Fertigation</option>
                                    <option value="Harvesting">Harvesting</option>
                                    <option value="Post-Harvest">Post-Harvest</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={techniqueForm.tags}
                                    onChange={(e) => setTechniqueForm({ ...techniqueForm, tags: e.target.value })}
                                    placeholder="e.g., organic, sustainable, water-saving"
                                />
                            </div>
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    value={techniqueForm.image_url}
                                    onChange={(e) => setTechniqueForm({ ...techniqueForm, image_url: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Short Description *</label>
                            <textarea
                                value={techniqueForm.description}
                                onChange={(e) => setTechniqueForm({ ...techniqueForm, description: e.target.value })}
                                placeholder="Brief description of the technique (2-3 sentences)"
                                rows="2"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Full Content *</label>
                            <textarea
                                value={techniqueForm.content}
                                onChange={(e) => setTechniqueForm({ ...techniqueForm, content: e.target.value })}
                                placeholder="Detailed instructions and explanation... (Markdown supported)"
                                rows="6"
                                required
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={techniqueLoading}>
                            {techniqueLoading ? '⏳ Creating...' : '✅ Create Technique'}
                        </button>
                    </form>
                </div>
            )}

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Tags</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {techniques.length === 0 ? (
                            <tr><td colSpan="5" className="no-data">No techniques found</td></tr>
                        ) : (
                            techniques.map((tech) => (
                                <tr key={tech.id}>
                                    <td><strong>{tech.title}</strong></td>
                                    <td><span className="category-badge">{tech.category}</span></td>
                                    <td>{tech.description?.substring(0, 80)}...</td>
                                    <td>
                                        {tech.tags?.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="tag">{tag}</span>
                                        ))}
                                    </td>
                                    <td>{formatDate(tech.createdAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render contacts section
    const renderContacts = () => (
        <div className="admin-section">
            <div className="section-header">
                <h2>Contact Messages</h2>
                <span className="badge">{contactsTotal} total</span>
            </div>

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Message</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contacts.length === 0 ? (
                            <tr><td colSpan="5" className="no-data">No contact messages found</td></tr>
                        ) : (
                            contacts.map((contact) => (
                                <tr key={contact.id}>
                                    <td><strong>{contact.name}</strong></td>
                                    <td>{contact.mobile || '-'}</td>
                                    <td>{contact.email || '-'}</td>
                                    <td className="message-cell">{contact.message}</td>
                                    <td>{formatDate(contact.date)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    // Render active section content
    const renderContent = () => {
        switch (activeSection) {
            case 'overview': return renderOverview()
            case 'farmers': return renderFarmers()
            case 'recommendations': return renderRecommendations()
            case 'soil-health': return renderSoilHealth()
            case 'yield-predictions': return renderYieldPredictions()
            case 'market-prices': return renderMarketPrices()
            case 'articles': return renderArticles()
            case 'techniques': return renderTechniques()
            case 'contacts': return renderContacts()
            default: return renderOverview()
        }
    }

    return (
        <div className="admin-dashboard">
            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <h2>{sidebarCollapsed ? '🌿' : '🌿 AgriAdvisor'}</h2>
                    <span className="admin-badge">Admin</span>
                </div>

                <nav className="sidebar-nav">
                    {MENU_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                        {sidebarCollapsed ? '→' : '←'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {/* Top Navbar */}
                <header className="admin-topbar">
                    <div className="topbar-left">
                        <h1>{MENU_ITEMS.find(m => m.id === activeSection)?.label || 'Dashboard'}</h1>
                    </div>
                    <div className="topbar-right">
                        <button className="btn-refresh" onClick={() => {
                            fetchStats()
                            fetchChartData()
                        }}>🔄 Refresh</button>
                        <button className="btn-home" onClick={() => nav('/')}>🏠 Home</button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="admin-content">
                    {loading && activeSection === 'overview' ? (
                        <div className="loading-state">Loading dashboard...</div>
                    ) : error ? (
                        <div className="error-state">{error}</div>
                    ) : (
                        renderContent()
                    )}
                </div>
            </main>
        </div>
    )
}
