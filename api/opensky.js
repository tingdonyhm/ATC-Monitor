export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  const username = process.env.VITE_OPENSKY_USERNAME
  const password = process.env.VITE_OPENSKY_PASSWORD

  const headers = { 'Accept': 'application/json' }
  if (username && password) {
    const creds = Buffer.from(`${username}:${password}`).toString('base64')
    headers['Authorization'] = `Basic ${creds}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch('https://opensky-network.org/api/states/all', {
      headers,
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenSky ${response.status}` })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    clearTimeout(timer)
    return res.status(500).json({ error: String(err) })
  }
}
