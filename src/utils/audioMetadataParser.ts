export interface LocalAudioMetadata {
  title: string;
  artist: string;
  album: string;
  cover: string | null;
}

export async function parseAudioMetadata(file: File): Promise<LocalAudioMetadata> {
  const cleanFileName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*\(\d+\)$/, '')
    .replace(/^\d+\s*/, '') // strip leading track numbers like "01 "
    .trim();

  let fallbackTitle = cleanFileName;
  let fallbackArtist = 'Unknown Artist';

  if (cleanFileName.includes(' - ')) {
    const parts = cleanFileName.split(' - ');
    fallbackArtist = parts[0].trim();
    fallbackTitle = parts.slice(1).join(' - ').trim();
  }

  const meta: LocalAudioMetadata = {
    title: fallbackTitle,
    artist: fallbackArtist,
    album: '',
    cover: null
  };

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // MP4/M4A/AAC container → iTunes atom metadata
    if (['m4a', 'mp4', 'aac', 'm4b', 'm4p', 'alac'].includes(ext) || file.type.includes('mp4') || file.type.includes('m4a')) {
      await parseMP4Metadata(file, meta);
    }
    // FLAC → Vorbis comments
    else if (ext === 'flac' || file.type.includes('flac')) {
      await parseFLACMetadata(file, meta);
    }
    // OGG/OPUS → Vorbis comments
    else if (['ogg', 'opus'].includes(ext) || file.type.includes('ogg')) {
      await parseOggMetadata(file, meta);
    }
    // MP3 / everything else → ID3
    else {
      await parseID3Metadata(file, meta);
    }
  } catch (e) {
    console.warn('Metadata parse error for', file.name, e);
  }

  return meta;
}

// ─── MP4/M4A Parser (iTunes atoms) ───────────────────────────────────

async function parseMP4Metadata(file: File, meta: LocalAudioMetadata): Promise<void> {
  // Read enough to find moov atom – typically within first 5MB
  const readSize = Math.min(file.size, 5 * 1024 * 1024);
  const buf = await file.slice(0, readSize).arrayBuffer();
  const view = new DataView(buf);

  // Find moov atom
  const moovOffset = findAtom(view, 0, buf.byteLength, 'moov');
  if (moovOffset < 0) return;

  const moovSize = view.getUint32(moovOffset);
  const moovEnd = Math.min(moovOffset + moovSize, buf.byteLength);
  const moovBody = moovOffset + 8;

  // Find udta inside moov
  const udtaOffset = findAtom(view, moovBody, moovEnd, 'udta');
  if (udtaOffset < 0) return;

  const udtaSize = view.getUint32(udtaOffset);
  const udtaEnd = Math.min(udtaOffset + udtaSize, moovEnd);
  const udtaBody = udtaOffset + 8;

  // Find meta inside udta
  const metaOffset = findAtom(view, udtaBody, udtaEnd, 'meta');
  if (metaOffset < 0) return;

  const metaSize = view.getUint32(metaOffset);
  const metaEnd = Math.min(metaOffset + metaSize, udtaEnd);
  // meta has 4 extra bytes (version + flags) after the 8-byte header
  const metaBody = metaOffset + 12;

  // Find ilst inside meta
  const ilstOffset = findAtom(view, metaBody, metaEnd, 'ilst');
  if (ilstOffset < 0) return;

  const ilstSize = view.getUint32(ilstOffset);
  const ilstEnd = Math.min(ilstOffset + ilstSize, metaEnd);
  const ilstBody = ilstOffset + 8;

  // Parse ilst entries
  let pos = ilstBody;
  while (pos + 8 < ilstEnd) {
    const atomSize = view.getUint32(pos);
    if (atomSize < 8 || pos + atomSize > ilstEnd) break;

    const atomType = getString(view, pos + 4, 4);
    const atomEnd = pos + atomSize;

    // Find "data" sub-atom inside this entry
    const dataOffset = findAtom(view, pos + 8, atomEnd, 'data');
    if (dataOffset >= 0) {
      const dataSize = view.getUint32(dataOffset);
      const dataType = view.getUint32(dataOffset + 8); // data type flags
      const dataBody = dataOffset + 16; // skip: size(4) + "data"(4) + type(4) + locale(4)
      const dataLen = dataSize - 16;

      if (dataLen > 0 && dataBody + dataLen <= buf.byteLength) {
        if (atomType === '\xA9nam') { // ©nam = title
          meta.title = decodeUTF8(view, dataBody, dataLen);
        } else if (atomType === '\xA9ART') { // ©ART = artist
          meta.artist = decodeUTF8(view, dataBody, dataLen);
        } else if (atomType === '\xA9alb') { // ©alb = album
          meta.album = decodeUTF8(view, dataBody, dataLen);
        } else if (atomType === 'aART') { // album artist
          if (meta.artist === 'Unknown Artist') {
            meta.artist = decodeUTF8(view, dataBody, dataLen);
          }
        } else if (atomType === 'covr') { // cover art
          const imgBytes = new Uint8Array(buf, dataBody, dataLen);
          const copy = new Uint8Array(imgBytes);
          // Detect MIME from first bytes
          let mime = 'image/jpeg';
          if (copy[0] === 0x89 && copy[1] === 0x50) mime = 'image/png';
          meta.cover = bytesToDataUrl(copy, mime);
        }
      }
    }

    pos = atomEnd;
  }
}

