import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Heart, Download, Plus, Trash2,
  Search, HardDrive, Library, ChevronRight, ChevronLeft, ListMusic,
  Quote, Music, FolderPlus, X, Keyboard, Star, MoreHorizontal,
  ChevronDown, Volume1, Volume2, Sliders, Repeat, Repeat1, Shuffle,
  Infinity, ArrowDownToLine, PlusCircle, Menu
} from 'lucide-react';

import { parseAudioMetadata } from '../utils/audioMetadataParser';

export const SYSTEM_DOWNLOADED_ID = 'pl-downloaded';

const OFFLINE_DB_NAME = 'MusicPlayerOfflineDB';
const OFFLINE_DB_VER = 1;
const OFFLINE_STORE = 'downloaded_tracks';
const LIBRARY_STORAGE_KEY = 'music-player-library-v1';
const OLD_LIBRARY_STORAGE_KEY = 'pikachu-music-library-v1';

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

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m) + ':' + String(s).padStart(2, '0');
}

function inferQualityFromUrl(url: string | null) {
  if (!url) return { tag: null as string | null, label: '' };
  let base = url.split('?')[0].toLowerCase();
  const m = base.match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : '';
  const losslessExts = ['flac', 'wav', 'ape', 'alac', 'aiff'];
  if (losslessExts.includes(ext)) {
    return { tag: 'lossless', label: 'LOSSLESS' };
  }
  return { tag: '320k', label: '320K' };
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VER);
    req.onupgradeneeded = e => {
      const target = e.target as IDBOpenDBRequest;
      const db = target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: 'uid' });
      }
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result as IDBDatabase);
    req.onerror = e => reject(e);
  });
}

async function saveOfflineTrackToDB(track: Track, audioBlob: Blob, lrcText: string | null) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE);
    const data = {
      uid: track.uid,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover,
      audioBlob: audioBlob,
      lrc: lrcText || track.lrc,
      savedAt: new Date().toISOString()
    };
    store.put(data);
  } catch (e) { }
}

async function getOfflineTrackFromDB(uid: string): Promise<{ uid: string; title: string; artist: string; album: string; cover: string | null; audioBlob: Blob; lrc: string | null; savedAt: string } | null> {
  try {
    const db = await openOfflineDB();
    return new Promise(resolve => {
      const tx = db.transaction(OFFLINE_STORE, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE);
      const req = store.get(uid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

function serializeTrack(track: Track | null) {
  if (!track) return null;
  const keys = [
    'uid', 'source', 'displayIndex', 'keyword', 'songid', 'songMid', 'qqId', 'qqSearchKey', 'qqIndex',
    'jooxIndex', 'jooxSongId', 'jooxSongMid', 'title', 'artist', 'album', 'cover', 'pageUrl',
    'quality', 'qualityLabel', 'qqQualityText', 'jooxQualityText', 'pay'
  ];
  const out: any = {};
  keys.forEach(k => {
    if ((track as any)[k] !== undefined && (track as any)[k] !== null && (track as any)[k] !== '') out[k] = (track as any)[k];
  });
  out.detailsLoaded = false;
  out.audioUrl = null;
  out.lrc = null;
  out.lrcUrl = null;
  return out.uid ? out : null;
}

function deserializeTrack(raw: any) {
  if (raw && raw.source === 'migu') return null;
  const track = serializeTrack(raw);
  if (!track) return null;
  track.detailsLoaded = false;
  track.audioUrl = null;
  track.lrc = null;
  track.lrcUrl = null;
  return track as Track;
}

function getLibrarySnapshot(state: State) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    favorites: state.favorites.map(serializeTrack).filter(Boolean),
    downloads: state.downloads.map(serializeTrack).filter(Boolean),
    playlists: state.playlists.filter(pl => !pl.isSystem).map(pl => ({
      id: pl.id,
      name: pl.name,
      tracks: (pl.tracks || []).map(serializeTrack).filter(Boolean)
    }))
  };
}

function saveLibraryToStorage(state: State) {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(getLibrarySnapshot(state)));
  } catch (e) { }
}

function rebuildLibraryTrackMap(state: State) {
  [...state.favorites, ...state.downloads, ...state.playlists.flatMap(pl => pl.tracks || [])].forEach(track => {
    if (track && track.uid && !state.trackMap.has(track.uid)) {
      state.trackMap.set(track.uid, track);
    }
  });
}

function loadLibraryFromStorage(setState: React.Dispatch<React.SetStateAction<State>>) {
  try {
    let raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(OLD_LIBRARY_STORAGE_KEY);
    }
    if (!raw) return;
    const data = JSON.parse(raw);
    setState(prev => {
      const newFavorites = Array.isArray(data.favorites)
        ? data.favorites.map(deserializeTrack).filter(Boolean) as Track[]
        : [];
      const newDownloads = Array.isArray(data.downloads)
        ? data.downloads.map(deserializeTrack).filter(Boolean) as Track[]
        : [];
      const newPlaylists = Array.isArray(data.playlists)
        ? data.playlists.map((pl: any, idx: number) => ({
          id: pl.id || ('pl-cached-' + idx + '-' + Date.now()),
          name: pl.name || 'Untitled Playlist',
          tracks: Array.isArray(pl.tracks) ? pl.tracks.map(deserializeTrack).filter(Boolean) as Track[] : []
        }))
        : [];
      const trackMap = new Map(prev.trackMap);
      [...newFavorites, ...newDownloads, ...newPlaylists.flatMap((pl: any) => pl.tracks || [])].forEach(track => {
        if (track && track.uid && !trackMap.has(track.uid)) {
          trackMap.set(track.uid, track);
        }
      });
      return {
        ...prev,
        favorites: newFavorites,
        downloads: newDownloads,
        playlists: newPlaylists,
        trackMap
      };
    });
  } catch (e) { }
}

function ensureSystemPlaylists(state: State, setState: React.Dispatch<React.SetStateAction<State>>) {
  setState(prev => {
    const playlists = [...prev.playlists];
    if (!playlists.find(p => p.id === SYSTEM_DOWNLOADED_ID)) {
      playlists.unshift({ id: SYSTEM_DOWNLOADED_ID, name: 'Downloaded Songs', isSystem: true, tracks: prev.downloads });
    } else {
      const idx = playlists.findIndex(p => p.id === SYSTEM_DOWNLOADED_ID);
      if (idx >= 0) playlists[idx] = { ...playlists[idx], tracks: prev.downloads, isSystem: true, name: 'Downloaded Songs' };
    }
    return { ...prev, playlists };
  });
}

export interface Track {
  uid: string;
  source: string;
  displayIndex: number;
  keyword: string;
  songid: string;
  songMid: string;
  qqId: string;
  qqSearchKey: string;
  qqIndex: number;
  jooxIndex: number;
  jooxSongId: string;
  jooxSongMid: string;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  pageUrl: string;
  quality: string | null;
  qualityLabel: string | null;
  qqQualityText: string | null;
  jooxQualityText: string | null;
  pay: string | null;
  detailsLoaded: boolean;
  audioUrl: string | null;
  lrc: string | null;
  lrcUrl: string | null;
  fileObject?: File;
}

export interface Playlist {
  id: string;
  name: string;
  isSystem: boolean;
  tracks: Track[];
}

export interface PlayContext {
  type: 'results' | 'favorites' | 'local' | 'playlist';
  index: number;
  playlistId: string | null;
}

