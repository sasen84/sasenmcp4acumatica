// Copyright 2026 Hall Boys, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// MCP tool annotations (readOnlyHint etc.) for every registered tool.
//
// Why this exists: Microsoft 365 Copilot federated connectors only enable
// tools that carry `readOnlyHint: true`; unannotated tools are silently
// withheld, so Copilot connects and authenticates but never calls anything.
// Claude treats annotations as hints only, so this is additive for Claude.
//
// Policy is centralised here (not at each registration site) so a new tool
// cannot ship unannotated: anything not explicitly listed as mutating is
// treated as a read tool, and the unit test pins the mutating set.

import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Tools that change state somewhere and therefore must NOT claim readOnlyHint.
 * Writer tools (from WRITER_TOOLS) are added at runtime by name; this list is
 * for non-writer tools that still mutate something.
 */
export const NON_WRITER_MUTATING_TOOLS: readonly string[] = [
  // Clears the worker's own metadata cache (KV). Does not touch Acumatica,
  // but it is not side-effect free, so it is not labelled read-only.
  "acumatica_clear_cache",
];

/** Name segments rendered as acronyms rather than title-cased. */
const ACRONYMS: Readonly<Record<string, string>> = { gi: "GI", xml: "XML" };

/** "acumatica_get_project_budget" -> "Get Project Budget" */
export function titleFromName(name: string): string {
  return name
    .replace(/^acumatica_/, "")
    .split("_")
    .filter(Boolean)
    .map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Annotation set for one tool.
 * - Writer tools: readOnlyHint false, destructiveHint true, idempotentHint
 *   false. The writers are PUT-as-upsert: with the key supplied they
 *   overwrite existing field values (destructive); with the key omitted
 *   Acumatica auto-numbers a NEW record, so a repeated call creates a
 *   duplicate (not idempotent).
 * - Other mutating tools (clear_cache): readOnlyHint false, idempotent, not
 *   destructive -- clearing an already-clear cache is a no-op, and the cache
 *   rebuilds on demand.
 * - Everything else: readOnlyHint true.
 * openWorldHint is false throughout: every tool talks only to the configured
 * Acumatica tenant or the worker's own storage.
 */
export function annotationsFor(name: string, writerNames: ReadonlySet<string>): ToolAnnotations {
  const title = titleFromName(name);
  if (writerNames.has(name)) {
    return { title, readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
  }
  if (NON_WRITER_MUTATING_TOOLS.includes(name)) {
    return { title, readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  }
  return { title, readOnlyHint: true, openWorldHint: false };
}

/** Same truthiness rule runWriter() uses for the kill switch. */
export function writesEnabled(value: string | undefined | null): boolean {
  return value?.trim().toLowerCase() === "true";
}
