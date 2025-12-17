const chromium = require('@sparticuz/chromium');
const puppeteerCore = require('puppeteer-core');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

const puppeteer = addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

// ----------------------------------------------------------------------
// 1. getBrowser Function
// ----------------------------------------------------------------------
const getBrowser = async () => {
    try {
        await chromium.font(path.join(__dirname, '../fonts', 'Sarabun-Regular.ttf'));
    } catch (e) {}

    const commonArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--hide-scrollbars',
        '--mute-audio',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--font-render-hinting=none',
        '--force-color-profile=srgb'
    ];

    let executablePath;
    if (process.platform === 'darwin' || process.platform === 'win32') {
        executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else {
        executablePath = await chromium.executablePath();
    }

    return puppeteer.launch({
        args: commonArgs,
        defaultViewport: chromium.defaultViewport,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true
    });
};

// ----------------------------------------------------------------------
// 2. Auto Scroll
// ----------------------------------------------------------------------
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight - window.innerHeight || totalHeight > 30000){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// ----------------------------------------------------------------------
// 3. Main Logic
// ----------------------------------------------------------------------
const scrapeAndGeneratePdf = async (req, res) => {
    // ✅ รับค่าจาก App (Team Tawee Command)
    const { url, date, title } = req.query;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    const isKhaosod = url.includes('khaosod');

    let browser = null;
    try {
        console.log(`🚀 Launching Browser (${isKhaosod ? 'Khaosod Reader Mode' : 'Normal Mode'})...`);
        browser = await getBrowser();
        const page = await browser.newPage();

        await page.setBypassCSP(true);
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        console.log(`🔗 Navigating to: ${url}`);

        if (isKhaosod) {
            // 🔥🔥🔥 KHAOSOD READER MODE 🔥🔥🔥
            
            // 1. เข้าเว็บ
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
            
            // 2. Scroll โหลดรูป
            console.log("⬇️ Scrolling to load images...");
            await autoScroll(page);
            await new Promise(r => setTimeout(r, 5000));

            // 3. ดูดข้อมูล
            const articleData = await page.evaluate(() => {
                const h1 = document.querySelector('h1')?.innerText || document.title;
                const contentEl = document.querySelector('.entry-content') || 
                                  document.querySelector('.ud-content') || 
                                  document.querySelector('article') ||
                                  document.body;
                let bodyHTML = contentEl.innerHTML;

                const dateEl = document.querySelector('.entry-date') || 
                               document.querySelector('time') || 
                               document.querySelector('.date');
                const dateText = dateEl ? dateEl.innerText : new Date().toISOString().split('T')[0];

                return { h1, bodyHTML, dateText };
            });

            // 4. สร้างหน้าใหม่ (Reader Mode)
            console.log("📝 Rewriting page content...");
            
            // ✅ จุดแก้ไขสำคัญ: ใช้ Title/Date จาก App ก่อน (ถ้ามี)
            const displayTitle = title || articleData.h1;
            const displayDate = date || articleData.dateText;

            const cleanHtml = `
                <html>
                <head>
                    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                    <style>
                        body { 
                            font-family: 'Sarabun', sans-serif !important; 
                            padding: 40px; 
                            background: #fff; 
                            color: #000;
                        }
                        h1 { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                        .meta-date { color: #666; font-size: 14px; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                        img { max-width: 100%; height: auto; margin: 10px 0; display: block; }
                        p { font-size: 16px; line-height: 1.6; margin-bottom: 15px; }
                        .ads, .banner, iframe, script, .relate-news { display: none !important; }
                    </style>
                </head>
                <body>
                    <h1>${displayTitle}</h1>
                    <div class="meta-date">วันที่: ${displayDate}</div>
                    <div class="content-body">
                        ${articleData.bodyHTML}
                    </div>
                </body>
                </html>
            `;

            // ใช้ domcontentloaded เพื่อกัน Timeout
            await page.setContent(cleanHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 3000));

        } else {
            // 🔥 NORMAL MODE (เว็บอื่นๆ)
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            console.log("⚔️ Checking Cloudflare...");
            try {
                await new Promise(r => setTimeout(r, 2000));
                const titleText = await page.title();
                if (titleText.toLowerCase().includes('just a moment') || titleText.includes('Cloudflare')) {
                    const frames = page.frames();
                    for (const frame of frames) {
                        try {
                            const box = await frame.$('input[type="checkbox"]');
                            if (box) {
                                await box.click();
                                await new Promise(r => setTimeout(r, 4000));
                            }
                        } catch(e) {}
                    }
                }
            } catch (e) {}

            console.log("⬇️ Scrolling...");
            await autoScroll(page);
            await new Promise(r => setTimeout(r, 3000));

            await page.addStyleTag({
                content: `
                    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                    * { font-family: 'Sarabun', 'Tahoma', 'Arial', sans-serif !important; }
                `
            });

            console.log("🧹 Cleaning...");
            await page.evaluate(() => {
                const trash = ['.modal', '.popup', '#cookie-consent', '.cookie-banner', '.ads-interstitial', '.overlay', 'iframe', 'header', 'footer'];
                trash.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
                document.querySelectorAll('*').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if ((style.position === 'fixed' || style.position === 'sticky') && el.tagName !== 'BODY') el.remove();
                });
                document.body.style.backgroundColor = '#ffffff';
                document.body.style.overflow = 'visible';
            });
        }

        // ✅ สร้างชื่อไฟล์
        const meta = await page.evaluate(() => {
            let t = document.title.replace('|', '-').trim();
            let d = new Date().toISOString().split('T')[0];
            return { t, d };
        });

        // ใช้ค่าจาก App เป็นหลัก
        let finalTitle = title || meta.t || 'news';
        let finalDate = date || meta.d || new Date().toISOString().split('T')[0];
        let siteName = (new URL(url).hostname).replace('www.', '').split('.')[0];

        const safeTitle = finalTitle.replace(/[^a-zA-Z0-9ก-๙\s\-_]/g, '').substring(0, 100);
        const filename = `${finalDate}_${siteName}_${safeTitle}.pdf`;

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            scale: 0.85
        });

        console.log(`✅ Success: ${filename}`);

        res.setHeader('Content-Type', 'application/pdf');
        const encodedFilename = encodeURIComponent(filename);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = scrapeAndGeneratePdf;