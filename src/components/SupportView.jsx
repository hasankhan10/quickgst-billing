import { useState, useEffect } from 'react';
import { ShieldCheck, Code, Wrench, Database, LifeBuoy, Smartphone, Check, Copy, Mail, Globe, Printer } from 'lucide-react';
import { toast } from './Toast';
import WhatsNew from './WhatsNew';
import ProblemLog from './ProblemLog';
import { SafePrivateSection } from './SafePrivateNote';

const EMAIL = 'support@stovamedia.com';
const SITE = 'https://stovamedia.com';

const SERVICES = [
  { icon: Printer, title: 'POS & Thermal Setup', text: '58mm/80mm thermal receipt printer and barcode scanner configuration.' },
  { icon: Database, title: 'Data Migration & Setup', text: 'Assisted installation, moving client & product data from Tally or Excel.' },
  { icon: Wrench, title: 'Custom Bill Templates', text: 'Tailored invoice formats, logo placement, and branded company stationery.' },
  { icon: LifeBuoy, title: 'Annual Support (AMC)', text: 'Priority phone and AnyDesk support for zero downtime during billing.' },
  { icon: Code, title: 'Custom Software & Features', text: 'Custom business management software and web tools designed for your workflow.' },
  { icon: Smartphone, title: 'E-commerce & Mobile Apps', text: 'Custom customer-facing apps and business websites by Stova Media.' },
];

export default function SupportView() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(`Support: ${EMAIL}`, 'info', 4000);
    }
  };

  const card = { padding: '1.25rem 1.5rem' };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support &amp; About</h1>
          <p className="page-subtitle">QuickGST Billing — Professional Edition built by Stova Media</p>
        </div>
      </div>

      <div className="glass-panel" style={{ ...card, marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <ShieldCheck size={32} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>100% Offline, Secure &amp; Subscription-Free</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '75ch' }}>
            QuickGST Billing is built for Indian retail shops, traders, and MSMEs. All data remains strictly
            on this computer with zero cloud leaks, zero monthly fees, and full GST compliance (GSTR-1, GSTR-3B, E-Way Bill).
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ ...card, marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>Business Services &amp; Enterprise Support</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Need specialized customization, hardware setup, or on-site support? Stova Media provides end-to-end technical assistance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {SERVICES.map((s) => (
            <div key={s.title} style={{ display: 'flex', gap: '0.75rem', padding: '0.9rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
              <s.icon size={22} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.45 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={copyEmail} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {copied ? <><Check size={16} /> Copied Email</> : <><Copy size={16} /> Contact Support ({EMAIL})</>}
          </button>
          <a className="btn btn-secondary" href={`mailto:${EMAIL}?subject=${encodeURIComponent('QuickGST Support & Setup Enquiry')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Mail size={16} /> Send Email
          </a>
          <a className="btn btn-secondary" href={SITE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={16} /> Stova Media
          </a>
        </div>
      </div>

      <SafePrivateSection style={{ marginBottom: '1.25rem' }} />
      <WhatsNew />
      <ProblemLog />
    </div>
  );
}
