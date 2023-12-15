FROM node:18 as builder

WORKDIR /app
COPY package.json .
RUN npm install
COPY ./pandora.js .

FROM pengzhile/pandora-next

EXPOSE 8181

CMD ["sh", "-c", "npm run pandora && cp -r /pandora/data /data && cp -r /pandora/sessions /root/.cache/PandoraNext && pandora-next"]
