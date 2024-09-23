FROM ubuntu:focal

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

RUN apt-get install git -y

WORKDIR /home/app

# ---------------------------------------------------------------------------
# fill the credentials

# ENV AWS_ACCESS_KEY_ID=
# ENV AWS_SECRET_ACCESS_KEY=
# ENV AWS_REGION=
# ENV S3_BUCKET_NAME=

# ---------------------------------------------------------------------------


COPY main.sh main.sh
COPY script.js script.js
COPY package*.json .

RUN npm install

RUN chmod +x main.sh
RUN chmod +x script.js

ENTRYPOINT [ "/home/app/main.sh" ]