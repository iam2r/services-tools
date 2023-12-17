# FROM node:18 as builder
# ARG LICENSE_ID
# ARG TOKENS
# ARG ACCESS_CODE
# ARG PROXY_API_PREFIX
# ENV LICENSE_ID=$LICENSE_ID
# ENV TOKENS=$TOKENS
# ENV ACCESS_CODE=$ACCESS_CODE
# ENV PROXY_API_PREFIX=$PROXY_API_PREFIX

# ENV APP_HOME /app
# WORKDIR $APP_HOME
# COPY package*.json yarn*.lock $APP_HOME/
# RUN npm install
# COPY pandora.js $APP_HOME/
# RUN LICENSE_ID=${LICENSE_ID} TOKENS=${TOKENS} ACCESS_CODE=${ACCESS_CODE} PROXY_API_PREFIX=${PROXY_API_PREFIX} npm run pandora

# FROM pengzhile/pandora-next
# WORKDIR /

# COPY --from=builder /app/pandora/data /data
# COPY --from=builder /app/pandora/sessions /root/.cache/PandoraNext

# EXPOSE 8181

# CMD ["pandora-next"]

FROM pengzhile/pandora-next as pandora-next
FROM node:18
ENV APP_HOME /node/app
WORKDIR $APP_HOME
RUN yarn global add pm2
RUN pm2 install pm2-logrotate
COPY package*.json yarn*.lock $APP_HOME/
RUN yarn
COPY . $APP_HOME/
COPY --from=pandora-next /opt/app /opt/app

EXPOSE 3000 

CMD [ "sh","-c", "\
yarn pandora && \
pm2 set pm2-logrotate:max_size 50k && \
pm2 set pm2-logrotate:retain 30 && \
pm2 start app.js && \
cp -r ./pandora/data /data && \
mkdir -p /root/.cache/PandoraNext && \
cp -r ./pandora/sessions /root/.cache/PandoraNext && \
/opt/app/entrypoint.sh"]


