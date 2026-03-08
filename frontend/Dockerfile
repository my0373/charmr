FROM registry.access.redhat.com/ubi9/nodejs-22

USER 0
WORKDIR /opt/app-root/src

COPY package.json package-lock.json* ./
RUN chown -R 1001:0 /opt/app-root/src
USER 1001

RUN npm install

COPY --chown=1001:0 . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
