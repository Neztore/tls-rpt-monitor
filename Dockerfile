FROM node:21.0.0

COPY package*.json .
RUN npm install
COPY . .

CMD [ "node", "index.mjs" ]
EXPOSE 3000
