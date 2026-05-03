import { bn254 } from "@noble/curves/bn254.js";


export const assertBn254G1AffineLikeGeth = (x: bigint, y: bigint): void => {
  const Fp = bn254.fields.Fp;
  const px = Fp.create(x);
  const py = Fp.create(y);
  if (Fp.is0(px) && Fp.is0(py)) {
    return;
  }
  if (!Fp.isValid(px) || !Fp.isValid(py)) {
    throw new Error("bn254: coordinate exceeds modulus");
  }
  const lhs = Fp.sqr(py);
  const rhs = Fp.add(Fp.mul(Fp.sqr(px), px), Fp.create(3n));
  if (!Fp.eql(lhs, rhs)) {
    throw new Error("bn254: malformed point");
  }
};
