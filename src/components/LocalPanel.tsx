import { useRef, useState, Fragment, useEffect } from 'react';
import PageHeader from './PageHeader';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Play, Star, HardDrive, FolderSearch, FolderPlus, MoreVertical, ListPlus, Music as MusicIcon, Folder, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

export default function LocalPanel() {
  const { state, handleLocalFilesSelect, clearLocalTracks, removeLocalTrack, playFromList, toggleFavorite, addToQueue, addTrackToPlaylist } = useMusicPlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuUid, setActiveMenuUid] = useState<string | null>(null);
  const [playlistSubMenuUid, setPlaylistSubMenuUid] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget === el) setIsDragging(false);
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length) {
        await handleLocalFilesSelect(files);
      }
    };
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  }, [handleLocalFilesSelect]);

  const handleFolderScanClick = async () => {
    // If File System Access API is available, use showDirectoryPicker for direct folder scanning
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        async function readDir(handle: any) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const f = await entry.getFile();
              files.push(f);
            } else if (entry.kind === 'directory') {
              await readDir(entry);
            }
          }
        }
        await readDir(dirHandle);
        if (files.length) {
          handleLocalFilesSelect(files as any);
        }
        return;
      } catch (err) {
        // User cancelled or fallback to webkitdirectory input
      }
    }
    folderInputRef.current?.click();
  };

  return (
    <Fragment>
      <PageHeader title="Devices" />
      <div ref={panelRef} style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', position: 'relative' }}>
        {isDragging && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(250, 36, 60, 0.1)',
            border: '2px dashed var(--accent)', borderRadius: '12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, color: 'var(--accent)'
          }}>
            Drop audio files here
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', margin: '8px 0 12px', width: '100%' }}>
          <button className="btn" onClick={handleFolderScanClick} style={{ flex: 1, borderRadius: '20px', padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <FolderSearch size={18} />
            <span>Scan Folder</span>
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, borderRadius: '20px', padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <FolderPlus size={18} />
            <span>Choose Files</span>
          </button>
        </div>

          <input
            ref={folderInputRef}
            type="file"
            //@ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: 'none' }}
            onChange={handleLocalFilesSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.wma,.opus"
            style={{ display: 'none' }}
            onChange={handleLocalFilesSelect}
          />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span id="local-tracks-count" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{state.localTracks.length} Local Track{state.localTracks.length === 1 ? '' : 's'}</span>
          {state.localTracks.length > 0 && (
            <button id="clear-local-btn" className="btn btn-ghost" onClick={clearLocalTracks} style={{ display: 'inline-block', padding: '4px 12px', fontSize: '12px' }}>Clear All</button>
          )}
        </div>

        <div id="local-track-list" className="playlist-main">
          {state.localTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>No local files or folder scanned yet.</div>
          ) : (
            state.localTracks.map((track, idx) => (
              <div key={track.uid} className={`track-item ${state.currentTrack?.uid === track.uid ? 'playing' : ''}`}>
                <div className="track-index">{String(idx + 1).padStart(2, '0')}</div>
                <div className="track-thumb-box">
                  {track.cover ? (
                    <img src={track.cover} alt="" className="track-thumb-art" />
                  ) : (
                    <div className="track-thumb-placeholder">
                      <MusicIcon size={18} color="var(--accent)" />
                    </div>
                  )}
                </div>
                <div className="track-meta-main">
                  <div className="track-meta-title">{track.title || 'Unknown'}</div>
                  <div className="track-meta-sub">
                    <span>{track.artist || ''}</span>
                    <span className="track-source-tag">
                      <span>LOCAL</span>
                    </span>
                  </div>
                </div>
                <div className="track-actions" style={{ position: 'relative' }}>
                  <button className="icon-btn" title="Play" onClick={(e) => { e.stopPropagation(); playFromList('local', idx); }}>
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
                          <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '4px 0' }} />
                          <button
                            className="ios-popover-item"
                            style={{ color: 'var(--accent)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLocalTrack(track.uid);
                              setActiveMenuUid(null);
                              setPlaylistSubMenuUid(null);
                            }}
                          >
                            <Trash2 size={16} color="var(--accent)" />
                            <span>Remove Track</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Fragment>
  );
}
