# Epochtal Tournament System

Epochtal is a framework for autonomous management of Portal 2 tournaments.

Reaching for the ambitious goal of bringing Portal 2 as close to a competitive e-sport as possible, starting by building
a solid technical foundation. Originally developed for use in [epochtal.p2r3.com](https://epochtal.p2r3.com/), designed
for adaptability in any Portal 2 tournament context.

## Contributing to Epochtal

Epochtal is an open source project, and encourages contributions. If you want to contribute to the project, or create
your own derivative, clone this repository and get going!

Epochtal supports [Development Containers](https://containers.dev/), which is the recommended way to develop as it sets
up everything needed for a smooth development and testing experience. Most modern IDEs support Dev Containers out of the
box and will ask you whether you want to launch a container when you open the project. For development in Visual Studio
Code, you might need to install the [Dev Containers extension](https://containers.dev/) before opening the project.

If you don't want to use Dev Containers, make sure to install all runtime dependencies as described in the manual
installation below before running Epochtal. You also need the system dependencies `tar`, `xz` and `wget`.

Regardless of which approach you choose, make sure to install the most up-to-date Bun dependencies with `bun install`.
Running Epochtal is as simple as `bun run main.js`, provided all dependencies are properly installed.

> [!TIP]
> If you're planning to make code contributions to Epochtal, you're also going to make your life a lot easier by reading
> [the contribution guidelines](CONTRIBUTING.md) before making any changes.

## Deploying Epochtal

This project is written for the [Bun runtime](https://bun.sh/), and will not work on other runtimes such as Node or Deno.

There are two primary ways in which you can deploy Epochtal for your own tournament:

### Using Docker (recommended)

Epochtal builds and publishes a Docker image every time a changes are pushed to the `main` branch.

To run Epochtal through Docker compose, use the provided [docker-compose.yml](docker-compose.yml) file.

If you want to use 'Plain Docker', you should first create a volume to persistently store data between updates:

```shell
docker volume create epochtal-data
```

Then, you can start the container:

```shell
docker run -d \
-v epochtal-data:/app/data \
-v /some/host/path/changeme:/app/secrets \
-p 8080:8080 \
-e STEAM_API_KEY=changeme \
-e DISCORD_API_KEY=changeme \
-e JWT_SECRET=changeme \
-e INTERNAL_SECRET=changeme \
-e DISCORD_CHANNEL_ANNOUNCE=changeme \
-e DISCORD_CHANNEL_REPORT=changeme \
-e DISCORD_CHANNEL_UPDATE=changeme \
ghcr.io/p2r3/epochtal
```

The `/app/secrets` bind is optional, and not recommended unless you need to edit SSL certificates or curation weights.

### Manual installation

If you don't want to use Docker, ~~use docker~~ you can run Epochtal locally on your machine:

1. Install the required dependencies; Epochtal needs `tar`, `xz` and `wget` to be available to the Bun process.
2. Clone the repository
   ```shell
   git clone --depth 1 https://github.com/p2r3/epochtal
   cd epochtal
   ```
3. Install the necessary binaries:
   ```shell
   mkdir bin 
   cd bin
   # Install bspsrc
   wget https://github.com/ata4/bspsrc/releases/download/v1.4.5/bspsrc-linux.zip
   unzip bspsrc-linux.zip -d bspsrc
   # Install mdp-json
   mkdir mdp-json
   wget https://github.com/p2r3/mdp-json/releases/download/07.2024/mdp -O mdp-json/mdp
   chmod +x mdp-json/mdp
   # Install UntitledParser
   wget https://github.com/UncraftedName/UntitledParser/releases/download/jul-9-2023/UntitledParser-linux -O UntitledParser
   chmod +x UntitledParser
   ```
4. Copy `.env.example` to `.env` and populate the necessary fields
5. Install bun packages and run Epochtal!
   ```shell
   bun install --production
   bun run main.js
   ```

## Updating

If you're using **Docker compose**, you can just restart the container. It'll automatically fetch the latest image:

```shell
docker compose down
docker compose up -d
```

If you're using **plain Docker**, you need to re-pull the image and then restart the container:

```shell
docker pull ghcr.io/p2r3/epochtal:latest
docker stop epochtal
```

To start the container, run the same command as the first time you launched it.

With a **manual installation**, you'll have to stop the bun process, then pull the changes and restart:
```shell
git pull
bun install --production # make sure that all packages are up to date
bun run main.js
```

## Configuration

Epochtal is configured using environment variables. A more detailed explanation can be found in the [example](.env.example) .env file.
