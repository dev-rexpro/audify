import { type Track } from '../stores/types';

export async function fetchQQDetails(track: Track, updateTrack: (t: Track) => void) {
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

export async function fetchKuwoDetails(track: Track, updateTrack: (t: Track) => void) {
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

export async function fetchJooxDetails(track: Track, updateTrack: (t: Track) => void) {
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

export async function fetchNeteaseDetails(track: Track, updateTrack: (t: Track) => void) {
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

export async function ensureTrackDetails(track: Track, updateTrack: (t: Track) => void) {
  if (track.source === 'local') return;
  if (track.detailsLoaded && track.audioUrl && (track.lrc || !track.lrcUrl)) return;
  if (track.source === 'netease') {
    if (!track.audioUrl && track.songid) {
      track.audioUrl = `https://api.qijieya.cn/meting/?server=netease&type=url&id=${encodeURIComponent(track.songid)}`;
    }
    if (!track.lrcUrl && track.songid) {
      track.lrcUrl = `https://api.qijieya.cn/meting/?server=netease&type=lrc&id=${encodeURIComponent(track.songid)}`;
    }
    await fetchNeteaseDetails(track, updateTrack);
  } else if (track.source === 'kuwo') {
    await fetchKuwoDetails(track, updateTrack);
  } else if (track.source === 'joox') {
    await fetchJooxDetails(track, updateTrack);
  } else {
    await fetchQQDetails(track, updateTrack);
  }
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

const JOOX_TOKEN = 'f84ao9lMF_q7husBWRfgUw';
const JOOX_BR = 4;

import { getOfflineTrack } from './db';

export async function getOfflineTrackFromDB(uid: string): Promise<{ uid: string; title: string; artist: string; album: string; cover: string | null; audioBlob: Blob; lrc: string | null; savedAt: string } | null> {
  try {
    const record = await getOfflineTrack(uid);
    if (!record) return null;
    return {
      uid: record.uid,
      title: record.title,
      artist: record.artist,
      album: record.album,
      cover: record.cover,
      audioBlob: record.audioBlob,
      lrc: record.lrc,
      savedAt: record.savedAt
    };
  } catch (e) {
    return null;
  }
}
