import https from 'node:https'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  const username = process.env.VITE_OPENSKY_USERNAME
  const password = process.env.VITE_OPENSKY_PASSWORD

  const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
  if (username && password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  }

  const options = {
    hostname: 'opensky-network.org',
    port: 443,
    path: '/api/states/all',
    method: 'GET',
    headers,
    timeout: 14000,
  }

  const request = https.request(options, (response) => {
    let data = ''
    response.on('data', chunk => { data += chunk })
    response.on('end', () => {
      try {
        const parsed = JSON.parse(data)
        res.status(response.statusCode).json(parsed)
      } catch {
        res.status(500).json({ error: 'Parse error', status: response.statusCode, body: data.slice(0, 500) })
      }
    })
  })

  request.on('timeout', () => {
    request.destroy()
    res.status(504).json({ error: 'timeout' })
  })

  request.on('error', (e) => {
    res.status(500).json({ error: e.message, code: e.code })
  })

  request.end()
}
