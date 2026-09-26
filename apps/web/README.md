# @rygine/omnilogic-web

Web app for local control of Hayward OmniLogic pool controllers. No internet or
cloud login required. Equipment controls, schedules, themes, favorites,
settings, and a command log for one controller, over
`@rygine/omnilogic-local-sdk`.

Run these from `apps/web`; they need Docker.

```bash
# build image
./dev/build.sh

# run container, keeping the database in ./data
./dev/run.sh

# run container with the database somewhere else
./dev/run.sh /mnt/appdata/omnilogic

# stop container
./dev/down.sh
```

Running on the host and the environment are on the documentation site's "The web
app" page (`apps/docs/guide/web-app.md`).
