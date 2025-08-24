const timeFormat = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return ""; // return empty text when invalid
  const hours = Math.floor(n / 60);
  const minutesRemainder = Math.round(n % 60);
  return `${hours}h ${minutesRemainder}m`;
};

export default timeFormat;