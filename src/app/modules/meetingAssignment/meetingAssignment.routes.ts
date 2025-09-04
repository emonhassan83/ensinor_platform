import express from 'express';
import { MeetingAssignmentController } from './meetingAssignment.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { MeetingAssignmentValidation } from './meetingAssignment.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(MeetingAssignmentValidation.createValidationSchema),
  MeetingAssignmentController.insertIntoDB,
);

router.get('/', MeetingAssignmentController.getAllFromDB);

router.get('/:id', MeetingAssignmentController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(MeetingAssignmentValidation.updateValidationSchema),
  MeetingAssignmentController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), MeetingAssignmentController.deleteFromDB);

export const MeetingAssignmentRoutes = router;
