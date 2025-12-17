// local-server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// เรียกใช้ฟังก์ชัน Backend จากไฟล์ api/scrape.js
const scrapeHandler = require('./api/scrape');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ✅ 1. แก้ Route API ให้ตรงกับหน้าเว็บ (ลบ /web-reader ออก)
// เมื่อหน้าเว็บเรียก /api/scrape ก็จะเจอทันที
app.get('/api/scrape', async (req, res) => {
    try {
        console.log(`📥 Received request: ${req.query.url}`);
        await scrapeHandler(req, res);
    } catch (error) {
        console.error("🔥 Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ 2. ตั้งค่าให้เข้าหน้าเว็บได้ง่ายๆ ที่หน้าแรก (Root)
app.use(express.static('public')); // ให้ดึงไฟล์ใน public (index.html, css) มาแสดงอัตโนมัติ

// (เผื่อไว้) ถ้าเข้า /web-reader ก็ให้เด้งไป index.html เหมือนกัน
app.get('/web-reader', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Local Server running!`);
    console.log(`👉 กดเข้าใช้งานที่นี่: http://localhost:${PORT}`);
});