export const formatSeconds = (seconds: number): string => `${seconds}s`;

export const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const percent = (value: number, digits = 2): string => `${value.toFixed(digits)}%`;

export const compactNumber = (value: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
