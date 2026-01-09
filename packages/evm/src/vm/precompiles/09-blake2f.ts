import { Bytes } from "@evm-effect/ethereum-types/bytes";
import { Uint } from "@evm-effect/ethereum-types/numeric";
import { Effect, Ref } from "effect";
import { InvalidParameterError } from "../../exceptions.js";
import { Evm } from "../evm.js";
import * as Gas from "../gas.js";

function ADD64AA(v: Uint32Array, a: number, b: number) {
  const o0 = v[a] + v[b];
  let o1 = v[a + 1] + v[b + 1];
  if (o0 >= 0x100000000) {
    o1++;
  }
  v[a] = o0;
  v[a + 1] = o1;
}

function ADD64AC(v: Uint32Array, a: number, b0: number, b1: number) {
  let o0 = v[a] + b0;
  if (b0 < 0) {
    o0 += 0x100000000;
  }
  let o1 = v[a + 1] + b1;
  if (o0 >= 0x100000000) {
    o1++;
  }
  v[a] = o0;
  v[a + 1] = o1;
}

function B2B_G(
  v: Uint32Array,
  mw: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  ix: number,
  iy: number,
) {
  const x0 = mw[ix];
  const x1 = mw[ix + 1];
  const y0 = mw[iy];
  const y1 = mw[iy + 1];

  ADD64AA(v, a, b);
  ADD64AC(v, a, x0, x1);

  let xor0 = v[d] ^ v[a];
  let xor1 = v[d + 1] ^ v[a + 1];
  v[d] = xor1;
  v[d + 1] = xor0;

  ADD64AA(v, c, d);

  xor0 = v[b] ^ v[c];
  xor1 = v[b + 1] ^ v[c + 1];
  v[b] = (xor0 >>> 24) ^ (xor1 << 8);
  v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);

  ADD64AA(v, a, b);
  ADD64AC(v, a, y0, y1);

  xor0 = v[d] ^ v[a];
  xor1 = v[d + 1] ^ v[a + 1];
  v[d] = (xor0 >>> 16) ^ (xor1 << 16);
  v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);

  ADD64AA(v, c, d);

  xor0 = v[b] ^ v[c];
  xor1 = v[b + 1] ^ v[c + 1];
  v[b] = (xor1 >>> 31) ^ (xor0 << 1);
  v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
}

const BLAKE2B_IV32 = new Uint32Array([
  0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372,
  0x5f1d36f1, 0xa54ff53a, 0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c,
  0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
]);

const SIGMA8 = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13,
  6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1,
  9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4,
  10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5,
  15, 14, 1, 9, 12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11, 13, 11, 7,
  14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2,
  13, 7, 1, 4, 10, 5, 10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 0,
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6,
  1, 12, 0, 2, 11, 7, 5, 3,
];

const SIGMA82 = new Uint8Array(
  SIGMA8.map(function (x) {
    return x * 2;
  }),
);

function F(
  h: Uint32Array,
  m: Uint32Array,
  t: Uint32Array,
  f: boolean,
  rounds: number,
) {
  const v = new Uint32Array(32);
  let i = 0;

  for (i = 0; i < 16; i++) {
    v[i] = h[i];
    v[i + 16] = BLAKE2B_IV32[i];
  }

  v[24] = v[24] ^ t[0];
  v[25] = v[25] ^ t[1];
  v[26] = v[26] ^ t[2];
  v[27] = v[27] ^ t[3];

  // last block flag set ?
  if (f) {
    v[28] = ~v[28];
    v[29] = ~v[29];
  }

  for (i = 0; i < rounds; i++) {
    const ri = (i % 10) * 16;
    B2B_G(v, m, 0, 8, 16, 24, SIGMA82[ri + 0], SIGMA82[ri + 1]);
    B2B_G(v, m, 2, 10, 18, 26, SIGMA82[ri + 2], SIGMA82[ri + 3]);
    B2B_G(v, m, 4, 12, 20, 28, SIGMA82[ri + 4], SIGMA82[ri + 5]);
    B2B_G(v, m, 6, 14, 22, 30, SIGMA82[ri + 6], SIGMA82[ri + 7]);
    B2B_G(v, m, 0, 10, 20, 30, SIGMA82[ri + 8], SIGMA82[ri + 9]);
    B2B_G(v, m, 2, 12, 22, 24, SIGMA82[ri + 10], SIGMA82[ri + 11]);
    B2B_G(v, m, 4, 14, 16, 26, SIGMA82[ri + 12], SIGMA82[ri + 13]);
    B2B_G(v, m, 6, 8, 18, 28, SIGMA82[ri + 14], SIGMA82[ri + 15]);
  }

  for (i = 0; i < 16; i++) {
    h[i] = h[i] ^ v[i] ^ v[i + 16];
  }
}

export const blake2f = Effect.gen(function* () {
  const evm = yield* Evm;
  const data = evm.message.data.value;

  if (data.length !== 213) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[blake2f] Error: dataLength=${data.length}`,
      }),
    );
  }
  const lastByte = data.subarray(212, 213)[0];
  if (lastByte !== 1 && lastByte !== 0) {
    return yield* Effect.fail(
      new InvalidParameterError({
        message: `[blake2f] Error: lastByte=${lastByte}`,
      }),
    );
  }

  const rounds = new DataView(data.buffer, data.byteOffset).getUint32(0, false); // big-endian
  const hRaw = new DataView(data.buffer, data.byteOffset + 4, 64);
  const mRaw = new DataView(data.buffer, data.byteOffset + 68, 128);
  const tRaw = new DataView(data.buffer, data.byteOffset + 196, 16);
  const f = lastByte === 1;

  yield* Gas.chargeGas(
    new Uint({ value: Gas.GAS_BLAKE2_PER_ROUND.value * BigInt(rounds) }),
  );

  const h = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    h[i] = hRaw.getUint32(i * 4, true);
  }

  const m = new Uint32Array(32);
  for (let i = 0; i < 32; i++) {
    m[i] = mRaw.getUint32(i * 4, true);
  }

  const t = new Uint32Array(4);
  for (let i = 0; i < 4; i++) {
    t[i] = tRaw.getUint32(i * 4, true);
  }

  F(h, m, t, f, rounds);

  const output = new Uint8Array(64);
  const outputView = new DataView(output.buffer);
  for (let i = 0; i < 16; i++) {
    outputView.setUint32(i * 4, h[i], true);
  }

  yield* Ref.set(evm.output, new Bytes({ value: output }));
});
