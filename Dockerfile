# use docker build 
FROM node:slim AS dev


WORKDIR /backend

COPY . /backend/
RUN apt update -y \
 && apt install -y git \
 && git restore . \
 && npm install \
 && npx prisma generate \
 && rm -rf /var/lib/apt/lists/* \
 && npm cache clean --force

EXPOSE 5000
EXPOSE 3000

CMD ["/bin/bash"]
