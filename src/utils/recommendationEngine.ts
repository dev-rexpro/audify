import type { Track } from '../stores/types';

export async function fetchSmartRecommendations(history: Track[], favorites: Track[]): Promise<Track[]> {
  try {
    const combined = [...history, ...favorites];
    
    // Extract top artist/keywords
    const artistCounts: Record<string, number> = {};
    combined.forEach(t => {
      if (t.artist && t.artist !== 'Unknown Artist') {
        artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      }
    });

    // Sort artists by frequency
    const topArtists = Object.keys(artistCounts).sort((a, b) => artistCounts[b] - artistCounts[a]);
    
    // Pick target keywords
    let queryKeyword = 'Top Hits 2026';
    if (topArtists.length > 0) {
      queryKeyword = topArtists[0];
    } else if (history.length > 0 && history[0].artist) {
      queryKeyword = history[0].artist;
    }

    const url = `https://tang.api.s01s.cn/music_open_api.php?msg=${encodeURIComponent(queryKeyword)}&type=json`;
    const res = await fetch(url);
    const json = await res.json();
    const data = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);

    if (!Array.isArray(data) || data.length === 0) return [];

    const existingUids = new Set(history.map(h => h.uid));
    const rawList = data.slice(0, 15);

    const results = await Promise.all(rawList.map(async (it: Record<string, unknown>, idx: number) => {
      const mid = (it.song_mid as string) || '';
      if (!mid) return null;
      const uid = `qq-${mid}`;
      if (existingUids.has(uid)) return null;

      const title = (it.song_title as string) || (it.song_name as string) || 'Unknown';
      const artist = (it.singer_name as string) || 'Unknown';

      // 1. Try iTunes 600x600 official HD album art first
      let albumPic: string | null = null;
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}&entity=song&limit=1`);
        const itunesJson = await itunesRes.json();
        if (itunesJson.results && itunesJson.results.length > 0 && itunesJson.results[0].artworkUrl100) {
          albumPic = itunesJson.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
      } catch (e) {}

      // 2. Fallback to QQ Music album/singer picture
      if (!albumPic) {
        const albumMid = (it.album_mid as string) || (it.albummid as string) || '';
        const singerMid = (it.singer_mid as string) || (it.singermid as string) || '';
        albumPic = (it.album_pic as string) || (it.singer_pic as string);
        
        if (!albumPic && albumMid) {
          albumPic = `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg`;
        } else if (!albumPic && singerMid) {
          albumPic = `https://y.qq.com/music/photo_new/T001R300x300M000${singerMid}.jpg`;
        }
      }

      // 3. Fallback to high quality music artwork
      if (!albumPic) {
        const fallbacks = [
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'
        ];
        albumPic = fallbacks[idx % fallbacks.length];
      }

      const track: Track = {
        uid,
        source: 'qq',
        displayIndex: idx + 1,
        keyword: queryKeyword,
        qqSearchKey: queryKeyword,
        qqIndex: idx + 1,
        qqId: mid,
        songid: mid,
        songMid: mid,
        title,
        artist,
        album: '',
        cover: albumPic,
        pageUrl: '',
        quality: null,
        qualityLabel: null,
        qqQualityText: (it.pay as string) || null,
        jooxQualityText: null,
        pay: (it.pay as string) || null,
        jooxIndex: 0,
        jooxSongId: '',
        jooxSongMid: '',
        audioUrl: null,
        lrc: null,
        lrcUrl: null,
        detailsLoaded: false
      };
      return track;
    }));

    return results.filter((t): t is Track => t !== null);
  } catch (e) {
    console.error('Recommendation fetch failed:', e);
    return [];
  }
}
