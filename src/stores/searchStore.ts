import { create } from 'zustand';
import { type Track, type PlayContext } from './types';

const JOOX_TOKEN = 'f84ao9lMF_q7husBWRfgUw';
const JOOX_BR = 4;

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

async function retryFetch<T>(fn: () => Promise<T>, retries = 1, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return retryFetch(fn, retries - 1, delay * 2);
    }
    throw e;
  }
}

async function searchQQ(kw: string, limit: number, existingUids: Set<string>, onResult: (track: Track) => void): Promise<number> {
  const url = `https://tang.api.s01s.cn/music_open_api.php?msg=${encodeURIComponent(kw)}&type=json`;
  let added = 0;
  try {
    const res = await retryFetch(() => fetch(url));
    const json = await res.json();
    const data = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    if (!Array.isArray(data) || data.length === 0) return 0;
    const list = data.slice(0, limit || data.length);
    list.forEach((it: Record<string, unknown>, idx: number) => {
      const mid = (it.song_mid as string) || '';
      if (!mid) return;
      const uid = `qq-${mid}`;
      if (existingUids.has(uid)) return;
      const indexInList = idx + 1;
      const track: Track = {
        uid, source: 'qq', displayIndex: indexInList, keyword: kw, qqSearchKey: kw, qqIndex: indexInList,
        qqId: mid, songid: mid, songMid: mid, title: (it.song_title as string) || '', artist: (it.singer_name as string) || '',
        album: '', cover: null, pageUrl: '', quality: null, qualityLabel: null,
        qqQualityText: (it.pay as string) || null, jooxQualityText: null, pay: (it.pay as string) || null,
        jooxIndex: 0, jooxSongId: '', jooxSongMid: '',
        audioUrl: null, lrc: null, lrcUrl: null, detailsLoaded: false
      };
      existingUids.add(uid);
      onResult(track);
      added++;
    });
  } catch (e) {
    console.error('QQ search failed:', e);
    throw new Error('QQ Music unavailable');
  }
  return added;
}

