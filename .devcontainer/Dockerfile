FROM oven/bun:debian

# Config Bun
ENV PATH="~/.bun/bin:${PATH}"
RUN ln -s /usr/local/bin/bun /usr/local/bin/node

# Update packages
RUN if [ "debian" == "alpine" ] ; then apk update ; else apt-get update ; fi

# Install Git
RUN if [ "debian" == "alpine" ] ; then apk add git ; else apt-get install -y git ; fi

# Install build dependencies
RUN apt install wget unzip -y

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
