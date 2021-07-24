FROM node:14-buster-slim

EXPOSE 3000

COPY --chown=root:root . /app
WORKDIR /app

RUN yarn && \
    yarn build

CMD yarn start