async function searchJoox(kw: string, limit: number, existingUids: Set<string>, onResult: (track: Track) => void): Promise<number> {
  const url = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(kw)}&token=${encodeURIComponent(JOOX_TOKEN)}&br=${encodeURIComponent(JOOX_BR)}`;
  let added = 0;
  try {
    const res = await retryFetch(() => fetch(url));
    const json = await res.json();
    const songs = json && json.code === 200 && json.data && Array.isArray(json.data.songs) ? json.data.songs : [];
    songs.slice(0, limit || songs.length).forEach((it: Record<string, unknown>, idx: number) => {
      const songMid = (it.songmid as string) || '';
      const songId = String((it['歌曲ID'] as string) || songMid || (idx + 1));
      const uid = `joox-${songMid || songId}`;
      if (existingUids.has(uid)) return;
      const track: Track = {
        uid, source: 'joox', displayIndex: idx + 1, keyword: kw, jooxIndex: idx + 1,
        songid: songId, songMid: songMid, title: (it['歌曲名称'] as string) || '', artist: (it['歌手'] as string) || '',
        album: (it['专辑'] as string) || '', cover: null, pageUrl: '', quality: null, qualityLabel: null,
        qqId: '', qqSearchKey: '', qqIndex: 0, jooxSongId: songId, jooxSongMid: songMid,
        qqQualityText: null, jooxQualityText: null, pay: null,
        audioUrl: null, lrc: (it['歌词内容'] as string) || null, lrcUrl: null, detailsLoaded: false
      };
      existingUids.add(uid);
      onResult(track);
      added++;
    });
  } catch (e) {
    console.error('JOOX search failed:', e);
    throw new Error('JOOX unavailable');
  }
  return added;
}

async function searchNetease(kw: string, page: number, num: number, existingUids: Set<string>, onResult: (track: Track) => void): Promise<number> {
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
    const res = await retryFetch(() => fetch(url));
    const json = await res.json();
    if (!Array.isArray(json)) return 0;
    json.forEach((it: Record<string, unknown>, idx: number) => {
      const songId = pickQueryParam(it.url as string, 'id') || `${kw}-${idx + 1}`;
      const uid = `netease-${songId}`;
      if (existingUids.has(uid)) return;
      const track: Track = {
        uid, source: 'netease', displayIndex: idx + 1, keyword: kw, songid: songId, songMid: '', qqId: '', qqSearchKey: '', qqIndex: 0,
        jooxIndex: 0, jooxSongId: '', jooxSongMid: '', title: (it.name as string) || '', artist: (it.artist as string) || '',
        album: '', cover: (it.pic as string) || null, pageUrl: '', quality: null, qualityLabel: null,
        qqQualityText: null, jooxQualityText: null, pay: null, detailsLoaded: false,
        audioUrl: (it.url as string) || null, lrc: null, lrcUrl: (it.lrc as string) || null
      };
      existingUids.add(uid);
      onResult(track);
      added++;
    });
  } catch (e) {
    console.error('Netease search failed:', e);
    throw new Error('Netease unavailable');
  }
  return added;
}

async function searchKuwo(kw: string, limit: number, existingUids: Set<string>, onResult: (track: Track) => void): Promise<number> {
  const url = `https://kw-api.cenguigui.cn/?name=${encodeURIComponent(kw)}&page=1&limit=${encodeURIComponent(limit)}`;
  let added = 0;
  try {
    const res = await retryFetch(() => fetch(url));
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data)) return 0;
    json.data.forEach((it: Record<string, unknown>, idx: number) => {
      const rid = String(it.rid);
      const uid = `kuwo-${rid}`;
      if (existingUids.has(uid)) return;
      const track: Track = {
        uid, source: 'kuwo', displayIndex: idx + 1, keyword: kw, songid: rid, songMid: '', qqId: '', qqSearchKey: '', qqIndex: 0,
        jooxIndex: 0, jooxSongId: '', jooxSongMid: '', title: (it.name as string) || '', artist: (it.artist as string) || '',
        album: (it.album as string) || '', cover: (it.pic as string) || null, pageUrl: '', quality: null, qualityLabel: null,
        qqQualityText: null, jooxQualityText: null, pay: null, detailsLoaded: false,
        audioUrl: null, lrc: null, lrcUrl: null
      };
      existingUids.add(uid);
      onResult(track);
      added++;
    });
  } catch (e) {
    console.error('Kuwo search failed:', e);
    throw new Error('Kuwo unavailable');
  }
  return added;
}

async function fetchQQDetails(track: Track, updateTrack: (t: Track) => void) {
  const msg = (track.qqSearchKey || track.keyword || '').trim() || ((track.title || '') + ' ' + (track.artist || '')).trim();
  const mid = (track.qqId || track.songMid || track.songid || '').toString().trim();
  if (!mid) return;
  const url = `https://tang.api.s01s.cn/music_open_api.php?msg=${encodeURIComponent(msg)}&type=json&mid=${encodeURIComponent(mid)}`;
  function pickBestPlayUrl(d: Record<string, unknown>) {
    if (d.song_play_url_sq) return { url: d.song_play_url_sq as string, tag: 'lossless', label: 'LOSSLESS', text: `SQ ${(d.kbps_sq as string) || ''}`.trim() };
    if (d.song_play_url_pq) return { url: d.song_play_url_pq as string, tag: 'lossless', label: 'LOSSLESS', text: `PQ ${(d.kbps_pq as string) || ''}`.trim() };
    if (d.song_play_url_accom) return { url: d.song_play_url_accom as string, tag: 'hq', label: 'HQ', text: `ACCOM ${(d.kbps_accom as string) || ''}`.trim() };
    if (d.song_play_url_hq) return { url: d.song_play_url_hq as string, tag: 'hq', label: 'HQ', text: `HQ ${(d.kbps_hq as string) || ''}`.trim() };
    if (d.song_play_url_standard) return { url: d.song_play_url_standard as string, tag: 'standard', label: 'STD', text: `STD ${(d.kbps_standard as string) || ''}`.trim() };
    if (d.song_play_url_fq) return { url: d.song_play_url_fq as string, tag: 'low', label: 'LOW', text: `FQ ${(d.kbps_fq as string) || ''}`.trim() };
    if (d.song_play_url) return { url: d.song_play_url as string, tag: null, label: null, text: null };
    return { url: null, tag: null, label: null, text: null };
  }
  try {
    const res = await retryFetch(() => fetch(url));
    const d = await res.json() as Record<string, unknown>;
    if (!d || typeof d !== 'object' || !d.song_mid) throw new Error('qq detail error');
    const best = pickBestPlayUrl(d);
    const q = best.url ? inferQualityFromUrl(best.url) : { tag: null, label: '' };
    const updated: Track = {
      ...track,
      title: (d.song_title as string) || (d.song_name as string) || track.title,
      artist: (d.singer_name as string) || track.artist,
      album: (d.album_name as string) || (d.album_title as string) || track.album || '',
      cover: (d.album_pic as string) || (d.singer_pic as string) || track.cover,
      pageUrl: (d.song_h5_url as string) || track.pageUrl,
      audioUrl: best.url || track.audioUrl,
      lrc: (d.song_lyric as string) || (d.lyric as string) || track.lrc,
      qqQualityText: best.text || (d.vip ? `VIP:${d.vip}` : null) || track.qqQualityText,
      quality: best.tag && best.label ? best.tag : q.tag,
      qualityLabel: best.tag && best.label ? best.label : q.label,
      detailsLoaded: true
    };
    updateTrack(updated);
  } catch (e) {
    console.error('QQ details fetch failed:', e);
  }
}

