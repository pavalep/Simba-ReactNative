const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3001
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url
  const fp = path.join(__dirname, file)

  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404)
      return res.end('Not found')
    }
    const ext = path.extname(fp)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', 'Cache-Control': 'no-cache' })
    res.end(data)
  })
}).listen(PORT, () => {
  console.log(`Mockup server → http://localhost:${PORT}`)
})
