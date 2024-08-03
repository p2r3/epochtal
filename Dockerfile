FROM debian AS build
WORKDIR /build
# Install build dependencies
RUN apt update && apt install wget git unzip -y
# Install bspsrc
RUN wget https://github.com/ata4/bspsrc/releases/download/v1.4.5/bspsrc-linux.zip
RUN unzip bspsrc-linux.zip -d bspsrc
# Install mdp-json
RUN mkdir mdp-json
RUN wget https://github.com/p2r3/mdp-json/releases/download/08.2024/mdp -O mdp-json/mdp
RUN chmod +x mdp-json/mdp
# Install UntitledParser
RUN wget https://github.com/UncraftedName/UntitledParser/releases/download/jul-9-2023/UntitledParser-linux -O UntitledParser
RUN chmod +x UntitledParser

FROM oven/bun:latest
LABEL authors="Soni"
WORKDIR /app
# Install runtime dependencies
RUN apt update && apt install xz-utils wget libicu-dev -y
# Get binaries from build step
RUN mkdir bin
COPY --from=build /build bin/
# Install application
COPY . .
RUN bun install --production

ENV NODE_ENV=production
EXPOSE 8080/tcp
ENTRYPOINT ["bun", "run", "main.js"]
