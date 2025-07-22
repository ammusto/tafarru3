import type { NameComponents } from '../types';

export const formatNodeLabel = (
    components: NameComponents & { label?: string; deathDate?: string }
): string => {
    // If explicit label is provided, use it
    if (components.label) {
        return components.label;
    }

    // Use shuhra if available
    if (components.shuhra) {
        return components.shuhra + (components.deathDate ? ` (${components.deathDate})` : '');
    }

    // Otherwise combine available components
    const parts = [];
    if (components.kunya) parts.push(components.kunya);
    if (components.nasab) parts.push(components.nasab);
    if (components.nisba) parts.push(components.nisba);

    const name = parts.join(' ') || 'New Node';
    return name + (components.deathDate ? ` (${components.deathDate})` : '');
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