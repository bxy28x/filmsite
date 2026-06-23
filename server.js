const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BASE = 'https://www.hdfilmizle.now';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

function isStreamUrl(url) {
  return url.includes('master.m3u8') || 
         url.includes('/mc/') ||
         url.includes('/ma/');
}

app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json({ results: [] });
  try {
    const response = await axios.post(`${BASE}/search/`, 
      `query=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE } }
    );
    let data = response.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) {} }
    const results = Array.isArray(data) ? data : (data.results || data.data || []);
    res.json({ results });
  } catch (err) {
    res.json({ results: [], error: err.message });
  }
});

app.post('/api/m3u8', async (req, res) => {
  const { slug, type } = req.body;
  if (!slug) return res.json({ found: false });

  const filmUrl = type === 'dizi' ? `${BASE}/dizi/${slug}/` : `${BASE}/${slug}/`;

  let browser;
  try {
browser = await puppeteer.launch({ 
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process'
  ]
});

    let streamUrl = null;
    const page = await browser.newPage();
    await page.setUserAgent(UA);

    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (isStreamUrl(url)) {
        streamUrl = url;
        console.log('Stream bulundu:', url);
      }
      req.continue();
    });

    await page.goto(filmUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Oynat butonuna bas
    await page.click('.vp, .play-btn, [class*="play"]').catch(() => {});
    await new Promise(r => setTimeout(r, 4000));

    // iframe ortasına tıkla
    const iframeEl = await page.$('iframe.vpx, iframe[data-src]');
    if (iframeEl) {
      const box = await iframeEl.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
        console.log('iframe tıklandı');
      }
    }

    // 12 saniye bekle
    await new Promise(r => setTimeout(r, 12000));

    if (streamUrl) {
      res.json({ found: true, url: streamUrl });
    } else {
      res.json({ found: false });
    }
  } catch (err) {
    console.error('Hata:', err.message);
    res.json({ found: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3000, () => {
  console.log('✅ Sunucu çalışıyor: http://localhost:3000');
});