import { Assignment, AssignmentSubmission, Course, NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

// Assignment Submission Notification → Author
export const sendAssignmentSubmissionNotifYToAuthor = async (
  user: Partial<User>,
  assignment: Partial<Assignment>,
  authorId: string,
  type: 'submitted' | 're-submitted',
) => {
  let message;
  let description;

  if (type === 'submitted') {
    message = messages.assignment.submitted;
    description = `${user?.name} has submitted the assignment "${assignment.title}". Please review it.`;
  } else {
    message = messages.assignment.resubmitted;
    description = `${user?.name} has re-submitted the assignment "${assignment.title}". Please review it.`;
  }

  await NotificationService.createNotificationIntoDB({
    receiverId: authorId,
    message,
    description,
    referenceId: assignment.id,
    modeType: NotificationModeType.assignment,
  });
};

// Assignment Checked → Notify Student
export const sendAssignmentCheckedNotifYToUser = async (
  user: Partial<User>,
  assignment: Partial<Assignment>,
  submission: Partial<AssignmentSubmission>,
) => {
  const message = messages.assignment.checked;
  const description = `Your assignment "${assignment.title}" has been checked. You received ${submission.marksObtained} marks and grade "${submission.grade}". Feedback: ${submission.feedback}`;

  await NotificationService.createNotificationIntoDB({
    receiverId: user.id!,
    message,
    description,
    referenceId: submission.id!,
    modeType: NotificationModeType.assignment,
  });
};