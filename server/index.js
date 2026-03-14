const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 4000;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

app.use(cors());
app.use(express.json());
app.use(express.static(clientDistPath));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/gk-api', createProxyMiddleware({
  target: 'http://127.0.0.1:4001',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/gk-api': '/api' },
}));

app.use('/addition-api', createProxyMiddleware({
  target: 'http://127.0.0.1:4002',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/addition-api': '/api' },
}));

app.use('/sqrt-api', createProxyMiddleware({
  target: 'http://127.0.0.1:4003',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/sqrt-api': '/api' },
}));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tenali app running on http://0.0.0.0:${PORT}`);
});
