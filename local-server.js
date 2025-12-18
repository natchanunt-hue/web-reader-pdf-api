// local-server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// เรียกใช้ฟังก์ชัน Backend จากไฟล์ api/scrape.js
const scrapeHandler = require('./api/scrape');

const app = express();

// ✅ แก้ตรงนี้: ให้รับ Port จาก Google Cloud (ถ้าไม่มีค่อยใช้ 3000)
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/scrape', async (req, res) => {
    try {
        console.log(`📥 Received request: ${req.query.url}`);
        await scrapeHandler(req, res);
    } catch (error) {
        console.error("🔥 Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.use(express.static('public')); 

app.get('/web-reader', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ แก้ตรงนี้: ให้ Listen ที่ 0.0.0.0 เพื่อให้ Cloud Run เข้าถึงได้
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});