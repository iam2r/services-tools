FROM node:18
ENV APP_HOME /node/app
WORKDIR $APP_HOME
RUN yarn global add pm2 pnpm
RUN mkdir -p ./logs
COPY package*.json yarn*.lock pnpm-lock.yaml $APP_HOME/
RUN pnpm install
COPY . $APP_HOME/

EXPOSE 3000

CMD ["sh","-c", "pm2-docker start pm2.config.js"]

#docker run --rm -e HTTP_PROXY=http://localhost:7890 -it -p 3000:3000/tcp openai-tools:latest


