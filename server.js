const express = require('express');
const path = require('path');
const scrapeHandler = require('./api/scrape'); // เรียกใช้ไฟล์ scrape ที่เราแก้ไป

const app = express();
const PORT = process.env.PORT || 8080; // Cloud Run บังคับใช้ PORT นี้

// 1. อนุญาตให้เข้าถึงไฟล์ใน public (index.html)
app.use(express.static(path.join(__dirname, 'public')));

// 2. สร้างเส้นทางสำหรับ API (จุดสำคัญที่แก้ 404)
app.get('/api/scrape', async (req, res) => {
    try {
        await scrapeHandler(req, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 3. ถ้าเข้าลิงก์อื่นที่ไม่รู้จัก ให้ส่งหน้า index.html ไปให้
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เริ่มต้น Server
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});