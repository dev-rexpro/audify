import { useState, useRef, useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { usePlayerStore } from '../stores/playerStore';
import { Star, MoreHorizontal, Quote, ListMusic, Music as MusicIcon, Shuffle, Repeat, Infinity, Sliders, Menu, Plus, Download, PlusCircle, Disc3, Airplay, X, Volume1, Volume2, VolumeX, FolderPlus, Folder, ChevronRight, ChevronLeft } from 'lucide-react';
import AudioTunerModal from './AudioTunerModal';
import Visualizer from './Visualizer';
import atmosLogo from '../assets/atmos.svg';
import atmosIcon from '../assets/atmos-icon.svg';

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
    addToQueue,
    removeFromQueue,
    reorderQueue,
    addTrackToPlaylist
  } = useMusicPlayer();

  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const lyricLines = usePlayerStore(s => s.lyricLines);
  const currentLyricIndex = usePlayerStore(s => s.currentLyricIndex);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const spatialAudio = usePlayerStore(s => s.spatialAudio);
  const toggleMute = usePlayerStore(s => s.toggleMute);

  const [showOptions, setShowOptions] = useState(false);
  const [playlistSubMenu, setPlaylistSubMenu] = useState(false);
  const [isLyricsActive, setIsLyricsActive] = useState(false);
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const isDraggingProgressRef = useRef(false);
  const dragSeekTimeRef = useRef<number | null>(null);
  const fullPlayerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isDraggingProgress) return;
    const bar = document.getElementById('progress-bar');
    const handle = document.getElementById('progress-handle');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const dur = duration || 0;
    if (bar && dur > 0) {
      const percent = (currentTime / dur) * 100;
      bar.style.width = `${percent}%`;
    }
    if (handle && dur > 0) {
      handle.style.left = `${(currentTime / dur) * 100}%`;
    }
    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(currentTime);
    }
    if (totalTimeEl) {
      totalTimeEl.textContent = `-${formatTime(dur)}`;
    }
  }, [currentTime, duration, isDraggingProgress]);

  useEffect(() => {
    if (!lyricLines.length) return;
    let idx = -1;
    for (let i = 0; i < lyricLines.length; i++) {
      if (currentTime >= lyricLines[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    if (idx !== currentLyricIndex) {
      usePlayerStore.getState().setCurrentLyricIndex(idx);
    }
  }, [currentTime, lyricLines, currentLyricIndex]);

  useEffect(() => {
    if (currentLyricIndex < 0) return;
    const container = document.getElementById('integratedLyricsContainer');
    const activeEl = container?.querySelector(`.integrated-lyric-line[data-index="${currentLyricIndex}"]`);
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [currentLyricIndex]);

  const updateProgressUI = (clientX: number) => {
    const wrapper = document.getElementById('progress-bar-wrapper');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = usePlayerStore.getState().duration || 0;
    const seekTime = r * dur;
    dragSeekTimeRef.current = seekTime;

    const bar = document.getElementById('progress-bar');
    const handle = document.getElementById('progress-handle');
    const currentTimeEl = document.getElementById('current-time');

    if (bar) bar.style.width = `${r * 100}%`;
    if (handle) handle.style.left = `${r * 100}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(seekTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingProgressRef.current = true;
    setIsDraggingProgress(true);
    updateProgressUI(e.clientX);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingProgressRef.current) return;
      updateProgressUI(moveEv.clientX);
    };

    const onPointerUp = () => {
      if (!isDraggingProgressRef.current) return;
      isDraggingProgressRef.current = false;
      setIsDraggingProgress(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (dragSeekTimeRef.current !== null) {
        const audio = document.getElementById('audio') as HTMLAudioElement;
        if (audio) {
          audio.currentTime = dragSeekTimeRef.current;
        }
        usePlayerStore.getState().setCurrentTime(dragSeekTimeRef.current);
        dragSeekTimeRef.current = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    usePlayerStore.getState().setVolume(val);
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === toIndex) return;
    reorderQueue(fromIndex, toIndex);
    dragIndexRef.current = null;
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragIndex(null);
  };

  return (
    <div ref={fullPlayerRef} id="fullPlayer" className="full-player">
      <div className="full-player-backdrop">
        {state.currentTrack?.cover ? (
          <img src={state.currentTrack.cover} alt="" className="full-player-ambient-img" />
        ) : null}
        <div className="full-player-backdrop-overlay" />
      </div>

      <div className="full-player-hero">
        {state.currentTrack?.cover ? (
          <img src={state.currentTrack.cover} alt="" className="full-player-hero-img" />
        ) : null}
        <div className="full-player-hero-mask" />
      </div>

      <div className="player-top-header" onClick={() => fullPlayerRef.current?.classList.remove('active')}>
        <div className="player-grabber-pill"></div>
      </div>

      <div className="full-player-content" id="fullPlayerContent">
        <div className="full-header-area" id="fullHeaderArea" style={{ position: 'relative' }}>
          <div className="full-album-art" id="fullAlbumArt" style={{ position: 'relative', zIndex: 1 }}>
            {state.currentTrack?.cover ? (
              <img id="full-cover-img" src={state.currentTrack.cover} alt="cover" style={{ display: 'block' }} />
            ) : (
              <div className="cover-placeholder" id="full-cover-placeholder" style={{ display: 'flex' }}>
                <MusicIcon size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              </div>
            )}
            <Visualizer />
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
              <button id="download-btn" className="player-circular-btn" onClick={() => { setShowOptions(!showOptions); setPlaylistSubMenu(false); }} title="Options">
                <MoreHorizontal size={18} strokeWidth={1.8} />
              </button>

              {showOptions && (
                <div id="track-options-popover" className="ios-popover-menu show" style={{ top: '44px', right: 0, transformOrigin: 'top right' }}>
                  {playlistSubMenu ? (
                    <>
                      <button className="ios-popover-item" onClick={(e) => { e.stopPropagation(); setPlaylistSubMenu(false); }}>
                         <ChevronLeft size={16} /> <span>Back</span>
                      </button>
                      <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '4px 0' }} />
                      {state.playlists.filter(p => !p.isSystem).length === 0 ? (
                         <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>No custom playlists</div>
                      ) : (
                         state.playlists.filter(p => !p.isSystem).map(pl => (
                           <button key={pl.id} className="ios-popover-item" onClick={(e) => { e.stopPropagation(); if(state.currentTrack) addTrackToPlaylist(pl.id, state.currentTrack); setShowOptions(false); setPlaylistSubMenu(false); }}>
                              <Folder size={16} /> <span>{pl.name}</span>
                           </button>
                         ))
                      )}
                    </>
                  ) : (
                    <>
                      <button id="context-download-btn" className="ios-popover-item" onClick={() => { handleDownloadCurrent(); setShowOptions(false); }}>
                        <Download size={18} />
                        <span id="context-download-text">{state.downloads.some(d => d.uid === state.currentTrack?.uid) ? 'Downloaded' : 'Download Song'}</span>
                      </button>
                      <button className="ios-popover-item" onClick={() => { if (state.currentTrack) addToQueue(state.currentTrack); setShowOptions(false); }}>
                        <PlusCircle size={18} />
                        <span>Add to Queue</span>
                      </button>
                      <button className="ios-popover-item" onClick={(e) => { e.stopPropagation(); setPlaylistSubMenu(true); }}>
                        <FolderPlus size={18} />
                        <span>Add to Playlist</span>
                        <ChevronRight size={14} style={{ marginLeft: 'auto', marginRight: '-4px', color: 'var(--text-secondary)' }} />
                      </button>
                      <button className="ios-popover-item" onClick={() => { toggleFavoriteCurrent(); setShowOptions(false); }}>
                        <Star size={18} strokeWidth={1.8} />
                        <span>Favorite Track</span>
                      </button>
                      <button className="ios-popover-item" onClick={() => { handleToggleQueue(); setShowOptions(false); }}>
                        <ListMusic size={18} />
                        <span>Show Queue</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="integrated-lyrics-container" id="integratedLyricsContainer">
          <div id="integrated-lyrics-inner">
            {lyricLines.length === 0 ? (
              <div className="integrated-lyric-line">No lyrics available</div>
            ) : (
              lyricLines.map((ln, i) => (
                <div key={i} className={`integrated-lyric-line ${currentLyricIndex === i ? 'active' : ''}`} data-index={i}>
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
            <button id="full-mixing-btn" className="queue-pill-btn" title="Audio Options" onClick={() => setIsTunerOpen(true)}><Sliders size={18} /></button>
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
                <div
                  key={track.uid + '-q-' + i}
                  className={`queue-item ${dragIndex === i ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="queue-item-thumb">
                    {track.cover ? <img src={track.cover} alt="" /> : <MusicIcon size={20} color="white" />}
                  </div>
                  <div className="queue-item-info">
                    <div className="queue-item-title">{track.title || 'Unknown Track'}</div>
                    <div className="queue-item-artist">{track.artist || 'Unknown Artist'}</div>
                  </div>
                  <div className="queue-item-actions">
                    <button className="queue-item-remove" onClick={(e) => { e.stopPropagation(); removeFromQueue(track.uid); }} title="Remove">
                      <X size={16} />
                    </button>
                    <div className="queue-item-drag" title="Drag to reorder"><Menu size={18} /></div>
                  </div>
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
            <div
              ref={progressRef}
              id="progress-bar-wrapper"
              className={`progress-bar-wrapper ${isDraggingProgress ? 'dragging' : ''}`}
              onPointerDown={handlePointerDown}
            >
              <div className="progress-bar" id="progress-bar"></div>
              <div className="progress-handle" id="progress-handle"></div>
            </div>
            <div className="progress-row-info">
              <span id="current-time">0:00</span>
              <div className="audio-format-badge" style={{ opacity: spatialAudio ? 1 : 0.3, transition: 'opacity 0.2s', filter: spatialAudio ? 'none' : 'grayscale(100%)' }}>
                <img src={atmosLogo} alt="Dolby Atmos" style={{ height: '14px', filter: 'brightness(0) invert(1)' }} />
              </div>
              <span id="total-time">-0:00</span>
            </div>
          </div>

          <div className="full-controls-main">
            <button id="prev-btn" className="control-skip-btn" onClick={() => playNext('prev')} title="Previous" aria-label="Previous track">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
            </button>
            <button id="play-btn" className="play-btn-large-solid" onClick={togglePlayPause} title="Play / Pause" aria-label={state.isPlaying ? 'Pause' : 'Play'}>
              {state.isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button id="next-btn" className="control-skip-btn" onClick={() => playNext('next')} title="Next" aria-label="Next track">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
            </button>
          </div>

          <div className="full-volume-row">
            <button 
              onClick={toggleMute} 
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={16} color="rgba(255,255,255,0.6)" /> : <Volume1 size={16} color="rgba(255,255,255,0.6)" />}
            </button>
            <input
              id="volume-slider"
              className="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.25) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.25) 100%)`
              }}
              onChange={handleVolumeChange}
              aria-label="Volume"
            />
            <Volume2 size={18} color="rgba(255,255,255,0.6)" />
          </div>

          <div className="full-actions-row">
            <button className={`bottom-action-icon-btn ${isLyricsActive ? 'active' : ''}`} id="lyrics-toggle-btn" onClick={handleToggleLyrics} title="Lyrics" aria-label="Lyrics">
              <Quote size={22} strokeWidth={1.8} />
            </button>
            <button className={`bottom-action-icon-btn ${isTunerOpen ? 'active' : ''}`} title="Audio Tuner / Dolby Atmos" aria-label="Audio Tuner" onClick={() => setIsTunerOpen(true)}>
              <img src={atmosIcon} alt="Atmos" style={{ height: '20px', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
            </button>
            <button className={`bottom-action-icon-btn ${isQueueActive ? 'queue-active active' : ''}`} id="queue-toggle-btn" onClick={handleToggleQueue} title="Queue / Up Next" aria-label="Queue / Up Next">
              <ListMusic size={22} strokeWidth={1.8} />
            </button>
          </div>
        </div>
        <AudioTunerModal isOpen={isTunerOpen} onClose={() => setIsTunerOpen(false)} />
      </div>
    </div>
  );
}
