FROM node:24

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3004
EXPOSE 3005

CMD ["node", "App.js"]