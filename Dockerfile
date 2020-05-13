FROM node:lts-buster as build-env
WORKDIR /app
ADD . /app
RUN cd /app && \
    npm install && \
    npm install typescript -g && \
    npm install ts-node -g && \
    cd /app/app && \
    npm install && \
    npm run build && \
    cd /app && \
    npm run build

from debian:buster
COPY --from=build-env /app/release/porn-vault /
COPY --from=build-env /app/release/app/ /app
COPY --from=build-env /app/release/views/  /views
RUN apt-get update && apt-get  -y install ca-certificates ffmpeg &&  rm -rf /var/lib/apt/lists/*

COPY assets /assets

COPY config.yaml.example /
COPY run.sh  /
VOLUME [ "/config" ]
EXPOSE 3000
ENTRYPOINT ["/run.sh"]
