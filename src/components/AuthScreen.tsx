import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Lock, ShieldCheck, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Staff } from '../types';

interface AuthScreenProps {
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  onLogin: (user: Staff) => void;
  addLog: (message: string, type: 'info' | 'success' | 'error') => void;
}

export default function AuthScreen({ staff, setStaff, onLogin, addLog }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Senior Travel Consultant');
  const [avatarColor, setAvatarColor] = useState('bg-teal-500');
  const [error, setError] = useState<string | null>(null);

  const colors = [
    { value: 'bg-teal-500', name: 'Teal' },
    { value: 'bg-indigo-500', name: 'Indigo' },
    { value: 'bg-emerald-500', name: 'Emerald' },
    { value: 'bg-amber-500', name: 'Amber' },
    { value: 'bg-pink-500', name: 'Pink' },
    { value: 'bg-violet-500', name: 'Violet' }
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = staff.find(s => s.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      setError('No user account found with this email.');
      return;
    }

    // Checking password (default initial accounts use 'password123')
    if (user.password && user.password !== password) {
      setError('Incorrect password. (Initial accounts default to "password123")');
      return;
    }

    addLog(`[Auth] User "${user.name}" successfully logged in.`, 'success');
    onLogin(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    // Check if email already exists
    const exists = staff.some(s => s.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      setError('An account with this email already exists.');
      return;
    }

    // Generate new ID
    const newId = `st_00${staff.length + 1}`;
    const newStaff: Staff = {
      id: newId,
      name: name.trim(),
      role: role.trim(),
      email: email.trim().toLowerCase(),
      avatarColor,
      activeLeadsCount: 0,
      password: password
    };

    setStaff(prev => [...prev, newStaff]);
    addLog(`[Auth] Registered new user account for "${newStaff.name}" (${newStaff.role})`, 'success');
    onLogin(newStaff);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Main Container */}
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md relative">
        
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-xl mb-4 shadow">
            <ShieldCheck className="h-7 w-7 text-teal-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">South Indian Holidays</h2>
          <p className="text-xs text-slate-400 mt-1">Travel CRM & Lead Routing Console</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-6 text-xs text-rose-400 flex items-start gap-2.5 animate-pulse text-left">
            <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Animate switches between login and signup */}
        <AnimatePresence mode="wait">
          {!isRegistering ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="specialist@southindianholidays.co.in"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Password</label>
                    <span className="text-[10px] text-slate-500 font-mono italic">Demo: password123</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-teal-500/10 transition-all uppercase tracking-wider font-mono text-xs text-center"
                >
                  Sign In
                </button>
              </form>

              {/* Quick Login Section */}
              {((import.meta as any).env?.DEV) && (
                <div className="border-t border-slate-900 pt-5 text-left">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold mb-3.5 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                    <span>One-Click Developer Sign-In</span>
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {staff.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          addLog(`[Auth] Developer Quick-Login as "${s.name}"`, 'success');
                          onLogin(s);
                        }}
                        className="p-2.5 bg-slate-950/60 border border-slate-900 rounded-xl hover:border-teal-500/40 hover:bg-slate-950 transition-all text-left flex items-center gap-2"
                      >
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${s.avatarColor}`}>
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="truncate text-left">
                          <div className="text-[10px] font-bold text-slate-200 truncate">{s.name}</div>
                          <div className="text-[8px] text-slate-500 truncate">{s.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Registration Toggle */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setIsRegistering(true)}
                  className="text-xs text-slate-400 hover:text-teal-400 font-medium transition-colors"
                >
                  Don't have an account? <span className="text-teal-400 font-semibold underline">Create User Account</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <form onSubmit={handleRegister} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@southindianholidays.co.in"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Specialized Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer"
                    >
                      <option value="Senior Travel Consultant">Senior Consultant</option>
                      <option value="Munnar Specialist">Munnar Specialist</option>
                      <option value="Kerala Houseboats Curator">Kerala Houseboats Expert</option>
                      <option value="Heritage & Wildlife Planner">Heritage Specialist</option>
                      <option value="Luxury Getaways Expert">Luxury Consultant</option>
                      <option value="CRM Account Admin">CRM Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 4 chars"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Avatar Color Choice */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Select Profile Accent Color</label>
                  <div className="flex gap-2.5">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setAvatarColor(c.value)}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${c.value} ${avatarColor === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-teal-500/10 transition-all uppercase tracking-wider font-mono text-xs text-center"
                >
                  Create & Login
                </button>
              </form>

              {/* Login Toggle */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-slate-400 hover:text-teal-400 font-medium transition-colors"
                >
                  Already have an account? <span className="text-teal-400 font-semibold underline">Sign In Here</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Security Architecture Limitation Documentation */}
      <div className="max-w-md w-full text-center mt-6 px-4">
        <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
          <span className="font-semibold text-slate-400">Security Architecture Note:</span> Consultant credentials and session states are securely tracked locally inside client-side browser storage (<code className="font-mono text-slate-400 bg-slate-950/40 px-1 py-0.5 rounded border border-slate-900">localStorage</code>) to enable fast offline mock authentication and session recovery. In full production builds, connect these to centralized identity providers (e.g., Firebase Auth or OAuth) as detailed in the architectural specifications.
        </p>
      </div>
    </div>
  );
}
