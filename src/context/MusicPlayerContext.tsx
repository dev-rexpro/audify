import { createContext, useContext, useMemo, useRef, ReactNode } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useSearchStore } from '../stores/searchStore';
import { useUiStore } from '../stores/uiStore';
import { type Track, type Playlist, type PlayContext } from '../stores/types';
import { saveOfflineTrack, cleanupOldOfflineTracks, saveLocalTrackToDB, clearAllLocalTracksFromDB } from '../utils/db';
import { embedID3Tags } from '../utils/id3TagWriter';
import { v4 as uuidv4 } from 'uuid';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

const translations = {
  en: {
    appTitle: "Audify",
    authorLabel: "Web Audio Experience",
    shortcutHint: "Shortcuts active",
    shortcutPanelTitle: "Shortcuts",
    shortcutPanelDesc: "Quick keyboard controls:",
    shortcutPlayPause: "Play / Pause",
    shortcutSeek: "Seek +/- 5s",
    shortcutVolume: "Volume Up / Down",
    shortcutPrevNext: "Previous / Next Track",
    shortcutFav: "Toggle Favorite",
    shortcutLyricsFX: "Toggle Lyrics Style",
    shortcutMute: "Toggle Mute",
    shortcutFocusSearch: "Focus Search",
    shortcutCloseModal: "Press ESC to close",
    searchTitle: "Search",
    searchSubtitle: "Multi-Platform",
    searchButton: "Search",
    perSourceCount: "Limit per source:",
    perSourceCountTail: "",
    loadMore: "Load More",
    searchStatusIdle: "Ready to search",
    searchStatusSearching: "Searching...",
    searchStatusDone: "Search complete",
    searchStatusNoSource: "Select at least one source",
    playerTitle: "Now Playing",
    playerSubtitle: "Visualizer",
    coverHint: "Play a song",
    playerStatusIdle: "Idle",
    playerStatusLoading: "Loading...",
    playerStatusPlaying: "Playing",
    playerStatusPaused: "Paused",
    lyricsEmpty: "No lyrics available",
    playlistTitle: "Library",
    tabResults: "Results",
    tabFavorites: "Favorites",
    tabCustomLists: "Playlists",
    playlistInfoResults: "Search Results",
    playlistInfoFavorites: "Favorite Songs",
    playlistInfoPlaylist: "Playlist",
    newPlaylist: "New",
    importPlaylist: "Import",
    exportPlaylist: "Export",
    deletePlaylist: "Delete",
    removeFromPlaylist: "Remove",
    footerText: "Educational demo. All music rights belong to original owners.",
    toastAddedFavorite: "Added to Favorites",
    toastRemovedFavorite: "Removed from Favorites",
    toastAddedToDownloaded: "Downloaded & saved locally",
    toastRemovedDownloaded: "Removed from Downloaded",
    toastAddedToPlaylist: "Added to playlist",
    toastAlreadyInList: "Song already in playlist",
    toastNoMore: "No more results",
    toastNeedKeyword: "Please enter a keyword",
    toastSearchError: "Search error occurred",
    toastPlayError: "Playback failed",
    toastLyricStyleSwitched: "Lyrics style changed",
    toastDownloadNotReady: "Track not ready",
    toastPlaylistCreated: "Playlist created",
    toastPlaylistDeleted: "Playlist deleted",
    toastCannotDeleteSystem: "System playlist cannot be deleted",
    toastTrackRemovedFromPlaylist: "Removed from playlist",
    confirmDeletePlaylist: "Delete this playlist?",
    confirmRemoveTrack: "Remove song from playlist?",
    toastPlaylistImported: "Imported successfully",
    toastPlaylistImportEmpty: "No valid playlist data found",
    toastPlaylistImportError: "Import error",
    toastPlaylistExported: "Exported successfully",
    toastPlaylistExportEmpty: "Nothing to export",
    toastPlaylistEmpty: "Playlist is empty",
    toastPlaymodeList: "Mode: Loop List",
    toastPlaymodeSingle: "Mode: Single Track",
    toastPlaymodeShuffle: "Mode: Shuffle",
    toastNeedPlaylistSelected: "Select a playlist first",
    toastNoCurrentTrack: "No track selected",
    sourceNetease: "Netease",
    sourceQQ: "QQ Music",
    sourceKuwo: "Kuwo",
    sourceJoox: "JOOX",
    modalNewPlaylistTitle: "Create Playlist",
    modalNewPlaylistDesc: "Enter a name for your new playlist",
    modalConfirm: "Save",
    modalCancel: "Cancel"
  }
};

