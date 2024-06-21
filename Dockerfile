FROM sxz799/gemini2chatgpt as gemini2chatgpt
FROM vinlic/kimi-free-api:latest as kimi
FROM node:18
ENV APP_HOME /node/app
WORKDIR $APP_HOME
RUN pnpm i pm2 -g
RUN mkdir -p ./logs
COPY package*.json yarn*.lock pnpm-lock.yaml $APP_HOME/
RUN pnpm i
COPY . $APP_HOME/

COPY --from=gemini2chatgpt . /gemini2chatgpt
COPY --from=kimi . /kimi

EXPOSE 3000

CMD ["sh","-c", "pm2-docker start pm2.config.js"]

#docker run --rm -e HTTP_PROXY=http://localhost:7890 -it -p 3000:3000/tcp openai-tools:latest


