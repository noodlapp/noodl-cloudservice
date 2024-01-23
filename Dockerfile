FROM nikolaik/python-nodejs:python3.8-nodejs16

# Copy over the local NPM package
# this is why the Dockerfile is in the root folder
WORKDIR /usr/src/noodl-cloudservice
COPY ./packages/noodl-cloudservice .
RUN npm install
RUN npm run build


WORKDIR /usr/src/app
COPY packages/noodl-cloudservice-docker .
RUN npm install --install-links


EXPOSE 3000
CMD [ "node", "./src/index.js" ]
