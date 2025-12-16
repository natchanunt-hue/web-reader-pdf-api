// local-server.js (ใช้สำหรับรันในเครื่องเท่านั้น ไม่ต้องอัปขึ้น Vercel)
const express = require('express');
const cors = require('cors');
const path = require('path');

// เรียกใช้ฟังก์ชัน Backend ที่เราเขียนไว้ใน folder api
const scrapeHandler = require('./api/scrape');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. จำลอง Route API ให้เหมือน Vercel
// เมื่อเรียก /web-reader/api/scrape ให้ไปเรียกฟังก์ชันใน api/scrape.js
app.get('/web-reader/api/scrape', scrapeHandler);

// 2. จำลอง Route หน้าเว็บ
// เมื่อเรียก /web-reader ให้เปิดไฟล์ index.html
app.get('/web-reader', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เสิร์ฟไฟล์ static อื่นๆ (เช่น css, js ถ้ามี)
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`✅ Local Server running!`);
    console.log(`👉 เข้าใช้งานได้ที่: http://localhost:${PORT}/web-reader`);
});