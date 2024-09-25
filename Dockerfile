# Use the existing image as a base
FROM electronuserland/builder:wine-mono

WORKDIR /project

# Install zip
RUN apt-get update && apt-get install -y zip

COPY . .

# Run yarn commands
RUN yarn && yarn make --platform win32
