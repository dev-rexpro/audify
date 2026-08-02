import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ShortcutModal() {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btn = document.getElementById('shortcut-toggle-btn');
    const modal = modalRef.current;
    if (!btn || !modal) return;
    const open = () => modal.classList.add('show');
    const close = () => modal.classList.remove('show');
    btn.addEventListener('click', open);
    modal.addEventListener('click', (e: any) => { if (e.target === modal) close(); });
    return () => {
      btn.removeEventListener('click', open);
      modal.removeEventListener('click', close);
    };
  }, []);

  return (
    <div id="shortcut-modal" ref={modalRef} className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Keyboard Shortcuts</span>
          </div>
          <button id="shortcut-close" className="modal-close-btn"><X size={18} strokeWidth={1.8} /></button>
        </div>
        <div className="shortcut-grid">
          <div className="shortcut-card"><span className="shortcut-label">Play / Pause</span><kbd>Space</kbd></div>
          <div className="shortcut-card"><span className="shortcut-label">Seek 5s</span><kbd>← / →</kbd></div>
          <div className="shortcut-card"><span className="shortcut-label">Volume</span><kbd>↑ / ↓</kbd></div>
          <div className="shortcut-card"><span className="shortcut-label">Next / Prev</span><kbd>N / P</kbd></div>
          <div className="shortcut-card"><span className="shortcut-label">Favorite</span><kbd>F</kbd></div>
          <div className="shortcut-card"><span className="shortcut-label">Mute</span><kbd>M</kbd></div>
        </div>
      </div>
    </div>
  );
}
