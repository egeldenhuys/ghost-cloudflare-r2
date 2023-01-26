import StorageBase = require('ghost-storage-base');
import {Handler} from 'express-serve-static-core';
// eslint-disable-next-line node/no-unpublished-import
import {getLogger, Logger} from 'loglevel';

const log = getLogger('ghost-cloudflare-r2');
setLogLevel(log, 'GHOST_STORAGE_ADAPTER_R2_LOG_LEVEL');

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import path from 'path';
import {readFile} from 'fs';

function stripLeadingSlash(s: string): string {
  return s.indexOf('/') === 0 ? s.substring(1) : s;
}

function check_env_variable(variableName: string) {
  if (process.env[variableName] === undefined) {
    throw new Error(`Environment variable ${variableName} is not defined`);
  }
}

function readFileAsync(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    readFile(filePath, (err, data) => (err ? reject(err) : resolve(data)))
  );
}

function setLogLevel(logger: Logger, envVariable: string) {
  switch (process.env[envVariable] || '') {
    case 'trace':
      logger.setLevel('trace');
      break;
    case 'debug':
      logger.setLevel('debug');
      break;
    case 'info':
      logger.setLevel('info');
      break;
    case 'warn':
      logger.setLevel('warn');
      break;
    case 'error':
      logger.setLevel('error');
      break;
    default:
      logger.setLevel('info');
  }
}

enum StorageType {
  Images = 0,
  Media = 1,
  Files = 2,
}

interface Config {
  storage_type_images?: boolean;
  storage_type_media?: boolean;
  storage_type_files?: boolean;
}

export default class CloudflareR2Adapter extends StorageBase {
  S3: S3Client;
  private bucket: string;
  private pathPrefix: string;
  private domain: string;
  private storageType: StorageType = StorageType.Images;
  private imagesUrlPrefix: string;
  private mediaUrlPrefix: string;
  private filesUrlPrefix: string;

  constructor(config: Config = {}) {
    log.debug('Initialising ghost-cloudflare-r2 storage adapter');
    super();

    check_env_variable('GHOST_STORAGE_ADAPTER_R2_DOMAIN');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_BUCKET');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY');

    this.bucket = process.env.GHOST_STORAGE_ADAPTER_R2_BUCKET || '';
    this.pathPrefix = process.env.GHOST_STORAGE_ADAPTER_R2_PATH_PREFIX || '';
    this.domain = process.env.GHOST_STORAGE_ADAPTER_R2_DOMAIN || '';
    this.imagesUrlPrefix =
      process.env.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX ||
      '/content/images/';
    this.mediaUrlPrefix =
      process.env.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX ||
      '/content/media/';
    this.filesUrlPrefix =
      process.env.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX ||
      '/content/files/';

    if (config.storage_type_images === true) {
      this.storageType = StorageType.Images;
      this.pathPrefix = this.imagesUrlPrefix;
    } else if (config.storage_type_media === true) {
      this.storageType = StorageType.Media;
      this.pathPrefix = this.mediaUrlPrefix;
    } else if (config.storage_type_files === true) {
      this.storageType = StorageType.Files;
      this.pathPrefix = this.filesUrlPrefix;
    } else {
      this.storageType = StorageType.Images;
      this.pathPrefix = this.imagesUrlPrefix;
    }

    log.info(
      'Cloudflare R2 Storage Adapter: handling',
      StorageType[this.storageType],
      'at',
      this.pathPrefix
    );

    this.S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID || '',
        secretAccessKey:
          process.env.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY || '',
      },
    });

    log.debug('Initialisation done');
  }

  delete(fileName: string, targetDir?: string): Promise<boolean> {
    log.debug('delete():', 'filename:', fileName, 'targetDir:', targetDir);
    log.error('Cloudflare R2 Storage Adapter: delete() is not implemented');
    return Promise.resolve(false);
  }

  exists(fileName: string, targetDir?: string): Promise<boolean> {
    log.debug('exists():', 'fileName:', fileName, 'targetDir:', targetDir);

    let targetPath: string;

    if (targetDir === undefined) {
      targetPath = fileName;
    } else {
      targetPath = path.join(targetDir, fileName);
    }

    return new Promise((resolve, reject) => {
      this.S3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: stripLeadingSlash(path.join(targetPath, fileName)),
        })
      )
        .then(
          value => {
            if (value.$metadata.httpStatusCode === 200) {
              resolve(true);
            } else {
              resolve(false);
            }
          },
          reason => {
            if (reason.$metadata.httpStatusCode === 404) {
              resolve(false);
            } else {
              reject(reason);
            }
          }
        )
        .catch(reason => {
          log.debug(reason);
          reject(reason);
        });
    });
  }

  read(options?: StorageBase.ReadOptions): Promise<Buffer> {
    log.debug('Cloudflare R2 Storage Adapter: read():', 'options:', options);

    return new Promise((resolve, reject) => {
      if (options === undefined) {
        reject(
          'Cloudflare R2 Storage Adapter: read(): argument "options" is undefined'
        );
      }

      if (options?.path === undefined) {
        reject(
          'Cloudflare R2 Storage Adapter: read(): argument "options.path" is undefined'
        );
      }

      reject(
        'Cloudflare R2 Storage Adapter: read() is not supported. Data should be fetched from CDN URL. Use redirects instead.'
      );
    });
  }

  save(fileInfo: StorageBase.Image, targetDir?: string): Promise<string> {
    log.debug(
      'Cloudflare R2 Storage Adapter: save():',
      'fileInfo:',
      fileInfo,
      'targetDir:',
      targetDir
    );

    const directory = targetDir || this.getTargetDir(this.pathPrefix);

    return new Promise((resolve, reject) => {
      Promise.all([
        this.getUniqueFileName(fileInfo, directory),
        readFileAsync(fileInfo.path),
      ])
        .then(([filePathR2, fileBuffer]) => {
          log.debug(
            'Cloudflare R2 Storage Adapter: save(): saving',
            filePathR2
          );
          this.S3.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Body: fileBuffer,
              ContentType: fileInfo.type,
              CacheControl: `max-age=${30 * 24 * 60 * 60}`,
              Key: stripLeadingSlash(filePathR2),
            })
          ).then(
            () => {
              resolve(`${this.domain}/${stripLeadingSlash(filePathR2)}`);
            },
            reason => {
              reject(reason);
            }
          );
        })
        .catch(err => {
          log.debug(err);
          reject(err);
        });
    });
  }

  /**
   * Ghost checks if a 'saveRaw' function exists on the storage adapter,
   * if it exists, the theme will generate srcset attribute in the HTML.
   * @param buffer
   * @param targetPath
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  saveRaw(buffer: Buffer, targetPath: string): Promise<string> {
    throw new Error('ghost-cloudflare-r2.saveRaw(): Not Implemented!');
  }

  serve(): Handler {
    return (req, res, next) => {
      next();
    };
  }
}

module.exports = CloudflareR2Adapter;
