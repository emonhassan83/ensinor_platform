export const notificationSearchableFields: string[] = ['message'];
export const notificationFilterableFields: string[] = ['searchTerm'];

export const messages = {
  authSettings: {
    passwordChanged: 'Password changed successfully.',
    passwordReset: 'Password Reset Processed',
  },

  userManagement: {
    accountActivated: 'User account activated.',
    accountDeactivated: 'User account deactivated.',
    accountDeleted: 'Your account Deleted.',
    invitationSent: 'Invitation sent',
    joinRequest: 'Sent join request',
  },

  companyRequest: {
    add: 'New company request added.',
    approved: 'Company request approved.',
    rejected: 'Company request rejected.',
    deleted: 'Company request deleted.',
  },

  coInstructor: {
    invitation: 'You have been invited as a Co-Instructor.',
    revoke: 'Your Co-Instructor access has been revoked.',
    deleted: 'Your Co-Instructor role has been removed permanently.',
  },

  shop: {
    added: 'Shop data added.',
    changedStatus: 'Your book shop status changed !',
    deleted: 'Shop data deleted.',
  },

  course: {
    added: 'New course upload.',
    assign: 'New Course Assigned',
    changedStatus: 'Your course status changed !',
    deleted: 'Your course deleted.',
  },

  enrolledCourse: {
    completed: 'Course completed submission!',
  },
  
  assignment: {
    published: 'Assignment published!',
    submitted: 'Assignment submitted!',
    resubmitted: 'Assignment resubmitted!',
    checked: 'Assignment checked!',
  },

  certificateRequest: {
    newRequest: 'Certificate request submitted!',
    statusChanged: 'Certificate request status changed!'
  },
  certificate: {
    completed: '🎉 Certificate Completed!'
  },

  subscription: {
    expired: 'Your subscription plan expired',
    warningForPlan: 'Alert for add new plan',
  },

  paymentManagement: {
    paymentSuccess: 'Payment was successful!',
    paymentRefunded: 'Payment refunded successfully.',
  },

  withdrawRequest: {
    completed: 'Withdraw request approved !',
    cancelled: 'Withdraw request cancelled !',
  },
};
