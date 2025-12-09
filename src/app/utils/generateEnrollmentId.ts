import crypto from "crypto";

export const generateEnrollmentId = (prefix: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const randomFour = crypto.randomInt(1000, 9999).toString();

  return `${prefix}-${year}-${randomFour}`;
};
