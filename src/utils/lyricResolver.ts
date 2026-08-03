export async function fetchOnlineLyrics(title: string, artist: string): Promise<string | null> {
  if (!title || title === 'Unknown') return null;

  const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const cleanArtist = (artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();

  // 1. Try LRCLIB exact get endpoint
  try {
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.syncedLyrics) return data.syncedLyrics;
      if (data && data.plainLyrics) return data.plainLyrics;
    }
  } catch (e) {}

  // 2. Try LRCLIB search endpoint as fallback
  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        const item = searchData[0];
        if (item.syncedLyrics) return item.syncedLyrics;
        if (item.plainLyrics) return item.plainLyrics;
      }
    }
  } catch (e) {}

  // 3. Try Netease Lyric Search API fallback
  try {
    const neteaseUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}&type=1&offset=0&limit=1`;
    const nRes = await fetch(neteaseUrl);
    if (nRes.ok) {
      const nJson = await nRes.json();
      const songs = nJson?.result?.songs;
      if (Array.isArray(songs) && songs.length > 0 && songs[0].id) {
        const songId = songs[0].id;
        const lrcRes = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&kv=-1&tv=-1`);
        if (lrcRes.ok) {
          const lrcJson = await lrcRes.json();
          if (lrcJson?.lrc?.lyric) return lrcJson.lrc.lyric;
        }
      }
    }
  } catch (e) {}

  return null;
}
