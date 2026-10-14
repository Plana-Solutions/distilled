/**
 * Proto `bytes` members — hand-written.
 *
 * Scaleway's APIs are proto3 services, and proto3 JSON writes a `bytes`
 * field as a base64 string. The OpenAPI export types such a field as a plain
 * `string` (Instance v2alpha1 user data and cloud-init `content`), so a
 * caller that wrote text got `"bao="` back for `"bar"`. Members a patch marks
 * `T.Bytes()` surface as `Uint8Array`: the protocol base64-encodes them on
 * the way out and decodes them on the way in.
 */
import {
  getProps,
  getPropAnn,
  isOpaqueValue,
  resolveNode,
} from "@distilled.cloud/core/protocol-http";
import * as Base64 from "effect/encoding/Base64";
import * as Result from "effect/Result";
import type * as AST from "effect/SchemaAST";
import { bytesSymbol } from "./traits.ts";

/** A response member that is not valid base64. */
export class BytesDecodeError extends Error {
  constructor(readonly member: string) {
    super(`member "${member}" is not valid base64`);
  }
}

const mapBytes = (
  ast: AST.AST,
  value: unknown,
  convert: (member: string, value: unknown) => unknown,
): unknown => {
  if (value === null || typeof value !== "object" || isOpaqueValue(value)) return value;
  const node = resolveNode(ast);
  if (node._tag === "Union") {
    return node.types.reduce<unknown>((mapped, arm) => mapBytes(arm, mapped, convert), value);
  }
  if (node._tag === "Arrays") {
    if (!Array.isArray(value)) return value;
    const element = (node as any).rest?.[0] as AST.AST | undefined;
    return element ? value.map((item) => mapBytes(element, item, convert)) : value;
  }
  if (node._tag !== "Objects" || Array.isArray(value)) return value;
  const props = new Map(getProps(node).map((prop) => [String(prop.name), prop]));
  if (props.size === 0) return value;
  const out: Record<string, unknown> = {};
  for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
    const prop = props.get(key);
    out[key] =
      prop === undefined
        ? member
        : getPropAnn(prop, bytesSymbol) !== undefined
          ? convert(key, member)
          : mapBytes(prop.type, member, convert);
  }
  return out;
};

/** Base64-encode the `Uint8Array` members of a request input marked `T.Bytes()`. */
export const encodeBytes = (ast: AST.AST, input: unknown): unknown =>
  mapBytes(ast, input, (_, member) =>
    member instanceof Uint8Array ? Base64.encode(member) : member,
  );

/** Decode the base64 members of a response body marked `T.Bytes()` into `Uint8Array`. */
export const decodeBytes = (ast: AST.AST, body: unknown): unknown =>
  mapBytes(ast, body, (key, member) => {
    if (typeof member !== "string") return member;
    const decoded = Base64.decode(member);
    if (Result.isFailure(decoded)) throw new BytesDecodeError(key);
    return decoded.success;
  });
