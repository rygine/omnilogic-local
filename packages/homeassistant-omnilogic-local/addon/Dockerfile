FROM node:24-alpine
ARG BUILD_VERSION
RUN npm install -g @rygine/homeassistant-omnilogic-local@${BUILD_VERSION}
CMD ["homeassistant-omnilogic-local"]
