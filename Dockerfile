FROM node:lts-buster as build-env
WORKDIR /app
ADD . /app
run cd /app && \
    npm install && \
    npm install typescript -g && \
    npm install ts-node -g && \
    cd /app/app && \
    npm install && \
    npm run build && \
    cd /app && \
    npm run build

from debian:buster
COPY --from=build-env /app/release/porn-manager /
COPY --from=build-env /app/release/app/ /app
COPY --from=build-env /app/release/views/  /views
RUN apt-get update && apt-get  -y install ca-certificates ffmpeg &&  rm -rf /var/lib/apt/lists/*

copy config.yaml.example /
copy run.sh  /
VOLUME [ "/config" ]
EXPOSE 3000
ENTRYPOINT ["/run.sh"]
