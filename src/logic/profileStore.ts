import { DEFAULT_AVATAR_ID } from './profileAvatars';

const ACCOUNTS_KEY = 'ddz.accounts.v1';
const SESSION_KEY = 'ddz.session.v1';

export interface StoredAccount {
  id: string;
  email: string;
  displayName: string;
  avatarId: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface PublicProfile {
  id: string;
  email: string;
  displayName: string;
  avatarId: string;
  createdAt: number;
  updatedAt: number;
}

interface StoredSession {
  accountId: string;
  token: string;
  signedInAt: number;
}

export interface ProfileSession {
  accountId: string;
  token: string;
  signedInAt: number;
  account: PublicProfile;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  avatarId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  displayName: string;
  avatarId: string;
}

const safeStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return null;
  } catch {
    return null;
  }
};

const readJson = <T>(key: string, fallback: T): T => {
  const storage = safeStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const trimName = (name: string) => name.trim();

const hashPassword = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return `h${(hash >>> 0).toString(16)}`;
};

const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const sanitizeAccount = (account: StoredAccount): PublicProfile => ({
  id: account.id,
  email: account.email,
  displayName: account.displayName,
  avatarId: account.avatarId,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

const getAccounts = (): StoredAccount[] => readJson<StoredAccount[]>(ACCOUNTS_KEY, []);
const setAccounts = (accounts: StoredAccount[]) => writeJson(ACCOUNTS_KEY, accounts);

const getStoredSession = (): StoredSession | null => readJson<StoredSession | null>(SESSION_KEY, null);
const setStoredSession = (session: StoredSession | null) => {
  const storage = safeStorage();
  if (!storage) return;
  if (session) storage.setItem(SESSION_KEY, JSON.stringify(session));
  else storage.removeItem(SESSION_KEY);
};

const buildSession = (account: StoredAccount): ProfileSession => {
  const baseSession = getStoredSession();
  const session: StoredSession = baseSession?.accountId === account.id
    ? baseSession
    : { accountId: account.id, token: randomId('session'), signedInAt: Date.now() };
  setStoredSession(session);

  return {
    ...session,
    account: sanitizeAccount(account),
  };
};

const validatePassword = (password: string) => {
  if (password.trim().length < 6) throw new Error('密码至少需要 6 位');
};

const validateDisplayName = (displayName: string) => {
  if (trimName(displayName).length < 2) throw new Error('昵称至少需要 2 个字符');
};

const validateEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('请输入有效邮箱');
  return normalized;
};

export const listProfiles = (): PublicProfile[] => getAccounts().map(sanitizeAccount);

export const getCurrentSession = (): ProfileSession | null => {
  const stored = getStoredSession();
  if (!stored) return null;

  const account = getAccounts().find(item => item.id === stored.accountId);
  if (!account) {
    setStoredSession(null);
    return null;
  }

  return {
    ...stored,
    account: sanitizeAccount(account),
  };
};

export const registerAccount = (input: RegisterInput): ProfileSession => {
  const email = validateEmail(input.email);
  const displayName = trimName(input.displayName);
  validateDisplayName(displayName);
  validatePassword(input.password);

  const accounts = getAccounts();
  if (accounts.some(account => account.email === email)) {
    throw new Error('该邮箱已注册，请直接登录');
  }

  const now = Date.now();
  const account: StoredAccount = {
    id: randomId('acct'),
    email,
    displayName,
    avatarId: input.avatarId ?? DEFAULT_AVATAR_ID,
    passwordHash: hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };

  accounts.unshift(account);
  setAccounts(accounts);
  return buildSession(account);
};

export const loginAccount = (input: LoginInput): ProfileSession => {
  const email = validateEmail(input.email);
  validatePassword(input.password);
  const account = getAccounts().find(item => item.email === email);

  if (!account || account.passwordHash !== hashPassword(input.password)) {
    throw new Error('邮箱或密码错误');
  }

  return buildSession(account);
};

export const logoutAccount = () => {
  setStoredSession(null);
};

export const updateCurrentProfile = (input: UpdateProfileInput): ProfileSession => {
  validateDisplayName(input.displayName);
  const current = getStoredSession();
  if (!current) throw new Error('请先登录');

  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(item => item.id === current.accountId);
  if (accountIndex === -1) throw new Error('账户不存在');

  const updated: StoredAccount = {
    ...accounts[accountIndex],
    displayName: trimName(input.displayName),
    avatarId: input.avatarId || DEFAULT_AVATAR_ID,
    updatedAt: Date.now(),
  };

  accounts[accountIndex] = updated;
  setAccounts(accounts);
  return buildSession(updated);
};

export const deleteCurrentAccount = () => {
  const current = getStoredSession();
  if (!current) throw new Error('请先登录');

  const accounts = getAccounts().filter(item => item.id !== current.accountId);
  setAccounts(accounts);
  setStoredSession(null);
};