function findAtom(view: DataView, start: number, end: number, target: string): number {
  let pos = start;
  while (pos + 8 <= end) {
    const size = view.getUint32(pos);
    if (size < 8) return -1;
    const type = getString(view, pos + 4, 4);
    if (type === target) return pos;
    pos += size;
  }
  return -1;
}

function getString(view: DataView, offset: number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

function decodeUTF8(view: DataView, offset: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
}

// ─── FLAC Parser (Vorbis Comments) ───────────────────────────────────

async function parseFLACMetadata(file: File, meta: LocalAudioMetadata): Promise<void> {
  const readSize = Math.min(file.size, 2 * 1024 * 1024);
  const buf = await file.slice(0, readSize).arrayBuffer();
  const view = new DataView(buf);

  // Check "fLaC" magic
  if (buf.byteLength < 4) return;
  if (getString(view, 0, 4) !== 'fLaC') return;

  let pos = 4;
  while (pos + 4 < buf.byteLength) {
    const blockHeader = view.getUint8(pos);
    const isLast = (blockHeader & 0x80) !== 0;
    const blockType = blockHeader & 0x7F;
    const blockSize = (view.getUint8(pos + 1) << 16) | (view.getUint8(pos + 2) << 8) | view.getUint8(pos + 3);
    pos += 4;

    if (pos + blockSize > buf.byteLength) break;

    if (blockType === 4) {
      // Vorbis Comment block
      parseVorbisComments(view, pos, blockSize, meta);
    } else if (blockType === 6) {
      // Picture block
      parseFLACPicture(view, pos, blockSize, meta);
    }

    pos += blockSize;
    if (isLast) break;
  }
}

function parseVorbisComments(view: DataView, offset: number, _length: number, meta: LocalAudioMetadata): void {
  try {
    let pos = offset;
    const vendorLen = view.getUint32(pos, true); // little-endian
    pos += 4 + vendorLen;
    const commentCount = view.getUint32(pos, true);
    pos += 4;

    for (let i = 0; i < commentCount; i++) {
      const commentLen = view.getUint32(pos, true);
      pos += 4;
      const commentBytes = new Uint8Array(view.buffer, view.byteOffset + pos, commentLen);
      const comment = new TextDecoder('utf-8').decode(commentBytes);
      pos += commentLen;

      const eqIdx = comment.indexOf('=');
      if (eqIdx < 0) continue;
      const key = comment.substring(0, eqIdx).toUpperCase();
      const val = comment.substring(eqIdx + 1).trim();

      if (key === 'TITLE' && val) meta.title = val;
      else if (key === 'ARTIST' && val) meta.artist = val;
      else if (key === 'ALBUM' && val) meta.album = val;
    }
  } catch (e) {}
}

function parseFLACPicture(view: DataView, offset: number, _length: number, meta: LocalAudioMetadata): void {
  if (meta.cover) return;
  try {
    let pos = offset;
    pos += 4; // picture type
    const mimeLen = view.getUint32(pos);
    pos += 4;
    const mimeBytes = new Uint8Array(view.buffer, view.byteOffset + pos, mimeLen);
    const mime = new TextDecoder('ascii').decode(mimeBytes);
    pos += mimeLen;
    const descLen = view.getUint32(pos);
    pos += 4 + descLen;
    pos += 16; // width, height, color depth, colors used
    const picDataLen = view.getUint32(pos);
    pos += 4;
    const imgBytes = new Uint8Array(view.buffer, view.byteOffset + pos, picDataLen);
    const copy = new Uint8Array(imgBytes);
    meta.cover = bytesToDataUrl(copy, mime || 'image/jpeg');
  } catch (e) {}
}

// ─── OGG/OPUS Parser ─────────────────────────────────────────────────

async function parseOggMetadata(file: File, meta: LocalAudioMetadata): Promise<void> {
  const readSize = Math.min(file.size, 512 * 1024);
  const buf = await file.slice(0, readSize).arrayBuffer();
  const view = new DataView(buf);

  // Find second OGG page (contains Vorbis comment / OpusTags)
  let pos = 0;
  let pageCount = 0;
  while (pos + 27 < buf.byteLength && pageCount < 5) {
    if (getString(view, pos, 4) !== 'OggS') break;
    const segments = view.getUint8(pos + 26);
    let pageDataSize = 0;
    for (let i = 0; i < segments; i++) {
      pageDataSize += view.getUint8(pos + 27 + i);
    }
    const headerEnd = pos + 27 + segments;
    pageCount++;

    if (pageCount >= 2) {
      // Check for Vorbis comment header or OpusTags
      const pageData = headerEnd;
      const sig7 = getString(view, pageData, 7);
      const sig8 = getString(view, pageData, 8);

      let commentStart = 0;
      if (sig7 === '\x03vorbis') {
        commentStart = pageData + 7;
      } else if (sig8 === 'OpusTags') {
        commentStart = pageData + 8;
      }

      if (commentStart > 0) {
        const commentLen = headerEnd + pageDataSize - commentStart;
        parseVorbisComments(view, commentStart, commentLen, meta);
      }
      break;
    }

    pos = headerEnd + pageDataSize;
  }
}

// ─── ID3 Parser (MP3) ────────────────────────────────────────────────

async function parseID3Metadata(file: File, meta: LocalAudioMetadata): Promise<void> {
  // 1. ID3v2 at start
  const headerBuf = await file.slice(0, 10).arrayBuffer();
  if (headerBuf.byteLength >= 10) {
    const hv = new DataView(headerBuf);
    if (hv.getUint8(0) === 0x49 && hv.getUint8(1) === 0x44 && hv.getUint8(2) === 0x33) {
      const version = hv.getUint8(3);
      const tagSize = parseSyncsafeInteger(hv, 6);
      const fullSize = Math.min(file.size, 10 + tagSize + 1024);
      const buf = await file.slice(0, fullSize).arrayBuffer();
      const data = new DataView(buf);
      const maxOffset = buf.byteLength;

      let offset = 10;
      const flags = hv.getUint8(5);
      if ((flags & 0x40) !== 0 && maxOffset >= 14) {
        if (version === 3) {
          const extSize = data.getUint32(10);
          offset += 4 + extSize;
        } else if (version === 4) {
          const extSize = parseSyncsafeInteger(data, 10);
          offset += extSize;
        }
      }

      const isV22 = (version === 2);

      while (offset < maxOffset - (isV22 ? 6 : 10)) {
        let frameId = '';
        let frameSize = 0;
        let headerLength = 10;

        if (isV22) {
          headerLength = 6;
          for (let i = 0; i < 3; i++) {
            const c = data.getUint8(offset + i);
            if (c >= 32 && c <= 126) frameId += String.fromCharCode(c);
          }
          if (!frameId || frameId.length < 3 || frameId[0] === '\0') break;
          frameSize = (data.getUint8(offset + 3) << 16) | (data.getUint8(offset + 4) << 8) | data.getUint8(offset + 5);
        } else {
          for (let i = 0; i < 4; i++) {
            const c = data.getUint8(offset + i);
            if (c >= 32 && c <= 126) frameId += String.fromCharCode(c);
          }
          if (!frameId || frameId.length < 4 || frameId[0] === '\0') break;
          frameSize = version === 4 ? parseSyncsafeInteger(data, offset + 4) : data.getUint32(offset + 4);
        }

        if (frameSize <= 0 || offset + headerLength + frameSize > maxOffset) break;
        const fdo = offset + headerLength;

        if (frameId === 'TIT2' || frameId === 'TT2') {
          const s = decodeID3Text(data, fdo, frameSize);
          if (s) meta.title = s;
        } else if (frameId === 'TPE1' || frameId === 'TP1') {
          const s = decodeID3Text(data, fdo, frameSize);
          if (s) meta.artist = s;
        } else if (frameId === 'TALB' || frameId === 'TAL') {
          const s = decodeID3Text(data, fdo, frameSize);
          if (s) meta.album = s;
        } else if ((frameId === 'APIC' || frameId === 'PIC') && !meta.cover) {
          meta.cover = parseID3Picture(data, fdo, frameSize, isV22);
        }

        offset += headerLength + frameSize;
      }
    }
  }

  // 2. ID3v1 fallback at end
  if (file.size >= 128 && meta.artist === 'Unknown Artist') {
    const v1Buf = await file.slice(file.size - 128, file.size).arrayBuffer();
    if (v1Buf.byteLength === 128) {
      const v1 = new DataView(v1Buf);
      if (v1.getUint8(0) === 0x54 && v1.getUint8(1) === 0x41 && v1.getUint8(2) === 0x47) {
        const dec = new TextDecoder('latin1');
        const t = dec.decode(new Uint8Array(v1Buf, 3, 30)).replace(/\0/g, '').trim();
        const a = dec.decode(new Uint8Array(v1Buf, 33, 30)).replace(/\0/g, '').trim();
        const alb = dec.decode(new Uint8Array(v1Buf, 63, 30)).replace(/\0/g, '').trim();
        if (t) meta.title = t;
        if (a) meta.artist = a;
        if (alb) meta.album = alb;
      }
    }
  }
}

function parseSyncsafeInteger(data: DataView, offset: number): number {
  return (
    ((data.getUint8(offset) & 0x7f) << 21) |
    ((data.getUint8(offset + 1) & 0x7f) << 14) |
    ((data.getUint8(offset + 2) & 0x7f) << 7) |
    (data.getUint8(offset + 3) & 0x7f)
  );
}

function decodeID3Text(data: DataView, offset: number, length: number): string {
  if (length <= 1) return '';
  const encoding = data.getUint8(offset);
  const bytes = new Uint8Array(data.buffer, data.byteOffset + offset + 1, length - 1);
  try {
    const codec = encoding === 0 ? 'latin1' : encoding === 1 ? 'utf-16' : encoding === 2 ? 'utf-16be' : 'utf-8';
    return new TextDecoder(codec).decode(bytes).replace(/\0/g, '').trim();
  } catch {
    return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
  }
}

function parseID3Picture(data: DataView, offset: number, length: number, isV22: boolean): string | null {
  try {
    const encoding = data.getUint8(offset);
    let pos = offset + 1;
    let mimeType = 'image/jpeg';

    if (isV22) {
      let fmt = '';
      for (let i = 0; i < 3; i++) fmt += String.fromCharCode(data.getUint8(pos + i));
      pos += 3;
      if (fmt.toUpperCase().includes('PNG')) mimeType = 'image/png';
    } else {
      let mimeStr = '';
      while (pos < offset + length && data.getUint8(pos) !== 0) {
        mimeStr += String.fromCharCode(data.getUint8(pos));
        pos++;
      }
      pos++;
      if (mimeStr.toLowerCase().includes('png')) mimeType = 'image/png';
      else if (mimeStr.toLowerCase().includes('webp')) mimeType = 'image/webp';
    }

    pos++; // picture type

    if (encoding === 1 || encoding === 2) {
      while (pos + 1 < offset + length && !(data.getUint8(pos) === 0 && data.getUint8(pos + 1) === 0)) pos += 2;
      pos += 2;
    } else {
      while (pos < offset + length && data.getUint8(pos) !== 0) pos++;
      pos++;
    }

    const imgLen = (offset + length) - pos;
    if (imgLen <= 0) return null;

    const imgBytes = new Uint8Array(data.buffer, data.byteOffset + pos, imgLen);
    const copy = new Uint8Array(imgBytes);
    return bytesToDataUrl(copy, mimeType);
  } catch {
    return null;
  }
}

export function bytesToDataUrl(bytes: Uint8Array, mimeType = 'image/jpeg'): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
