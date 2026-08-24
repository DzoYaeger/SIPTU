const STORAGE_KEY = 'bmn_sequences';
const ORGANIZATION_CODE = '672845';

const readSequences = () => {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Failed to parse BMN sequence storage', error);
    return {};
  }
};

const writeSequences = (data) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist BMN sequence storage', error);
  }
};

const nextSequence = (prefix, date = new Date()) => {
  const storage = readSequences();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const key = `${prefix}-${year}-${month}`;

  const current = storage[key] ?? 0;
  const nextValue = current + 1;
  storage[key] = nextValue;
  writeSequences(storage);

  return { year, month, sequence: String(nextValue).padStart(3, '0') };
};

const buildNumber = (code, prefix, { month, year, sequence }) => `${sequence}/${prefix}/${code}/${month}/${year}`;

export const generateSpbNumber = (date = new Date()) => {
  const next = nextSequence('SPB', date);
  return buildNumber(ORGANIZATION_CODE, 'SPB', next);
};

export const generateSpaNumber = (date = new Date()) => {
  const next = nextSequence('SPA', date);
  return buildNumber(ORGANIZATION_CODE, 'SPA', next);
};

export const resetSequences = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};
