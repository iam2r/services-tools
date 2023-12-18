FROM pengzhile/pandora-next as pandora-next
FROM node:18
ENV APP_HOME /node/app
WORKDIR $APP_HOME
RUN yarn global add pm2
RUN mkdir -p ./logs
COPY package*.json yarn*.lock $APP_HOME/
RUN yarn
COPY . $APP_HOME/
COPY --from=pandora-next /opt/app /opt/app

EXPOSE 3000

CMD ["sh","-c", "\
    yarn pandora && \
    cp -r ./pandora/data /data && \
    mkdir -p /root/.cache/PandoraNext && \
    cp -r ./pandora/sessions /root/.cache/PandoraNext && \
    pm2-runtime start pm2.config.js"]


