export interface AreaCategory {
  name: string;
  areas: string[];
}

const AREA_PREFIX = 'area:';
const CATEGORY_PREFIX = 'category:';

export function areaFilterValue(area: string): string {
  return AREA_PREFIX + area;
}

export function categoryFilterValue(name: string): string {
  return CATEGORY_PREFIX + name;
}

/** Resolves a filter <select> value into the concrete set of area names it covers, or null for "all". */
export function resolveFilterAreas(selection: string, categories: AreaCategory[]): string[] | null {
  if (!selection) return null;
  if (selection.startsWith(CATEGORY_PREFIX)) {
    const name = selection.slice(CATEGORY_PREFIX.length);
    return categories.find(c => c.name === name)?.areas ?? [];
  }
  if (selection.startsWith(AREA_PREFIX)) {
    return [selection.slice(AREA_PREFIX.length)];
  }
  return null;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  label: string;
  options: FilterOption[];
}

/**
 * Groups the area filter options by category, using each category's own name as the
 * group header (instead of a generic "カテゴリ"/"エリア" label), so e.g. "文京エリア"
 * appears as a header with 上野・根津千駄木・お茶の水 listed underneath it. Areas not
 * assigned to any category fall into a trailing group.
 */
export function buildFilterGroups(allAreas: string[], categories: AreaCategory[]): FilterGroup[] {
  const categorized = new Set<string>();
  const groups: FilterGroup[] = [];
  for (const cat of categories) {
    const memberAreas = cat.areas.filter(a => allAreas.includes(a));
    // A category with no areas visible to the current viewer (e.g. every restaurant in
    // it is private and not shared with them) would otherwise show an empty, dead-end
    // filter option — skip it entirely instead.
    if (memberAreas.length === 0) continue;
    memberAreas.forEach(a => categorized.add(a));
    groups.push({
      label: cat.name,
      options: [
        { label: `${cat.name}(すべて)`, value: categoryFilterValue(cat.name) },
        ...memberAreas.map(a => ({ label: a, value: areaFilterValue(a) })),
      ],
    });
  }

  const uncategorized = allAreas.filter(a => !categorized.has(a));
  if (uncategorized.length > 0) {
    groups.push({
      label: categories.length > 0 ? 'その他のエリア' : 'エリア',
      options: uncategorized.map(a => ({ label: a, value: areaFilterValue(a) })),
    });
  }

  return groups;
}

// --- Same grouping concept, for cuisine types instead of areas ---

export interface CuisineCategory {
  name: string;
  cuisines: string[];
}

const CUISINE_PREFIX = 'cuisine:';
const CUISINE_CATEGORY_PREFIX = 'cuisineCategory:';

export function cuisineFilterValue(cuisine: string): string {
  return CUISINE_PREFIX + cuisine;
}

export function cuisineCategoryFilterValue(name: string): string {
  return CUISINE_CATEGORY_PREFIX + name;
}

/** Resolves a filter <select> value into the concrete set of cuisines it covers, or null for "all". */
export function resolveFilterCuisines(selection: string, cuisineCategories: CuisineCategory[]): string[] | null {
  if (!selection) return null;
  if (selection.startsWith(CUISINE_CATEGORY_PREFIX)) {
    const name = selection.slice(CUISINE_CATEGORY_PREFIX.length);
    return cuisineCategories.find(c => c.name === name)?.cuisines ?? [];
  }
  if (selection.startsWith(CUISINE_PREFIX)) {
    return [selection.slice(CUISINE_PREFIX.length)];
  }
  return null;
}

/** Same idea as buildFilterGroups, but for cuisine types (e.g. "麺類" containing ラーメン・つけめん・うどん). */
export function buildCuisineFilterGroups(allCuisines: string[], cuisineCategories: CuisineCategory[]): FilterGroup[] {
  const categorized = new Set<string>();
  const groups: FilterGroup[] = [];
  for (const cat of cuisineCategories) {
    const members = cat.cuisines.filter(c => allCuisines.includes(c));
    // Same reasoning as buildFilterGroups: hide categories with nothing visible to show.
    if (members.length === 0) continue;
    members.forEach(c => categorized.add(c));
    groups.push({
      label: cat.name,
      options: [
        { label: `${cat.name}(すべて)`, value: cuisineCategoryFilterValue(cat.name) },
        ...members.map(c => ({ label: c, value: cuisineFilterValue(c) })),
      ],
    });
  }

  const uncategorized = allCuisines.filter(c => !categorized.has(c));
  if (uncategorized.length > 0) {
    groups.push({
      label: cuisineCategories.length > 0 ? 'その他の料理種別' : '料理種別',
      options: uncategorized.map(c => ({ label: c, value: cuisineFilterValue(c) })),
    });
  }

  return groups;
}
