const chromium = require('@sparticuz/chromium');
const puppeteerCore = require('puppeteer-core');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const puppeteer = addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

// ฟังก์ชันแปลงลิงก์รูปเป็น Base64
async function imageUrlToBase64(url) {
    if (!url) return null;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.warn(`⚠️ Failed to load cover image: ${url}`);
        return null;
    }
}

// ✅ ฟังก์ชันจัดรูปแบบชื่อไฟล์: 2025-12-16_14-20_WebName_Title.pdf
function generateFilename(isoDateString, url, title) {
    let dateStr = "";
    
    // 1. แปลงวันที่จาก ISO String (ที่รับมาจาก Frontend) เป็น YYYY-MM-DD_HH-mm
    try {
        const d = new Date(isoDateString);
        // ปรับเวลาให้เป็น Local Time (ไทย +7) แบบ Manual เพื่อความชัวร์ในชื่อไฟล์
        // (หรือจะใช้ UTC ก็ได้แล้วแต่ชอบ แต่โค้ดนี้จะพยายามอิงตามวันที่ส่งมา)
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        
        dateStr = `${yyyy}-${mm}-${dd}_${hh}-${min}`;
    } catch (e) {
        // กันเหนียว: ถ้าแปลงไม่ได้จริงๆ ให้ใช้วันปัจจุบัน
        dateStr = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    }

    // 2. ดึงชื่อเว็บ: www.khaosod.co.th -> khaosod
    let siteName = "website";
    try {
        const hostname = new URL(url).hostname;
        siteName = hostname.replace('www.', '').split('.')[0];
    } catch (e) {}

    // 3. จัดการ Title: ลบอักขระพิเศษ เว้นวรรคเปลี่ยนเป็น _
    const safeTitle = title.replace(/[^a-zA-Z0-9ก-๙]/g, '_').substring(0, 60);

    // ผลลัพธ์: 2025-12-16_14-20_khaosod_นายกเปิดงาน.pdf
    return `${dateStr}_${siteName}_${safeTitle}.pdf`;
}

// ฟังก์ชันแปลงวันที่เพื่อโชว์ใน PDF (แบบสวยงาม: 16 ธ.ค. 2568 14:20 น.)
function formatDisplayDate(isoDateString) {
    try {
        const d = new Date(isoDateString);
        return d.toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }) + " น.";
    } catch (e) {
        return isoDateString;
    }
}

const scrapeAndGeneratePdf = async (req, res) => {
    const { url, title, date_text, image_url } = req.query;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    const customTitle = title || 'Document';
    
    // แปลงวันที่สำหรับโชว์ใน PDF
    const displayDate = formatDisplayDate(date_text || new Date().toISOString());

    let browser = null;
    try {
        console.log(`🚀 Processing: ${customTitle}`);
        
        // โหลดรูปปก (Parallel)
        const coverImagePromise = imageUrlToBase64(image_url);

        // เลือก Chrome
        let exePath;
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        } else if (process.platform === 'darwin') {
            exePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        } else {
            exePath = await chromium.executablePath();
        }

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security'
            ],
            defaultViewport: { width: 1280, height: 800 },
            executablePath: exePath,
            headless: 'new',
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(0); 
        page.setDefaultTimeout(0); 
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // 🔥 SUPER TURBO MODE: Text Only!
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // บล็อกหมด ยกเว้น Document/Script (เพราะเรามีรูปปกจาก Frontend แล้ว)
            if (['image', 'media', 'font', 'stylesheet', 'other', 'websocket'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // เข้าเว็บดูด Text
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.warn("⚠️ Navigation warning: " + e.message);
        }

        const contentHtml = await page.content();
        
        // แกะเนื้อหา
        const dom = new JSDOM(contentHtml, { url: url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        let finalContent = article ? article.content : dom.window.document.body.innerHTML;

        // Clean
        if (finalContent) {
            finalContent = finalContent.replace(/(word\s?){3,}/gi, ''); 
            finalContent = finalContent.replace(/<img[^>]*>/gi, ''); 
            finalContent = finalContent.replace(/<video[^>]*>[\s\S]*?<\/video>/gi, ''); 
            finalContent = finalContent.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, ''); 
            finalContent = finalContent.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
        }

        if (!finalContent || finalContent.length < 100) {
             throw new Error('ไม่สามารถดึงเนื้อหาข่าวได้');
        }

        const coverImageBase64 = await coverImagePromise;

        // ✅ HTML TEMPLATE
        const cleanHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    
                    .header { margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
                    h1 { font-size: 26px; color: #000; margin: 10px 0; line-height: 1.3; font-weight: bold; }
                    
                    /* ส่วน Meta Data */
                    .meta-table { width: 100%; font-size: 14px; color: #555; margin-top: 10px; }
                    .meta-table td { padding: 2px 0; vertical-align: top; }
                    .meta-label { font-weight: bold; width: 80px; }
                    .meta-value a { color: #2563eb; text-decoration: none; word-break: break-all; }
                    
                    /* Cover Image */
                    .cover-container {
                        text-align: center;
                        margin-bottom: 30px;
                        background-color: #f9f9f9;
                        border-radius: 8px;
                        padding: 10px;
                    }
                    .cover-image {
                        width: 100%;
                        max-height: 450px;
                        object-fit: contain;
                        border-radius: 6px;
                    }

                    .content { font-size: 16px; text-align: justify; }
                    p { margin-bottom: 15px; }
                    
                    .ssd-slot, .ads, .banner { display: none !important; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${customTitle}</h1>
                    
                    <table class="meta-table">
                        <tr>
                            <td class="meta-label">วันที่:</td>
                            <td class="meta-value">${displayDate}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">ที่มา:</td>
                            <td class="meta-value">${new URL(url).hostname}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">ลิงก์ข่าว:</td>
                            <td class="meta-value"><a href="${url}" target="_blank">${url}</a></td>
                        </tr>
                    </table>
                </div>

                ${coverImageBase64 ? `
                <div class="cover-container">
                    <img src="${coverImageBase64}" class="cover-image">
                </div>` : ''}
                
                <div class="content">
                    ${finalContent} 
                </div>
            </body>
            </html>
        `;

        await page.setContent(cleanHtml, { waitUntil: 'load', timeout: 30000 });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
        });

        // ✅ สร้างชื่อไฟล์แบบตัวเลขที่ต้องการ
        const finalFilename = generateFilename(date_text, url, customTitle);
        const encodedFilename = encodeURIComponent(finalFilename);

        console.log(`✅ Success: ${finalFilename}`);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = scrapeAndGeneratePdf;