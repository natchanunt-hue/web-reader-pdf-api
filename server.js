// server.js (สำหรับ Render)
const express = require('express');
const cors = require('cors');
const path = require('path');

// เรียกใช้ฟังก์ชัน Backend ที่เราเขียนไว้ใน folder api
const scrapeHandler = require('./api/scrape');

const app = express();
const PORT = process.env.PORT || 10000; // Render จะกำหนด PORT ให้เรา

app.use(cors());
app.use(express.json());

// 1. ตั้ง Route API
// เมื่อเรียก /api/scrape ให้ไปเรียกฟังก์ชันใน api/scrape.js
app.get('/api/scrape', scrapeHandler); // ใช้ scrapeHandler เดิม

// 2. เสิร์ฟไฟล์ static อื่นๆ (ถ้ามี)
// Render มักไม่ใช้สำหรับไฟล์ Frontend แต่เราเผื่อไว้
app.use(express.static(path.join(__dirname, 'public'))); 

app.listen(PORT, () => {
    console.log(`✅ Render Server running!`);
    console.log(`Listening on port ${PORT}`);
});