// import * as bunTest from "bun:test";
// // import type { Context } from "@effect/platform";
// import { Effect } from "effect";
// import { BunContext } from "@effect/platform-bun";
// import { Scope } from "effect";
// import type { PlatformError } from "@effect/platform/Error";
// import { fn } from "effect/Effect";

import { BunContext } from "@effect/platform-bun";
import { Effect, Logger, type Scope } from "effect";

export const runTest = <A, E>(
  program: Effect.Effect<A, E, BunContext.BunContext | Scope.Scope>,
) => {
  return Effect.runPromise(
    program.pipe(
      Effect.provide(BunContext.layer),
      Effect.scoped,
      Effect.provide(Logger.pretty),
    ),
  );
};
// type TestEffect = Effect.Effect<
// 	void,
// 	PlatformError,
// 	BunContext.BunContext | Scope.Scope
// >;
// type TestExecParam = (() => TestEffect | void) | TestEffect;
// export const _describe = (label: string, fn: TestExecParam) => {
// 	return Effect.async<void, PlatformError, Scope.Scope | BunContext.BunContext>(
// 		(resume) => {
// 			console.log("describe", label);
// 			bunTest.describe(label, async () => {
// 				const result = typeof fn === "function" ? await fn() : fn;
// 				console.log("describe", label);
// 				if (result) {
// 					resume(result);
// 				}
// 				resume(Effect.succeed(undefined));
// 			});
// 		},
// 	).pipe(Effect.provide(BunContext.layer), Effect.scoped, Effect.runPromise);
// 	// bunTest.describe(label, async () => {
// 	//   console.log("describe", label);
// 	// 	const result = typeof fn === "function" ? fn() : fn;
// 	// 	if (result) {
// 	// 		return await Effect.runPromise(
// 	// 			result.pipe(Effect.provide(BunContext.layer), Effect.scoped),
// 	// 		);
// 	// 	}
// 	// });
// };

// export function describe(name: string, fn: TestExecParam): Promise<void>;
// export function describe(name: string): (self: TestEffect) => Promise<void>;
// export function describe(name: string, fn?: TestExecParam) {
// 	console.log("describe", name);
// 	// process.exit(0);
// 	if (!fn) {
// 		return (self: TestEffect) => {
// 			console.log("describe", name);
// 			return _describe(name, self);
// 		};
// 	}
// 	return _describe(name, fn);
// }

// export function it(name: string, fn: TestExecParam){
// 	bunTest.it(name, async () => {
// 		console.log("it", name);
// 		const program = typeof fn === "function" ? await fn() : fn;
// 		if (program) {
// 			return await Effect.runPromise(
// 				program.pipe(Effect.provide(BunContext.layer), Effect.scoped),
// 			);
// 		}
// 	});
// 	// return Effect.succeed(undefined);
// 	// bunTest.it(name, () => {
// 	// return Effect.async<void, PlatformError, Scope.Scope | BunContext.BunContext>(
// 	// 	(resume) => {
// 	// 		console.log("it", name);
// 	// 			// Effect.tryPromise({
// 	// 			const innerProgram = Effect.tryPromise({
// 	// 				try: async () => {
// 	// 					const result = typeof fn === "function" ? await fn() : fn;
// 	// 					if (result) {
// 	// 						return result;
// 	// 					}
// 	// 					return Effect.succeed(undefined);
// 	// 				},
// 	// 				catch: (error) => {
// 	// 					return error as PlatformError;
// 	// 				},
// 	// 			}).pipe(Effect.flatten);
// 	// 			resume(innerProgram);

// 	// 			// if (result) {
// 	// 			// 	resume(result);
// 	// 			// }
// 	// 			// if (result) {
// 	// 			// 	result;
// 	// 			// }
// 	// 			// if (result) {
// 	// 			// 	return Effect.runPromise(
// 	// 			// 		result.pipe(Effect.provide(BunContext.layer), Effect.scoped),
// 	// 			// 	);
// 	// 			// }
// 	// 		});
// 	// 	},
// 	// ).pipe(Effect.provide(BunContext.layer), Effect.scoped, Effect.runPromise);
// }
// // }

// // export function it(name: string, fn: TestExecParam): Promise<void>;
// // export function it(name: string): (self: TestEffect) => Promise<void>;
// // export function it(name: string, fn?: TestExecParam) {
// // 	if (!fn) {
// // 		return (self: TestEffect) => _it(name, self);
// // 	}
// // 	return _it(name, fn);
// // }
