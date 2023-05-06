# speak-voicevox

- Speak TextMessage for Discord

# Get Ready

1. install node.js or nodenv (16.15.1)
2. run MySQL, create database and user, set privilege.
3. `cp src/config/config.ts.template src/config/config.ts`
4. `vim src/config/config.ts`, set config text.
5. `yarn install`
6. Clone [voicevox_engine](https://github.com/VOICEVOX/voicevox_engine) and launch engine.
7. `yarn run dev` run with nodemon
8. `yarn run compile`
9. `yarn run dist` run compiled js (./dist)