interface State {
  language: string;
  enabledSources: Record<string, boolean>;
  perSourceLimit: number;
  perSourceCurrentLimit: Record<string, number>;
  perSourcePage: Record<string, number>;
  searchKeyword: string;
  searchResults: Track[];
  trackMap: Map<string, Track>;
  favorites: Track[];
  downloads: Track[];
  localTracks: Track[];
  playlists: Playlist[];
  queue: Track[];
  activeLibraryView: 'root' | 'playlists' | 'downloaded' | 'favorites' | 'results';
  selectedPlaylistId: string | null;
  currentTrack: Track | null;
  playContext: PlayContext;
  playMode: 'list' | 'single' | 'shuffle';
  isPlaying: boolean;
  lyricLines: { time: number; text: string }[];
  currentLyricIndex: number;
  searchInProgress: boolean;
  noMoreResults: boolean;
  lyricsAlt: boolean;
  muted: boolean;
  activeTab: 'home' | 'search' | 'local' | 'playlist';
  previousTab: 'home' | 'search' | 'local' | 'playlist';
}

const AUDIFY_STORAGE_KEY = 'audify_app_state_v2';

function loadAudifyState(): Partial<State> {
  try {
    const raw = localStorage.getItem(AUDIFY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      language: typeof parsed.language === 'string' ? parsed.language : 'en',
      enabledSources: parsed.enabledSources || { qq: true, joox: true, netease: true, kuwo: true },
      perSourceLimit: typeof parsed.perSourceLimit === 'number' ? parsed.perSourceLimit : 5,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
      playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      playMode: ['list', 'single', 'shuffle'].includes(parsed.playMode) ? parsed.playMode : 'list'
    };
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
    return {};
  }
}

function saveAudifyState(state: State) {
  try {
    const payload = {
      language: state.language,
      enabledSources: state.enabledSources,
      perSourceLimit: state.perSourceLimit,
      favorites: state.favorites,
      downloads: state.downloads,
      playlists: state.playlists,
      queue: state.queue,
      playMode: state.playMode
    };
    localStorage.setItem(AUDIFY_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

const initialPerSourceLimit = { qq: 5, joox: 5, netease: 5, kuwo: 5 };
const initialPerSourcePage = { qq: 1, joox: 1, netease: 1, kuwo: 1 };

const persistedState = loadAudifyState();

const initialTrackMap = new Map<string, Track>();
[
  ...(persistedState.favorites || []),
  ...(persistedState.downloads || []),
  ...(persistedState.queue || []),
  ...(persistedState.playlists || []).flatMap(p => p.tracks || [])
].forEach(t => {
  if (t && t.uid) initialTrackMap.set(t.uid, t);
});

const initialState: State = {
  language: persistedState.language || 'en',
  enabledSources: persistedState.enabledSources || { qq: true, joox: true, netease: true, kuwo: true },
  perSourceLimit: persistedState.perSourceLimit || 5,
  perSourceCurrentLimit: { ...initialPerSourceLimit },
  perSourcePage: { ...initialPerSourcePage },
  searchKeyword: '',
  searchResults: [],
  trackMap: initialTrackMap,
  favorites: persistedState.favorites || [],
  downloads: persistedState.downloads || [],
  localTracks: [],
  playlists: persistedState.playlists || [],
  queue: persistedState.queue || [],
  activeLibraryView: 'root',
  selectedPlaylistId: null,
  currentTrack: null,
  playContext: { type: 'results', index: -1, playlistId: null },
  playMode: persistedState.playMode || 'list',
  isPlaying: false,
  lyricLines: [],
  currentLyricIndex: -1,
  searchInProgress: false,
  noMoreResults: false,
  lyricsAlt: false,
  muted: false,
  activeTab: 'home',
  previousTab: 'home'
};

interface ContextValue {
  state: State;
  showToast: (msg: string) => void;
  toastMsg: string;
  toastVisible: boolean;
  setToastMsg: (msg: string) => void;
  setToastVisible: (v: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  // actions
  setEnabledSources: (s: Record<string, boolean>) => void;
  setPerSourceLimit: (n: number) => void;
  setSearchKeyword: (k: string) => void;
  setActiveTab: (tab: 'home' | 'search' | 'local' | 'playlist') => void;
  toggleSearchTab: () => void;
  search: (reset: boolean, kwOverride?: string) => Promise<void>;
  loadMore: () => void;
  playTrack: (track: Track, context?: PlayContext) => void;
  playFromList: (type: PlayContext['type'], index: number, plId?: string | null) => void;
  playNext: (direction: 'next' | 'prev') => void;
  addToQueue: (track: Track) => void;
  clearQueueTracks: () => void;
  togglePlayPause: () => void;
  toggleFavorite: (track: Track) => void;
  toggleFavoriteCurrent: () => void;
  handleDownloadTrack: (track: Track) => void;
  handleDownloadCurrent: () => void;
  addCurrentToPlaylist: (plId?: string) => void;
  deleteSelectedPlaylist: (plId?: string) => void;
  removeTrackFromCurrentPlaylist: (trackUid: string) => void;
  handleLocalFilesSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

function parseLRC(txt: string | null) {
  if (!txt) return [];
  const lines = txt.split(/\r?\n/);
  const reg = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/;
  const out: { time: number; text: string }[] = [];
  for (const line of lines) {
    const m = reg.exec(line);
    if (!m) continue;
    const min = parseInt(m[1], 10) || 0;
    const sec = parseInt(m[2], 10) || 0;
    const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = line.replace(reg, '').trim();
    if (text) out.push({ time, text });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

function getInterleavedSearchList(state: State) {
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
}

function getActiveList(state: State) {
  const tp = state.playContext.type;
  if (tp === 'results') {
    let list = getInterleavedSearchList(state);
    if (!list.length && state.searchResults.length) {
      list = [...state.searchResults];
    }
    return list;
  }
  if (tp === 'favorites') return state.favorites;
  if (tp === 'local') return state.localTracks;
  if (tp === 'playlist') {
    const pl = state.playlists.find(p => p.id === state.playContext.playlistId);
    return pl ? pl.tracks : [];
  }
  return getInterleavedSearchList(state);
}

const JOOX_TOKEN = 'f84ao9lMF_q7husBWRfgUw';
const JOOX_BR = 4;

async function searchQQ(kw: string, limit: number, state: State, setState: React.Dispatch<React.SetStateAction<State>>) {
  const url = `https://tang.api.s01s.cn/music_open_api.php?msg=${encodeURIComponent(kw)}&type=json`;
  let added = 0;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const data = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    if (!Array.isArray(data) || data.length === 0) return 0;
    const list = data.slice(0, limit || data.length);
    setState(prev => {
      const newSearchResults = [...prev.searchResults];
      const newTrackMap = new Map(prev.trackMap);
      list.forEach((it: any, idx: number) => {
        const mid = it.song_mid;
        if (!mid) return;
        const uid = `qq-${mid}`;
        if (newTrackMap.has(uid)) return;
        const indexInList = idx + 1;
        const track: Track = {
          uid, source: 'qq', displayIndex: indexInList, keyword: kw, qqSearchKey: kw, qqIndex: indexInList,
          qqId: mid, songid: mid, songMid: mid, title: it.song_title || '', artist: it.singer_name || '',
          album: '', cover: null, pageUrl: '', quality: null, qualityLabel: null,
          qqQualityText: it.pay || null, jooxQualityText: null, pay: it.pay || null,
          jooxIndex: 0, jooxSongId: '', jooxSongMid: '',
          audioUrl: null, lrc: null, lrcUrl: null, detailsLoaded: false
        };
        newTrackMap.set(uid, track);
        newSearchResults.push(track);
        added++;
      });
      return { ...prev, searchResults: newSearchResults, trackMap: newTrackMap };
    });
  } catch (e) { }
  return added;
}

async function searchJoox(kw: string, limit: number, state: State) {
  const url = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(kw)}&token=${encodeURIComponent(JOOX_TOKEN)}&br=${encodeURIComponent(JOOX_BR)}`;
  let added = 0;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const songs = json && json.code === 200 && json.data && Array.isArray(json.data.songs) ? json.data.songs : [];
    songs.slice(0, limit || songs.length).forEach((it: any, idx: number) => {
      const songMid = it.songmid || '';
      const songId = it['歌曲ID'] || songMid || (idx + 1);
      const uid = `joox-${songMid || songId}`;
      if (state.trackMap.has(uid)) return;
      const track: Track = {
        uid, source: 'joox', displayIndex: idx + 1, keyword: kw, jooxIndex: idx + 1,
        songid: songId, songMid: songMid, title: it['歌曲名称'] || '', artist: it['歌手'] || '',
        album: it['专辑'] || '', cover: null, pageUrl: '', quality: null, qualityLabel: null,
        qqId: '', qqSearchKey: '', qqIndex: 0, jooxSongId: songId, jooxSongMid: songMid,
        qqQualityText: null, jooxQualityText: null, pay: null,
        audioUrl: null, lrc: it['歌词内容'] || null, lrcUrl: null, detailsLoaded: false
      };
      state.trackMap.set(uid, track);
      state.searchResults.push(track);
      added++;
    });
  } catch (e) { }
  return added;
}

async function searchNetease(kw: string, page: number, num: number, state: State, setState: React.Dispatch<React.SetStateAction<State>>) {
  const requestLimit = Math.max(1, page || 1) * Math.max(1, num || 10);
  const url = `https://api.qijieya.cn/meting/?type=search&id=${encodeURIComponent(kw)}&limit=${encodeURIComponent(requestLimit)}&server=netease`;
  let added = 0;
  function pickQueryParam(rawUrl: string, key: string) {
    if (!rawUrl) return '';
    try {
      return new URL(rawUrl, window.location.href).searchParams.get(key) || '';
    } catch (e) {
      const m = String(rawUrl).match(new RegExp('[?&]' + key + '=([^&]+)'));
      return m ? decodeURIComponent(m[1]) : '';
    }
  }
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!Array.isArray(json)) return 0;
    setState(prev => {
      const newSearchResults = [...prev.searchResults];
      const newTrackMap = new Map(prev.trackMap);
      json.forEach((it: any, idx: number) => {
        const songId = pickQueryParam(it.url, 'id') || `${kw}-${idx + 1}`;
        const uid = `netease-${songId}`;
        if (newTrackMap.has(uid)) return;
        const track: Track = {
          uid, source: 'netease', displayIndex: idx + 1, keyword: kw, songid: songId, songMid: '', qqId: '', qqSearchKey: '', qqIndex: 0,
          jooxIndex: 0, jooxSongId: '', jooxSongMid: '', title: it.name || '', artist: it.artist || '',
          album: '', cover: it.pic || null, pageUrl: '', quality: null, qualityLabel: null,
          qqQualityText: null, jooxQualityText: null, pay: null, detailsLoaded: false,
          audioUrl: it.url || null, lrc: null, lrcUrl: it.lrc || null
        };
        newTrackMap.set(uid, track);
        newSearchResults.push(track);
        added++;
      });
      return { ...prev, searchResults: newSearchResults, trackMap: newTrackMap };
    });
  } catch (e) { }
  return added;
}

async function searchKuwo(kw: string, limit: number, state: State, setState: React.Dispatch<React.SetStateAction<State>>) {
  const url = `https://kw-api.cenguigui.cn/?name=${encodeURIComponent(kw)}&page=1&limit=${encodeURIComponent(limit)}`;
  let added = 0;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data)) return 0;
    setState(prev => {
      const newSearchResults = [...prev.searchResults];
      const newTrackMap = new Map(prev.trackMap);
      json.data.forEach((it: any, idx: number) => {
        const uid = `kuwo-${it.rid}`;
        if (newTrackMap.has(uid)) return;
        const track: Track = {
          uid, source: 'kuwo', displayIndex: idx + 1, keyword: kw, songid: it.rid, songMid: '', qqId: '', qqSearchKey: '', qqIndex: 0,
          jooxIndex: 0, jooxSongId: '', jooxSongMid: '', title: it.name || '', artist: it.artist || '',
          album: it.album || '', cover: it.pic || null, pageUrl: '', quality: null, qualityLabel: null,
          qqQualityText: null, jooxQualityText: null, pay: null, detailsLoaded: false,
          audioUrl: null, lrc: null, lrcUrl: null
        };
        newTrackMap.set(uid, track);
        newSearchResults.push(track);
        added++;
      });
      return { ...prev, searchResults: newSearchResults, trackMap: newTrackMap };
    });
  } catch (e) { }
  return added;
}

