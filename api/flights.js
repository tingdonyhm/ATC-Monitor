export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=115')

  const username = process.env.VITE_OPENSKY_USERNAME
  const password = process.env.VITE_OPENSKY_PASSWORD

  const { begin, end } = req.query
  if (!begin || !end) return res.status(400).json({ error: 'Missing begin/end' })

  const headers = { 'Accept': 'application/json' }
  if (username && password) {
    headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const url = `https://opensky-network.org/api/flights/all?begin=${begin}&end=${end}`
    const response = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) return res.status(response.status).json({ error: `OpenSky ${response.status}` })
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    clearTimeout(timer)
    return res.status(500).json({ error: String(err) })
  }
}
