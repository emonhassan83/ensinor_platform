import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { uploadManyToS3, uploadToS3 } from '../../utils/s3';

const multiple = async (files: any) => {
  let fileArray: any[] = [];

  // Case 1: if multer.array() is used → files is already an array
  if (Array.isArray(files)) {
    fileArray = files;
  }
  // Case 2: if multer.fields() or upload.array('files') wrapped in object
  else if (files?.files && Array.isArray(files.files)) {
    fileArray = files.files;
  }
  // Case 3: if multer.fields() returns multiple named arrays (like { images: [...], videos: [...] })
  else if (typeof files === 'object') {
    Object.values(files).forEach((arr: any) => {
      if (Array.isArray(arr)) fileArray.push(...arr);
    });
  }

  if (!fileArray.length) {
    return { images: [], videos: [] };
  }

  const imageFiles = [];
  const videoFiles = [];

  for (const file of fileArray) {
    if (file.mimetype.startsWith('image/')) {
      imageFiles.push({
        file,
        path: 'images',
      });
    } else if (file.mimetype.startsWith('video/')) {
      videoFiles.push({
        file,
        path: 'videos',
      });
    }
  }

  const [imagesArray, videosArray] = await Promise.all([
    imageFiles.length > 0 ? uploadManyToS3(imageFiles) : [],
    videoFiles.length > 0 ? uploadManyToS3(videoFiles) : [],
  ]);

  return {
    images: imagesArray || [],
    videos: videosArray || [],
  };
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
