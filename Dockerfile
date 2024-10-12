# Use a base image
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install dependencies (optional if needed)
COPY package*.json ./
RUN npm install
RUN npm install axios --save


# Copy the entire backend code into the container
COPY . .

# Create a directory for SSL certificates
RUN mkdir -p /usr/src/app/config/certs

# # Copy SSL certificates from the local path to the certs directory in the container
# # Make sure these paths are correct relative to your Dockerfile
COPY ./es-certs/elastic-stack-ca.p12 /usr/src/app/config/certs/
COPY ./es-certs/http.p12 /usr/src/app/config/certs/
COPY ./es-certs/elasticsearch-ca.pem /usr/src/app/config/certs/

# Expose the application port (if needed)
EXPOSE 5000

# Start the backend application
CMD ["npm", "start"]