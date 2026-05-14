/**
 * Optional hex helpers present in some runtimes (e.g. Bun, newer Node) and relied on when available.
 */
export {};

declare global {
  interface Uint8Array {
    toHex?: () => string;
  }
  interface Uint8ArrayConstructor {
    fromHex?: (hex: string) => Uint8Array<ArrayBufferLike>;
  }
}
