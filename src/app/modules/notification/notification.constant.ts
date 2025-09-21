export const notificationSearchableFields: string[] = ['message'];
export const notificationFilterableFields: string[] = ['searchTerm'];

export const messages = {
  authSettings: {
    passwordChanged: 'Password changed successfully.',
    passwordReset: 'Password Reset Processed'
  },

  userManagement: {
    accountActivated: 'User account activated.',
    accountDeactivated: 'User account deactivated.',
    accountDeleted: 'Your account Deleted.',
    invitationSent: 'Invitation sent',
    joinRequest: 'Invitation sent',
  },

  companyRequest: {
    add: 'New company request added.',
    approved: 'Company request approved.',
    rejected: 'Company request rejected.',
    deleted: 'Company request deleted.',
  },

  purityMeter: {
    empty: 'Purity Meter Empty',
    warning: 'Purity Meter Running Low',
  },

  trackWater: {
    completed: 'You finally reached you goal !',
    inCompleted: 'You were not able to reach you goal !',
  },

  settings: {
    systemUpdated: 'System settings updated.',
  },

  subscription: {
    newPlan: 'New subscription plan added.',
    warningForPlan: 'Alert for add new plan',
  },

  paymentManagement: {
    paymentSuccess: 'Payment was successful!',
    paymentRefunded: 'Payment refunded successfully.',
  },
};
