FROM node:18 as builder
ARG LICENSE_ID
ARG TOKENS
ARG ACCESS_CODE
ENV LICENSE_ID=$LICENSE_ID
ENV TOKENS=$TOKENS
ENV TOKENS=$ACCESS_CODE
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY package*.json yarn*.lock $APP_HOME/
RUN npm install
COPY pandora.js $APP_HOME/
RUN LICENSE_ID=${LICENSE_ID} TOKENS=${TOKENS} ACCESS_CODE=${ACCESS_CODE} npm run pandora

FROM pengzhile/pandora-next
WORKDIR /

COPY --from=builder /app/pandora/data /data
COPY --from=builder /app/pandora/sessions /root/.cache/PandoraNext

EXPOSE 8181

CMD ["pandora-next"]
