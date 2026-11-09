import { useEffect, useState } from 'react';

export default function AppFooter() {
  const [version, setVersion] = useState('');
  useEffect(() => {
    let live = true;
    fetch('/api/version').then((r) => r.json()).then((d) => { if (live && d?.current) setVersion(d.current); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return (
    <footer style={{
      marginTop: 'auto', paddingTop: '1.5rem',
      textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'center',
        padding: '0.3rem 0.85rem', borderRadius: 999, background: 'var(--card-bg)', border: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}>
        <span>QuickGST Billing{version ? ` v${version}` : ''}</span>
        <span aria-hidden="true">·</span>
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Built by Stova Media</span>
      </span>
    </footer>
  );
}
