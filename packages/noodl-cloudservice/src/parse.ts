import path from 'path';
import ParseServer, { S3Adapter } from 'parse-server';
import { LoggerAdapter } from './mongodb';

export type NoodlParseServerOptions = {
  port: number;
  databaseURI: string;
  masterKey: string;
  appId: string;
  parseOptions?: Record<string, unknown>;

  functionOptions: {
    timeOut: number;
    memoryLimit: number;
  }
}

export type NoodlParseServerResult = {
  functionOptions: NoodlParseServerOptions['functionOptions'];
  options: {
    port: number;
    appId: string;
    masterKey: string;
  };
  server: ParseServer;
  logger: LoggerAdapter;
}

export function createNoodlParseServer({
  port = 3000,
  databaseURI,
  masterKey,
  appId,
  functionOptions,
  parseOptions = {},
}: NoodlParseServerOptions): NoodlParseServerResult {
  const serverURL = `http://localhost:${port}/`;

  const logger = new LoggerAdapter({
    databaseURI
  })

  // Create files adapter
  let filesAdapter;
  if (process.env.S3_BUCKET) {
    console.log('Using AWS S3 file storage with bucket ' + process.env.S3_BUCKET)

    if (!process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
      throw Error("You must provide S3_SECRET_KEY and S3_ACCESS_KEY environment variables in addition to S3_BUCKET for S3 file storage.")
    }

    filesAdapter = new S3Adapter(
      process.env.S3_ACCESS_KEY,
      process.env.S3_SECRET_KEY,
      process.env.S3_BUCKET, {
        region: process.env.S3_REGION,
        bucketPrefix: process.env.S3_BUCKET_PREFIX,
        directAccess: process.env.S3_DIRECT_ACCESS === 'true'
      }
    )
  } else if (process.env.GCS_BUCKET) {
    const GCSAdapter = require('parse-server-gcs-adapter');

    if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CLIENT_EMAIL || !process.env.GCP_PRIVATE_KEY) {
      throw Error("You must provide GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY environment variables in addition to GCS_BUCKET for GCS file storage.")
    }

    console.log('Using GCS file storage with bucket ' + process.env.GCS_BUCKET)
    filesAdapter = new GCSAdapter(
      process.env.GCP_PROJECT_ID, { // Credentials
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/gm, '\n')
      },
      process.env.GCS_BUCKET, {
        directAccess: process.env.GCS_DIRECT_ACCESS === 'true',
        bucketPrefix: process.env.GCS_BUCKET_PREFIX
      }
    );
  }

  const server = new ParseServer({
    databaseURI,
    cloud: path.resolve(__dirname, './static/cloud.cjs'),
    push: false,
    appId,
    masterKey,
    serverURL,
    appName: "Noodl App",
    // allowCustomObjectId is needed for Noodl's cached model writes
    allowCustomObjectId: true,
    loggerAdapter: logger,

    // We do this just to get the right behaviour for emailVerified (no emails are sent)
    publicServerURL: process.env.PUBLIC_SERVER_URL || 'https://you-need-to-set-public-server-env-to-support-files',
    verifyUserEmails: true,
    emailAdapter: { // null email adapter
      sendMail: () => {},
      sendVerificationEmail: () => {},
      sendPasswordResetEmail: () => {}
    },
    filesAdapter,
    ...parseOptions,
  });

  return {
    functionOptions: {
      timeOut: functionOptions.timeOut || 15,
      memoryLimit: functionOptions.memoryLimit || 256
    },
    options: {
      port,
      appId,
      masterKey,
    },
    server,
    logger,
  };
}
