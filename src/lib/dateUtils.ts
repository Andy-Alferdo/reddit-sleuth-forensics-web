import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const PAKISTAN_TIMEZONE = 'Asia/Karachi';

/**
 * Format a date to Pakistan Standard Time (PST/PKT - UTC+5)
 */
export const formatToPakistanTime = (date: Date | string | number, formatStr: string = 'PPpp'): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const zonedDate = toZonedTime(dateObj, PAKISTAN_TIMEZONE);
  return format(zonedDate, formatStr);
};

/**
 * Format timestamp for activity display (e.g., "Jan 15, 2024, 2:30:45 PM PKT")
 */
export const formatActivityTime = (timestamp: number): string => {
  const dateObj = new Date(timestamp * 1000);
  const pktStr = formatToPakistanTime(dateObj, 'PPpp');
  const utcStr = format(dateObj, 'h:mm:ss a', { timeZone: 'UTC' } as any);
  // date-fns doesn't support timeZone in format, so compute UTC manually
  const utcDate = new Date(dateObj.toISOString());
  const utcFormatted = format(toZonedTime(utcDate, 'UTC'), 'h:mm:ss a');
  return `${pktStr} PKT (${utcFormatted} UTC)`;
};

/**
 * Format date for display (e.g., "Jan 15, 2024")
 */
export const formatDateShort = (date: Date | string): string => {
  return formatToPakistanTime(date, 'PP');
};

/**
 * Format current time for live monitoring (e.g., "2:30:45 PM")
 */
export const formatCurrentTimePakistan = (): string => {
  const now = new Date();
  const pktStr = formatToPakistanTime(now, 'p');
  const utcStr = format(toZonedTime(now, 'UTC'), 'p');
  return `${pktStr} PKT (${utcStr} UTC)`;
};

/**
 * Format full date and time (e.g., "Jan 15, 2024, 2:30:45 PM")
 */
export const formatFullDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const pktStr = formatToPakistanTime(dateObj, 'PPpp');
  const utcStr = format(toZonedTime(dateObj, 'UTC'), 'h:mm:ss a');
  return `${pktStr} PKT (${utcStr} UTC)`;
};
