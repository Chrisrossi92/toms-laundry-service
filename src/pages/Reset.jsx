import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Reset() {
  const nav = useNavigate();
  const [ok, setOk] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');

  // Capture tokens from the hash and set the session
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1)); // after '#'
    const type = h.get('type');
    const at = h.get('access_token');
    const rt = h.get('refresh_token');
    if (type === 'recovery' && at && rt) {
      supabase.auth.setSession({ access_token: at, refresh_token: rt })
        .then(({ error }) => {
          if (error) setMsg(error.message);
          else setOk(true);
        });
    } else {
      setMsg('Reset link is invalid or expired.');
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (pw1.length < 8) return setMsg('Password must be at least 8 characters.');
    if (pw1 !== pw2)   return setMsg('Passwords do not match.');
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) setMsg(error.message);
    else {
      setMsg('Password updated. Redirecting…');
      setTimeout(() => nav('/account'), 800);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
      <p className="mt-2 text-sm text-gray-200">
        {ok ? 'Enter a new password for your account.' : 'Preparing reset form…'}
      </p>
      {msg && <div className="mt-3 rounded bg-white/10 p-3 text-sm text-red-200">{msg}</div>}
      {ok && (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded px-3 py-2"
            onChange={e => setPw1(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm password"
            className="w-full rounded px-3 py-2"
            onChange={e => setPw2(e.target.value)}
          />
          <button type="submit" className="rounded bg-white px-4 py-2 font-medium text-black">
            Update password
          </button>
        </form>
      )}
    </div>
  );
}
