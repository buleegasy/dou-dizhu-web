import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Mail, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';
import { AVATAR_PRESETS, DEFAULT_AVATAR_ID } from '../logic/profileAvatars';
import {
  deleteCurrentAccount,
  getCurrentSession,
  listProfiles,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateCurrentProfile,
  type ProfileSession,
} from '../logic/profileStore';

interface ProfileDialogProps {
  isOpen: boolean;
  session: ProfileSession | null;
  onClose: () => void;
  onSessionChange: (session: ProfileSession | null) => void;
}

const panelMotion = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.98 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

const ProfileDialog: React.FC<ProfileDialogProps> = ({ isOpen, session, onClose, onSessionChange }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const knownProfiles = useMemo(() => listProfiles(), [isOpen, session]);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);

    if (session) {
      setDisplayName(session.account.displayName);
      setAvatarId(session.account.avatarId);
      setEmail(session.account.email);
      setPassword('');
    } else {
      setMode('login');
      setEmail(knownProfiles[0]?.email ?? '');
      setPassword('');
      setDisplayName('');
      setAvatarId(DEFAULT_AVATAR_ID);
    }
  }, [isOpen, session, knownProfiles]);

  if (!isOpen) return null;

  const runAction = async (action: () => void) => {
    try {
      setBusy(true);
      setMessage(null);
      action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = () =>
    runAction(() => {
      const next = loginAccount({ email, password });
      onSessionChange(next);
      onClose();
    });

  const handleRegister = () =>
    runAction(() => {
      const next = registerAccount({ email, password, displayName, avatarId });
      onSessionChange(next);
      onClose();
    });

  const handleSaveProfile = () =>
    runAction(() => {
      const next = updateCurrentProfile({ displayName, avatarId });
      onSessionChange(next);
      setMessage('资料已保存');
    });

  const handleLogout = () => {
    logoutAccount();
    onSessionChange(null);
    onClose();
  };

  const handleDeleteAccount = () =>
    runAction(() => {
      deleteCurrentAccount();
      onSessionChange(null);
      onClose();
    });

  const liveSession = session ?? getCurrentSession();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          {...panelMotion}
          onClick={event => event.stopPropagation()}
          className="w-full max-w-xl rounded-[32px] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-900/12"
        >
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-500">Profile</div>
              <h2 className="mt-1 text-2xl font-black text-gray-900">{liveSession ? '账户管理' : '登录或创建账户'}</h2>
              <p className="mt-1 text-sm text-gray-500">当前版本为本地账户系统，数据仅保存在这个浏览器。</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl border border-gray-100 p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          {!liveSession ? (
            <>
              <div className="mb-5 inline-flex rounded-2xl bg-gray-100 p-1">
                <button
                  onClick={() => setMode('login')}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  登录
                </button>
                <button
                  onClick={() => setMode('register')}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  注册
                </button>
              </div>

              {mode === 'register' && (
                <div className="mb-5 rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 text-sm font-bold text-gray-900">选择你的头像</div>
                  <div className="grid grid-cols-4 gap-3">
                    {AVATAR_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setAvatarId(preset.id)}
                        className={`rounded-2xl border p-2 transition-all ${avatarId === preset.id ? 'border-purple-400 bg-purple-50' : 'border-transparent bg-white hover:border-gray-200'}`}
                      >
                        <ProfileAvatar avatarId={preset.id} className="mx-auto" />
                        <div className="mt-2 text-xs font-bold text-gray-500">{preset.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {mode === 'register' && (
                  <label className="block">
                    <div className="mb-2 text-sm font-bold text-gray-700">昵称</div>
                    <div className="relative">
                      <UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        value={displayName}
                        onChange={event => setDisplayName(event.target.value)}
                        placeholder="例如：牌桌小霸王"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <div className="mb-2 text-sm font-bold text-gray-700">邮箱</div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-bold text-gray-700">密码</div>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="至少 6 位"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                </label>
              </div>

              {knownProfiles.length > 0 && mode === 'login' && (
                <div className="mt-5 rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 text-sm font-bold text-gray-900">本机已有账户</div>
                  <div className="space-y-2">
                    {knownProfiles.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          setEmail(profile.email);
                          setMessage(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left transition-colors hover:bg-purple-50"
                      >
                        <ProfileAvatar avatarId={profile.avatarId} size="sm" />
                        <div>
                          <div className="text-sm font-bold text-gray-800">{profile.displayName}</div>
                          <div className="text-xs text-gray-400">{profile.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {message && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{message}</div>}

              <button
                onClick={mode === 'login' ? handleLogin : handleRegister}
                disabled={busy}
                className="mt-5 w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-purple-200 transition-all hover:bg-purple-700 disabled:opacity-60"
              >
                {busy ? '处理中...' : mode === 'login' ? '登录账户' : '创建账户'}
              </button>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-4 rounded-[28px] border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
                <ProfileAvatar avatarId={avatarId} size="lg" />
                <div>
                  <div className="text-xl font-black text-gray-900">{liveSession.account.displayName}</div>
                  <div className="text-sm text-gray-500">{liveSession.account.email}</div>
                  <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-purple-500 shadow-sm">
                    已登录
                  </div>
                </div>
              </div>

              <div className="mb-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <label className="block">
                    <div className="mb-2 text-sm font-bold text-gray-700">昵称</div>
                    <input
                      value={displayName}
                      onChange={event => setDisplayName(event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                    />
                  </label>

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">绑定邮箱</div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">{liveSession.account.email}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-bold text-gray-700">头像</div>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setAvatarId(preset.id)}
                        className={`rounded-2xl border p-2 transition-all ${avatarId === preset.id ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                      >
                        <ProfileAvatar avatarId={preset.id} className="mx-auto" />
                        <div className="mt-2 text-[11px] font-bold text-gray-500">{preset.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {message && (
                <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-semibold ${message === '资料已保存' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {message}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={busy}
                  className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-200 transition-all hover:bg-purple-700 disabled:opacity-60"
                >
                  保存资料
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  删除本地账户
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileDialog;
