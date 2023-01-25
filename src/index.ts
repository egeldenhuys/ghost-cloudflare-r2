import StorageBase = require('ghost-storage-base');
import {Handler} from 'express-serve-static-core';
// eslint-disable-next-line node/no-unpublished-import
import {getLogger, setLevel} from 'loglevel';

setLevel('debug');
const log = getLogger('ghost-cloudflare-r2');

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import path from 'path';
import {readFile} from 'fs';

function stripLeadingSlash(s: string): string {
  return s.indexOf('/') === 0 ? s.substring(1) : s;
}

function stripEndingSlash(s: string): string {
  return s.indexOf('/') === s.length - 1 ? s.substring(0, s.length - 1) : s;
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

export default class CloudflareR2Adapter extends StorageBase {
  S3: S3Client;
  private bucket: string;
  private pathPrefix: string;
  private domain: string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(config = {}) {
    log.debug('Initialising ghost-cloudflare-r2 storage adapter');
    super();

    check_env_variable('GHOST_STORAGE_ADAPTER_R2_DOMAIN');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_BUCKET');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_PATH_PREFIX');

    this.bucket = process.env.GHOST_STORAGE_ADAPTER_R2_BUCKET || '';
    this.pathPrefix = process.env.GHOST_STORAGE_ADAPTER_R2_PATH_PREFIX || '';
    this.domain = process.env.GHOST_STORAGE_ADAPTER_R2_DOMAIN || '';

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

    return Promise.resolve(false);
  }

  exists(fileName: string, targetDir?: string): Promise<boolean> {
    log.debug('exists(): ', 'fileName: ', fileName, 'targetDir: ', targetDir);

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
    log.debug('read(): ', 'options: ', options);

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

      // remove trailing slashes
      let filePath = (options?.path || '').replace(/\/$|\\$/, '');

      // check if path is stored in s3 handled by us
      if (!filePath.startsWith(this.domain)) {
        reject(new Error(`${path} is not stored in s3`));
      }
      filePath = filePath.substring(this.domain.length);

      this.S3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: stripLeadingSlash(filePath),
        })
      ).then(
        value => {
          resolve(value.Body);
        },
        reason => {
          reject(reason);
        }
      );
    });
  }

  save(image: StorageBase.Image, targetDir?: string): Promise<string> {
    log.debug('save(): ', 'image: ', image, 'targetDir: ', targetDir);

    const directory = targetDir || this.getTargetDir(this.pathPrefix);

    return new Promise((resolve, reject) => {
      Promise.all([
        this.getUniqueFileName(image, directory),
        readFileAsync(image.path),
      ])
        .then(([fileName, file]) => {
          this.S3.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Body: file,
              ContentType: image.type,
              CacheControl: `max-age=${30 * 24 * 60 * 60}`,
              Key: stripLeadingSlash(fileName),
            })
          ).then(
            () => {
              resolve(`${this.domain}/${stripLeadingSlash(fileName)}`);
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

  saveRaw(buffer: Buffer, targetPath: string): Promise<string> {
    log.debug('saveRaw(): ', 'buffer: ', 'targetPath: ', targetPath);

    const directory = targetPath || this.getTargetDir(this.pathPrefix);

    return new Promise((resolve, reject) => {
      resolve(`${this.domain}/dummy.jpg`);
    });
  }

  serve(): Handler {
    log.debug('serve()');
    console.warn('Cloudflare R2 Storage Adapter: serve() has been called');

    return (req, res, next) => {
      next();
    };
  }
}

module.exports = CloudflareR2Adapter;
