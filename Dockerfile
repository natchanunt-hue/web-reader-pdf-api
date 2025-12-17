FROM ghcr.io/puppeteer/puppeteer:23.10.1

# 🔥 บอกระบบว่า: ใช้ Chromium ตัวที่กำลังจะติดตั้งนี้นะ!
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

COPY package*.json ./

USER root
RUN npm install

# 🛠️ สั่งติดตั้ง Chromium และฟอนต์ไทยให้ชัวร์ๆ (ไม้ตาย)
RUN apt-get update && apt-get install -y chromium fonts-thai-tlwg && rm -rf /var/lib/apt/lists/*

COPY . .
RUN chown -R pptruser:pptruser /usr/src/app

USER pptruser
EXPOSE 8080
CMD [ "node", "server.js" ]