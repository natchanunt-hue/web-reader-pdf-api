const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path'); // ✅ บรรทัดนี้คุณมีแล้ว (ดีมาก)

// ----------------------------------------------------------------------
// 1. getBrowser Function
// ----------------------------------------------------------------------
const getBrowser = async () => {
    
    // ✅✅✅ เพิ่มบรรทัดนี้ด่วน! (ไม่งั้นภาษาไทยไม่มา) ✅✅✅
    // อธิบาย: สั่งให้ Chrome โหลดไฟล์ฟอนต์จากโฟลเดอร์ fonts ที่อยู่ข้างนอก
    await chromium.font(path.join(__dirname, '../fonts', 'Sarabun-Regular.ttf'));

    // 🔥 Argument Set (เหมือนเดิม)
    const launchArgs = [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-video-decode',
        '--disable-accelerated-video-encode',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--no-sandbox',
        '--window-size=1920x1080',
        '--hide-scrollbars',
        '--mute-audio'
    ];

    return puppeteer.launch({
        args: launchArgs, 
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreDefaultArgs: ['--disable-extensions'], 
        ignoreHTTPSErrors: true
    });
};

// ----------------------------------------------------------------------
// 2. Main Logic Function (คง Logic การทำงานเดิม 100%)
// ----------------------------------------------------------------------
const scrapeAndGeneratePdf = async (req, res) => {
    // 🚨 Logic การตั้งค่า CORS และ OPTIONS ถูกย้ายไปอยู่ใน server.js แล้ว

    const { url, date, title } = req.query; 
    
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let browser = null;
    try {
        console.log("🚀 Launching Browser V15 (Stealth Mode)...");
        browser = await getBrowser();
        const page = await browser.newPage();

        // ============================================================
        // 🥷 STEALTH TACTICS: การปลอมตัว (สำคัญมากสำหรับ Cloudflare)
        // ============================================================
        
        // 1. ปลอม User-Agent ให้เหมือนคนใช้ Mac จริงๆ
        const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        await page.setUserAgent(userAgent);

        // 2. ตั้งค่า Header ภาษา (Cloudflare ชอบเช็ค)
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1'
        });

        // 3. ลบรอยสัก Robot (navigator.webdriver) ก่อนเว็บโหลด
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // ปลอม Plugins เล็กน้อย
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
        });

        // ============================================================
        // 📥 Loading Content (ฉบับแก้ Cloudflare)
        // ============================================================
        
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const reqUrl = request.url().toLowerCase();
            const resourceType = request.resourceType();

            // ✅ 1. กฎเหล็ก: ห้ามบล็อกอะไรก็ตามที่เป็นของ Cloudflare หรือ Google (Captcha)
            if (reqUrl.includes('cloudflare') || reqUrl.includes('turnstile') || reqUrl.includes('google.com/recaptcha')) {
                request.continue();
                return;
            }

            // ✅ 2. ยอมให้โหลด Font และ Image (เพื่อให้รูปข่าวมา)
            // เราลบ 'image' ออกจากรายการแบนแล้ว
            if (['media', 'websocket', 'manifest'].includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log(`🔗 Navigating to: ${url}`);
        // เพิ่ม Timeout เป็น 2 นาที เผื่อเว็บช้า
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        
        // ============================================================
        // 🎭 ACTING CLASS: แสดงละครว่าเป็นคน (Human Behavior)
        // ============================================================
        console.log("🎭 Simulating human behavior...");
        
        try {
            // 1. ขยับเมาส์มั่วๆ (Cloudflare ชอบเช็คเมาส์)
            await page.mouse.move(Math.floor(Math.random() * 500), Math.floor(Math.random() * 500));
            await page.mouse.down();
            await new Promise(r => setTimeout(r, 200));
            await page.mouse.up();
            await page.mouse.move(Math.floor(Math.random() * 500), Math.floor(Math.random() * 500));

            // 2. เลื่อนหน้าจอนิดหน่อย (Scroll)
            await page.evaluate(() => {
                window.scrollBy(0, 300);
            });
        } catch (e) {
            console.log("⚠️ Mouse simulation failed (minor issue)");
        }

        // 3. รอให้ Cloudflare หมุนเสร็จ (เพิ่มเป็น 15 วินาที สำหรับ Free Tier)
        console.log("⏳ Waiting for content load & Cloudflare check...");
        await new Promise(r => setTimeout(r, 15000));

        // ============================================================
        // 🧹 Cleaning & Compressing (สูตร V14.2 Safe Mode)
        // ============================================================
        await page.evaluate(async () => {
            try {
                // A. ลบ Popup / Ads
                const clutter = document.querySelectorAll(
                    '.modal, .overlay, .popup, .cookie-consent, #cookie-consent, .ads-interstitial, ' + 
                    'iframe, .ads, .advertisement, div[id^="div-gpt-ad"], .taboola, .outbrain, .box-relate, ' +
                    '.social-share, .share-buttons, .sticky-share, .floating-bar, ' +
                    'footer, aside, .sidebar'
                );
                clutter.forEach(el => el.remove());

                // B. ปลดล็อค Scroll (ใส่ if ป้องกัน Error)
                if (document.body) document.body.style.overflow = 'visible';
                if (document.documentElement) document.documentElement.style.overflow = 'visible';

                // C. บีบอัดรูปภาพ
                const images = document.querySelectorAll('img');
                for (let img of images) {
                    if (img.src && !img.src.endsWith('.svg')) {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            let w = img.naturalWidth || img.width;
                            let h = img.naturalHeight || img.height;
                            if (w > 1000) { const s = 1000/w; w=1000; h=h*s; }
                            if (w < 50) continue;
                            canvas.width = w; canvas.height = h;
                            ctx.drawImage(img, 0, 0, w, h);
                            img.src = canvas.toDataURL('image/jpeg', 0.5); 
                            img.removeAttribute('srcset'); 
                        } catch (e) {}
                    }
                }
            } catch (err) {
                // ถ้ามี error ในส่วน clean ให้ข้ามไปเลย ไม่ต้องพังทั้งระบบ
                console.log('Cleanup minor error:', err.message);
            }
        });

        // ============================================================
        // 🎨 CSS Injection
        // ============================================================
        await page.addStyleTag({
    content: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

        /* 🚨 แก้ไขบรรทัดนี้: เพิ่ม Thonburi, Tahoma เป็น Fallback */
        body { background-color: #fff !important; font-family: 'Sarabun', Thonburi, Tahoma, sans-serif !important; margin: 0 !important; padding: 0 !important; }

        /* บังคับใช้ฟอนต์ในการพิมพ์ */
        @media print {
            * {
                font-family: 'Sarabun', Thonburi, Tahoma, sans-serif !important;
            }
        }

        header, nav, .navbar, .menu, .top-bar { position: static !important; display: block !important; width: 100% !important; }
        /* ... โค้ด CSS ส่วนที่เหลือ ... */
    `
});

        // ============================================================
        // 💾 Metadata & Print
        // ============================================================
        let finalTitle = title;
        let finalDate = date;
        let siteName = (new URL(url).hostname).replace('www.', '').split('.')[0];

        if (!finalTitle || !finalDate) {
            const scraped = await page.evaluate(() => {
                const t = document.title.replace('|', '-').split('-')[0].trim();
                const d = new Date().toISOString().split('T')[0];
                return { t, d };
            });
            if (!finalTitle) finalTitle = scraped.t;
            if (!finalDate) finalDate = scraped.d;
        }

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
            scale: 0.85
        });

        res.setHeader('Content-Type', 'application/pdf');
        const safeTitle = (finalTitle || 'document').replace(/[^a-zA-Z0-9ก-๙\s\-_]/g, '').substring(0, 100); 
        const filename = `${finalDate}_${siteName}_${safeTitle}.pdf`;
        const encodedFilename = encodeURIComponent(filename);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);

        res.send(pdfBuffer);
        console.log(`✅ Saved as: ${filename}`);

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: 'Error: ' + error.message });
    } finally {
        if (browser) await browser.close();
    }
};

// 3. Export เป็น Express Middleware
module.exports = scrapeAndGeneratePdf;