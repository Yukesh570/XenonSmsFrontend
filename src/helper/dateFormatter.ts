// src/helper/dateFormatter.ts

export const getAppTimezone = (): string => {
  return localStorage.getItem("app_timezone") || "UTC";
};

export const getAppDateFormat = (): string => {
  return localStorage.getItem("app_date_format") || "YYYY-MM-DD";
};

export const getAppDateTimeFormat = (): string => {
  return localStorage.getItem("app_datetime_format") || "YYYY-MM-DD HH:mm:ss";
};

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTH_NAMES_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export interface ParsedDateInfo {
  date: Date;
  isDateOnly: boolean;
}

export const parseDateInput = (
  input?: string | number | Date | null
): ParsedDateInfo | null => {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : { date: input, isDateOnly: false };
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : { date: d, isDateOnly: false };
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (
      !trimmed ||
      trimmed === "-" ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined"
    ) {
      return null;
    }

    // Pure date string: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map((n) => parseInt(n, 10));
      const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      return isNaN(date.getTime()) ? null : { date, isDateOnly: true };
    }

    // Pure timestamp in seconds or milliseconds
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      const d = new Date(trimmed.length === 10 ? num * 1000 : num);
      return isNaN(d.getTime()) ? null : { date: d, isDateOnly: false };
    }

    // Datetime string without timezone indicator e.g. "2026-09-20 22:04:31" or "2026-09-20T22:04:31"
    // Standardize to UTC ISO string by appending 'Z'
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
      const iso = trimmed.replace(" ", "T") + "Z";
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return { date: d, isDateOnly: false };
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : { date: d, isDateOnly: false };
  }
  return null;
};

const getTimezoneParts = (
  date: Date,
  timeZone: string,
  isDateOnly: boolean = false
) => {
  if (isDateOnly) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return {
      year,
      month,
      day,
      hour24: 0,
      hour12: 12,
      minute: 0,
      second: 0,
      ampm: "AM",
    };
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    let hour24 = parseInt(map.hour, 10);
    if (hour24 === 24) hour24 = 0;
    const minute = parseInt(map.minute, 10);
    const second = parseInt(map.second, 10);
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return { year, month, day, hour24, hour12, minute, second, ampm };
  } catch {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour24 = date.getUTCHours();
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return { year, month, day, hour24, hour12, minute, second, ampm };
  }
};

const normalizePattern = (pattern: string): string => {
  if (!pattern) return "YYYY-MM-DD HH:mm:ss";
  let p = pattern;
  // Convert MM to mm if it appears after hours or before seconds (common user typo HH:MM:SS)
  p = p.replace(/(?:HH|hh|H|h):MM/g, (m) => m.slice(0, -2) + "mm");
  p = p.replace(/:MM(?=:|$|\s|[A-Za-z])/g, ":mm");
  return p;
};

const formatWithTokens = (
  parsed: ParsedDateInfo,
  pattern: string,
  timeZone: string
): string => {
  const normalized = normalizePattern(pattern);
  const parts = getTimezoneParts(parsed.date, timeZone, parsed.isDateOnly);

  const YYYY = String(parts.year);
  const YY = String(parts.year).slice(-2);
  const MMMM = MONTH_NAMES_LONG[parts.month - 1] || "";
  const MMM = MONTH_NAMES_SHORT[parts.month - 1] || "";
  const MM = String(parts.month).padStart(2, "0");
  const M = String(parts.month);
  const DD = String(parts.day).padStart(2, "0");
  const D = String(parts.day);
  const HH = String(parts.hour24).padStart(2, "0");
  const H = String(parts.hour24);
  const hh = String(parts.hour12).padStart(2, "0");
  const h = String(parts.hour12);
  const mm = String(parts.minute).padStart(2, "0");
  const m = String(parts.minute);
  const ss = String(parts.second).padStart(2, "0");
  const s = String(parts.second);
  const A = parts.ampm;
  const a = parts.ampm.toLowerCase();

  return normalized.replace(
    /YYYY|yyyy|YY|yy|MMMM|MMM|MM|M|DD|dd|D|d|HH|H|hh|h|mm|m|ss|SS|s|S|A|a/g,
    (match) => {
      switch (match) {
        case "YYYY":
        case "yyyy":
          return YYYY;
        case "YY":
        case "yy":
          return YY;
        case "MMMM":
          return MMMM;
        case "MMM":
          return MMM;
        case "MM":
          return MM;
        case "M":
          return M;
        case "DD":
        case "dd":
          return DD;
        case "D":
        case "d":
          return D;
        case "HH":
          return HH;
        case "H":
          return H;
        case "hh":
          return hh;
        case "h":
          return h;
        case "mm":
          return mm;
        case "m":
          return m;
        case "ss":
        case "SS":
          return ss;
        case "s":
        case "S":
          return s;
        case "A":
          return A;
        case "a":
          return a;
        default:
          return match;
      }
    }
  );
};

export const formatDateTime = (
  dateInput?: string | number | Date | null,
  customFormat?: string,
  customTimezone?: string
): string => {
  const parsed = parseDateInput(dateInput);
  if (!parsed) return "-";

  const tz = customTimezone || getAppTimezone();
  const format = customFormat || getAppDateTimeFormat();
  return formatWithTokens(parsed, format, tz);
};

export const formatDate = (
  dateInput?: string | number | Date | null,
  customFormat?: string,
  customTimezone?: string
): string => {
  const parsed = parseDateInput(dateInput);
  if (!parsed) return "-";

  const tz = customTimezone || getAppTimezone();
  const format = customFormat || getAppDateFormat();
  return formatWithTokens(parsed, format, tz);
};

export const formatTime = (
  dateInput?: string | number | Date | null,
  customFormat?: string,
  customTimezone?: string
): string => {
  const parsed = parseDateInput(dateInput);
  if (!parsed) return "-";

  const tz = customTimezone || getAppTimezone();
  const format = customFormat || "HH:mm:ss";
  return formatWithTokens(parsed, format, tz);
};

export const getNowInAppTimezone = (): Date => {
  const tz = getAppTimezone();
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();
    let hour = now.getHours();
    let minute = now.getMinutes();
    let second = now.getSeconds();

    for (const part of parts) {
      if (part.type === "year") year = parseInt(part.value, 10);
      if (part.type === "month") month = parseInt(part.value, 10) - 1;
      if (part.type === "day") day = parseInt(part.value, 10);
      if (part.type === "hour") {
        const h = parseInt(part.value, 10);
        hour = h === 24 ? 0 : h;
      }
      if (part.type === "minute") minute = parseInt(part.value, 10);
      if (part.type === "second") second = parseInt(part.value, 10);
    }
    return new Date(year, month, day, hour, minute, second);
  } catch {
    return new Date();
  }
};

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};