import projectCardSchemaJson from "../../../plugins/agent-project-card/skills/agent-project-card/references/project-card.schema.json";
import type { ComparisonValueKind } from "../types/catalog";

export const SUPPORTED_PROJECT_CARD_SCHEMA_VERSION = "0.2" as const;

interface JsonSchemaNode {
  $ref?: string;
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  oneOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  additionalProperties?: boolean | JsonSchemaNode;
}

export interface ContractFieldDefinition {
  group: string;
  fieldPattern: string;
  label: string;
  valueKind: ComparisonValueKind;
  coveredByDescendants: boolean;
}

export interface ProjectCardContract {
  schemaVersion: string;
  topLevelOrder: string[];
  fields: ContractFieldDefinition[];
}

const projectCardSchema = projectCardSchemaJson as JsonSchemaNode;

function humanLabel(value: string) {
  return value
    .replace(/^@[^/]+\//, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function pointerSegment(value: string) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function resolveLocalRef(root: JsonSchemaNode, ref: string): JsonSchemaNode {
  if (!ref.startsWith("#/")) {
    throw new Error(`Agent Project Card schema uses unsupported external reference ${ref}.`);
  }

  let current: unknown = root;
  for (const encodedSegment of ref.slice(2).split("/")) {
    const segment = encodedSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (typeof current !== "object" || current === null || !(segment in current)) {
      throw new Error(`Agent Project Card schema reference ${ref} does not resolve.`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current as JsonSchemaNode;
}

function resolveNode(root: JsonSchemaNode, node: JsonSchemaNode): JsonSchemaNode {
  return node.$ref ? resolveNode(root, resolveLocalRef(root, node.$ref)) : node;
}

function nodeVariants(root: JsonSchemaNode, node: JsonSchemaNode): JsonSchemaNode[] {
  const resolved = resolveNode(root, node);
  const variants = resolved.oneOf ?? resolved.anyOf;
  return variants ? variants.flatMap((variant) => nodeVariants(root, variant)) : [resolved];
}

function hasType(node: JsonSchemaNode, type: string) {
  return Array.isArray(node.type) ? node.type.includes(type) : node.type === type;
}

function isObjectNode(node: JsonSchemaNode) {
  return hasType(node, "object") || Boolean(node.properties);
}

function valueKind(root: JsonSchemaNode, node: JsonSchemaNode): ComparisonValueKind {
  const variants = nodeVariants(root, node);
  if (variants.some((variant) => hasType(variant, "array"))) return "primitive_array";
  if (variants.some((variant) => hasType(variant, "boolean"))) return "boolean";
  if (variants.some((variant) => hasType(variant, "number") || hasType(variant, "integer"))) return "number";
  if (variants.some((variant) => hasType(variant, "string") || variant.enum || typeof variant.const === "string")) {
    return "string";
  }
  if (variants.some(isObjectNode)) return "empty_object";
  return "null";
}

function addDefinition(
  definitions: ContractFieldDefinition[],
  definition: ContractFieldDefinition,
) {
  const existing = definitions.find(({ fieldPattern }) => fieldPattern === definition.fieldPattern);
  if (!existing) {
    definitions.push(definition);
  } else if (definition.coveredByDescendants) {
    existing.coveredByDescendants = true;
  }
}

function collectNode(
  root: JsonSchemaNode,
  node: JsonSchemaNode,
  group: string,
  fieldPattern: string,
  label: string,
  definitions: ContractFieldDefinition[],
) {
  const resolved = resolveNode(root, node);
  const variants = resolved.oneOf ?? resolved.anyOf;
  if (variants) {
    const resolvedVariants = variants.flatMap((variant) => nodeVariants(root, variant));
    const objectVariants = resolvedVariants.filter(isObjectNode);
    const terminalVariants = resolvedVariants.filter((variant) => !isObjectNode(variant));
    if (terminalVariants.length > 0) {
      addDefinition(definitions, {
        group,
        fieldPattern,
        label,
        valueKind: valueKind(root, { oneOf: terminalVariants }),
        coveredByDescendants: objectVariants.length > 0,
      });
    }
    objectVariants.forEach((variant) => {
      collectNode(root, variant, group, fieldPattern, label, definitions);
    });
    return;
  }

  if (hasType(resolved, "array")) {
    if (!resolved.items) {
      addDefinition(definitions, {
        group,
        fieldPattern,
        label,
        valueKind: "primitive_array",
        coveredByDescendants: false,
      });
      return;
    }

    const itemVariants = nodeVariants(root, resolved.items);
    const objectItems = itemVariants.filter(isObjectNode);
    const terminalItems = itemVariants.filter((variant) => !isObjectNode(variant));
    if (terminalItems.length > 0 || objectItems.length === 0) {
      addDefinition(definitions, {
        group,
        fieldPattern,
        label,
        valueKind: "primitive_array",
        coveredByDescendants: objectItems.length > 0,
      });
    }
    objectItems.forEach((item) => {
      collectNode(root, item, group, `${fieldPattern}/*`, label, definitions);
    });
    return;
  }

  if (isObjectNode(resolved)) {
    const properties = Object.entries(resolved.properties ?? {});
    if (properties.length === 0) {
      addDefinition(definitions, {
        group,
        fieldPattern,
        label,
        valueKind: "empty_object",
        coveredByDescendants: resolved.additionalProperties !== false,
      });
      return;
    }
    properties.forEach(([key, child]) => {
      collectNode(
        root,
        child,
        group,
        `${fieldPattern}/${pointerSegment(key)}`,
        humanLabel(key),
        definitions,
      );
    });
    return;
  }

  addDefinition(definitions, {
    group,
    fieldPattern,
    label,
    valueKind: valueKind(root, resolved),
    coveredByDescendants: false,
  });
}

export function readProjectCardContract(root: JsonSchemaNode): ProjectCardContract {
  const properties = root.properties ?? {};
  const schemaVersionNode = resolveNode(root, properties.schema_version ?? {});
  const schemaVersion = typeof schemaVersionNode.const === "string"
    ? schemaVersionNode.const
    : "unknown";
  const fields: ContractFieldDefinition[] = [];

  Object.entries(properties).forEach(([group, node]) => {
    collectNode(
      root,
      node,
      group,
      `/${pointerSegment(group)}`,
      humanLabel(group),
      fields,
    );
  });

  return {
    schemaVersion,
    topLevelOrder: Object.keys(properties),
    fields,
  };
}

export const projectCardContract = readProjectCardContract(projectCardSchema);

export function assertSupportedProjectCardContract() {
  if (projectCardContract.schemaVersion !== SUPPORTED_PROJECT_CARD_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported packaged Agent Project Card schema ${projectCardContract.schemaVersion}; `
      + `the frontend adapter supports ${SUPPORTED_PROJECT_CARD_SCHEMA_VERSION}.`,
    );
  }
}
