FROM node:14

WORKDIR /app

COPY . . 

RUN npm install --production

# Default port inside container
ENV PORT=3000

EXPOSE 3000

# Start the app directly with node (cross-platform)
CMD ["node", "server.js"]