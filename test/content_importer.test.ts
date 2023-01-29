// See docker-compose.yml
import fs from 'fs';
import sharp from 'sharp';
import {ContentImporter} from '../src/content_importer';
import CloudflareR2Adapter from '../src';

process.env.GHOST_STORAGE_ADAPTER_R2_ENDPOINT = 'http://127.0.0.1:9000';
process.env.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID = 'TEST_MINIO_ACCESS_KEY';
process.env.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY =
  'TEST_MINIO_SECRET_KEY';
process.env.GHOST_STORAGE_ADAPTER_R2_BUCKET = 'test-bucket';
process.env.GHOST_STORAGE_ADAPTER_R2_DOMAIN = 'https://cdn.example.com';

// Source: https://stackoverflow.com/a/1349426
function makeid(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

/**
 * Creates a random image
 * Source: https://github.com/davidpadbury/random-image-generator/blob/master/index.js
 */
function randomColorComponent() {
  return Math.floor(Math.random() * 256);
}

async function generateImage(width: number, height: number, filePath: string) {
  const buffer = Buffer.alloc(width * height * 3);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const pixelStart = x * width * 3 + y * 3;

      buffer[pixelStart + 0] = randomColorComponent();
      buffer[pixelStart + 1] = randomColorComponent();
      buffer[pixelStart + 2] = randomColorComponent();
    }
  }

  fs.mkdirSync(filePath.split('/').slice(0, -1).join('/'), {recursive: true});

  await sharp(buffer, {
    raw: {
      width: width,
      height: height,
      channels: 3,
    },
  })
    .jpeg()
    .toFile(filePath);
}

let contentPrefix = '';

describe('import: save(): imageOptimization__resize: true', () => {
  beforeEach(() => {
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE = 'true';
    contentPrefix = '/test_' + makeid(12);
    process.env.GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX = contentPrefix;
  });

  afterEach(() => {
    // Restore defaults
    process.env.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX = '/content/images/';
    process.env.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX = '/content/media/';
    process.env.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX = '/content/files/';
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES = 'false';
    process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY = '80';
    process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS =
      '300,600,1000,1600,400,750,960,1140,1200';
    process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME = 'false';
    process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL = 'true';
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE = 'true';
  });

  test('import single: ', async () => {
    const adapter = new CloudflareR2Adapter();

    const fileName = makeid(32) + '.jpg';
    const testDir = 'test_dir_' + makeid(12);
    const filePath = `/tmp/${testDir}/content/images/2021/08/${fileName}`;

    await generateImage(100, 100, filePath);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(false);

    const contentImporter = new ContentImporter();
    await contentImporter.run(`/tmp/${testDir}`);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(true);
  });

  test('import single: uploads when already exists', async () => {
    const adapter = new CloudflareR2Adapter();

    const fileNameNoExt = makeid(32);
    const fileName = fileNameNoExt + '.jpg';

    const testDir = 'test_dir_' + makeid(12);
    const filePath = `/tmp/${testDir}/content/images/2021/08/${fileName}`;

    await generateImage(100, 100, filePath);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(false);

    const contentImporter = new ContentImporter();
    await contentImporter.run(`/tmp/${testDir}`);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(true);

    await expect(
      adapter.exists(
        contentPrefix + `/content/images/2021/08/${fileNameNoExt}-1.jpg`
      )
    ).resolves.toBe(false);

    await contentImporter.run(`/tmp/${testDir}`);
    console.log('WAT');

    await expect(
      adapter.exists(
        contentPrefix + `/content/images/2021/08/${fileNameNoExt}-1.jpg`
      )
    ).resolves.toBe(true);
    console.log('DONE');
  });

  test('import single: RESPONSIVE_IMAGES: true ', async () => {
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES = 'true';

    const adapter = new CloudflareR2Adapter();

    const fileName = makeid(32) + '.jpg';
    const testDir = 'test_dir_' + makeid(12);
    const filePath = `/tmp/${testDir}/content/images/2021/08/${fileName}`;

    await generateImage(100, 100, filePath);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(false);

    const resizeWidths = (<string>(
      process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS
    ))
      .split(',')
      .map(w => parseInt(w));

    for (const w of resizeWidths) {
      await expect(
        adapter.exists(
          contentPrefix + `/content/images/size/w${w}/2021/08/${fileName}`
        )
      ).resolves.toBe(false);
    }

    const contentImporter = new ContentImporter();
    await contentImporter.run(`/tmp/${testDir}`);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(true);

    for (const w of resizeWidths) {
      await expect(
        adapter.exists(
          contentPrefix + `/content/images/size/w${w}/2021/08/${fileName}`
        )
      ).resolves.toBe(true);
    }
  });

  xtest('import: save(): bulk, RESPONSIVE_IMAGES = true', async () => {
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES = 'true';

    const adapter = new CloudflareR2Adapter();

    const testDir = 'test_dir_' + makeid(12);

    const fileNames = [];

    for (let i = 0; i < 100; i++) {
      const fileName = makeid(32) + '.jpg';
      fileNames.push(fileName);

      const filePath = `/tmp/${testDir}/content/images/2021/08/${fileName}`;

      await generateImage(100, 100, filePath);
    }

    for (let i = 0; i < 100; i++) {
      await expect(
        adapter.exists(
          contentPrefix + `/content/images/2021/08/${fileNames[i]}`
        )
      ).resolves.toBe(false);
    }

    const contentImporter = new ContentImporter();
    await contentImporter.run(`/tmp/${testDir}`);

    for (let i = 0; i < 100; i++) {
      await expect(
        adapter.exists(
          contentPrefix + `/content/images/2021/08/${fileNames[i]}`
        )
      ).resolves.toBe(true);
    }
  });
});

