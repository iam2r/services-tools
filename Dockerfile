FROM node:18 as builder
WORKDIR /app
RUN cd /app && npm install
COPY . /app
FROM pengzhile/pandora-next

EXPOSE 8181

CMD ["sh", "-c", "cd /app && npm run pandora && cp -r /app/pandora/data /data && cp -r /app/pandora/sessions /root/.cache/PandoraNext && pandora-next"]
