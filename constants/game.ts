export const SKILL_LEVELS = ['LB', 'MB', 'HB', 'LI', 'MI', 'HI', 'LA', 'MA', 'HA'];

export const SKILL_LEVELS_DISPLAY: Record<string, string> = {
  LB: 'Lower Beginner',
  MB: 'Mid Beginner',
  HB: 'High Beginner',
  LI: 'Lower Intermediate',
  MI: 'Mid Intermediate',
  HI: 'High Intermediate',
  LA: 'Lower Advanced',
  MA: 'Mid Advanced',
  HA: 'High Advanced',
};

export const getSkillLevelDisplay = (skill: string) => {
  if (!skill) return 'Unknown';
  if (skill.includes(' - ')) {
    const [min, max] = skill.split(' - ');
    return `${SKILL_LEVELS_DISPLAY[min] || min} - ${SKILL_LEVELS_DISPLAY[max] || max}`;
  }
  return SKILL_LEVELS_DISPLAY[skill] || skill;
};
