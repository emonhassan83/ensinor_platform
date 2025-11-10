import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { uploadManyToS3, uploadToS3 } from '../../utils/s3';

const multiple = async (files: any) => {
  let fileArray: any[] = [];

  // ✅ Handle different multer upload structures
  if (Array.isArray(files)) {
    fileArray = files;
  } else if (files?.files && Array.isArray(files.files)) {
    fileArray = files.files;
  } else if (typeof files === 'object') {
    Object.values(files).forEach((arr: any) => {
      if (Array.isArray(arr)) fileArray.push(...arr);
    });
  }

  if (!fileArray.length) {
    return [];
  }


  // ✅ Detect file type and assign upload path
  const uploadTasks = fileArray.map((file: any) => {
    let path = 'others'; // default fallback

    if (file.mimetype.startsWith('image/')) {
      path = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      path = 'videos';
    } else if (
      file.mimetype.startsWith('application/pdf') ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      path = 'documents';
    } else if (
      file.mimetype.startsWith('application/vnd') ||
      file.originalname.match(/\.(docx?|xlsx?|pptx?)$/i)
    ) {
      path = 'documents';
    } else if (file.mimetype.startsWith('audio/')) {
      path = 'audios';
    }

    return { file, path };
  });

  // ✅ Upload all to S3
  const uploadedFiles = await uploadManyToS3(uploadTasks);

  // ✅ Return only the URLs
  const urls = uploadedFiles.map((item: any) => item.url);

  return urls;
};

const single = async (file: any) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File is required');
  }
  const result = await uploadToS3({
    file,
    fileName: `images/${Math.floor(100000 + Math.random() * 900000)}`,
  });

  return result;
};

const uploadService = { multiple, single };
export default uploadService;
