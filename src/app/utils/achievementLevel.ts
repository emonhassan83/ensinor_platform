export const BASE_LEVEL_POINTS = 300; // Level 1 starts at 300 pts
export const MULTIPLIER = 3; // Each next level needs 3x points
export const LEVEL_CONFIG = {
  BASE_POINTS: 300, // Points required for Level 1
  MULTIPLIER: 3,    // Each next level requires 3x previous
};

// 🎯 Calculate current level and next level progress
export const getLevelProgress = (totalPoints: number) => {
  const { BASE_POINTS, MULTIPLIER } = LEVEL_CONFIG;

  let currentLevel = 0;
  let requiredPoints = BASE_POINTS;
  let accumulated = 0;

  // Determine current level based on total points
  while (totalPoints >= accumulated + requiredPoints) {
    accumulated += requiredPoints;
    requiredPoints *= MULTIPLIER;
    currentLevel++;
  }

  // Calculate progress to next level
  const pointsIntoLevel = totalPoints - accumulated;
  const nextLevelProgress = Math.min(
    (pointsIntoLevel / requiredPoints) * 100,
    100,
  );

  return {
    level: currentLevel,
    nextLevelProgress: Number(nextLevelProgress.toFixed(2)),
  };
};



/**
 * Calculates the user's level and progress percentage toward the next level
 */
export const calculateAchievementLevel = (totalPoints: number) => {
  if (totalPoints < BASE_LEVEL_POINTS) {
    return {
      level: 0,
      nextLevelProgress: Math.floor((totalPoints / BASE_LEVEL_POINTS) * 100),
    };
  }

  let level = 1;
  let pointsForNext = BASE_LEVEL_POINTS * MULTIPLIER;
  let pointsForCurrent = BASE_LEVEL_POINTS;

  while (totalPoints >= pointsForNext) {
    level++;
    pointsForCurrent = pointsForNext;
    pointsForNext = pointsForNext * MULTIPLIER;
  }

  const range = pointsForNext - pointsForCurrent;
  const progress = Math.floor(((totalPoints - pointsForCurrent) / range) * 100);

  return {
    level,
    nextLevelProgress: Math.min(progress, 100),
  };
};