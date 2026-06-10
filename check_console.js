import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE UNCAUGHT ERROR:', error.message);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  console.log('Page loaded successfully. No errors detected if none printed above.');
  await browser.close();
})();
