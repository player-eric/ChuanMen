import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage();
await page.goto(`file://${path.join(__dirname, 'test-guide.html')}`, { waitUntil: 'networkidle0' });
await page.pdf({
  path: path.join(__dirname, '串门儿_UI测试指南_v1.0.pdf'),
  format: 'A4',
  margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
  printBackground: true,
});
await browser.close();
console.log('✅ PDF generated: docs/串门儿_UI测试指南_v1.0.pdf');
