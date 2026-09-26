# The web app

The web app is a browser interface to your controller. It has pages for
equipment, schedules, favorites, themes, settings, system information, and logs.
It runs on your local machine or in Docker.

Do not expose the app to the internet. It has no authentication or other
security. Use it only on your local network.

## Running on the host

The app needs Node.js 22.18 or later and Yarn 4. From the repository root:

```bash
yarn install

# creates apps/web/data/app.db
yarn workspace @rygine/omnilogic-web db:deploy

# dev server on :3000
yarn start
```

Then open http://127.0.0.1:3000 and enter the controller's IP address.

## Running in Docker

The `Dockerfile`, `compose.yaml`, and the `dev/` scripts live in `apps/web`.
Before you run the container, create the data directory and give uid 1000 write
access to it. Then, from `apps/web`:

```bash
# build the image
./dev/build.sh

# run it, keeping the database in ./data
./dev/run.sh

# or keep the database elsewhere
./dev/run.sh /mnt/data

# stop it
./dev/down.sh
```

The container reads `PORT`, `HOST`, and `LOG_LEVEL`, and keeps its database in
`/data`. On the host, `compose.yaml` and the `dev/` scripts read `BIND_ADDR` and
`DATA_PATH`, and the dev server reads `DATA_DIR`. `.env.example` lists them all.

The app reaches the controller over UDP port 10444, which Docker's bridge
network carries outbound. If your setup blocks it, use `network_mode: host`
instead of `ports`.