async function fetchQQDetails(track: Track, setState: React.Dispatch<React.SetStateAction<State>>) {
  const msg = (track.qqSearchKey || track.keyword || '').trim() || ((track.title || '') + ' ' + (track.artist || '')).trim();
  const mid = (track.qqId || track.songMid || track.songid || '').toString().trim();
  if (!mid) return;
  const url = `https://tang.api.s01s.cn/music_open_api.php?msg=${encodeURIComponent(msg)}&type=json&mid=${encodeURIComponent(mid)}`;
  function pickBestPlayUrl(d: any) {
    if (d.song_play_url_sq) return { url: d.song_play_url_sq, tag: 'lossless', label: 'LOSSLESS', text: `SQ ${d.kbps_sq || ''}`.trim() };
    if (d.song_play_url_pq) return { url: d.song_play_url_pq, tag: 'lossless', label: 'LOSSLESS', text: `PQ ${d.kbps_pq || ''}`.trim() };
    if (d.song_play_url_accom) return { url: d.song_play_url_accom, tag: 'hq', label: 'HQ', text: `ACCOM ${d.kbps_accom || ''}`.trim() };
    if (d.song_play_url_hq) return { url: d.song_play_url_hq, tag: 'hq', label: 'HQ', text: `HQ ${d.kbps_hq || ''}`.trim() };
    if (d.song_play_url_standard) return { url: d.song_play_url_standard, tag: 'standard', label: 'STD', text: `STD ${d.kbps_standard || ''}`.trim() };
    if (d.song_play_url_fq) return { url: d.song_play_url_fq, tag: 'low', label: 'LOW', text: `FQ ${d.kbps_fq || ''}`.trim() };
    if (d.song_play_url) return { url: d.song_play_url, tag: null, label: null, text: null };
    return { url: null, tag: null, label: null, text: null };
  }
  try {
    const res = await fetch(url);
    const d = await res.json();
    if (!d || typeof d !== 'object' || !d.song_mid) throw new Error('qq detail error');
    const best = pickBestPlayUrl(d);
    const q = best.url ? inferQualityFromUrl(best.url) : { tag: null, label: '' };
    setState(prev => {
      const newTrackMap = new Map(prev.trackMap);
      const updated = { ...newTrackMap.get(track.uid), ...track };
      updated.title = d.song_title || d.song_name || track.title;
      updated.artist = d.singer_name || track.artist;
      updated.album = d.album_name || d.album_title || track.album || '';
      updated.cover = d.album_pic || d.singer_pic || track.cover;
      updated.pageUrl = d.song_h5_url || track.pageUrl;
      updated.audioUrl = best.url || track.audioUrl;
      updated.lrc = d.song_lyric || d.lyric || track.lrc;
      updated.qqQualityText = best.text || (d.vip ? `VIP:${d.vip}` : null) || track.qqQualityText;
      updated.quality = best.tag && best.label ? best.tag : q.tag;
      updated.qualityLabel = best.tag && best.label ? best.label : q.label;
      updated.detailsLoaded = true;
      newTrackMap.set(track.uid, updated);
      return { ...prev, trackMap: newTrackMap };
    });
  } catch (e) { }
}