function t(key: string) {
  return (translations as Record<string, Record<string, string>>).en[key] || key;
}

export interface ContextValue {
  state: {
    favorites: Track[];
    downloads: Track[];
    localTracks: Track[];
    playlists: Playlist[];
    trackMap: Map<string, Track>;
    currentTrack: Track | null;
    playContext: PlayContext;
    queue: Track[];
    playMode: string;
    isPlaying: boolean;
    lyricLines: { time: number; text: string }[];
    currentLyricIndex: number;
    volume: number;
    duration: number;
    currentTime: number;
    searchKeyword: string;
    searchResults: Track[];
    enabledSources: Record<string, boolean>;
    perSourceLimit: number;
    searchInProgress: boolean;
    noMoreResults: boolean;
    sourceErrors: Record<string, string>;
    sourceStatus: Record<string, 'ok' | 'error' | 'unknown'>;
    activeTab: string;
    previousTab: string;
    activeLibraryView: string;
    selectedPlaylistId: string | null;
    language: string;
    lyricsAlt: boolean;
    muted: boolean;
    toastMsg: string;
    toastVisible: boolean;
    showProviderModal: boolean;
    showPlaylistModal: boolean;
  };
  showToast: (msg: string) => void;
  toastMsg: string;
  toastVisible: boolean;
  setToastMsg: (msg: string) => void;
  setToastVisible: (v: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  setEnabledSources: (s: Record<string, boolean>) => void;
  setPerSourceLimit: (n: number) => void;
  setSearchKeyword: (k: string) => void;
  setActiveTab: (tab: 'home' | 'search' | 'local' | 'playlist') => void;
  toggleSearchTab: () => void;
  search: (reset: boolean, kwOverride?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  playTrack: (track: Track, context?: PlayContext) => Promise<{ src: string | null }>;
  playFromList: (type: PlayContext['type'], index: number, plId?: string | null, list?: Track[]) => void;
  playNext: (direction: 'next' | 'prev') => void;
  addToQueue: (track: Track) => void;
  clearQueueTracks: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  removeFromQueue: (uid: string) => void;
  togglePlayPause: () => void;
  toggleFavorite: (track: Track) => void;
  toggleFavoriteCurrent: () => void;
  handleDownloadTrack: (track: Track) => void;
  handleDownloadCurrent: () => void;
  addCurrentToPlaylist: (plId?: string) => void;
  addTrackToPlaylist: (plId: string, track: Track) => void;
  deleteSelectedPlaylist: (plId?: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  duplicatePlaylist: (id: string) => void;
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;
  reorderFavorites: (fromIndex: number, toIndex: number) => void;
  exportPlaylist: (playlistId: string) => void;
  importPlaylist: (file: File) => Promise<void>;
  sortPlaylistTracks: (playlistId: string, sortBy: 'title' | 'artist' | 'dateAdded') => void;
  removeTrackFromCurrentPlaylist: (trackUid: string) => void;
  handleLocalFilesSelect: (e: File[] | React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearLocalTracks: () => void;
  switchLibraryTab: (tabName: string) => void;
  openPlaylistDetail: (plId: string) => void;
  handleBackNavigation: () => void;
  backToLibraryRoot: () => void;
  backToPlaylistFolders: () => void;
  openPlaylistModal: () => void;
  closePlaylistModal: () => void;
  createPlaylist: (name: string) => void;
  openLimitModal: () => void;
  closeLimitModal: () => void;
  confirmLimitWheelSelection: (val: number) => void;
  openProviderModal: () => void;
  closeProviderModal: () => void;
  showProviderModal: boolean;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  toggleIntegratedLyrics: () => void;
  toggleQueueMode: () => void;
  togglePlayMode: (mode: 'list' | 'single' | 'shuffle') => void;
  focusSearchInput: () => void;
  setPlaymodeUI: () => void;
  setLanguage: (lang: string) => void;
  updatePlaylistInfoLabel: () => string;
  getInterleavedSearchList: () => Track[];
  getActiveList: () => Track[];
  isFavorite: (track: Track) => boolean;
  isDownloaded: (track: Track) => boolean;
  updateMainFavButton: () => void;
  updatePlayButtonIcon: (playing: boolean) => void;
  renderLyrics: () => void;
  renderLocalTrackList: () => Track[];
  renderMiniSearchList: () => Track[];
  renderPlaylistList: () => { activeTab: string; selectedPlaylistId: string | null };
  renderIntegratedQueue: () => void;
  setSelectedPlaylistId: (id: string | null) => void;
}

const MusicPlayerContext = createContext<ContextValue | null>(null);

export const useMusicPlayer = () => {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
};

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { audioRef, analyserRef } = useAudioPlayer();

  const library = useLibraryStore();
  const player = usePlayerStore();
  const search = useSearchStore();
  const ui = useUiStore();

  const contextValue = useMemo<ContextValue>(() => {
    const state = {
      favorites: library.favorites,
      downloads: library.downloads,
      localTracks: library.localTracks,
      playlists: library.playlists,
      trackMap: library.trackMap,
      currentTrack: player.currentTrack,
      playContext: player.playContext,
      queue: player.queue,
      playMode: player.playMode,
      isPlaying: player.isPlaying,
      lyricLines: player.lyricLines,
      currentLyricIndex: player.currentLyricIndex,
      volume: player.volume,
      duration: player.duration,
      currentTime: player.currentTime,
      searchKeyword: search.searchKeyword,
      searchResults: search.searchResults,
      enabledSources: search.enabledSources,
      perSourceLimit: search.perSourceLimit,
      searchInProgress: search.searchInProgress,
      noMoreResults: search.noMoreResults,
      sourceErrors: search.sourceErrors,
      sourceStatus: search.sourceStatus,
      activeTab: ui.activeTab,
      previousTab: ui.previousTab,
      activeLibraryView: ui.activeLibraryView,
      selectedPlaylistId: ui.selectedPlaylistId,
      language: ui.language,
      lyricsAlt: ui.lyricsAlt,
      muted: ui.muted,
      toastMsg: ui.toastMsg,
      toastVisible: ui.toastVisible,
      showProviderModal: ui.showProviderModal,
      showPlaylistModal: ui.showPlaylistModal,
    };

    const handleDownloadTrack = async (track: Track) => {
      if (!track) return;
      if (track.source === 'local') {
        ui.showToast('Local file already available on device');
        return;
      }
      const updated = await search.ensureTrackDetails(track);
      if (!updated?.audioUrl) {
        ui.showToast(t('toastDownloadNotReady'));
        return;
      }
      let audioBlob: Blob | null = null;
      try {
        const res = await fetch(updated.audioUrl);
        const rawBuffer = await res.arrayBuffer();
        audioBlob = await embedID3Tags(rawBuffer, updated);
      } catch (e) { }
      if (audioBlob) {
        cleanupOldOfflineTracks(30).catch(() => {});
        await saveOfflineTrack(updated, audioBlob, updated.lrc);
        const blobUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        const ext = (updated.quality === 'lossless') ? 'flac' : 'mp3';
        a.href = blobUrl;
        a.download = `${updated.artist || 'Artist'} - ${updated.title || 'Song'}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        if (updated.lrc) {
          try {
            const lrcBlob = new Blob([updated.lrc], { type: 'text/plain;charset=utf-8' });
            const lrcUrl = URL.createObjectURL(lrcBlob);
            const aLrc = document.createElement('a');
            aLrc.href = lrcUrl;
            aLrc.download = `${updated.artist || 'Artist'} - ${updated.title || 'Song'}.lrc`;
            document.body.appendChild(aLrc);
            aLrc.click();
            aLrc.remove();
            setTimeout(() => URL.revokeObjectURL(lrcUrl), 10000);
          } catch (e) { }
        }
      } else {
        window.open(updated.audioUrl, '_blank');
      }
      library.addDownload(updated);
      ui.showToast(t('toastAddedToDownloaded'));
    };

    return {
      state,
      showToast: ui.showToast,
      toastMsg: ui.toastMsg,
      toastVisible: ui.toastVisible,
      setToastMsg: ui.setToastMsg,
      setToastVisible: ui.setToastVisible,
      searchInputRef,
      audioRef,
      analyserRef,
      setEnabledSources: (s) => {
        ui.setEnabledSources(s);
        search.setEnabledSources(s);
      },
      setPerSourceLimit: ui.setPerSourceLimit,
      setSearchKeyword: search.setSearchKeyword,
      setActiveTab: ui.setActiveTab,
      toggleSearchTab: ui.toggleSearchTab,
      search: search.search.bind(search),
      loadMore: search.loadMore.bind(search),
      playTrack: player.playTrack,
      playFromList: player.playFromList,
      playNext: player.playNext,
      addToQueue: player.addToQueue,
      clearQueueTracks: player.clearQueue,
      reorderQueue: player.reorderQueue,
      removeFromQueue: player.removeFromQueue,
      togglePlayPause: player.togglePlayPause,
      toggleFavorite: library.toggleFavorite,
      toggleFavoriteCurrent: () => {
        const tr = player.currentTrack;
        if (!tr) return;
        library.toggleFavorite(tr);
        ui.showToast(library.favorites.some(f => f.uid === tr.uid) ? t('toastRemovedFavorite') : t('toastAddedFavorite'));
      },
      handleDownloadTrack,
      handleDownloadCurrent: () => {
        const tr = player.currentTrack;
        if (!tr) { ui.showToast(t('toastDownloadNotReady')); return; }
        handleDownloadTrack(tr);
      },
      addCurrentToPlaylist: (plId?: string) => {
        const targetPlId = plId || ui.selectedPlaylistId;
        if (!targetPlId) { ui.showToast(t('toastNeedPlaylistSelected')); return; }
        const track = player.currentTrack;
        if (!track) { ui.showToast(t('toastNoCurrentTrack')); return; }
        const added = library.addTrackToPlaylist(targetPlId, track);
        if (added) {
          ui.showToast(t('toastAddedToPlaylist'));
        } else {
          const pl = library.playlists.find(p => p.id === targetPlId);
          if (pl?.tracks.some(tk => tk.uid === track.uid)) {
            ui.showToast(t('toastAlreadyInList'));
          }
        }
      },
      addTrackToPlaylist: (targetPlId: string, track: Track) => {
        const added = library.addTrackToPlaylist(targetPlId, track);
        if (added) {
          ui.showToast(t('toastAddedToPlaylist'));
        } else {
          const pl = library.playlists.find(p => p.id === targetPlId);
          if (pl?.tracks.some(tk => tk.uid === track.uid)) {
            ui.showToast(t('toastAlreadyInList'));
          }
        }
      },
      deleteSelectedPlaylist: (plId?: string) => {
        const targetPlId = plId || ui.selectedPlaylistId;
        if (!targetPlId) return;
        if (!window.confirm(t('confirmDeletePlaylist'))) return;
        const pl = library.playlists.find(p => p.id === targetPlId);
        if (pl?.isSystem) {
          ui.showToast(t('toastCannotDeleteSystem'));
          return;
        }
        library.deletePlaylist(targetPlId);
        ui.showToast(t('toastPlaylistDeleted'));
      },
      renamePlaylist: (id, name) => {
        library.renamePlaylist(id, name);
        ui.showToast('Playlist renamed');
      },
      duplicatePlaylist: (id) => {
        library.duplicatePlaylist(id);
        ui.showToast('Playlist duplicated');
      },
      reorderPlaylistTracks: (playlistId, fromIndex, toIndex) => {
        library.reorderPlaylistTracks(playlistId, fromIndex, toIndex);
      },
      reorderFavorites: (fromIndex, toIndex) => {
        library.reorderFavorites(fromIndex, toIndex);
      },
      exportPlaylist: (playlistId) => {
        const pl = library.playlists.find(p => p.id === playlistId);
        if (!pl || pl.isSystem) return;
        const data = {
          name: pl.name,
          tracks: pl.tracks.map(t => ({
            uid: t.uid,
            title: t.title,
            artist: t.artist,
            album: t.album,
            source: t.source,
            cover: t.cover,
            quality: t.quality,
            qualityLabel: t.qualityLabel
          }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pl.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        ui.showToast(t('toastPlaylistExported'));
      },
      importPlaylist: async (file) => {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.name || !Array.isArray(data.tracks)) {
            ui.showToast(t('toastPlaylistImportEmpty'));
            return;
          }
          const id = 'pl-' + Date.now() + '-' + uuidv4().slice(0, 8);
          const tracks: Track[] = data.tracks.map((t: Record<string, unknown>) => ({
            uid: (t.uid as string) || ('imported-' + Date.now() + '-' + Math.random().toString(16).slice(2)),
            source: (t.source as string) || 'unknown',
            displayIndex: 0,
            keyword: '',
            songid: '',
            songMid: '',
            qqId: '',
            qqSearchKey: '',
            qqIndex: 0,
            jooxIndex: 0,
            jooxSongId: '',
            jooxSongMid: '',
            title: (t.title as string) || 'Unknown',
            artist: (t.artist as string) || 'Unknown',
            album: (t.album as string) || '',
            cover: (t.cover as string) || null,
            pageUrl: '',
            quality: (t.quality as string) || null,
            qualityLabel: (t.qualityLabel as string) || null,
            qqQualityText: null,
            jooxQualityText: null,
            pay: null,
            detailsLoaded: false,
            audioUrl: null,
            lrc: null,
            lrcUrl: null
          }));
          const pl: Playlist = { id, name: data.name, tracks, isSystem: false };
          useLibraryStore.setState(state => {
            const newPlaylists = [pl, ...state.playlists];
            return { playlists: newPlaylists };
          });
          ui.showToast(t('toastPlaylistImported'));
        } catch (e) {
          ui.showToast(t('toastPlaylistImportError'));
        }
      },
      sortPlaylistTracks: (playlistId, sortBy) => {
        const pl = library.playlists.find(p => p.id === playlistId);
        if (!pl || pl.isSystem) return;
        const sorted = [...pl.tracks];
        if (sortBy === 'title') {
          sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortBy === 'artist') {
          sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        } else if (sortBy === 'dateAdded') {
          sorted.sort((a, b) => (b.uid || '').localeCompare(a.uid || ''));
        }
        library.reorderPlaylistTracks(playlistId, 0, sorted.length > 0 ? 0 : 0);
        useLibraryStore.setState(state => {
          const newPlaylists = state.playlists.map(p => p.id === playlistId ? { ...p, tracks: sorted } : p);
          return { playlists: newPlaylists };
        });
        ui.showToast(`Sorted by ${sortBy}`);
      },
      removeTrackFromCurrentPlaylist: (trackUid: string) => {
        if (!window.confirm(t('confirmRemoveTrack'))) return;
        const plId = ui.selectedPlaylistId;
        if (!plId) return;
        library.removeTrackFromPlaylist(plId, trackUid);
        ui.showToast(t('toastTrackRemovedFromPlaylist'));
      },
      handleLocalFilesSelect: async (e: File[] | React.ChangeEvent<HTMLInputElement>) => {
        let rawFiles: File[] = [];
        if (Array.isArray(e)) {
          rawFiles = e;
        } else if (e && e.target && e.target.files) {
          rawFiles = Array.from(e.target.files);
        }
        if (!rawFiles.length) return;
        const validAudio = /\.(mp3|flac|wav|m4a|ogg|aac|wma|opus)$/i;
        const audioFiles = rawFiles.filter(f => validAudio.test(f.name) || f.type.startsWith('audio/'));
        if (!audioFiles.length) {
          ui.showToast('No supported audio files found');
          return;
        }
        ui.showToast(`Scanning ${audioFiles.length} audio file${audioFiles.length === 1 ? '' : 's'}...`);
        const parsedTracks: Track[] = [];
        for (let idx = 0; idx < audioFiles.length; idx++) {
          const file = audioFiles[idx];
          const { parseAudioMetadata } = await import('../utils/audioMetadataParser');
          const meta = await parseAudioMetadata(file);
          const uid = 'local-' + Date.now() + '-' + idx + '-' + uuidv4().slice(0, 8);
          const audioUrl = URL.createObjectURL(file);
          const track: Track = {
            uid, source: 'local', displayIndex: idx + 1, title: meta.title || file.name,
            artist: meta.artist || 'Local Artist', album: meta.album || 'Device Storage',
            cover: meta.cover || null, pageUrl: '', quality: 'local', qualityLabel: 'LOCAL',
            qqQualityText: null, jooxQualityText: null, pay: null, detailsLoaded: true,
            audioUrl, lrc: null, lrcUrl: null, keyword: '', songid: '', songMid: '',
            qqId: '', qqSearchKey: '', qqIndex: 0, jooxIndex: 0, jooxSongId: '', jooxSongMid: '',
            fileObject: file
          };
          saveLocalTrackToDB(track, file).catch(() => {});
          parsedTracks.push(track);
        }
        library.addLocalTracks(parsedTracks);
        ui.showToast(`Added ${parsedTracks.length} local track${parsedTracks.length === 1 ? '' : 's'}`);
        if (!Array.isArray(e) && e.target) e.target.value = '';
      },
      clearLocalTracks: () => {
        clearAllLocalTracksFromDB().catch(() => {});
        library.clearLocalTracks();
      },
      switchLibraryTab: ui.switchLibraryTab,
      openPlaylistDetail: ui.openPlaylistDetail,
      handleBackNavigation: ui.handleBackNavigation,
      backToLibraryRoot: ui.backToLibraryRoot,
      backToPlaylistFolders: ui.backToPlaylistFolders,
      openPlaylistModal: ui.openPlaylistModal,
      closePlaylistModal: ui.closePlaylistModal,
      createPlaylist: (name) => {
        if (!name || !name.trim()) return;
        const pl = library.createPlaylist(name.trim());
        ui.openPlaylistDetail(pl.id);
        ui.showToast(`Playlist "${pl.name}" created`);
        ui.closePlaylistModal();
      },
      openLimitModal: () => { },
      closeLimitModal: () => { },
      confirmLimitWheelSelection: (val) => {
        ui.setPerSourceLimit(val);
        ui.showToast(`Limit set to ${val} per source`);
      },
      openProviderModal: ui.openProviderModal,
      closeProviderModal: ui.closeProviderModal,
      showProviderModal: ui.showProviderModal,
      openFullPlayer: () => document.getElementById('fullPlayer')?.classList.add('active'),
      closeFullPlayer: () => document.getElementById('fullPlayer')?.classList.remove('active'),
      toggleIntegratedLyrics: () => {
        const fp = document.getElementById('fullPlayer');
        const btn = document.getElementById('lyrics-toggle-btn');
        const queueBtn = document.getElementById('queue-toggle-btn');
        if (fp) {
          fp.classList.remove('queue-mode-active');
          if (queueBtn) queueBtn.classList.remove('queue-active');
          fp.classList.toggle('lyrics-mode-active');
          const isLyrics = fp.classList.contains('lyrics-mode-active');
          if (btn) btn.classList.toggle('active', isLyrics);
        }
      },
      toggleQueueMode: () => {
        const fp = document.getElementById('fullPlayer');
        const queueBtn = document.getElementById('queue-toggle-btn');
        const lyricsBtn = document.getElementById('lyrics-toggle-btn');
        if (fp) {
          fp.classList.remove('lyrics-mode-active');
          if (lyricsBtn) lyricsBtn.classList.remove('active');
          fp.classList.toggle('queue-mode-active');
          const isQueue = fp.classList.contains('queue-mode-active');
          if (queueBtn) queueBtn.classList.toggle('queue-active', isQueue);
        }
      },
      togglePlayMode: (mode) => player.togglePlayMode(mode),
      focusSearchInput: () => {
        ui.setActiveTab('search');
        setTimeout(() => searchInputRef.current?.focus(), 100);
      },
      setPlaymodeUI: () => {
        document.querySelectorAll('.playmode-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-mode') === player.playMode);
        });
      },
      setLanguage: ui.setLanguage,
      updatePlaylistInfoLabel: () => {
        const activeTab = document.querySelector('.playlist-tab.active')?.getAttribute('data-tab') || 'results';
        if (activeTab === 'results') return t('playlistInfoResults');
        if (activeTab === 'favorites') return t('playlistInfoFavorites');
        if (!ui.selectedPlaylistId) return 'All Playlists';
        const pl = library.playlists.find(p => p.id === ui.selectedPlaylistId);
        return pl ? `${t('playlistInfoPlaylist')} · ${pl.name}` : t('playlistInfoPlaylist');
      },
      getInterleavedSearchList: search.getInterleavedSearchList,
      getActiveList: () => search.getActiveList(player.playContext),
      isFavorite: (track) => library.favorites.some(x => x.uid === track.uid),
      isDownloaded: (track) => library.downloads.some(x => x.uid === track.uid),
      updateMainFavButton: () => { },
      updatePlayButtonIcon: (playing: boolean) => { },
      renderLyrics: () => { },
      renderLocalTrackList: () => library.localTracks,
      renderMiniSearchList: () => search.getInterleavedSearchList(),
      renderPlaylistList: () => ({ activeTab: document.querySelector('.playlist-tab.active')?.getAttribute('data-tab') || 'results', selectedPlaylistId: ui.selectedPlaylistId }),
      renderIntegratedQueue: () => { },
      setSelectedPlaylistId: ui.setSelectedPlaylistId,
    };
  }, [library, player, search, ui, searchInputRef, audioRef, analyserRef]);

  return (
    <MusicPlayerContext.Provider value={contextValue}>
      {children}
    </MusicPlayerContext.Provider>
  );
}
