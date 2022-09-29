FROM node:14-buster-slim as base

FROM base as build

USER root
WORKDIR /home/node/app

ENV BUILD_DEPS="build-essential python-dev git-core openssl ca-certificates"

RUN apt-get update && \
    apt-get install -y --no-install-recommends $BUILD_DEPS

COPY . .

# ENV RAZZLE_PUBLIC_PATH=VOLTO_PUBLIC_PATH
ENV RAZZLE_API_PATH=VOLTO_API_PATH
ENV RAZZLE_INTERNAL_API_PATH=VOLTO_INTERNAL_API_PATH
# ENV RAZZLE_RECAPTCHA_KEY=VOLTO_RECAPTCHA_KEY
# ENV RAZZLE_GA_CODE=VOLTO_GA_CODE
# ENV SENTRY_DSN=VOLTO_SENTRY_DSN

RUN yarn policies set-version 1.19.1 && \
    yarn config set network-timeout 600000 -g && \
    yarn --frozen-lockfile && \
    yarn build && \
    yarn cache clean && \
    rm -rf /home/node/.cache && \
    apt-get purge -y $BUILD_DEPS && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

FROM base

WORKDIR /home/node/app
COPY --chown=node --from=build /home/node/app /home/node/app

EXPOSE 3000 3001 4000 4001
ENTRYPOINT ["/home/node/app/entrypoint.sh"]
CMD ["yarn", "start:prod"]
