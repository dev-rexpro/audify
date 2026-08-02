import { useState, useRef, useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Star, MoreHorizontal, Quote, ListMusic, Music as MusicIcon, Shuffle, Repeat, Infinity, Sliders, Play, Pause, SkipBack, SkipForward, Volume1, Volume2, Menu, Plus, Download, PlusCircle, Disc3, Airplay } from 'lucide-react';

export default function FullPlayer() {
  const {
    state,
    toggleFavoriteCurrent,
    handleDownloadCurrent,
    toggleIntegratedLyrics,
    toggleQueueMode,
    togglePlayMode,
    playNext,
    togglePlayPause,
    playFromList,
    clearQueueTracks,
    addToQueue
  } = useMusicPlayer();

  const [showOptions, setShowOptions] = useState(false);
  const [isLyricsActive, setIsLyricsActive] = useState(false);
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const fullPlayerRef = useRef<HTMLDivElement>(null);

  const handleToggleLyrics = () => {
    setIsLyricsActive(!isLyricsActive);
    toggleIntegratedLyrics();
  };

  const handleToggleQueue = () => {
    setIsQueueActive(!isQueueActive);
    toggleQueueMode();
  };

  useEffect(() => {
    const fp = fullPlayerRef.current;
    if (!fp) return;
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.progress-bar-wrapper') || target.closest('.volume-slider') || target.closest('.integrated-lyrics-container') || target.closest('.integrated-queue-container')) return;
      startY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!startY) return;
      const currentY = e.touches[0].clientY;
      if (currentY - startY > 60) {
        fp.classList.remove('active', 'lyrics-mode-active', 'queue-mode-active');
        setIsLyricsActive(false);
        setIsQueueActive(false);
        startY = 0;
      }
    };
    fp.addEventListener('touchstart', handleTouchStart, { passive: true });
    fp.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      fp.removeEventListener('touchstart', handleTouchStart);
      fp.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const r = (e.clientX - rect.left) / rect.width;
    const audio = document.getElementById('audio') as HTMLAudioElement;
    if (audio) {
      const dur = audio.duration || 0;
      audio.currentTime = Math.max(0, Math.min(dur, dur * r));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const audio = document.getElementById('audio') as HTMLAudioElement;
    if (audio) audio.volume = val;
  };

  const getActiveList = () => {
    const tp = state.playContext.type;
    if (tp === 'results') return state.searchResults;
    if (tp === 'favorites') return state.favorites;
    if (tp === 'local') return state.localTracks;
    const pl = state.playlists.find(p => p.id === state.playContext.playlistId);
    return pl ? pl.tracks : [];
  };

  const autoplayList = getActiveList().slice(Math.max(0, state.playContext.index + 1));

  return (
    <div ref={fullPlayerRef} id="fullPlayer" className="full-player">
      <div className="player-top-header" onClick={() => fullPlayerRef.current?.classList.remove('active')}>
        <div className="player-grabber-pill"></div>
      </div>

      <div className="full-player-content" id="fullPlayerContent">
        <div className="full-header-area" id="fullHeaderArea">
          <div className="full-album-art" id="fullAlbumArt">
            {state.currentTrack?.cover ? (
              <img id="full-cover-img" src={state.currentTrack.cover} alt="cover" style={{ display: 'block' }} />
            ) : (
              <div className="cover-placeholder" id="full-cover-placeholder" style={{ display: 'flex' }}>
                <MusicIcon size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              </div>
            )}
          </div>

          <div className="full-track-meta" id="fullTrackMeta">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="full-track-title" id="full-track-title">{state.currentTrack?.title || 'No Track Selected'}</div>
              <div className="full-track-artist" id="full-track-artist">{state.currentTrack?.artist || 'Select music to start'}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0, position: 'relative' }}>
              <button id="fav-btn" className={`player-circular-btn ${state.favorites.some(f => f.uid === state.currentTrack?.uid) ? 'btn-fav-active' : ''}`} onClick={toggleFavoriteCurrent} title="Favorite">
                <Star size={18} strokeWidth={1.8} />
              </button>
              <button id="download-btn" className="player-circular-btn" onClick={() => setShowOptions(!showOptions)} title="Options">
                <MoreHorizontal size={18} strokeWidth={1.8} />
              </button>

              {showOptions && (
                <div id="track-options-popover" className="ios-popover-menu show" style={{ top: '44px', right: 0, transformOrigin: 'top right' }}>
                  <button id="context-download-btn" className="ios-popover-item" onClick={() => { handleDownloadCurrent(); setShowOptions(false); }}>
                    <Download size={18} />
                    <span id="context-download-text">{state.downloads.some(d => d.uid === state.currentTrack?.uid) ? 'Downloaded' : 'Download Song'}</span>
                  </button>
                  <button className="ios-popover-item" onClick={() => { if (state.currentTrack) addToQueue(state.currentTrack); setShowOptions(false); }}>
                    <PlusCircle size={18} />
                    <span>Add to Queue</span>
                  </button>
                  <button className="ios-popover-item" onClick={() => { toggleFavoriteCurrent(); setShowOptions(false); }}>
                    <Star size={18} strokeWidth={1.8} />
                    <span>Favorite Track</span>
                  </button>
                  <button className="ios-popover-item" onClick={() => { handleToggleQueue(); setShowOptions(false); }}>
                    <ListMusic size={18} />
                    <span>Show Queue</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="integrated-lyrics-container" id="integratedLyricsContainer">
          <div id="integrated-lyrics-inner">
            {state.lyricLines.length === 0 ? (
              <div className="integrated-lyric-line">No lyrics available</div>
            ) : (
              state.lyricLines.map((ln, i) => (
                <div key={i} className={`integrated-lyric-line ${state.currentLyricIndex === i ? 'active' : ''}`} data-index={i}>
                  {ln.text}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="integrated-queue-container" id="integratedQueueContainer">
          <div className="queue-pills-row">
            <button id="full-shuffle-btn" className={`queue-pill-btn ${state.playMode === 'shuffle' ? 'active' : ''}`} onClick={() => togglePlayMode('shuffle')} title="Shuffle"><Shuffle size={18} /></button>
            <button id="full-repeat-btn" className={`queue-pill-btn ${state.playMode === 'single' || state.playMode === 'list' ? 'active' : ''}`} onClick={() => togglePlayMode(state.playMode === 'list' ? 'single' : 'list')} title="Repeat"><Repeat size={18} /></button>
            <button id="full-autoplay-btn" className="queue-pill-btn active" title="AutoPlay"><Infinity size={18} /></button>
            <button id="full-mixing-btn" className="queue-pill-btn" title="Audio Options"><Sliders size={18} /></button>
          </div>

          <div className="queue-section-header">
            <span className="queue-title">Queue</span>
            <button className="queue-clear-btn" onClick={clearQueueTracks}>Clear</button>
          </div>

          <div id="integrated-queue-list" className="integrated-queue-list">
            {state.queue.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', padding: '10px 0', fontWeight: 500 }}>No manually queued songs</div>
            ) : (
              state.queue.map((track, i) => (
                <div key={track.uid + '-q-' + i} className="queue-item">
                  <div className="queue-item-thumb">
                    {track.cover ? <img src={track.cover} alt="" /> : <MusicIcon size={20} color="white" />}
                  </div>
                  <div className="queue-item-info">
                    <div className="queue-item-title">{track.title || 'Unknown Track'}</div>
                    <div className="queue-item-artist">{track.artist || 'Unknown Artist'}</div>
                  </div>
                  <div className="queue-item-drag"><Menu size={18} /></div>
                </div>
              ))
            )}
          </div>

          <div className="queue-section-header" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="queue-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Infinity size={16} /> AutoPlay
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 400, marginTop: '2px' }}>Similar music will keep playing</span>
            </div>
          </div>

          <div id="integrated-autoplay-list" className="integrated-queue-list">
            {autoplayList.map((track, idx) => (
              <div key={track.uid + '-ap-' + idx} className="queue-item" onClick={() => playFromList(state.playContext.type, state.playContext.index + 1 + idx, state.playContext.playlistId)}>
                <div className="queue-item-thumb">
                  {track.cover ? <img src={track.cover} alt="" /> : <MusicIcon size={20} color="white" />}
                </div>
                <div className="queue-item-info">
                  <div className="queue-item-title">{track.title || 'Unknown Track'}</div>
                  <div className="queue-item-artist">{track.artist || 'Unknown Artist'}</div>
                </div>
                <div className="queue-item-drag"><Menu size={18} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="full-bottom-controls">
          <div className="full-progress-container">
            <div id="progress-bar-wrapper" className="progress-bar-wrapper" onClick={handleProgressClick}>
              <div className="progress-bar" id="progress-bar"></div>
              <div className="progress-handle" id="progress-handle"></div>
            </div>
            <div className="progress-row-info">
              <span id="current-time">0:00</span>
              <div className="audio-format-badge">
                <Disc3 size={12} />
                <span id="full-audio-format">{state.currentTrack?.qualityLabel || 'Dolby Atmos'}</span>
              </div>
              <span id="total-time">-0:00</span>
            </div>
          </div>

          <div className="full-controls-main">
            <button id="prev-btn" className="control-skip-btn" onClick={() => playNext('prev')} title="Previous">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
            </button>
            <button id="play-btn" className="play-btn-large-solid" onClick={togglePlayPause} title="Play / Pause">
              {state.isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button id="next-btn" className="control-skip-btn" onClick={() => playNext('next')} title="Next">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
            </button>
          </div>

          <div className="full-volume-row">
            <Volume1 size={16} color="rgba(255,255,255,0.6)" />
            <input
              id="volume-slider"
              className="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume * 100}%, rgba(255, 255, 255, 0.25) ${volume * 100}%, rgba(255, 255, 255, 0.25) 100%)`
              }}
              onChange={handleVolumeChange}
            />
            <Volume2 size={18} color="rgba(255,255,255,0.6)" />
          </div>

          <div className="full-actions-row">
            <button className={`bottom-action-icon-btn ${isLyricsActive ? 'active' : ''}`} id="lyrics-toggle-btn" onClick={handleToggleLyrics} title="Lyrics">
              <Quote size={22} strokeWidth={1.8} />
            </button>
            <button className="bottom-action-icon-btn" title="AirPlay / Audio Output">
              <Airplay size={22} strokeWidth={1.8} />
            </button>
            <button className={`bottom-action-icon-btn ${isQueueActive ? 'queue-active active' : ''}`} id="queue-toggle-btn" onClick={handleToggleQueue} title="Queue / Up Next">
              <ListMusic size={22} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
