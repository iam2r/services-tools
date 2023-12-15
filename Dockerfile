FROM node:18 as builder

WORKDIR /app
COPY package.json .
RUN npm install
COPY ./pandora.js .
RUN npm run pandora

FROM pengzhile/pandora-next

WORKDIR /app

COPY --from=builder /app/pandora/data /data

COPY --from=builder /app/pandora/sessions /root/.cache/PandoraNext

EXPOSE 8181

CMD ["pandora-next"]
