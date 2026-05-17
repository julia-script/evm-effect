import * as Rpc from "./generated-rpc-schemas.js";
import * as Components from "./generated-schemas.js";

export * from "./generated-rpc-schemas.js";
export * from "./generated-schemas.js";

export default {
  ...Components,
  ...Rpc,
};
