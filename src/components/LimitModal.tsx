import { useRef } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function LimitModal() {
  const { state, confirmLimitWheelSelection } = useMusicPlayer();
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const openLimitModal = () => {
    modalRef.current?.classList.add('show');
    setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const values = [5, 10, 20, 30, 50];
      const idx = values.indexOf(state.perSourceLimit);
      const activeIdx = idx >= 0 ? idx : 1;
      scroller.scrollTop = activeIdx * 44;
    }, 50);
  };

  const closeLimitModal = () => modalRef.current?.classList.remove('show');

  const confirm = () => {
    if (!scrollerRef.current) return;
    const center = scrollerRef.current.scrollTop + 110;
    let minDiff = Infinity;
    let closest = state.perSourceLimit;
    scrollerRef.current.querySelectorAll('.ios-wheel-item').forEach(item => {
      const top = (item as HTMLElement).offsetTop + 22;
      const diff = Math.abs(top - center);
      if (diff < minDiff) {
        minDiff = diff;
        closest = parseInt((item as HTMLElement).getAttribute('data-value') || '10', 10);
      }
    });
    confirmLimitWheelSelection(closest);
  };

  return (
    <div id="limit-modal" ref={modalRef} className="modal-backdrop">
      <div className="modal ios-wheel-modal">
        <div className="ios-wheel-header">
          <button className="ios-wheel-cancel-btn" onClick={closeLimitModal}>Cancel</button>
          <span className="ios-wheel-title">Limit per Source</span>
          <button className="ios-wheel-done-btn" onClick={confirm}>Done</button>
        </div>
        <div className="ios-wheel-wrapper">
          <div className="ios-wheel-lens"></div>
          <div className="ios-wheel-mask-top"></div>
          <div className="ios-wheel-mask-bottom"></div>
           <div ref={scrollerRef} id="limitWheelScroller" className="ios-wheel-scroller">
            <div className="ios-wheel-padding"></div>
            <div className="ios-wheel-padding"></div>
            {[5, 10, 20, 30, 50].map(v => (
              <div key={v} className={`ios-wheel-item ${state.perSourceLimit === v ? 'selected' : ''}`} data-value={v}>{v}</div>
            ))}
            <div className="ios-wheel-padding"></div>
            <div className="ios-wheel-padding"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
