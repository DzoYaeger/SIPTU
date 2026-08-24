import dayjs from 'dayjs';

const STORAGE_KEY = 'siptu.archiveLoans.v1';

const memoryStore = {
  loans: [],
};

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    if (!window.localStorage) return null;
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const readLoans = () => {
  const storage = getStorage();
  if (!storage) {
    return Array.isArray(memoryStore.loans) ? [...memoryStore.loans] : [];
  }
  const parsed = safeParse(storage.getItem(STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeLoans = (loans) => {
  const normalized = Array.isArray(loans) ? loans : [];
  const storage = getStorage();
  if (!storage) {
    memoryStore.loans = [...normalized];
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
};

const generateToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

const buildRequestNumber = () => {
  const datePart = dayjs().format('YYYYMMDD');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ARS-${datePart}-${randomPart}`;
};

const normalizeLoan = (loan) => ({
  ...loan,
  signatures: Array.isArray(loan?.signatures) ? loan.signatures : [],
});

const hasSignature = (loan, type, role) =>
  normalizeLoan(loan).signatures.some((signature) => signature.type === type && signature.role === role);

const applySignature = (loan, { type, role, signature }) => {
  const normalized = normalizeLoan(loan);
  const signatures = [...normalized.signatures];

  signatures.push({
    type,
    role,
    signature,
    created_at: dayjs().toISOString(),
  });

  const updated = { ...normalized, signatures };

  if (type === 'borrowing' && role === 'admin') {
    updated.status = 'dipinjam';
  }

  if (type === 'borrowing' && role === 'borrower') {
    updated.status = hasSignature(updated, 'borrowing', 'admin') ? 'dipinjam' : 'menunggu_paraf';
  }

  if (type === 'returning' && role === 'admin') {
    updated.status = 'menunggu_paraf_kembali';
    updated.return_date = dayjs().format('YYYY-MM-DD');
    if (!updated.return_token) {
      updated.return_token = generateToken();
    }
  }

  if (type === 'returning' && role === 'borrower') {
    updated.status = 'dikembalikan';
  }

  return updated;
};

const replaceLoan = (loans, updatedLoan) =>
  loans.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan));

export const archiveLoanStore = {
  list() {
    const loans = readLoans();
    return loans.map(normalizeLoan).sort((a, b) => {
      const aDate = a.borrow_date ?? a.created_at;
      const bDate = b.borrow_date ?? b.created_at;
      return dayjs(bDate).valueOf() - dayjs(aDate).valueOf();
    });
  },
  create(payload) {
    const loans = readLoans();
    const now = dayjs();
    const newLoan = normalizeLoan({
      id: generateToken(),
      request_number: buildRequestNumber(),
      borrow_date: payload.borrow_date,
      borrower_employee_id: payload.borrower_employee_id ?? null,
      borrower_name: payload.borrower_name ?? '-',
      borrower_nip: payload.borrower_nip ?? null,
      borrower_work_unit: payload.borrower_work_unit ?? null,
      archive_unit_id: payload.archive_unit_id ?? null,
      unit_pengolah: payload.unit_pengolah ?? null,
      archive_number: payload.archive_number ?? '-',
      status: 'menunggu_paraf',
      public_token: generateToken(),
      return_token: null,
      return_date: null,
      created_at: now.toISOString(),
      signatures: payload.signature
        ? [{ type: 'borrowing', role: 'borrower', signature: payload.signature, created_at: now.toISOString() }]
        : [],
    });

    const updated = [newLoan, ...loans];
    writeLoans(updated);
    return newLoan;
  },
  delete(loanId) {
    const loans = readLoans();
    const updated = loans.filter((loan) => loan.id !== loanId);
    writeLoans(updated);
    return updated.length !== loans.length;
  },
  saveSignature(loanId, payload) {
    const loans = readLoans();
    const target = loans.find((loan) => loan.id === loanId);
    if (!target) return null;
    const updatedLoan = applySignature(target, payload);
    writeLoans(replaceLoan(loans, updatedLoan));
    return updatedLoan;
  },
  findByToken(token) {
    if (!token) return null;
    const loans = readLoans();
    const direct = loans.find((loan) => loan.public_token === token);
    if (direct) return { loan: normalizeLoan(direct), tokenType: 'public' };
    const returning = loans.find((loan) => loan.return_token === token);
    if (returning) return { loan: normalizeLoan(returning), tokenType: 'return' };
    return null;
  },
};

