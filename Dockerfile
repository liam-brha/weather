FROM node:alpine
WORKDIR /Weather-Website
COPY . .
CMD ["node", "index.js"]
