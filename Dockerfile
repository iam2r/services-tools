FROM node:18-bookworm

RUN apt update -y && apt install -y libc++-dev libc++abi-dev

WORKDIR /app

COPY . .

RUN --mount=type=secret,id=UUID,mode=0444,required=true \
yarn install && \
npx cross-env UUID=$(cat /run/secrets/UUID) node wrangler.js

CMD npx wrangler dev --log-level info --port 7860

EXPOSE 7860
