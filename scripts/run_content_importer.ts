import {ContentImporter} from '../src/content_importer';

async function main() {
  const contentImporter = new ContentImporter();
  if (process.env.CONTENT_IMPORTER_CONTENT_PARENT_PATH === undefined) {
    throw new Error(
      'Env variable CONTENT_IMPORTER_CONTENT_PARENT_PATH is not defined'
    );
  }
  await contentImporter.run(process.env.CONTENT_IMPORTER_CONTENT_PARENT_PATH);
}

main();
