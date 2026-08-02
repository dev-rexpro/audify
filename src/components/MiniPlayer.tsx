import { useRef, useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Play, Pause, SkipForward, Music } from 'lucide-react';

export default function MiniPlayer() {
  const { state, openFullPlayer, togglePlayPause, playNext } = useMusicPlayer();
  const miniPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = miniPlayerRef.current;
    if (!el) return;
    const open = () => openFullPlayer();
    el.addEventListener('click', open);
    return () => el.removeEventListener('click', open);
  }, [openFullPlayer]);

  if (!state.currentTrack) {
    return (
      <div ref={miniPlayerRef} id="miniPlayer" className="mini-player">
        <div className="mini-player-thumb">
          <Music size={24} className="text-gray-400" id="miniAlbumIcon" style={{ display: 'inline-flex' }} />
        </div>
        <div className="mini-player-info">
          <div className="mini-player-title" id="miniTitle">Not Playing</div>
          <div className="mini-player-artist" id="miniArtist">Select music to start</div>
        </div>
        <div className="mini-player-controls">
          <button id="mini-play-btn" className="mini-control-btn" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
            <svg viewBox="0 0 24 24" fill="#000000" style={{ width: '24px', height: '24px' }}><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button className="mini-control-btn" onClick={(e) => { e.stopPropagation(); playNext('next'); }}>
            <svg viewBox="0 0 24 24" fill="#000000" style={{ width: '22px', height: '22px' }}><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={miniPlayerRef} id="miniPlayer" className="mini-player">
      <div className="mini-player-thumb">
        {state.currentTrack.cover ? (
          <img src={state.currentTrack.cover} alt="Album Art" id="miniAlbumArt" style={{ display: 'block' }} />
        ) : (
          <Music size={24} className="text-gray-400" id="miniAlbumIcon" style={{ display: 'inline-flex' }} />
        )}
      </div>
      <div className="mini-player-info">
        <div className="mini-player-title" id="miniTitle">{state.currentTrack.title || 'Unknown'}</div>
        <div className="mini-player-artist" id="miniArtist">{state.currentTrack.artist || 'Unknown'}</div>
      </div>
      <div className="mini-player-controls">
        <button id="mini-play-btn" className="mini-control-btn" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
          {state.isPlaying ? (
            <svg viewBox="0 0 24 24" fill="#000000" style={{ width: '24px', height: '24px' }}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="#000000" style={{ width: '24px', height: '24px' }}><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <button className="mini-control-btn" onClick={(e) => { e.stopPropagation(); playNext('next'); }}>
          <svg viewBox="0 0 24 24" fill="#000000" style={{ width: '22px', height: '22px' }}><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
        </button>
      </div>
    </div>
  );
}