describe('import: save(): imageOptimization__resize: false', () => {
  beforeEach(() => {
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE = 'false';
    contentPrefix = '/test_' + makeid(12);
    process.env.GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX = contentPrefix;
  });

  afterEach(() => {
    // Restore defaults
    process.env.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX = '/content/images/';
    process.env.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX = '/content/media/';
    process.env.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX = '/content/files/';
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES = 'false';
    process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY = '80';
    process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS =
      '300,600,1000,1600,400,750,960,1140,1200';
    process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME = 'false';
    process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL = 'true';
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE = 'true';
  });

  test('import single: ', async () => {
    const adapter = new CloudflareR2Adapter();

    const fileName = makeid(32) + '.jpg';
    const testDir = 'test_dir_' + makeid(12);
    const filePath = `/tmp/${testDir}/content/images/2021/08/${fileName}`;

    await generateImage(100, 100, filePath);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(false);

    const contentImporter = new ContentImporter();
    await contentImporter.run(`/tmp/${testDir}`);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(true);
  });

  test('import single: RESPONSIVE_IMAGES: true ', async () => {
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES = 'true';

    const adapter = new CloudflareR2Adapter();

    const fileName = makeid(32) + '.jpg';
    const testDir = 'test_dir_' + makeid(12);
    const filePath = `/tmp/${testDir}/content/images/2021/08/${fileName}`;

    await generateImage(100, 100, filePath);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(false);

    const resizeWidths = (<string>(
      process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS
    ))
      .split(',')
      .map(w => parseInt(w));

    for (const w of resizeWidths) {
      await expect(
        adapter.exists(
          contentPrefix + `/content/images/size/w${w}/2021/08/${fileName}`
        )
      ).resolves.toBe(false);
    }

    const contentImporter = new ContentImporter();
    await contentImporter.run(`/tmp/${testDir}`);

    await expect(
      adapter.exists(contentPrefix + `/content/images/2021/08/${fileName}`)
    ).resolves.toBe(true);

    for (const w of resizeWidths) {
      await expect(
        adapter.exists(
          contentPrefix + `/content/images/size/w${w}/2021/08/${fileName}`
        )
      ).resolves.toBe(true);
    }
  });
});
