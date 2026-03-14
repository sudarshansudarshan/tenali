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

app.use('/general-knowledge', createProxyMiddleware({
  target: 'http://127.0.0.1:4001',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/general-knowledge': '' },
}));

app.use('/addition', createProxyMiddleware({
  target: 'http://127.0.0.1:4002',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/addition': '' },
}));

app.use('/squareroot', createProxyMiddleware({
  target: 'http://127.0.0.1:4003',
  changeOrigin: true,
  ws: false,
  pathRewrite: { '^/squareroot': '' },
}));

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tenali launcher running on http://0.0.0.0:${PORT}`);
});
