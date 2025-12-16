const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const getBrowser = async () => {
    const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;
    
    // 🔥 Argument Set ที่แข็งแกร่งที่สุดสำหรับแก้ libnss3.so
    const launchArgs = [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // <--- ตัวนี้สำคัญมาก
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

    if (isVercel) {
        return puppeteer.launch({
            args: launchArgs, 
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            // 🚨 บังคับให้ใช้ Argument ของเรา
            ignoreDefaultArgs: ['--disable-extensions'], 
            ignoreHTTPSErrors: true
        });
    } else {
        // ... (ส่วน else ใช้โค้ดเดิม)
        return puppeteer.launch({
            args: launchArgs,
            defaultViewport: { width: 1366, height: 768 }, 
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
            headless: "new",
            ignoreHTTPSErrors: true
        });
    }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

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
        // 📥 Loading Content
        // ============================================================
        
        // Block ของหนักๆ (วิดีโอ/ฟอนต์)
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['media', 'websocket', 'manifest', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log(`🔗 Navigating to: ${url}`);
        // เพิ่มเวลา Timeout เผื่อ Cloudflare ตรวจสอบนาน
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        // 🔥 รอเพิ่ม 6 วินาที (Cloudflare ปกติจะหมุนติ้วๆ ประมาณ 3-5 วิ แล้วจะปล่อยผ่านถ้าเราเนียนพอ)
        await new Promise(r => setTimeout(r, 6000));

        // ============================================================
        // 🧹 Cleaning & Compressing (สูตร V14.1)
        // ============================================================
        await page.evaluate(async () => {
            // A. ลบ Popup / Ads (เก็บ Header ไว้ตามคำขอ)
            const clutter = document.querySelectorAll(
                '.modal, .overlay, .popup, .cookie-consent, #cookie-consent, .ads-interstitial, ' + 
                'iframe, .ads, .advertisement, div[id^="div-gpt-ad"], .taboola, .outbrain, .box-relate, ' +
                '.social-share, .share-buttons, .sticky-share, .floating-bar, ' +
                'footer, aside, .sidebar'
            );
            clutter.forEach(el => el.remove());

            // B. ปลดล็อค Scroll
            document.body.style.overflow = 'visible';
            document.documentElement.style.overflow = 'visible';

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
        });

        // ============================================================
        // 🎨 CSS Injection
        // ============================================================
        await page.addStyleTag({
            content: `
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
                body { background-color: #fff !important; font-family: 'Sarabun', sans-serif !important; margin: 0 !important; padding: 0 !important; }
                
                /* บังคับ Header ไม่ให้ลอย */
                header, nav, .navbar, .menu, .top-bar { position: static !important; display: block !important; width: 100% !important; }
                /* ซ่อนของลอยอื่นๆ */
                div[style*="position: fixed"], div[style*="position: sticky"], .sticky-nav { display: none !important; }
                .empty-space, .spacer { display: none !important; }
                img { max-width: 100% !important; height: auto !important; page-break-inside: avoid; display: block; margin: 10px auto; }
                a { text-decoration: none; color: black; pointer-events: none; }
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