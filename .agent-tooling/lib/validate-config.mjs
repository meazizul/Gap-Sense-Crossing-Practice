import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "..", "..", "schemas", "agent-tooling.config.schema.json");

export const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = ajv.compile(schema);

export function validateConsumerConfig(obj) {
  const valid = compiled(obj);
  return { valid, errors: valid ? [] : (compiled.errors ?? []) };
}
