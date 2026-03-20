/**
 * Returns a YYYY-MM-DD string in the user's local timezone.
 * Prevents the "one day off" bug caused by UTC conversions (toISOString).
 */
export const toLocalISO = (d: Date | string) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Normalizes an ISO string or Date to just the local date part for comparison.
 */
export const normalizeDate = (iso: string | Date) => {
    return toLocalISO(iso);
};

/**
 * Returns a Date object set to the beginning of the day (00:00:00.000).
 */
export const getLocalStartOfDay = (d: Date | string = new Date()) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

/**
 * Returns a Date object set to the end of the day (23:59:59.999).
 */
export const getLocalEndOfDay = (d: Date | string = new Date()) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};
