import type { NameComponents } from '../types';

export const formatNodeLabel = (
    components: NameComponents & { label?: string; deathDate?: string }
): string => {
    let baseLabel = '';

    // If explicit label is provided, use it
    if (components.label) {
        baseLabel = components.label;
    } else if (components.shuhra) {
        // Use shuhra if available
        baseLabel = components.shuhra;
    } else {
        // Otherwise combine available components
        const parts = [];
        if (components.kunya) parts.push(components.kunya);
        if (components.nasab) parts.push(components.nasab);
        if (components.nisba) parts.push(components.nisba);
        baseLabel = parts.join(' ') || 'New Node';
    }

    // Always append death date if available
    if (components.deathDate) {
        // Format the death date properly
        const formattedDate = parseDeathDate(components.deathDate);
        return `${baseLabel} (${formattedDate})`;
    }

    return baseLabel;
};
export const parseDeathDate = (date: string): string => {
    // Handle various death date formats
    if (!date) return '';

    // Already formatted
    if (date.startsWith('d.')) return date;

    // Add d. prefix if it's just numbers
    if (/^\d+/.test(date)) return `d. ${date}`;

    return date;
};