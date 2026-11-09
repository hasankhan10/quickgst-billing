import { useState } from 'react';
import { KeyRound, Copy, Check, ShieldCheck, AlertTriangle, MessageCircle, X } from 'lucide-react';
import { toast } from './Toast';

export default function LicenseModal({ licenseStatus, onRefresh, onClose, forceOpen }) {
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { machineId, licensed, isTrial, daysLeft } = licenseStatus || {};

  const copyMachineId = async () => {
    try {
      await navigator.clipboard.writeText(machineId || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('Machine ID copied to clipboard!', 'success');
    } catch {
      toast(`Machine ID: ${machineId}`, 'info');
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      toast('Please enter a license key', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast('🎉 QuickGST Billing activated successfully!', 'success');
        if (onRefresh) onRefresh();
        if (onClose) onClose();
      } else {
        toast(data.error || 'Invalid license key', 'error');
      }
    } catch {
      toast('Failed to reach server. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const waMessage = encodeURIComponent(`Hello Stova Media, I want to activate QuickGST Billing Lifetime License for my Machine ID: ${machineId}`);

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '14px', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: licensed ? '#dcfce7' : '#eff6ff', padding: '8px', borderRadius: '10px', color: licensed ? '#16a34a' : '#2563eb' }}>
              <KeyRound size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Software License</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>QuickGST Billing · Stova Media</p>
            </div>
          </div>
          {!forceOpen && onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Current status pill */}
        <div style={{
          padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
          background: licensed ? '#f0fdf4' : isTrial ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${licensed ? '#bbf7d0' : isTrial ? '#fde68a' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          {licensed ? (
            <>
              <ShieldCheck size={24} style={{ color: '#16a34a', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#166534', fontSize: '0.9rem' }}>Lifetime Pro License Active</strong>
                <div style={{ fontSize: '0.78rem', color: '#15803d' }}>This machine is fully unlocked for unlimited billing.</div>
              </div>
            </>
          ) : isTrial ? (
            <>
              <AlertTriangle size={24} style={{ color: '#d97706', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#92400e', fontSize: '0.9rem' }}>Trial Mode Active ({daysLeft} days remaining)</strong>
                <div style={{ fontSize: '0.78rem', color: '#b45309' }}>Activate with a license key anytime to unlock lifetime access.</div>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#991b1b', fontSize: '0.9rem' }}>Trial Expired - Activation Required</strong>
                <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>Please enter your activation key to continue creating invoices.</div>
              </div>
            </>
          )}
        </div>

        {/* Machine ID box */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            YOUR MACHINE ID:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={machineId || 'Detecting...'}
              style={{
                flex: 1, padding: '0.6rem 0.85rem', fontFamily: 'monospace', fontWeight: 700,
                fontSize: '1.05rem', letterSpacing: '1px', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--primary)',
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={copyMachineId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <small style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Each license is tied to your computer's unique hardware identifier.
          </small>
        </div>

        {/* Activation Form */}
        {!licensed && (
          <form onSubmit={handleActivate} style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="license-key-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              ENTER LICENSE KEY:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="license-key-input"
                type="text"
                className="form-input"
                placeholder="QGST-XXXX-XXXX-XXXX"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
              />
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '100px' }}>
                {loading ? 'Verifying…' : 'Activate'}
              </button>
            </div>
          </form>
        )}

        {/* Contact to buy key */}
        {!licensed && (
          <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary)' }}>Need an activation key?</div>
            <div>Send your Machine ID to <strong>Stova Media</strong> via WhatsApp to receive your lifetime activation key.</div>
            <a
              href={`https://wa.me/?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
            >
              <MessageCircle size={15} /> Send Machine ID via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
