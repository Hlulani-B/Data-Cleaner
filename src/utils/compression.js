/**
 * Compression utilities for large JSON payloads
 * Uses native Compression Streams API (browser) and zlib (Node.js)
 */

// Client-side: compress JSON to base64-encoded gzip
export async function compressJSON(data) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
  const compressedBlob = await new Response(stream).blob();
  const buffer = await compressedBlob.arrayBuffer();
  // Chunked base64 to avoid call-stack overflow on large buffers
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Client-side: decompress base64-encoded gzip back to JSON
export async function decompressJSON(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes]);
  const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
  const decompressedBlob = await new Response(stream).text();
  return JSON.parse(decompressedBlob);
}
