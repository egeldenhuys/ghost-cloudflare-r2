import pkg, {Logger} from 'loglevel';

const {getLogger} = pkg;
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line node/no-unpublished-import
import CloudflareR2Adapter, {FileInfo} from '../src';

const log = getLogger('content_importer');
setLogLevel(log, 'GHOST_STORAGE_ADAPTER_R2_LOG_LEVEL');

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

// Adapted from
// https://coderrocketfuel.com/article/recursively-list-all-the-files-in-a-directory-using-node-js
const getAllFiles = function (dirPath: string, arrayOfFiles: Array<string>) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(file => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
};

function stripEndingSlash(s: string): string {
  return s.indexOf('/') === s.length - 1 ? s.substring(0, s.length - 1) : s;
}

export class ContentImporter {
  async run(contentDirParent: string) {
    const adapter = new CloudflareR2Adapter();
    const files = getAllFiles(contentDirParent, []);

    for (const filePath of files) {
      const contentPath = filePath.slice(
        stripEndingSlash(contentDirParent).length
      );

      if (!contentPath.startsWith('/content/images')) {
        log.info(`Skipping ${filePath}`);
        continue;
      }

      log.info(`Importing ${filePath}`);
      const name = filePath.slice(
        (stripEndingSlash(contentDirParent) + '/content/images/').length
      );

      await adapter.save(
        {
          name: name,
          path: filePath,
          originalPath: `content/images/${name}`,
          targetDir: `/var/lib/ghost/content/images/${name}`,
          newPath: `/content/images/${name}`,
          type: '',
        },
        `/var/lib/ghost/content/images/${name.slice(0, 'YYYY/MM'.length)}`
      );
    }
  }
}
