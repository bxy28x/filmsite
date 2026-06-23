const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/mc/') || url.includes('/ma/') || url.includes('m3u8')) {
      console.log('STREAM:', url);
    }
    req.continue();
  });

  await page.goto('https://www.hdfilmizle.now/orumcek-adam-eve-donus-yok-hd-izle-1/', {
    waitUntil: 'networkidle2', timeout: 30000
  });

  await page.click('.vp, .play-btn, [class*="play"]').catch(() => {});
  await new Promise(r => setTimeout(r, 4000));

  // iframe'in pozisyonunu bul ve ortasına tıkla
  const iframeEl = await page.$('iframe.vpx, iframe[data-src*="vidmoxy"]');
  if (iframeEl) {
    const box = await iframeEl.boundingBox();
    console.log('iframe konum:', box);
    if (box) {
      // Ortasına tıkla
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
      console.log('Tıklandı');
    }
  }

  await new Promise(r => setTimeout(r, 12000));
  await browser.close();
})();