import wrapper from "solc/wrapper";

self.addEventListener("message", async (event) => {
  const payload = event.data;
  // const meta = event.data.meta;
  const id = payload?.id ?? 1;
  const [url, version, ...params] = payload?.params ?? [];
  const method = payload?.method;
  console.log("payload", JSON.stringify(payload, null, 2));

  if (!method) {
    return self.postMessage({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32600,
        message: "Invalid Request",
      },
    });
  }
  try {
    const moduleUrl = new URL(`${url}/bin/${version}`, url);
    console.log("moduleUrl", moduleUrl.toString());
    //
    const module = await import(
      /* webpackIgnore: true */ moduleUrl.toString()
    ).then((mod) => mod.default);
    console.log("module", module);
    const solc = wrapper(module);
    const result = solc[method](...params);
    self.postMessage({
      jsonrpc: "2.0",
      id,
      result,
    });
  } catch (error) {
    self.postMessage({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: "Internal Error",
        stack: error.stack,
      },
    });
  }
});
