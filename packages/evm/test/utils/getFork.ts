import { Effect } from "effect";
import * as Fork from "../../src/vm/Fork.js";
import { ExecutionSpecTestError } from "./ExecutionSpecTestError.js";

export const getFork = Effect.fn("getFork")(function* (fork: string) {
  switch (fork) {
    case "Osaka":
      return Fork.osaka();
    case "Cancun":
      return Fork.cancun();
    case "CancunToPragueAtTime15k":
      return Fork.prague();
    case "Prague":
      return Fork.prague();
    case "Berlin":
      return Fork.berlin();
    case "London":
      return Fork.london();
    case "Paris":
      return Fork.paris();
    case "ParisToShanghaiAtTime15k":
      return Fork.shanghai();
    case "Shanghai":
      return Fork.shanghai();
    case "ShanghaiToCancunAtTime15k":
      return Fork.cancun();
    case "Istanbul":
      return Fork.istantbul();
    case "Byzantium":
      return Fork.byzantium();
    case "Constantinople":
      return Fork.constantinople();
    case "ConstantinopleFix":
      return Fork.petersburg();
    case "Homestead":
      return Fork.homestead();
    case "Frontier":
      return Fork.frontier();
    default:
      return yield* Effect.fail(
        new ExecutionSpecTestError({
          message: `Unknown fork: ${fork}`,
        }),
      );
  }
});
