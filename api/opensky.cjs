const https = require('https')

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  const username = process.env.VITE_OPENSKY_USERNAME
  const password = process.env.VITE_OPENSKY_PASSWORD

  const auth = (username && password)
    ? 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
    : null

  const options = {
    hostname: 'opensky-network.org',
    path: '/api/states/all',
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    timeout: 13000,
  }
  if (auth) options.headers['Authorization'] = auth

  const request = https.request(options, (response) => {
    let data = ''
    response.on('data', chunk => { data += chunk })
    response.on('end', () => {
      try {
        const parsed = JSON.parse(data)
        res.status(200).json(parsed)
      } catch (e) {
        res.status(500).json({ error: 'Parse error', raw: data.slice(0, 200) })
      }
    })
  })

  request.on('timeout', () => {
    request.destroy()
    res.status(504).json({ error: 'OpenSky timeout' })
  })

  request.on('error', (e) => {
    res.status(500).json({ error: e.message })
  })

  request.end()
}
