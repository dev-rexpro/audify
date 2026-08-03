import { useRef, useEffect, useState, Fragment } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import type { Track } from '../stores/types';
import { Play, Star, ListPlus, FolderPlus, Download, ChevronRight, ChevronLeft, Search, Settings2, MoreVertical, X, Music as MusicIcon, ChevronDown, Folder } from 'lucide-react';
import PageHeader from './PageHeader';
import ProviderModal from './ProviderModal';

export default function SearchPanel() {
  const {
    state,
    searchInputRef,
    search,
    loadMore,
    playFromList,
    toggleFavorite,
    addToQueue,
    handleDownloadTrack,
    setSearchKeyword,
    openProviderModal,
    addTrackToPlaylist
  } = useMusicPlayer();

  const [limitText, setLimitText] = useState('5');
  const [inputValue, setInputValue] = useState(state.searchKeyword);
  const [activeMenuUid, setActiveMenuUid] = useState<string | null>(null);
  const [playlistSubMenuUid, setPlaylistSubMenuUid] = useState<string | null>(null);
  const limitModalRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSourceKey = (source: string) => {
    if (source === 'qq') return 'QQ Music';
    if (source === 'joox') return 'JOOX';
    if (source === 'netease') return 'Netease';
    return 'Kuwo';
  };

  useEffect(() => {
    setInputValue(state.searchKeyword);
  }, [state.searchKeyword]);

  useEffect(() => {
    const items = scrollerRef.current?.querySelectorAll('.ios-wheel-item');
    if (!items || !limitModalRef.current) return;
    const updateHighlight = () => {
      if (!scrollerRef.current) return;
      const center = scrollerRef.current.scrollTop + 110;
      let minDiff = Infinity;
      let closest = state.perSourceLimit;
      items.forEach(item => {
        const top = (item as HTMLElement).offsetTop + 22;
        const diff = Math.abs(top - center);
        if (diff < minDiff) {
          minDiff = diff;
          closest = parseInt((item as HTMLElement).getAttribute('data-value') || '5', 10);
        }
      });
      items.forEach(it => {
        const val = parseInt((it as HTMLElement).getAttribute('data-value') || '0', 10);
        it.classList.toggle('selected', val === closest);
      });
    };
    const scroller = scrollerRef.current;
    scroller?.addEventListener('scroll', updateHighlight, { passive: true });
    items.forEach(item => {
      item.addEventListener('click', () => {
        const val = parseInt((item as HTMLElement).getAttribute('data-value') || '0', 10);
        const idx = [5, 10, 20, 30, 50].indexOf(val);
        if (idx >= 0 && scroller) {
          scroller.scrollTo({ top: idx * 44, behavior: 'smooth' });
        }
      });
    });
    return () => scroller?.removeEventListener('scroll', updateHighlight);
  }, [state.perSourceLimit]);

  const openLimitModal = () => {
    limitModalRef.current?.classList.add('show');
    setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const values = [5, 10, 20, 30, 50];
      const idx = values.indexOf(state.perSourceLimit);
      const activeIdx = idx >= 0 ? idx : 0;
      scroller.scrollTop = activeIdx * 44;
    }, 50);
  };

  const closeLimitModal = () => limitModalRef.current?.classList.remove('show');

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
        closest = parseInt((item as HTMLElement).getAttribute('data-value') || '5', 10);
      }
    });
    setLimitText(String(closest));
    closeLimitModal();
  };

  useEffect(() => { setLimitText(String(state.perSourceLimit)); }, [state.perSourceLimit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchKeyword(value);
      search(true, value);
    }, 400);
  };

  const handleSearchClick = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchKeyword(inputValue);
    search(true, inputValue);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const getInterleaved = (): Track[] => {
    const grouped: Record<string, Track[]> = { qq: [], joox: [], netease: [], kuwo: [] };
    state.searchResults.forEach(t => { if (grouped[t.source]) grouped[t.source].push(t); });
    Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0)));
    const order = ['qq', 'joox', 'netease', 'kuwo'];
    const idx: Record<string, number> = { qq: 0, joox: 0, netease: 0, kuwo: 0 };
    const out: Track[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const s of order) {
        const arr = grouped[s];
        const i = idx[s];
        if (arr && i < arr.length) { out.push(arr[i]); idx[s]++; added = true; }
      }
    }
    return out;
  };

  return (
    <Fragment>
      <PageHeader 
        title="Search" 
        rightContent={
          <button id="provider-settings-btn" className="icon-btn" onClick={openProviderModal} title="Provider Settings" style={{ width: '36px', height: '36px', color: 'var(--text-primary)' }}>
            <Settings2 size={20} />
          </button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="search-row">
          <span className="search-prefix"><Search size={18} /></span>
          <input
            id="search-input"
            ref={searchInputRef}
            className="input"
            type="text"
            placeholder="Search song, artist, or album..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                setSearchKeyword(inputValue);
                search(true, inputValue);
              }
            }}
          />
          <button id="search-btn" className="btn" onClick={handleSearchClick}>Search</button>
        </div>

        <div className="limit-row" style={{ marginTop: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Limit per source:</span>
            <button id="limit-trigger-btn" className="btn btn-secondary" style={{ borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', fontSize: '13px' }} onClick={openLimitModal}>
              <span id="limit-current-text">{limitText}</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <button id="load-more-btn" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '13px' }} onClick={loadMore}>Load More</button>
        </div>

        <div className="search-stats" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span id="search-status">{state.searchInProgress ? 'Searching...' : (state.searchResults.length > 0 ? 'Search complete' : 'Ready to search')}</span>
          <span id="search-count" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{state.searchResults.length}</span>
        </div>

        <div className="search-results-viewport" style={{ display: 'flex', flexDirection: 'column' }}>
          <div id="search-mini-list" className="search-results-mini">
            {getInterleaved().map((track, i) => (
              <div key={track.uid} className={`search-mini-item ${state.currentTrack?.uid === track.uid ? 'playing' : ''}`}>
                <div className="mini-badge">{String(i + 1).padStart(2, '0')}</div>
                <div className="track-thumb-box">
                  {track.cover ? (
                    <img src={track.cover} alt="" className="track-thumb-art" />
                  ) : (
                    <div className="track-thumb-placeholder">
                      <MusicIcon size={18} color="var(--accent)" />
                    </div>
                  )}
                </div>
                  <div className="mini-meta-main">
                    <div className="mini-title">{track.title || 'Unknown'}</div>
                    <div className="mini-artist" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span>{track.artist || ''}</span>
                      <span className="track-source-tag">
                        <span>{getSourceKey(track.source)}</span>
                      </span>
                      <span className="track-quality-badge">
                        {track.qualityLabel ? (track.qualityLabel.includes('K') ? track.qualityLabel.replace('K', 'kbps') : track.qualityLabel) : (track.qqQualityText || track.jooxQualityText || '320kbps')}
                      </span>
                    </div>
                  </div>
                <div className="mini-right" style={{ position: 'relative' }}>
                  <button className="icon-btn" title="Play" onClick={(e) => { e.stopPropagation(); playFromList('results', i); }}>
                    <Play size={18} fill="currentColor" />
                  </button>
                  <button className="icon-btn" title="More Options" onClick={(e) => { e.stopPropagation(); setActiveMenuUid(activeMenuUid === track.uid ? null : track.uid); }}>
                    <MoreVertical size={18} />
                  </button>

                  {activeMenuUid === track.uid && (
                    <div className="ios-popover-menu show" style={{ top: '38px', right: 0 }}>
                      {playlistSubMenuUid === track.uid ? (
                        <>
                          <button className="ios-popover-item" onClick={(e) => { e.stopPropagation(); setPlaylistSubMenuUid(null); }}>
                             <ChevronLeft size={16} /> <span>Back</span>
                          </button>
                          <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '4px 0' }} />
                          {state.playlists.filter(p => !p.isSystem).length === 0 ? (
                             <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>No custom playlists</div>
                          ) : (
                             state.playlists.filter(p => !p.isSystem).map(pl => (
                               <button key={pl.id} className="ios-popover-item" onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(pl.id, track); setActiveMenuUid(null); setPlaylistSubMenuUid(null); }}>
                                  <Folder size={16} /> <span>{pl.name}</span>
                               </button>
                             ))
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(track); setActiveMenuUid(null); setPlaylistSubMenuUid(null); }}
                          >
                            <Star size={16} fill={state.favorites.some(f => f.uid === track.uid) ? 'var(--accent)' : 'none'} color={state.favorites.some(f => f.uid === track.uid) ? 'var(--accent)' : 'currentColor'} />
                            <span>{state.favorites.some(f => f.uid === track.uid) ? 'Remove Favorite' : 'Add to Favorites'}</span>
                          </button>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); addToQueue(track); setActiveMenuUid(null); setPlaylistSubMenuUid(null); }}
                          >
                            <ListPlus size={16} />
                            <span>Add to Queue</span>
                          </button>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); setPlaylistSubMenuUid(track.uid); }}
                          >
                            <FolderPlus size={16} />
                            <span>Add to Playlist</span>
                            <ChevronRight size={14} style={{ marginLeft: 'auto', marginRight: '-4px', color: 'var(--text-secondary)' }} />
                          </button>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); handleDownloadTrack(track); setActiveMenuUid(null); setPlaylistSubMenuUid(null); }}
                          >
                            <Download size={16} />
                            <span>Download</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="limit-modal" ref={limitModalRef} className="modal-backdrop">
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
      <ProviderModal />
    </Fragment>
  );
}
