export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  const username = process.env.VITE_OPENSKY_USERNAME
  const password = process.env.VITE_OPENSKY_PASSWORD

  const headers = { 'Accept': 'application/json', 'User-Agent': 'atc-monitor/1.0' }
  if (username && password) {
    const creds = Buffer.from(`${username}:${password}`).toString('base64')
    headers['Authorization'] = `Basic ${creds}`
  }

  try {
    const response = await fetch('https://opensky-network.org/api/states/all', {
      method: 'GET',
      headers,
    })

    const text = await response.text()

    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenSky ${response.status}`, body: text.slice(0, 300) })
    }

    const data = JSON.parse(text)
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) })
  }
}
