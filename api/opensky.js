export default async function handler(req, res) {
  const username = process.env.VITE_OPENSKY_USERNAME
  const password = process.env.VITE_OPENSKY_PASSWORD

  const url = `https://opensky-network.org/api/states/all`
  const headers = { 'Accept': 'application/json' }
  if (username && password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  }

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(14000) })
    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenSky returned ${response.status}` })
    }
    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=60')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
