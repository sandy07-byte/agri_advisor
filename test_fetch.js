const token = 'devtoken:dashboard_test@example.com:1771372466';
const API = 'http://127.0.0.1:8000';

async function testEndpoints() {
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // Test /api/me
        const meRes = await fetch(`${API}/api/me`, { headers });
        const meData = await meRes.json();
        console.log('✓ /api/me:', typeof meData, meData);

        // Test /api/history
        const histRes = await fetch(`${API}/api/history`, { headers });
        const histData = await histRes.json();
        console.log('✓ /api/history:', typeof histData, 'Array?', Array.isArray(histData), histData);

        // Test /api/prices
        const priceRes = await fetch(`${API}/api/prices`);
        const priceData = await priceRes.json();
        console.log('✓ /api/prices:', typeof priceData, 'Array?', Array.isArray(priceData), priceData);

        // Test /api/weather/Mumbai
        const weatherRes = await fetch(`${API}/api/weather/Mumbai`);
        const weatherData = await weatherRes.json();
        console.log('✓ /api/weather/Mumbai:', typeof weatherData, weatherData);
    } catch (err) {
        console.error('Error:', err);
    }
}

testEndpoints();
