FROM node:18 as builder
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY package*.json yarn*.lock $APP_HOME/
RUN npm install

FROM pengzhile/pandora-next
WORKDIR /

COPY --from=builder $APP_HOME .

EXPOSE 8181

CMD ["sh", "-c", "npm run pandora && cp -r /pandora/data /data && cp -r /app/pandora/sessions /root/.cache/PandoraNext && pandora-next"]
