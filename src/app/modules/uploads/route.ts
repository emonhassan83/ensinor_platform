import { Router } from 'express';
import multer, { memoryStorage } from 'multer';
import uploadController from './upload.controller';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/multiple',
  upload.fields([
    { name: 'images', maxCount: 12 },
    { name: 'videos', maxCount: 6 },
  ]),
  uploadController.multiple,
);

router.post('/single', upload.single('file'), uploadController.single);

const uploadRouter = router;
export default uploadRouter;
