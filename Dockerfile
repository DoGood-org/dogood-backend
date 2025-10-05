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


RUN git clone https://github.com/DoGood-org/dogood-frontend /frontend/ && cd /frontend && npm install

EXPOSE 5000
EXPOSE 3000

CMD ["/bin/bash"]
