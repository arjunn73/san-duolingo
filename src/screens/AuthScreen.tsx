import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { BookOpen, Sparkles } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-parchment to-saffron-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-bounce-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-lg shadow-saffron-500/30 mb-4">
            <span className="font-devanagari text-4xl font-bold text-white">सं</span>
          </div>
          <h1 className="text-3xl font-extrabold text-saffron-900">Sanskrit Path</h1>
          <p className="text-saffron-600 mt-2 text-sm font-medium">
            Learn Sanskrit from the ground up
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-saffron-900/5 p-8 border border-saffron-100">
          <div className="flex gap-2 mb-6 p-1 bg-saffron-50 rounded-2xl">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-saffron-700 shadow-sm'
                  : 'text-saffron-400 hover:text-saffron-600'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-white text-saffron-700 shadow-sm'
                  : 'text-saffron-400 hover:text-saffron-600'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-saffron-900 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-saffron-100 focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-saffron-900 placeholder-saffron-300"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-saffron-900 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-saffron-100 focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none transition-all text-saffron-900 placeholder-saffron-300"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="bg-error-50 text-error-700 text-sm font-medium px-4 py-3 rounded-xl animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-white font-bold text-sm shadow-lg shadow-saffron-500/30 hover:shadow-lg hover:shadow-saffron-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-saffron-400">
            <div className="flex-1 h-px bg-saffron-100" />
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Progress saved across devices
            </span>
            <div className="flex-1 h-px bg-saffron-100" />
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-saffron-400 flex items-center justify-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          Devanagari · Maheshwar Sutras · Pratyahar
        </p>
      </div>
    </div>
  );
}
