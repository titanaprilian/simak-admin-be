export const parseDuration = (duration: string | undefined): number => {
  if (!duration) return 0;

  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return parseInt(duration) || 0;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      return value;
  }
};