async function fetchKuwoDetails(track: Track, updateTrack: (t: Track) => void) {
  const api = `https://kw-api.cenguigui.cn/?id=${encodeURIComponent(track.songid)}&type=song&level=zp&format=json`;
  try {
    const res = await retryFetch(() => fetch(api));
    const j = await res.json() as Record<string, unknown>;
    if (!j || j.code !== 200 || !j.data) throw new Error('kuwo detail failed');
    const d = j.data as Record<string, unknown>;
    const q = d.url ? inferQualityFromUrl(d.url as string) : { tag: null, label: '' };
    const updated: Track = {
      ...track,
      title: (d.name as string) || track.title,
      artist: (d.artist as string) || track.artist,
      album: (d.album as string) || track.album,
      cover: (d.pic as string) || track.cover,
      audioUrl: (d.url as string) || track.audioUrl,
      lrc: (d.lyric as string) || track.lrc || null,
      lrcUrl: null,
      detailsLoaded: true,
      quality: q.tag,
      qualityLabel: q.label
    };
    updateTrack(updated);
  } catch (e) {
    console.error('Kuwo details fetch failed:', e);
  }
}

async function fetchJooxDetails(track: Track, updateTrack: (t: Track) => void) {
  const n = track.jooxIndex || track.displayIndex || 1;
  const url = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(track.keyword)}&n=${encodeURIComponent(n)}&token=${encodeURIComponent(JOOX_TOKEN)}&br=${encodeURIComponent(JOOX_BR)}`;
  try {
    const res = await retryFetch(() => fetch(url));
    const j = await res.json() as Record<string, unknown>;
    if (!j || j.code !== 200 || !j.data) throw new Error('joox detail failed');
    const d = j.data as Record<string, unknown>;
    const playLinks = (d['播放链接'] as Record<string, string>) || {};
    async function probeJooxAudioUrl(u: string) {
      if (!u) return false;
      async function request(method: string, extraOptions?: RequestInit) {
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
    const updated: Track = {
      ...track,
      title: (d['歌曲名称'] as string) || track.title,
      artist: (d['歌手'] as string) || track.artist,
      album: (d['专辑'] as string) || track.album,
      songid: (d['歌曲ID'] as string) || track.songid,
      songMid: (d.songmid as string) || track.songMid,
      audioUrl: best.url || track.audioUrl,
      lrc: (d['歌词内容'] as string) || track.lrc || null,
      lrcUrl: null,
      jooxQualityText: best.text || track.jooxQualityText || null,
      detailsLoaded: true
    };
    if (best.tag && best.label) {
      updated.quality = best.tag;
      updated.qualityLabel = best.label;
    } else if (updated.audioUrl) {
      const q = inferQualityFromUrl(updated.audioUrl);
      updated.quality = q.tag;
      updated.qualityLabel = q.label;
    }
    updateTrack(updated);
  } catch (e) {
    console.error('JOOX details fetch failed:', e);
  }
}

async function fetchNeteaseDetails(track: Track, updateTrack: (t: Track) => void) {
  if (track.audioUrl) {
    const q = inferQualityFromUrl(track.audioUrl);
    updateTrack({ ...track, quality: q.tag, qualityLabel: q.label });
  }
  if (!track.lrc && track.lrcUrl) {
    try {
      const lr = await retryFetch(() => fetch(track.lrcUrl!));
      const contentType = (lr.headers.get('content-type') || '').toLowerCase();
      let lrc = '';
      if (contentType.includes('json')) {
        const lj = await lr.json();
        lrc = (typeof lj === 'string' ? lj : null) || lj?.lrc || lj?.lyric || lj?.data?.lrc || lj?.data?.lyric || (typeof lj?.data === 'string' ? lj.data : null) || track.lrc || null;
      } else {
        lrc = await lr.text();
      }
      updateTrack({ ...track, lrc: lrc || track.lrc, detailsLoaded: true });
      return;
    } catch (e) {
      console.error('Netease lrc fetch failed:', e);
    }
  }
  updateTrack({ ...track, detailsLoaded: true });
}

export interface SearchState {
  searchKeyword: string;
  searchResults: Track[];
  trackMap: Map<string, Track>;
  enabledSources: Record<string, boolean>;
  perSourceLimit: number;
  perSourceCurrentLimit: Record<string, number>;
  perSourcePage: Record<string, number>;
  searchInProgress: boolean;
  noMoreResults: boolean;
  sourceErrors: Record<string, string>;
  sourceStatus: Record<string, 'ok' | 'error' | 'unknown'>;
  searchCache: Map<string, { data: Track[]; timestamp: number }>;
  abortController: AbortController | null;
  search: (reset: boolean, kwOverride?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  setSearchKeyword: (k: string) => void;
  setEnabledSources: (s: Record<string, boolean>) => void;
  setPerSourceLimit: (n: number) => void;
  setTrackMap: (map: Map<string, Track>) => void;
  addTrack: (track: Track) => void;
  addTracks: (tracks: Track[]) => void;
  clearSearch: () => void;
  getInterleavedSearchList: () => Track[];
  getActiveList: (playContext: PlayContext) => Track[];
  ensureTrackDetails: (track: Track) => Promise<Track | null>;
  setSourceStatus: (source: string, status: 'ok' | 'error' | 'unknown') => void;
  setAbortController: (controller: AbortController | null) => void;
}

const initialPerSourceLimit = { qq: 5, joox: 5, netease: 5, kuwo: 5 };
const initialPerSourcePage = { qq: 1, joox: 1, netease: 1, kuwo: 1 };

export const useSearchStore = create<SearchState>()((set, get) => ({
  searchKeyword: '',
  searchResults: [],
  trackMap: new Map(),
  enabledSources: { qq: true, joox: true, netease: true, kuwo: true },
  perSourceLimit: 5,
  perSourceCurrentLimit: { ...initialPerSourceLimit },
  perSourcePage: { ...initialPerSourcePage },
  searchInProgress: false,
  noMoreResults: false,
  sourceErrors: {},
  sourceStatus: { qq: 'unknown', joox: 'unknown', netease: 'unknown', kuwo: 'unknown' },
  searchCache: new Map<string, { data: Track[]; timestamp: number }>(),
  abortController: null,

  setSearchKeyword: (k) => set({ searchKeyword: k }),
  setEnabledSources: (s) => set({ enabledSources: s }),
  setPerSourceLimit: (n) => set({ perSourceLimit: n }),
  setTrackMap: (map) => set({ trackMap: map }),
  setSourceStatus: (source, status) => set(state => ({
    sourceStatus: { ...state.sourceStatus, [source]: status }
  })),
  setAbortController: (controller) => set({ abortController: controller }),
  addTrack: (track) => set(state => {
    const newResults = [...state.searchResults, track];
    const newMap = new Map(state.trackMap);
    newMap.set(track.uid, track);
    return { searchResults: newResults, trackMap: newMap };
  }),
  addTracks: (tracks) => set(state => {
    const newResults = [...state.searchResults, ...tracks];
    const newMap = new Map(state.trackMap);
    tracks.forEach(t => newMap.set(t.uid, t));
    return { searchResults: newResults, trackMap: newMap };
  }),
  clearSearch: () => set({
    searchResults: [],
    trackMap: new Map(),
    perSourceCurrentLimit: { ...initialPerSourceLimit },
    perSourcePage: { ...initialPerSourcePage },
    noMoreResults: false,
    sourceErrors: {}
  }),

  getInterleavedSearchList: () => {
    const grouped: Record<string, Track[]> = { qq: [], joox: [], netease: [], kuwo: [] };
    get().searchResults.forEach(t => { if (grouped[t.source]) grouped[t.source].push(t); });
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
  },

  getActiveList: (playContext) => {
    if (playContext.type === 'results') return get().getInterleavedSearchList();
    if (playContext.type === 'favorites') return [];
    if (playContext.type === 'local') return [];
    return [];
  },

  ensureTrackDetails: async (track) => {
    if (track.source === 'local') return track;
    if (track.detailsLoaded && track.audioUrl && (track.lrc || !track.lrcUrl)) return track;
    const update = (t: Track) => set(state => {
      const newMap = new Map(state.trackMap);
      newMap.set(t.uid, t);
      return { trackMap: newMap };
    });
    if (track.source === 'netease') {
      if (!track.audioUrl && track.songid) {
        track.audioUrl = `https://api.qijieya.cn/meting/?server=netease&type=url&id=${encodeURIComponent(track.songid)}`;
      }
      if (!track.lrcUrl && track.songid) {
        track.lrcUrl = `https://api.qijieya.cn/meting/?server=netease&type=lrc&id=${encodeURIComponent(track.songid)}`;
      }
      await fetchNeteaseDetails(track, update);
    } else if (track.source === 'kuwo') {
      await fetchKuwoDetails(track, update);
    } else if (track.source === 'joox') {
      await fetchJooxDetails(track, update);
    } else {
      await fetchQQDetails(track, update);
    }
    const updated = get().trackMap.get(track.uid) || track;
    return updated;
  },

  search: async (reset, kwOverride) => {
    const kw = kwOverride !== undefined ? kwOverride : get().searchKeyword;
    if (!kw) return;
    const enabled = Object.keys(get().enabledSources).filter(k => get().enabledSources[k]);
    if (!enabled.length) return;

    const cacheKey = `${kw}-${enabled.sort().join(',')}-${get().perSourceLimit}`;
    const cached = get().searchCache.get(cacheKey);
    const now = Date.now();
    if (cached && !reset && (now - cached.timestamp < 5 * 60 * 1000)) {
      set({ searchResults: cached.data, searchInProgress: false, noMoreResults: true });
      return;
    }

    const controller = new AbortController();
    const prev = get().abortController;
    if (prev) prev.abort();
    set({ abortController: controller });

    if (reset) {
      set({
        searchKeyword: kw,
        searchInProgress: true,
        perSourceCurrentLimit: { ...initialPerSourceLimit },
        perSourcePage: { ...initialPerSourcePage },
        searchResults: [],
        trackMap: new Map(),
        noMoreResults: false,
        sourceErrors: {},
        sourceStatus: { qq: 'unknown', joox: 'unknown', netease: 'unknown', kuwo: 'unknown' }
      });
    } else {
      set({ searchInProgress: true });
    }

    const currentState = get();
    const tasks: Promise<{ source: string; count: number }>[] = [];
    const existingUids = new Set(currentState.trackMap.keys());

    for (const s of enabled) {
      const limit = currentState.perSourceCurrentLimit[s] || currentState.perSourceLimit;
      const page = currentState.perSourcePage[s] || 1;
      const onResult = (track: Track) => get().addTrack(track);

      if (s === 'qq') tasks.push(searchQQ(kw, limit, existingUids, onResult).then(count => ({ source: 'qq', count })).catch(e => ({ source: 'qq', count: 0, error: (e as Error).message })));
      if (s === 'joox') tasks.push(searchJoox(kw, limit, existingUids, onResult).then(count => ({ source: 'joox', count })).catch(e => ({ source: 'joox', count: 0, error: (e as Error).message })));
      if (s === 'netease') tasks.push(searchNetease(kw, page, currentState.perSourceLimit, existingUids, onResult).then(count => ({ source: 'netease', count })).catch(e => ({ source: 'netease', count: 0, error: (e as Error).message })));
      if (s === 'kuwo') tasks.push(searchKuwo(kw, limit, existingUids, onResult).then(count => ({ source: 'kuwo', count })).catch(e => ({ source: 'kuwo', count: 0, error: (e as Error).message })));
    }

    let added = 0;
    const sourceErrors: Record<string, string> = {};
    const sourceStatus: Record<string, 'ok' | 'error' | 'unknown'> = {};
    try {
      const res = await Promise.all(tasks);
      res.forEach(r => {
        added += r.count;
        if ((r as Record<string, unknown>).error) {
          sourceErrors[r.source] = (r as Record<string, unknown>).error as string;
          sourceStatus[r.source] = 'error';
        } else {
          sourceStatus[r.source] = 'ok';
        }
      });
    } catch (e) {
      console.error('Search failed:', e);
    }

    const state = get();
    const newCache = new Map(state.searchCache);
    newCache.set(cacheKey, { data: state.searchResults, timestamp: Date.now() });
    if (newCache.size > 50) {
      const firstKey = newCache.keys().next().value;
      if (firstKey) newCache.delete(firstKey);
    }

    set(state => ({
      searchInProgress: false,
      noMoreResults: added === 0 && !reset,
      sourceErrors: { ...state.sourceErrors, ...sourceErrors },
      sourceStatus: { ...state.sourceStatus, ...sourceStatus },
      searchCache: newCache,
      abortController: null
    }));
  },

  loadMore: async () => {
    const state = get();
    const enabled = Object.keys(state.enabledSources).filter(k => state.enabledSources[k]);
    if (!enabled.length) return;
    set({ searchInProgress: true, noMoreResults: false });

    const controller = new AbortController();
    const prev = get().abortController;
    if (prev) prev.abort();
    set({ abortController: controller });

    const tasks: Promise<{ source: string; count: number }>[] = [];
    const existingUids = new Set(state.trackMap.keys());
    const newPerSourcePage = { ...state.perSourcePage };

    for (const s of enabled) {
      newPerSourcePage[s] = (newPerSourcePage[s] || 1) + 1;
      const page = newPerSourcePage[s];
      const onResult = (track: Track) => get().addTrack(track);
      if (s === 'qq') tasks.push(searchQQ(state.searchKeyword, state.perSourceLimit, existingUids, onResult).then(count => ({ source: 'qq', count })).catch(e => ({ source: 'qq', count: 0, error: (e as Error).message })));
      if (s === 'joox') tasks.push(searchJoox(state.searchKeyword, state.perSourceLimit, existingUids, onResult).then(count => ({ source: 'joox', count })).catch(e => ({ source: 'joox', count: 0, error: (e as Error).message })));
      if (s === 'netease') tasks.push(searchNetease(state.searchKeyword, page, state.perSourceLimit, existingUids, onResult).then(count => ({ source: 'netease', count })).catch(e => ({ source: 'netease', count: 0, error: (e as Error).message })));
      if (s === 'kuwo') tasks.push(searchKuwo(state.searchKeyword, state.perSourceLimit, existingUids, onResult).then(count => ({ source: 'kuwo', count })).catch(e => ({ source: 'kuwo', count: 0, error: (e as Error).message })));
    }

    let added = 0;
    const sourceErrors: Record<string, string> = {};
    const sourceStatus: Record<string, 'ok' | 'error' | 'unknown'> = {};
    try {
      const res = await Promise.all(tasks);
      res.forEach(r => {
        added += r.count;
        if ((r as Record<string, unknown>).error) {
          sourceErrors[r.source] = (r as Record<string, unknown>).error as string;
          sourceStatus[r.source] = 'error';
        } else {
          sourceStatus[r.source] = 'ok';
        }
      });
    } catch (e) {
      console.error('Load more failed:', e);
    }

    const searchState = get();
    const newCache = new Map(searchState.searchCache);
    newCache.delete(`${state.searchKeyword}-${enabled.sort().join(',')}-${state.perSourceLimit}`);

    set(state => ({
      searchInProgress: false,
      perSourcePage: newPerSourcePage,
      noMoreResults: added === 0,
      sourceErrors: { ...state.sourceErrors, ...sourceErrors },
      sourceStatus: { ...state.sourceStatus, ...sourceStatus },
      searchCache: newCache,
      abortController: null
    }));
  }
}));
