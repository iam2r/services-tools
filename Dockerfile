FROM node:18 as builder
ARG LICENSE_ID
ENV LICENSE_ID_VAR=$LICENSE_ID
ARG TOKENS
ENV TOKENS_VAR=$TOKENS
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY package*.json yarn*.lock $APP_HOME/
RUN npm install
COPY pandora.js $APP_HOME/
RUN LICENSE_ID=${LICENSE_ID_VAR} TOKENS=${TOKENS_VAR} npm run pandora

FROM pengzhile/pandora-next
WORKDIR /

COPY --from=builder /app/pandora/data /data
COPY --from=builder /app/pandora/sessions /root/.cache/PandoraNext

EXPOSE 8181

CMD ["pandora-next"]
