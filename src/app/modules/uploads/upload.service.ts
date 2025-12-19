import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { uploadManyToS3, uploadToS3 } from '../../utils/s3';

const multiple = async (files: any) => {
  let fileArray: any[] = [];

  // ✅ Normalize multer upload structures
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

  // ✅ Prepare upload tasks with proper paths
  const uploadTasks = fileArray.map((file: any) => {
    let path = 'others';

    if (file.mimetype.startsWith('image/')) {
      path = 'images';
    } else if (file.mimetype.startsWith('video/')) {
      path = 'videos';
    } else if (
      file.mimetype === 'application/pdf' ||
      file.originalname?.toLowerCase().endsWith('.pdf')
    ) {
      path = 'documents';
    } else if (
      file.mimetype.startsWith('application/vnd') ||
      /\.(docx?|xlsx?|pptx?)$/i.test(file.originalname)
    ) {
      path = 'documents';
    } else if (file.mimetype.startsWith('audio/')) {
      path = 'audios';
    }

    return { file, path };
  });

  // ✅ Upload to S3
  const uploadedFiles = await uploadManyToS3(uploadTasks);

  // ✅ Return unified response: [{ url, size }]
  const result = uploadedFiles.map((item: any, index: number) => {
    const originalFile = fileArray[index];
    const sizeInMB = Number(
      (originalFile.size / (1024 * 1024)).toFixed(4),
    );

    return {
      url: item.url,
      size: sizeInMB,
    };
  });

  return result;
};

const single = async (file: any) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File is required');
  }
  const result = await uploadToS3({
    file,
    fileName: `images/${Math.floor(100000 + Math.random() * 900000)}`,
  });

  const fileSizeInMB = Number((file.size / (1024 * 1024)).toFixed(4))

  return {
    url: result,
    size: fileSizeInMB,
  }
};

const uploadService = { multiple, single };
export default uploadService;
