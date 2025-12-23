import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ObjectCannedACL,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import httpStatus from 'http-status'; 
import config from '../config';
import { s3Client } from '../constants/aws';
import ApiError from '../errors/ApiError';

//upload a single file
export const uploadToS3 = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { file, fileName }: { file: any; fileName: string },
): Promise<string | null> => {
  const command = new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: ObjectCannedACL.public_read, //access public read
  });

  try {
    const key = await s3Client.send(command);
    if (!key) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'File Upload failed');
    }
    const url = `${config?.aws?.s3BaseUrl}/${fileName}`;

    return url;
  } catch (error) {
    console.log(error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'File Upload failed');
  }
};
 
// delete file from s3 bucket
export const deleteFromS3 = async (key: string) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.log('🚀 ~ deleteFromS3 ~ error:', error);
    throw new Error('s3 file delete failed');
  }
};

// upload multiple files
export const uploadManyToS3 = async (
  tasks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any;
    path: string;
    key?: string; // ← Now REQUIRED: we always pass a proper key from multiple()
  }[],
): Promise<{ url: string; key: string }[]> => {
  try {
    const uploadPromises = tasks.map(async ({ file, path, key }) => {
      // Full S3 key: path + filename (e.g., "images/my-photo-1234567890-abc123.jpg")
      const fullKey = `${path}/${key}`;

      const command = new PutObjectCommand({
        Bucket: config.aws.bucket as string,
        Key: fullKey,
        Body: file?.buffer,
        ContentType: file.mimetype,
        ACL: ObjectCannedACL.public_read,
      });

      await s3Client.send(command); // Throw on failure

      const url = `${config.aws.s3BaseUrl}/${fullKey}`;

      return {
        url,
        key: fullKey, // Return the full key (optional, useful for DB storage)
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'File upload failed');
  }
};

export const deleteManyFromS3 = async (keys: string[]) => {
  try {
    const deleteParams = {
      Bucket: config.aws.bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false,
      },
    };

    const command = new DeleteObjectsCommand(deleteParams);

    const response = await s3Client.send(command);

    return response;
  } catch (error) {
    console.error('Error deleting S3 files:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'S3 file delete failed');
  }
};