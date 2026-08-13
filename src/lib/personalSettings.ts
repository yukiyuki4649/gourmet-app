import { MapCenter } from './appSettings';

// Per-browser preferences — no login required, not shared between devices/users.

const DEFAULT_CENTER_KEY = 'gourmet-map:defaultCenter';
const DEFAULT_AREA_FILTER_KEY = 'gourmet-map:defaultAreaFilter';
const DEFAULT_PERSON_FILTER_KEY = 'gourmet-map:defaultPersonFilter';
const SHOW_ADDED_BY_KEY = 'gourmet-map:showAddedBy';

export interface PersonalSettings {
  defaultCenter: MapCenter | null;
  defaultAreaFilter: string;
  defaultPersonFilter: string;
  showAddedBy: boolean;
}

export function loadPersonalSettings(): PersonalSettings {
  return {
    defaultCenter: getDefaultCenter(),
    defaultAreaFilter: localStorage.getItem(DEFAULT_AREA_FILTER_KEY) ?? '',
    defaultPersonFilter: localStorage.getItem(DEFAULT_PERSON_FILTER_KEY) ?? '',
    showAddedBy: localStorage.getItem(SHOW_ADDED_BY_KEY) !== 'false',
  };
}

export function savePersonalSettings(settings: PersonalSettings): void {
  if (settings.defaultCenter) {
    localStorage.setItem(DEFAULT_CENTER_KEY, JSON.stringify(settings.defaultCenter));
  } else {
    localStorage.removeItem(DEFAULT_CENTER_KEY);
  }
  if (settings.defaultAreaFilter) {
    localStorage.setItem(DEFAULT_AREA_FILTER_KEY, settings.defaultAreaFilter);
  } else {
    localStorage.removeItem(DEFAULT_AREA_FILTER_KEY);
  }
  if (settings.defaultPersonFilter) {
    localStorage.setItem(DEFAULT_PERSON_FILTER_KEY, settings.defaultPersonFilter);
  } else {
    localStorage.removeItem(DEFAULT_PERSON_FILTER_KEY);
  }
  localStorage.setItem(SHOW_ADDED_BY_KEY, String(settings.showAddedBy));
}

function getDefaultCenter(): MapCenter | null {
  try {
    const raw = localStorage.getItem(DEFAULT_CENTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}
