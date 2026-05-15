const RU_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function transliterate(str: string): string {
  return str
    .toLowerCase()
    .split('')
    .map(ch => RU_MAP[ch] ?? ch)
    .join('');
}

export function slugify(str: string, maxLen = 80): string {
  const tr = transliterate(str || '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return tr.slice(0, maxLen).replace(/-$/, '') || 'object';
}

/** Слаг для объекта: title + id, чтобы был уникальный и человекочитаемый. */
export function listingSlug(title: string, id: number): string {
  return `${slugify(title)}-${id}`;
}

/** Достаёт id из ЧПУ-урла вида "office-tsentr-krasnodara-42" */
export function extractIdFromSlug(slug: string): number | null {
  const m = String(slug || '').match(/-?(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}
