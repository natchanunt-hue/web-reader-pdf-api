# ใช้ Node.js เวอร์ชัน 18 (Slim) เพื่อความเบา
FROM node:18-slim

# ติดตั้ง Library พื้นฐานที่ Chromium ต้องการ (จำเป็นมากสำหรับ Linux Cloud Run)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# กำหนดโฟลเดอร์ทำงาน
WORKDIR /usr/src/app

# ก๊อปปี้ package.json ไปก่อน
COPY package*.json ./

# ติดตั้ง dependencies (ตัด devDependencies ออก)
RUN npm install --omit=dev

# ก๊อปปี้ไฟล์โปรเจกต์ทั้งหมด
COPY . .

# ตั้งค่า Environment
ENV NODE_ENV=production
ENV PORT=8080

# เปิด Port
EXPOSE 8080

# รัน Server
CMD [ "npm", "start" ]