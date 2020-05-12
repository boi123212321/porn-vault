# Import format

Add one or more folders to import from to `BULK_IMPORT_PATHS` in your config
Then add .json or .yaml files containing data:

```json
{
  "movies": {
    "[iid]": <MovieSchema>
  },
  "scenes": {
    "[iid]": <SceneSchema>
  },
  "actors": {
    "[iid]": <ActorSchema>
  },
  "studios": {
    "[iid]": <StudioSchema>
  },
  "labels": {
    "[iid]": <LabelSchema>
  },
  "markers": {
    "[iid]": <MarkerSchema>
  },
  "customFields": {
    "[iid]": <CustomFieldSchema>
  }
}
```

IIDs can reference objects with IIDs **only** in that file, or, if a "real" ID is used, it will reference an object in the database.

Check /src/import/schemas for schemas.

Use `--commit-import` to actually add stuff, omit, if you want to check the validity of your import.
