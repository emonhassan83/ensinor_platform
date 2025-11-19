import crypto from "crypto";

export const generateEnrollmentId = (
  courseCategory: string,
  studentName: string
): string => {
  const category = courseCategory.toLowerCase().replace(/\s+/g, "");
  const name = studentName.toLowerCase().replace(/\s+/g, "");

  // time-based digits → min-sec-ms  (e.g., 14-53-129)
  const now = new Date();
  const timePart = `${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;

  const randomFour = crypto.randomInt(1000, 9999).toString();

  return `ensinor-${category}-${name}-${timePart}-${randomFour}`;
};
