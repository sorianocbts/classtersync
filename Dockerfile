FROM node:10-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . . 

# Copy .env file into the container
COPY .env .env

EXPOSE 3000
