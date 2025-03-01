FROM node:22-alpine

COPY package*.json .
RUN npm install
COPY . .

CMD [ "node", "index.mjs" ]
EXPOSE 3000
