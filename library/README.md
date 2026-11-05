# library

Files brandkit itself provides to every brand: the open-licence faces in `fonts/`. A brand file
that a brand's folder (or its pack) does not hold is looked for here, by the same path. Brand packs
leave out any file that is byte for byte a file here, so the faces are downloaded and stored once,
with the app, however many brands use them.
