export const parseExpirationToSeconds = (exp: string): number => {
  const match = exp.match(/^(\d+)([smhd])$/); 
  if (!match) return 60 * 60 * 24 * 30; 

  const value = parseInt(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multiplier: { [key in typeof unit]: number } = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };

  return value * multiplier[unit];
};
