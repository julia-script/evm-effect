/**
 * NatSpec documentation schemas for Solidity compiler
 */
import { Schema } from "effect";

export const UserDocMethod = Schema.Struct({
  notice: Schema.String,
});

export type UserDocMethod = typeof UserDocMethod.Type;

export const UserDocEvent = Schema.Struct({
  notice: Schema.String,
});

export type UserDocEvent = typeof UserDocEvent.Type;

export const UserDocError = Schema.Struct({
  notice: Schema.String,
});

export type UserDocError = typeof UserDocError.Type;

export const UserDoc = Schema.Struct({
  version: Schema.optional(Schema.Number),
  kind: Schema.optional(Schema.Literal("user")),
  methods: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: UserDocMethod,
    }),
  ),
  events: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: UserDocEvent,
    }),
  ),
  errors: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Array(UserDocError),
    }),
  ),
  notice: Schema.optional(Schema.String),
});

export type UserDoc = typeof UserDoc.Type;

export const DevDocMethod = Schema.Struct({
  details: Schema.optional(Schema.String),
  params: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String,
    }),
  ),
  returns: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String,
    }),
  ),
  custom: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
});

export type DevDocMethod = typeof DevDocMethod.Type;

export const DevDocEvent = Schema.Struct({
  details: Schema.optional(Schema.String),
  params: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String,
    }),
  ),
  custom: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
});

export type DevDocEvent = typeof DevDocEvent.Type;

export const DevDocError = Schema.Struct({
  details: Schema.optional(Schema.String),
  params: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String,
    }),
  ),
  custom: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
});

export type DevDocError = typeof DevDocError.Type;

export const DevDocStateVariable = Schema.Struct({
  details: Schema.optional(Schema.String),
  returns: Schema.optional(Schema.String),
  custom: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
});

export type DevDocStateVariable = typeof DevDocStateVariable.Type;

export const DevDoc = Schema.Struct({
  version: Schema.optional(Schema.Number),
  kind: Schema.optional(Schema.Literal("dev")),
  author: Schema.optional(Schema.String),
  details: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  methods: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: DevDocMethod,
    }),
  ),
  events: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: DevDocEvent,
    }),
  ),
  errors: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Array(DevDocError),
    }),
  ),
  stateVariables: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: DevDocStateVariable,
    }),
  ),
  custom: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
});

export type DevDoc = typeof DevDoc.Type;
