import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { ArticleValidation } from './article.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';
import { ArticleController } from './article.controller';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(ArticleValidation.createValidationSchema),
  ArticleController.insertIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(ArticleValidation.updateValidationSchema),
  ArticleController.updateIntoDB,
);

router.patch(
  '/seen/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  ArticleController.seenArticleIntoDB,
);

router.get('/categories', ArticleController.getAllCategoriesFromDB);

router.get('/:id', ArticleController.getByIdFromDB);

router.get('/', ArticleController.getAllFromDB);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  ArticleController.deleteFromDB,
);

export const ArticleRoutes = router;
