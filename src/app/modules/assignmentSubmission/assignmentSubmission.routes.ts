import express from 'express';
import { AssignmentSubmissionController } from './assignmentSubmission.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { AssignmentSubmissionValidation } from './assignmentSubmission.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('file'),
  parseData(),
  validateRequest(AssignmentSubmissionValidation.createValidationSchema),
  AssignmentSubmissionController.insertIntoDB,
);

router.get(
  '/author/my-assignment',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AssignmentSubmissionController.getAuthorAssignmentSubmission,
);

router.get(
  '/course/:courseId',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student,
  ),
  AssignmentSubmissionController.getCourseAssignmentSubmission,
);

router.get(
  '/user/my-assignment',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student,
  ),
  AssignmentSubmissionController.getMyAssignmentSubmission,
);

router.get(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student,
  ),
  AssignmentSubmissionController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('file'),
  parseData(),
  validateRequest(AssignmentSubmissionValidation.updateValidationSchema),
  AssignmentSubmissionController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AssignmentSubmissionController.deleteFromDB,
);

export const AssignmentSubmissionRoutes = router;
