FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . . 

# Copy .env file into the container
COPY .env .env

EXPOSE 80

# Start the app
CMD ["npm", "start"]