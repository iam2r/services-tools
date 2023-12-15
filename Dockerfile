FROM node:18 as builder

WORKDIR /app
COPY package.json .
RUN npm install
COPY ./pandora.js .

FROM pengzhile/pandora-next

WORKDIR /app

COPY --from=builder /app .

EXPOSE 8181

CMD ["sh", "-c", "npm run pandora && cp -r /app/pandora/data /data && cp -r /app/pandora/sessions /root/.cache/PandoraNext && pandora-next"]
