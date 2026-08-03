import React from 'react';
import { X } from 'lucide-react';
import atmosIcon from '../assets/atmos-icon.svg';
import { usePlayerStore } from '../stores/playerStore';

interface AudioTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AudioTunerModal({ isOpen, onClose }: AudioTunerModalProps) {
  const { eqBands, setEqBands, spatialAudio, toggleSpatialAudio } = usePlayerStore();

  if (!isOpen) return null;

  const freqs = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

  const handleSliderChange = (index: number, value: number) => {
    const newBands = [...eqBands];
    newBands[index] = value;
    setEqBands(newBands);
  };

  const handlePreset = (type: 'flat' | 'bass' | 'acoustic' | 'electronic' | 'rock' | 'vocal' | 'classical' | 'dance') => {
    if (type === 'flat') setEqBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    if (type === 'bass') setEqBands([6, 5, 3, 1, 0, 0, 0, 0, 0, 0]);
    if (type === 'acoustic') setEqBands([4, 3, 1, 0, 1, 2, 4, 5, 3, 2]);
    if (type === 'electronic') setEqBands([5, 4, 1, 0, -1, 2, 4, 5, 4, 3]);
    if (type === 'rock') setEqBands([4, 3, 0, -1, -2, 1, 3, 4, 3, 2]);
    if (type === 'vocal') setEqBands([-2, -1, 0, 2, 4, 4, 3, 1, 0, -1]);
    if (type === 'classical') setEqBands([4, 3, 2, 0, -1, 0, 2, 3, 4, 4]);
    if (type === 'dance') setEqBands([6, 4, 2, 0, 0, -1, -1, 1, 3, 4]);
  };

  return (
    <div className="modal-backdrop show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '400px', width: '90%', background: 'var(--bg-card, #ffffff)', color: 'var(--text-primary)' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Audio Tuner</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        
        {/* Spatial Audio Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', margin: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={atmosIcon} alt="Atmos" style={{ height: '24px', opacity: spatialAudio ? 1 : 0.4, transition: 'opacity 0.2s', filter: spatialAudio ? 'none' : 'grayscale(100%)' }} />
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Dolby Atmos</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
            <input 
              type="checkbox" 
              checked={spatialAudio} 
              onChange={toggleSpatialAudio} 
              style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
            />
            <div style={{
              width: '42px', height: '24px', background: spatialAudio ? 'var(--accent)' : 'var(--bg-secondary)', 
              borderRadius: '12px', position: 'relative', transition: 'background 0.2s'
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: spatialAudio ? '20px' : '2px',
                width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s'
              }} />
            </div>
          </label>
        </div>

        {/* Equalizer */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', width: '100%' }}>Equalizer</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => handlePreset('flat')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Flat</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('bass')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Bass</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('acoustic')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Acoustic</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('electronic')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Electronic</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('rock')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Rock</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('vocal')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Vocal</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('classical')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Classical</button>
              <button className="btn btn-ghost" onClick={() => handlePreset('dance')} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Dance</button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', padding: '10px 0' }}>
            {eqBands.map((val, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%' }}>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={val}
                  onChange={(e) => handleSliderChange(i, parseFloat(e.target.value))}
                  style={{ 
                    writingMode: 'vertical-lr', 
                    WebkitAppearance: 'slider-vertical',
                    width: '12px',
                    height: '100px',
                    margin: 0,
                    accentColor: 'var(--accent)'
                  }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{freqs[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn" onClick={onClose} style={{ width: '100%' }}>Done</button>
        </div>
      </div>
    </div>
  );
}