async function fetchKuwoDetails(track: Track, setState: React.Dispatch<React.SetStateAction<State>>) {
  const api = `https://kw-api.cenguigui.cn/?id=${encodeURIComponent(track.songid)}&type=song&level=zp&format=json`;
  try {
    const res = await fetch(api);
    const j = await res.json();
    if (!j || j.code !== 200 || !j.data) throw new Error('kuwo detail failed');
    const d = j.data;
    const q = d.url ? inferQualityFromUrl(d.url) : { tag: null, label: '' };
    setState(prev => {
      const newTrackMap = new Map(prev.trackMap);
      const updated = { ...newTrackMap.get(track.uid), ...track };
      Object.assign(updated, {
        title: d.name || track.title,
        artist: d.artist || track.artist,
        album: d.album || track.album,
        cover: d.pic || track.cover,
        audioUrl: d.url || track.audioUrl,
        lrc: d.lyric || track.lrc || null,
        lrcUrl: null,
        detailsLoaded: true
      });
      updated.quality = q.tag;
      updated.qualityLabel = q.label;
      newTrackMap.set(track.uid, updated);
      return { ...prev, trackMap: newTrackMap };
    });
  } catch (e) { }
}

async function fetchJooxDetails(track: Track, setState: React.Dispatch<React.SetStateAction<State>>) {
  const n = track.jooxIndex || track.displayIndex || 1;
  const url = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(track.keyword)}&n=${encodeURIComponent(n)}&token=${encodeURIComponent(JOOX_TOKEN)}&br=${encodeURIComponent(JOOX_BR)}`;
  try {
    const res = await fetch(url);
    const j = await res.json();
    if (!j || j.code !== 200 || !j.data) throw new Error('joox detail failed');
    const d = j.data;
    const playLinks = d['播放链接'] || {};
    async function probeJooxAudioUrl(u: string) {
      if (!u) return false;
      async function request(method: string, extraOptions?: any) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        try {
          const res = await fetch(u, { method, cache: 'no-store', redirect: 'follow', signal: controller.signal, ...extraOptions });
          return res && (res.ok || res.status === 206 || (res.status >= 200 && res.status < 400));
        } finally {
          clearTimeout(timer);
        }
      }
      try { if (await request('HEAD')) return true; } catch (e) { }
      try { return await request('GET', { headers: { Range: 'bytes=0-0' } }); } catch (e) { return false; }
    }
    async function pickJooxPlayUrl(links: Record<string, string>) {
      const order = ['Atmos全景声', '无损FLAC', 'Hi-Res无损', '母带无损', 'OGG 320', 'MP3 320', 'AAC 192', 'OGG 192', 'MP3 128', 'AAC 96', 'AAC 48'];
      for (const name of order) {
        const u = links[name];
        if (!u) continue;
        if (!(await probeJooxAudioUrl(u))) continue;
        if (/母带|无损|flac|hi-res|atmos/i.test(name) || /\.flac(?:\?|$)/i.test(u)) {
          return { url: u, tag: 'lossless', label: 'LOSSLESS', text: name };
        }
        const m = name.match(/(\d+)$/);
        if (m) return { url: u, tag: m[1] + 'k', label: m[1] + 'K', text: name };
        return { url: u, tag: null, label: null, text: name };
      }
      return { url: null, tag: null, label: null, text: '' };
    }
    const best = await pickJooxPlayUrl(playLinks);
    setState(prev => {
      const newTrackMap = new Map(prev.trackMap);
      const updated = { ...newTrackMap.get(track.uid), ...track };
      Object.assign(updated, {
        title: d['歌曲名称'] || track.title,
        artist: d['歌手'] || track.artist,
        album: d['专辑'] || track.album,
        songid: d['歌曲ID'] || track.songid,
        songMid: d.songmid || track.songMid,
        audioUrl: best.url || track.audioUrl,
        lrc: d['歌词内容'] || track.lrc || null,
        lrcUrl: null,
        jooxQualityText: best.text || track.jooxQualityText || null,
        detailsLoaded: true
      });
      if (best.tag && best.label) {
        updated.quality = best.tag;
        updated.qualityLabel = best.label;
      } else if (updated.audioUrl) {
        const q = inferQualityFromUrl(updated.audioUrl);
        updated.quality = q.tag;
        updated.qualityLabel = q.label;
      }
      newTrackMap.set(track.uid, updated);
      return { ...prev, trackMap: newTrackMap };
    });
  } catch (e) { }
}

async function fetchNeteaseDetails(track: Track, setState: React.Dispatch<React.SetStateAction<State>>) {
  if (track.songid) {
    if (!track.audioUrl) {
      // handled in playTrack
    }
    if (!track.lrcUrl) {
      // handled in playTrack
    }
  }
  if (track.audioUrl) {
    const q = inferQualityFromUrl(track.audioUrl);
    setState(prev => {
      const newTrackMap = new Map(prev.trackMap);
      const updated = { ...newTrackMap.get(track.uid), ...track };
      updated.quality = q.tag;
      updated.qualityLabel = q.label;
      newTrackMap.set(track.uid, updated);
      return { ...prev, trackMap: newTrackMap };
    });
  }
  if (!track.lrc && track.lrcUrl) {
    try {
      const lr = await fetch(track.lrcUrl);
      const contentType = (lr.headers.get('content-type') || '').toLowerCase();
      let lrc = '';
      if (contentType.includes('json')) {
        const lj = await lr.json();
        lrc = (typeof lj === 'string' ? lj : null) || lj?.lrc || lj?.lyric || lj?.data?.lrc || lj?.data?.lyric || (typeof lj?.data === 'string' ? lj.data : null) || track.lrc || null;
      } else {
        lrc = await lr.text();
      }
      setState(prev => {
        const newTrackMap = new Map(prev.trackMap);
        const updated = { ...newTrackMap.get(track.uid), ...track, lrc };
        newTrackMap.set(track.uid, updated);
        return { ...prev, trackMap: newTrackMap };
      });
    } catch (e) { }
  }
  setState(prev => {
    const newTrackMap = new Map(prev.trackMap);
    const updated = { ...newTrackMap.get(track.uid), ...track, detailsLoaded: true };
    newTrackMap.set(track.uid, updated);
    return { ...prev, trackMap: newTrackMap };
  });
}

async function ensureTrackDetails(track: Track, setState: React.Dispatch<React.SetStateAction<State>>) {
  if (track.source === 'local') return;
  if (track.detailsLoaded && track.audioUrl && (track.lrc || !track.lrcUrl)) return;
  if (track.source === 'netease') {
    if (!track.audioUrl && track.songid) {
      track.audioUrl = `https://api.qijieya.cn/meting/?server=netease&type=url&id=${encodeURIComponent(track.songid)}`;
    }
    if (!track.lrcUrl && track.songid) {
      track.lrcUrl = `https://api.qijieya.cn/meting/?server=netease&type=lrc&id=${encodeURIComponent(track.songid)}`;
    }
    await fetchNeteaseDetails(track, setState);
  } else if (track.source === 'kuwo') {
    await fetchKuwoDetails(track, setState);
  } else if (track.source === 'joox') {
    await fetchJooxDetails(track, setState);
  } else {
    await fetchQQDetails(track, setState);
  }
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    saveAudifyState(state);
  }, [
    state.favorites,
    state.playlists,
    state.enabledSources,
    state.perSourceLimit,
    state.queue,
    state.downloads,
    state.language,
    state.playMode
  ]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const updatePlaylistInfoLabel = useCallback(() => {
    const activeTab = document.querySelector('.playlist-tab.active')?.getAttribute('data-tab') || 'results';
    if (activeTab === 'results') return t('playlistInfoResults');
    if (activeTab === 'favorites') return t('playlistInfoFavorites');
    if (!state.selectedPlaylistId) return 'All Playlists';
    const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
    return pl ? `${t('playlistInfoPlaylist')} · ${pl.name}` : t('playlistInfoPlaylist');
  }, [state.selectedPlaylistId, state.playlists]);

  const setPlaymodeUI = useCallback(() => {
    document.querySelectorAll('.playmode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === state.playMode);
    });
  }, [state.playMode]);

  const isFavorite = useCallback((track: Track | null) => {
    if (!track) return false;
    return state.favorites.some(x => x.uid === track.uid);
  }, [state.favorites]);

  const isDownloaded = useCallback((track: Track | null) => {
    if (!track) return false;
    return state.downloads.some(x => x.uid === track.uid);
  }, [state.downloads]);

  const updateMainFavButton = useCallback(() => {
    // This is handled by component re-render
  }, []);

  const updatePlayButtonIcon = useCallback((playing: boolean) => {
    // Handled by component
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setState(prev => ({ ...prev, language: lang }));
  }, []);

  const getInterleavedSearchListCtx = useCallback(() => {
    return getInterleavedSearchList(state);
  }, [state]);

  const getActiveListCtx = useCallback(() => {
    return getActiveList(state);
  }, [state]);

  const searchAllSources = useCallback(async (reset: boolean, kwOverride?: string) => {
    const kw = kwOverride !== undefined ? kwOverride : state.searchKeyword;
    if (!kw) { showToast(t('toastNeedKeyword')); return; }
    const enabled = Object.keys(state.enabledSources).filter(k => state.enabledSources[k]);
    if (!enabled.length) { showToast(t('searchStatusNoSource')); return; }
    setState(prev => ({
      ...prev,
      searchKeyword: kw,
      searchInProgress: true,
      ...(reset ? {
        perSourceCurrentLimit: { ...initialPerSourceLimit },
        perSourcePage: { ...initialPerSourcePage },
        searchResults: [],
        trackMap: new Map(),
        noMoreResults: false
      } : {})
    }));
    const tasks: Promise<number>[] = [];
    const currentState = { ...state, searchKeyword: kw };
    for (const s of enabled) {
      const limit = currentState.perSourceCurrentLimit[s] || currentState.perSourceLimit;
      if (s === 'qq') tasks.push(searchQQ(kw, limit, currentState, setState));
      if (s === 'joox') tasks.push(searchJoox(kw, limit, currentState));
      if (s === 'netease') tasks.push(searchNetease(kw, currentState.perSourcePage.netease || 1, currentState.perSourceLimit, currentState, setState));
      if (s === 'kuwo') tasks.push(searchKuwo(kw, limit, currentState, setState));
    }
    let added = 0;
    try {
      const res = await Promise.all(tasks);
      added = res.reduce((a, b) => a + (b || 0), 0);
    } catch (e) {
      showToast(t('toastSearchError'));
    }
    setState(prev => ({
      ...prev,
      searchInProgress: false,
      noMoreResults: added === 0 && !reset
    }));
    if (added === 0 && !reset) {
      showToast(t('toastNoMore'));
    }
  }, [state, showToast]);

  const playTrack = useCallback(async (track: Track, context?: PlayContext) => {
    if (!track) return;
    setState(prev => ({
      ...prev,
      currentTrack: track,
      playContext: context || prev.playContext
    }));
    const applyUI = () => {
      // UI updates handled by React rendering
    };
    let playSrc = track.audioUrl;
    if (track.source !== 'local') {
      const offlineRecord = await getOfflineTrackFromDB(track.uid);
      if (offlineRecord && offlineRecord.audioBlob) {
        playSrc = URL.createObjectURL(offlineRecord.audioBlob);
        if (offlineRecord.lrc) {
          setState(prev => {
            const newTrackMap = new Map(prev.trackMap);
            const updated = { ...newTrackMap.get(track.uid), ...track, lrc: offlineRecord.lrc };
            newTrackMap.set(track.uid, updated);
            return { ...prev, trackMap: newTrackMap };
          });
        }
      } else {
        await ensureTrackDetails(track, setState);
        await new Promise<void>(resolve => {
          setState(prev => {
            const newTrackMap = new Map(prev.trackMap);
            const updated = newTrackMap.get(track.uid) || track;
            playSrc = updated.audioUrl || playSrc;
            const newCurrentTrack = (prev.currentTrack?.uid === track.uid) ? { ...updated } : prev.currentTrack;
            resolve();
            return { ...prev, trackMap: newTrackMap, currentTrack: newCurrentTrack };
          });
        });
      }
    }
    setState(prev => {
      const newTrackMap = new Map(prev.trackMap);
      const updated = newTrackMap.get(track.uid) || track;
      const lines = updated.lrc ? parseLRC(updated.lrc) : [];
      return { ...prev, lyricLines: lines, currentLyricIndex: -1, trackMap: newTrackMap };
    });
    if (!playSrc) {
      showToast(t('toastPlayError'));
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = playSrc;
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (e) {
        showToast(t('toastPlayError'));
      }
    }
  }, [showToast]);

  const playFromList = useCallback((type: PlayContext['type'], index: number, plId?: string | null) => {
    let list: Track[] = [];
    const currentState = state;
    if (type === 'results') list = getInterleavedSearchList(currentState);
    else if (type === 'favorites') list = currentState.favorites;
    else if (type === 'local') list = currentState.localTracks;
    else {
      const pl = currentState.playlists.find(p => p.id === plId);
      list = pl ? pl.tracks : [];
    }
    if (!list.length) {
      if (type !== 'results') showToast(t('toastPlaylistEmpty'));
      return;
    }
    if (index < 0) index = list.length - 1;
    if (index >= list.length) index = 0;
    const track = list[index];
    const context: PlayContext = { type, index, playlistId: plId || null };
    playTrack(track, context);
  }, [state, playTrack, showToast]);

  const playNext = useCallback((direction: 'next' | 'prev') => {
    const currentState = state;
    if (direction === 'next' && currentState.queue.length > 0) {
      const nextTrack = currentState.queue[0];
      const newQueue = currentState.queue.slice(1);
      setState(prev => ({ ...prev, queue: newQueue }));
      playTrack(nextTrack);
      return;
    }

    const list = getActiveList(currentState);
    if (!list.length) return;
    let idx = currentState.playContext.index ?? -1;
    if (idx < 0 || idx >= list.length) idx = 0;

    if (currentState.playMode === 'single') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
      return;
    }

    if (currentState.playMode === 'shuffle') {
      if (list.length === 1) {
        idx = 0;
      } else {
        let newIdx;
        do { newIdx = Math.floor(Math.random() * list.length); } while (newIdx === idx);
        idx = newIdx;
      }
    } else {
      idx = (idx + (direction === 'prev' ? -1 : 1) + list.length) % list.length;
    }

    const track = list[idx];
    const context = { ...currentState.playContext, index: idx };
    playTrack(track, context);
  }, [state, playTrack]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      if (state.isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(() => { });
    }
  }, [state.isPlaying]);

  const toggleFavoriteCurrent = useCallback(() => {
    const tr = state.currentTrack;
    if (!tr) return;
    setState(prev => {
      const i = prev.favorites.findIndex(x => x.uid === tr.uid);
      if (i >= 0) {
        showToast(t('toastRemovedFavorite'));
        return { ...prev, favorites: prev.favorites.filter(x => x.uid !== tr.uid) };
      } else {
        showToast(t('toastAddedFavorite'));
        return { ...prev, favorites: [...prev.favorites, tr] };
      }
    });
  }, [state.currentTrack, state, showToast]);

  const toggleFavorite = useCallback((track: Track) => {
    setState(prev => {
      const i = prev.favorites.findIndex(x => x.uid === track.uid);
      if (i >= 0) {
        showToast(t('toastRemovedFavorite'));
        return { ...prev, favorites: prev.favorites.filter(x => x.uid !== track.uid) };
      } else {
        showToast(t('toastAddedFavorite'));
        return { ...prev, favorites: [...prev.favorites, track] };
      }
    });
  }, [showToast]);

  const handleDownloadTrack = useCallback(async (track: Track) => {
    if (!track) return;
    if (track.source === 'local') {
      showToast('Local file already available on device');
      return;
    }
    await ensureTrackDetails(track, setState);
    let updatedTrack = track;
    await new Promise<void>(resolve => {
      setState(prev => {
        updatedTrack = prev.trackMap.get(track.uid) || track;
        resolve();
        return prev;
      });
    });

    if (!updatedTrack.audioUrl) {
      showToast(t('toastDownloadNotReady'));
      return;
    }
    let audioBlob: Blob | null = null;
    try {
      const res = await fetch(updatedTrack.audioUrl);
      audioBlob = await res.blob();
    } catch (e) { }
    if (audioBlob) {
      await saveOfflineTrackToDB(updatedTrack, audioBlob, updatedTrack.lrc);
      const blobUrl = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      const ext = (updatedTrack.quality === 'lossless') ? 'flac' : 'mp3';
      a.href = blobUrl;
      a.download = `${updatedTrack.artist || 'Artist'} - ${updatedTrack.title || 'Song'}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      if (updatedTrack.lrc) {
        try {
          const lrcBlob = new Blob([updatedTrack.lrc], { type: 'text/plain;charset=utf-8' });
          const lrcUrl = URL.createObjectURL(lrcBlob);
          const aLrc = document.createElement('a');
          aLrc.href = lrcUrl;
          aLrc.download = `${updatedTrack.artist || 'Artist'} - ${updatedTrack.title || 'Song'}.lrc`;
          document.body.appendChild(aLrc);
          aLrc.click();
          aLrc.remove();
          setTimeout(() => URL.revokeObjectURL(lrcUrl), 10000);
        } catch (e) { }
      }
    } else {
      window.open(updatedTrack.audioUrl, '_blank');
    }
    setState(prev => {
      if (prev.downloads.some(x => x.uid === updatedTrack.uid)) {
        showToast(t('toastAddedToDownloaded'));
        return prev;
      }
      const newDownloads = [...prev.downloads, updatedTrack];
      const newPlaylists = prev.playlists.map(p => p.id === SYSTEM_DOWNLOADED_ID ? { ...p, tracks: newDownloads, isSystem: true, name: 'Downloaded Songs' } : p);
      saveLibraryToStorage({ ...prev, downloads: newDownloads, playlists: newPlaylists });
      return { ...prev, downloads: newDownloads, playlists: newPlaylists };
    });
    showToast(t('toastAddedToDownloaded'));
  }, [state, showToast]);

  const handleDownloadCurrent = useCallback(() => {
    const tr = state.currentTrack;
    if (!tr) { showToast(t('toastDownloadNotReady')); return; }
    handleDownloadTrack(tr);
  }, [state.currentTrack, handleDownloadTrack, showToast]);

  const addCurrentToPlaylist = useCallback((targetPlId?: string) => {
    const plId = targetPlId || state.selectedPlaylistId;
    if (!plId) { showToast(t('toastNeedPlaylistSelected')); return; }
    const track = state.currentTrack;
    if (!track) { showToast(t('toastNoCurrentTrack')); return; }
    setState(prev => {
      const pl = prev.playlists.find(p => p.id === plId);
      if (!pl) { showToast(t('toastNeedPlaylistSelected')); return prev; }
      if (pl.tracks.some(tk => tk.uid === track.uid)) {
        showToast(t('toastAlreadyInList'));
        return prev;
      }
      const newTracks = [...pl.tracks, track];
      const newPlaylists = prev.playlists.map(p => p.id === plId ? { ...p, tracks: newTracks } : p);
      let newDownloads = prev.downloads;
      if (plId === SYSTEM_DOWNLOADED_ID) {
        if (!prev.downloads.some(x => x.uid === track.uid)) {
          newDownloads = [...prev.downloads, track];
        }
      }
      saveLibraryToStorage({ ...prev, playlists: newPlaylists, downloads: newDownloads });
      showToast(t('toastAddedToPlaylist'));
      return { ...prev, playlists: newPlaylists, downloads: newDownloads };
    });
  }, [state.selectedPlaylistId, state.currentTrack, state, showToast]);

  const deleteSelectedPlaylist = useCallback((targetPlId?: string) => {
    const plId = targetPlId || state.selectedPlaylistId;
    if (!plId) return;
    if (!window.confirm(t('confirmDeletePlaylist'))) return;
    setState(prev => {
      const pl = prev.playlists.find(p => p.id === plId);
      if (pl?.isSystem) {
        showToast(t('toastCannotDeleteSystem'));
        return prev;
      }
      const newPlaylists = prev.playlists.filter(p => p.id !== plId);
      saveLibraryToStorage({ ...prev, playlists: newPlaylists });
      showToast(t('toastPlaylistDeleted'));
      return { ...prev, playlists: newPlaylists, selectedPlaylistId: null };
    });
  }, [state.selectedPlaylistId, state, showToast]);

  const removeTrackFromCurrentPlaylist = useCallback((trackUid: string) => {
    if (!window.confirm(t('confirmRemoveTrack'))) return;
    const plId = state.selectedPlaylistId;
    if (!plId) return;
    setState(prev => {
      const pl = prev.playlists.find(p => p.id === plId);
      if (!pl) return prev;
      const idx = pl.tracks.findIndex(tk => tk.uid === trackUid);
      if (idx < 0) return prev;
      const removed = pl.tracks.splice(idx, 1)[0];
      const newTracks = [...pl.tracks];
      let newDownloads = prev.downloads;
      if (pl.id === SYSTEM_DOWNLOADED_ID) {
        const dIdx = prev.downloads.findIndex(x => x.uid === trackUid);
        if (dIdx >= 0) newDownloads = prev.downloads.filter(x => x.uid !== trackUid);
      }
      let newPlayContext = prev.playContext;
      if (prev.playContext.type === 'playlist' && prev.playContext.playlistId === plId) {
        if (prev.currentTrack && removed && prev.currentTrack.uid === removed.uid) {
          newPlayContext = { ...prev.playContext, index: pl.tracks.length ? Math.min(idx, pl.tracks.length - 1) : -1 };
        } else if (idx < prev.playContext.index) {
          newPlayContext = { ...prev.playContext, index: prev.playContext.index - 1 };
        } else if (prev.playContext.index >= pl.tracks.length) {
          newPlayContext = { ...prev.playContext, index: pl.tracks.length - 1 };
        }
      }
      const newPlaylists = prev.playlists.map(p => p.id === plId ? { ...p, tracks: newTracks } : p);
      saveLibraryToStorage({ ...prev, playlists: newPlaylists, downloads: newDownloads });
      showToast(t('toastTrackRemovedFromPlaylist'));
      return { ...prev, playlists: newPlaylists, downloads: newDownloads, playContext: newPlayContext };
    });
  }, [state.selectedPlaylistId, state, showToast]);

  const handleLocalFilesSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | File[]) => {
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
      showToast('No supported audio files found');
      return;
    }

    showToast(`Scanning ${audioFiles.length} audio file${audioFiles.length === 1 ? '' : 's'}...`);

    const parsedTracks: Track[] = [];
    for (let idx = 0; idx < audioFiles.length; idx++) {
      const file = audioFiles[idx];
      const meta = await parseAudioMetadata(file);
      const uid = 'local-' + Date.now() + '-' + idx + '-' + Math.random().toString(16).slice(2);
      const audioUrl = URL.createObjectURL(file);
      const track: Track = {
        uid,
        source: 'local',
        displayIndex: idx + 1,
        title: meta.title || file.name,
        artist: meta.artist || 'Local Artist',
        album: meta.album || 'Device Storage',
        cover: meta.cover || null,
        pageUrl: '',
        quality: 'local',
        qualityLabel: 'LOCAL',
        qqQualityText: null,
        jooxQualityText: null,
        pay: null,
        detailsLoaded: true,
        audioUrl,
        lrc: null,
        lrcUrl: null,
        keyword: '',
        songid: '',
        songMid: '',
        qqId: '',
        qqSearchKey: '',
        qqIndex: 0,
        jooxIndex: 0,
        jooxSongId: '',
        jooxSongMid: '',
        fileObject: file
      };
      parsedTracks.push(track);
    }

    let added = 0;
    setState(prev => {
      const newLocalTracks = [...prev.localTracks];
      const newTrackMap = new Map(prev.trackMap);
      parsedTracks.forEach((t) => {
        t.displayIndex = newLocalTracks.length + 1;
        newTrackMap.set(t.uid, t);
        newLocalTracks.push(t);
        added++;
      });
      return { ...prev, localTracks: newLocalTracks, trackMap: newTrackMap };
    });

    showToast(`Added ${added} local track${added === 1 ? '' : 's'}`);
    if (!Array.isArray(e) && e.target) e.target.value = '';

    setState(prev => {
      if (!prev.currentTrack && prev.localTracks.length > 0) {
        return { ...prev, playContext: { type: 'local', index: 0, playlistId: null }, currentTrack: prev.localTracks[0] };
      }
      return prev;
    });
  }, [showToast]);

  const clearLocalTracks = useCallback(() => {
    setState(prev => {
      if (!prev.localTracks.length) return prev;
      prev.localTracks.forEach(t => {
        if (t.audioUrl && t.audioUrl.startsWith('blob:')) URL.revokeObjectURL(t.audioUrl);
      });
      showToast('Cleared local tracks');
      return { ...prev, localTracks: [] };
    });
  }, [showToast]);

  const addToQueue = useCallback((track: Track) => {
    setState(prev => ({ ...prev, queue: [...prev.queue, track] }));
    showToast('Added to queue');
  }, [showToast]);

  const clearQueueTracks = useCallback(() => {
    setState(prev => ({ ...prev, queue: [] }));
  }, []);

  const switchLibraryTab = useCallback((tabName: string) => {
    setState(prev => ({
      ...prev,
      activeLibraryView: tabName as any,
      selectedPlaylistId: tabName === 'playlists' ? prev.selectedPlaylistId : null,
      playContext: tabName === 'results' ? { type: 'results', index: -1, playlistId: null } :
        tabName === 'favorites' ? { type: 'favorites', index: -1, playlistId: null } :
          tabName === 'downloaded' ? { type: 'playlist', index: -1, playlistId: SYSTEM_DOWNLOADED_ID } :
            prev.playContext
    }));
  }, []);

  const openPlaylistDetail = useCallback((plId: string) => {
    setState(prev => ({
      ...prev,
      activeLibraryView: 'playlists',
      selectedPlaylistId: plId,
      playContext: { type: 'playlist', index: -1, playlistId: plId }
    }));
  }, []);

  const handleBackNavigation = useCallback(() => {
    setState(prev => {
      if (prev.activeLibraryView === 'playlists' && prev.selectedPlaylistId) {
        return { ...prev, selectedPlaylistId: null };
      }
      return { ...prev, activeLibraryView: 'root', selectedPlaylistId: null };
    });
  }, []);

  const backToLibraryRoot = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeLibraryView: 'root',
      selectedPlaylistId: null
    }));
  }, []);

  const backToPlaylistFolders = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedPlaylistId: null
    }));
  }, []);

  const [showProviderModal, setShowProviderModal] = useState(false);
  const openProviderModal = useCallback(() => setShowProviderModal(true), []);
  const closeProviderModal = useCallback(() => setShowProviderModal(false), []);

  const openPlaylistModal = useCallback(() => {
    // Handled by component state
  }, []);

  const closePlaylistModal = useCallback(() => {
    // Handled by component state
  }, []);

  const createPlaylist = useCallback((name: string) => {
    if (!name.trim()) name = 'Untitled Playlist';
    const id = 'pl-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    const pl: Playlist = { id, name: name.trim(), tracks: [], isSystem: false };
    setState(prev => {
      const newPlaylists = [pl, ...prev.playlists];
      saveLibraryToStorage({ ...prev, playlists: newPlaylists });
      return { ...prev, playlists: newPlaylists, selectedPlaylistId: id };
    });
    showToast(t('toastPlaylistCreated'));
  }, [showToast]);

  const openLimitModal = useCallback(() => {
    // Handled by component
  }, []);

  const closeLimitModal = useCallback(() => {
    // Handled by component
  }, []);

  const confirmLimitWheelSelection = useCallback((val: number) => {
    setState(prev => ({ ...prev, perSourceLimit: val }));
    showToast(`Limit set to ${val} per source`);
  }, [showToast]);

  const openFullPlayer = useCallback(() => {
    document.getElementById('fullPlayer')?.classList.add('active');
  }, []);

  const closeFullPlayer = useCallback(() => {
    document.getElementById('fullPlayer')?.classList.remove('active');
  }, []);

  const toggleIntegratedLyrics = useCallback(() => {
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
  }, []);

  const toggleQueueMode = useCallback(() => {
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
  }, []);

  const togglePlayMode = useCallback((mode: 'list' | 'single' | 'shuffle') => {
    setState(prev => ({ ...prev, playMode: mode }));
    if (mode === 'shuffle') showToast(t('toastPlaymodeShuffle'));
    else if (mode === 'single') showToast(t('toastPlaymodeSingle'));
    else showToast(t('toastPlaymodeList'));
  }, [showToast]);

  const setActiveTab = useCallback((tab: 'home' | 'search' | 'local' | 'playlist') => {
    setState(prev => ({ ...prev, activeTab: tab }));
    closeProviderModal();
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`view-${tab}`)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(i => i.classList.toggle('active', i.getAttribute('data-target') === `view-${tab}`));
  }, [closeProviderModal]);

  const toggleSearchTab = useCallback(() => {
    closeProviderModal();
    setState(prev => {
      if (prev.activeTab === 'search') {
        const target = prev.previousTab || 'home';
        setTimeout(() => searchInputRef.current?.blur(), 50);
        return { ...prev, activeTab: target };
      } else {
        setTimeout(() => searchInputRef.current?.focus(), 100);
        return { ...prev, previousTab: prev.activeTab, activeTab: 'search' };
      }
    });
  }, [closeProviderModal]);

  const focusSearchInput = useCallback(() => {
    setActiveTab('search');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [setActiveTab]);

  const lyricLinesRef = useRef(state.lyricLines);
  const currentLyricIndexRef = useRef(state.currentLyricIndex);
  const playNextRef = useRef(playNext);

  useEffect(() => { lyricLinesRef.current = state.lyricLines; });
  useEffect(() => { currentLyricIndexRef.current = state.currentLyricIndex; });
  useEffect(() => { playNextRef.current = playNext; });

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      const cur = audio.currentTime || 0;
      const dur = audio.duration || 0;
      const currentTimeEl = document.getElementById('current-time');
      const totalTimeEl = document.getElementById('total-time');
      const progressBar = document.getElementById('progress-bar');
      const progressHandle = document.getElementById('progress-handle');
      const progressWrapper = document.getElementById('progress-bar-wrapper');
      if (currentTimeEl) currentTimeEl.textContent = formatTime(cur);
      const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressHandle) progressHandle.style.left = pct + '%';
      if (dur > 0) {
        if (totalTimeEl) totalTimeEl.textContent = '-' + formatTime(Math.max(0, dur - cur));
      } else {
        if (totalTimeEl) totalTimeEl.textContent = '-0:00';
      }
      const lines = lyricLinesRef.current;
      if (lines.length) {
        let idx = currentLyricIndexRef.current;
        if (idx < 0 || idx >= lines.length || cur < lines[idx].time || (idx + 1 < lines.length && cur >= lines[idx + 1].time)) {
          idx = lines.findIndex((l, i) => {
            const nxt = lines[i + 1];
            if (!nxt) return cur >= l.time - 0.05;
            return cur >= l.time - 0.05 && cur < nxt.time - 0.05;
          });
        }
        if (idx >= 0 && idx !== currentLyricIndexRef.current) {
          currentLyricIndexRef.current = idx;
          setState(prev => ({ ...prev, currentLyricIndex: idx }));
          const fullWrap = document.getElementById('integrated-lyrics-inner');
          if (fullWrap) {
            fullWrap.querySelectorAll('.integrated-lyric-line.active').forEach(el => el.classList.remove('active'));
            const actF = fullWrap.querySelector(`.integrated-lyric-line[data-index="${idx}"]`);
            if (actF) {
              actF.classList.add('active');
              const boxF = document.getElementById('integratedLyricsContainer');
              if (boxF) boxF.scrollTo({ top: (actF as HTMLElement).offsetTop - boxF.clientHeight * 0.35, behavior: 'smooth' });
            }
          }
        }
      }
    };
    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleEnded = () => playNextRef.current('next');
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      const typing = (tag === 'input' || tag === 'textarea');
      const playlistOpen = document.getElementById('playlist-modal')?.classList.contains('show');
      const shortcutOpen = document.getElementById('shortcut-modal')?.classList.contains('show');
      const limitOpen = document.getElementById('limit-modal')?.classList.contains('show');

      if (e.key === 'Escape') {
        if (playlistOpen) closePlaylistModal();
        if (shortcutOpen) document.getElementById('shortcut-modal')?.classList.remove('show');
        if (limitOpen) closeLimitModal();
        document.getElementById('playlist-popover-menu')?.classList.remove('show');
        document.getElementById('track-options-popover')?.classList.remove('show');
        document.getElementById('fullPlayer')?.classList.remove('active');
        return;
      }

      if (playlistOpen || shortcutOpen || limitOpen) {
        return;
      }

      if (e.code === 'Space' && !typing) { e.preventDefault(); togglePlayPause(); }
      if (e.key === 'ArrowRight' && !typing) { const a = document.getElementById('audio') as HTMLAudioElement; if (a) a.currentTime = (a.currentTime || 0) + 5; }
      if (e.key === 'ArrowLeft' && !typing) { const a = document.getElementById('audio') as HTMLAudioElement; if (a) a.currentTime = Math.max(0, (a.currentTime || 0) - 5); }
      if (e.key === 'ArrowUp' && !typing) { const a = document.getElementById('audio') as HTMLAudioElement; if (a) { a.volume = Math.min(1, (a.volume || 0) + 0.05); const v = document.getElementById('volume-slider') as HTMLInputElement; if (v) v.value = String(a.volume); } }
      if (e.key === 'ArrowDown' && !typing) { const a = document.getElementById('audio') as HTMLAudioElement; if (a) { a.volume = Math.max(0, (a.volume || 0) - 0.05); const v = document.getElementById('volume-slider') as HTMLInputElement; if (v) v.value = String(a.volume); } }
      if ((e.key === 'n' || e.key === 'N') && !typing) playNext('next');
      if ((e.key === 'p' || e.key === 'P') && !typing) playNext('prev');
      if ((e.key === 'f' || e.key === 'F') && !typing) toggleFavoriteCurrent();
      if ((e.key === 'l' || e.key === 'L') && !typing) toggleIntegratedLyrics();
      if ((e.key === 'q' || e.key === 'Q') && !typing) toggleQueueMode();
      if ((e.key === 'm' || e.key === 'M') && !typing) {
        setState(prev => ({ ...prev, muted: !prev.muted }));
        const a = document.getElementById('audio') as HTMLAudioElement;
        if (a) a.muted = !state.muted;
      }
      if (e.key === '/' && !typing) { e.preventDefault(); focusSearchInput(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [togglePlayPause, playNext, toggleFavoriteCurrent, toggleIntegratedLyrics, toggleQueueMode, focusSearchInput, state.muted, closePlaylistModal, closeLimitModal]);

  // Initialize on mount
  useEffect(() => {
    loadLibraryFromStorage(setState);
    const timer = setTimeout(() => {
      setState(prev => {
        const playlists = [...prev.playlists];
        if (!playlists.find(p => p.id === SYSTEM_DOWNLOADED_ID)) {
          playlists.unshift({ id: SYSTEM_DOWNLOADED_ID, name: 'Downloaded Songs', isSystem: true, tracks: prev.downloads });
        } else {
          const idx = playlists.findIndex(p => p.id === SYSTEM_DOWNLOADED_ID);
          if (idx >= 0) playlists[idx] = { ...playlists[idx], tracks: prev.downloads, isSystem: true, name: 'Downloaded Songs' };
        }
        return { ...prev, playlists };
      });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo(() => ({
    state,
    showToast,
    toastMsg,
    toastVisible,
    setToastMsg,
    setToastVisible,
    searchInputRef,
    audioRef,
    setEnabledSources: (s: Record<string, boolean>) => setState(prev => ({ ...prev, enabledSources: s })),
    setPerSourceLimit: (n: number) => setState(prev => ({ ...prev, perSourceLimit: n })),
    setSearchKeyword: (k: string) => setState(prev => ({ ...prev, searchKeyword: k })),
    search: searchAllSources,
    loadMore: () => {
      setState(prev => {
        const enabled = Object.keys(prev.enabledSources).filter(k => prev.enabledSources[k]);
        if (!enabled.length) { showToast(t('searchStatusNoSource')); return prev; }
        return prev;
      });
      searchAllSources(false);
    },
    playTrack,
    playFromList,
    playNext,
    addToQueue,
    clearQueueTracks,
    togglePlayPause,
    toggleFavorite,
    toggleFavoriteCurrent,
    handleDownloadTrack,
    handleDownloadCurrent,
    addCurrentToPlaylist,
    deleteSelectedPlaylist,
    removeTrackFromCurrentPlaylist,
    handleLocalFilesSelect,
    clearLocalTracks,
    switchLibraryTab,
    openPlaylistDetail,
    handleBackNavigation,
    backToLibraryRoot,
    backToPlaylistFolders,
    openPlaylistModal,
    closePlaylistModal,
    createPlaylist,
    openLimitModal,
    closeLimitModal,
    confirmLimitWheelSelection,
    openProviderModal,
    closeProviderModal,
    showProviderModal,
    openFullPlayer,
    closeFullPlayer,
    toggleIntegratedLyrics,
    toggleQueueMode,
    togglePlayMode,
    focusSearchInput,
    setActiveTab,
    toggleSearchTab,
    setPlaymodeUI,
    setLanguage,
    updatePlaylistInfoLabel,
    getInterleavedSearchList: getInterleavedSearchListCtx,
    getActiveList: getActiveListCtx,
    isFavorite,
    isDownloaded,
    updateMainFavButton,
    updatePlayButtonIcon,
    renderLyrics: () => { },
    renderLocalTrackList: () => state.localTracks,
    renderMiniSearchList: () => getInterleavedSearchList(state),
    renderPlaylistList: () => ({ activeTab: document.querySelector('.playlist-tab.active')?.getAttribute('data-tab') || 'results', selectedPlaylistId: state.selectedPlaylistId }),
    renderIntegratedQueue: () => { },
    setSelectedPlaylistId: (id: string | null) => setState(prev => ({ ...prev, selectedPlaylistId: id }))
  }), [
    state, showToast, toastMsg, toastVisible, searchInputRef, audioRef,
    searchAllSources, playTrack, playFromList, playNext, togglePlayPause,
    toggleFavorite, toggleFavoriteCurrent, handleDownloadTrack, handleDownloadCurrent,
    addCurrentToPlaylist, deleteSelectedPlaylist, removeTrackFromCurrentPlaylist,
    handleLocalFilesSelect, clearLocalTracks, switchLibraryTab, openPlaylistDetail,
    backToPlaylistFolders, openPlaylistModal, closePlaylistModal, createPlaylist,
    openLimitModal, closeLimitModal, confirmLimitWheelSelection, openFullPlayer,
    closeFullPlayer, toggleIntegratedLyrics, toggleQueueMode, togglePlayMode,
    clearQueueTracks, focusSearchInput, setPlaymodeUI, setLanguage,
    updatePlaylistInfoLabel, getInterleavedSearchListCtx, getActiveListCtx,
    isFavorite, isDownloaded,
    showProviderModal, openProviderModal, closeProviderModal,
    handleBackNavigation, backToLibraryRoot, addToQueue
  ]);

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}
