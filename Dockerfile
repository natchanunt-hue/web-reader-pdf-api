FROM ghcr.io/puppeteer/puppeteer:23.10.1

# 🔥 บอกระบบว่า: ไม่ต้องโหลดเพิ่ม และ Chrome ตัวจริงอยู่ที่นี่!
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

WORKDIR /usr/src/app

COPY package*.json ./

USER root
RUN npm install
RUN apt-get update && apt-get install -y fonts-thai-tlwg && rm -rf /var/lib/apt/lists/*

COPY . .
RUN chown -R pptruser:pptruser /usr/src/app

USER pptruser
EXPOSE 8080
CMD [ "node", "server.js" ]