function encodeUTF16WithBOM(str: string): Uint8Array {
  const buf = new Uint8Array(2 + str.length * 2);
  buf[0] = 0xff;
  buf[1] = 0xfe;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    buf[2 + i * 2] = code & 0xff;
    buf[2 + i * 2 + 1] = (code >> 8) & 0xff;
  }
  return buf;
}

function createTextFrame(frameId: string, text: string): Uint8Array {
  if (!text) return new Uint8Array(0);
  const encodedText = encodeUTF16WithBOM(text);
  const payloadSize = 1 + encodedText.length;
  const frame = new Uint8Array(10 + payloadSize);

  for (let i = 0; i < 4; i++) {
    frame[i] = frameId.charCodeAt(i);
  }

  frame[4] = (payloadSize >> 24) & 0xff;
  frame[5] = (payloadSize >> 16) & 0xff;
  frame[6] = (payloadSize >> 8) & 0xff;
  frame[7] = payloadSize & 0xff;

  frame[8] = 0x00;
  frame[9] = 0x00;

  frame[10] = 0x01; // UTF-16 with BOM
  frame.set(encodedText, 11);

  return frame;
}

function createAPICFrame(imageBuffer: Uint8Array, mimeType = 'image/jpeg'): Uint8Array {
  if (!imageBuffer || !imageBuffer.length) return new Uint8Array(0);
  const mimeBytes = new TextEncoder().encode(mimeType);
  const payloadSize = 1 + mimeBytes.length + 1 + 1 + 1 + imageBuffer.length;
  const frame = new Uint8Array(10 + payloadSize);

  frame[0] = 'A'.charCodeAt(0);
  frame[1] = 'P'.charCodeAt(0);
  frame[2] = 'I'.charCodeAt(0);
  frame[3] = 'C'.charCodeAt(0);

  frame[4] = (payloadSize >> 24) & 0xff;
  frame[5] = (payloadSize >> 16) & 0xff;
  frame[6] = (payloadSize >> 8) & 0xff;
  frame[7] = payloadSize & 0xff;

  frame[8] = 0x00;
  frame[9] = 0x00;

  let offset = 10;
  frame[offset++] = 0x00; // ISO-8859-1
  frame.set(mimeBytes, offset);
  offset += mimeBytes.length;
  frame[offset++] = 0x00;
  frame[offset++] = 0x03; // Cover (front)
  frame[offset++] = 0x00;
  frame.set(imageBuffer, offset);

  return frame;
}

function createUSLTFrame(lyricsText: string): Uint8Array {
  if (!lyricsText) return new Uint8Array(0);
  const encodedText = encodeUTF16WithBOM(lyricsText);
  const payloadSize = 1 + 3 + 2 + encodedText.length;
  const frame = new Uint8Array(10 + payloadSize);

  frame[0] = 'U'.charCodeAt(0);
  frame[1] = 'S'.charCodeAt(0);
  frame[2] = 'L'.charCodeAt(0);
  frame[3] = 'T'.charCodeAt(0);

  frame[4] = (payloadSize >> 24) & 0xff;
  frame[5] = (payloadSize >> 16) & 0xff;
  frame[6] = (payloadSize >> 8) & 0xff;
  frame[7] = payloadSize & 0xff;

  frame[8] = 0x00;
  frame[9] = 0x00;

  let offset = 10;
  frame[offset++] = 0x01; // UTF-16
  frame[offset++] = 'e'.charCodeAt(0);
  frame[offset++] = 'n'.charCodeAt(0);
  frame[offset++] = 'g'.charCodeAt(0);
  frame[offset++] = 0x00;
  frame[offset++] = 0x00;
  frame.set(encodedText, offset);

  return frame;
}

export async function embedID3Tags(
  audioBuffer: ArrayBuffer,
  track: { title: string; artist: string; album: string; cover?: string | null; lrc?: string | null }
): Promise<Blob> {
  const frames: Uint8Array[] = [];

  if (track.title) frames.push(createTextFrame('TIT2', track.title));
  if (track.artist) frames.push(createTextFrame('TPE1', track.artist));
  if (track.album) frames.push(createTextFrame('TALB', track.album));
  if (track.lrc) frames.push(createUSLTFrame(track.lrc));

  if (track.cover) {
    try {
      const imgRes = await fetch(track.cover);
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob();
        const imgBuf = new Uint8Array(await imgBlob.arrayBuffer());
        const mime = imgBlob.type || (track.cover.includes('.png') ? 'image/png' : 'image/jpeg');
        const apicFrame = createAPICFrame(imgBuf, mime);
        if (apicFrame.length) frames.push(apicFrame);
      }
    } catch (e) {
      console.warn('Failed to fetch cover art for ID3 embedding:', e);
    }
  }

  let totalFramesSize = 0;
  frames.forEach(f => { totalFramesSize += f.length; });

  if (totalFramesSize === 0) {
    return new Blob([audioBuffer], { type: 'audio/mpeg' });
  }

  const headerSize = 10;
  const tagSize = totalFramesSize;
  const header = new Uint8Array(headerSize);

  header[0] = 0x49; // 'I'
  header[1] = 0x44; // 'D'
  header[2] = 0x33; // '3'
  header[3] = 0x03; // ID3v2.3
  header[4] = 0x00;
  header[5] = 0x00;

  header[6] = (tagSize >> 21) & 0x7f;
  header[7] = (tagSize >> 14) & 0x7f;
  header[8] = (tagSize >> 7) & 0x7f;
  header[9] = tagSize & 0x7f;

  const id3Tag = new Uint8Array(headerSize + totalFramesSize);
  id3Tag.set(header, 0);

  let offset = headerSize;
  frames.forEach(f => {
    id3Tag.set(f, offset);
    offset += f.length;
  });

  return new Blob([id3Tag, audioBuffer], { type: 'audio/mpeg' });
}
