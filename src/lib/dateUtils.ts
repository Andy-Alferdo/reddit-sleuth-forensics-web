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
 * Format timestamp for activity display (e.g., "2:30:45 PM")
 */
export const formatActivityTime = (timestamp: number): string => {
  return formatToPakistanTime(timestamp * 1000, 'p');
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
  return formatToPakistanTime(new Date(), 'p');
};

/**
 * Format full date and time (e.g., "Jan 15, 2024, 2:30:45 PM")
 */
export const formatFullDateTime = (date: Date | string): string => {
  return formatToPakistanTime(date, 'PPpp');
};
