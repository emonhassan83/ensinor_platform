import { SESClient } from "@aws-sdk/client-ses";
import config from "../config";

export const sesClient = new SESClient({
  region: config.ses.region!, // eu-north-1
  credentials: {
    accessKeyId: config.ses.accessKeyId!,
    secretAccessKey: config.ses.secretAccessKey!,
  },
});
