// shortAnswerHelper.ts
import levenshtein from "js-levenshtein";

export const normalize = (str: string) =>
  str.trim().toLowerCase().replace(/\s+/g, " ");

export const isShortAnswerCorrect = (userAns: string, expectedList: string[]) => {
  if (!userAns) return false;

  const normalizedUser = normalize(userAns);

  return expectedList.some(expected => {
    const normalizedExp = normalize(expected);

    // 1️⃣ Exact match
    if (normalizedUser === normalizedExp) return true;

    // 2️⃣ Regex strict match
    const regex = new RegExp(
      `^${normalizedExp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
    if (regex.test(normalizedUser)) return true;

    // 3️⃣ Partial match (user contains expected)
    if (normalizedUser.includes(normalizedExp)) return true;

    // 4️⃣ Fuzzy match (20% tolerance)
    const distance = levenshtein(normalizedUser, normalizedExp);
    const allowed = Math.max(1, Math.floor(normalizedExp.length * 0.2));

    if (distance <= allowed) return true;

    return false;
  });
};
