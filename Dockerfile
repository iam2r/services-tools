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
RUN chmod +x ./setup.sh
EXPOSE 3000

CMD ["sh","-c", "./setup.sh && pm2-runtime start pm2.config.js"]

#docker run --rm -e HTTP_PROXY=http://localhost:7890 -it -p 3000:3000/tcp openai-tools:latest


