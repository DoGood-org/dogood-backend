#!/bin/bash


git clone https://github.com/DoGood-org/dogood-frontend /frontend/ && cd /frontend && npm install


cd /backend && npx prisma migrate dev