import { useMusicPlayer } from '../context/MusicPlayerContext';
import { X } from 'lucide-react';

export default function ProviderModal() {
  const { state, setEnabledSources, showProviderModal, closeProviderModal } = useMusicPlayer();

  if (!showProviderModal) return null;

  const sources = [
    { key: 'qq', label: 'QQ Music' },
    { key: 'joox', label: 'JOOX' },
    { key: 'netease', label: 'Netease' },
    { key: 'kuwo', label: 'Kuwo' }
  ];

  return (
    <div id="provider-modal" className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) closeProviderModal(); }}>
      <div className="modal" style={{ maxWidth: '340px', width: '90%' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Search Providers</span>
          </div>
          <button id="provider-close" className="modal-close-btn" onClick={closeProviderModal}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Select active music sources for search.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {sources.map(src => (
            <label key={src.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
              <input
                type="checkbox"
                data-source={src.key}
                checked={state.enabledSources[src.key] ?? true}
                onChange={e => setEnabledSources({ ...state.enabledSources, [src.key]: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', margin: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '15px', fontWeight: 500, userSelect: 'none' }}>{src.label}</span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={closeProviderModal} style={{ width: '100%' }}>Done</button>
        </div>
      </div>
    </div>
  );
}
