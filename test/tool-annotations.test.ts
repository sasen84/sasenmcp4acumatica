// Copyright 2026 Hall Boys, Inc.
// SPDX-License-Identifier: Apache-2.0

import { test } from "node:test";
import assert from "node:assert/strict";
import { annotationsFor, titleFromName, writesEnabled, NON_WRITER_MUTATING_TOOLS } from "../src/tools/tool-annotations.ts";
// The registries use extensionless imports that the strip-types runner cannot
// resolve, so the writer set is pinned here. If a writer is added to
// WRITER_TOOLS, add it here too; index.ts derives the real set at runtime.
const writers = new Set(["acumatica_create_or_update_customer"]);
const SAMPLE_GETTERS = ["acumatica_get_project", "acumatica_get_project_budget", "acumatica_get_bill",
  "acumatica_get_customer", "acumatica_get_invoice", "acumatica_get_vendor"];

test("every getter tool is read-only", () => {
  for (const name of SAMPLE_GETTERS) {
    const a = annotationsFor(name, writers);
    assert.equal(a.readOnlyHint, true, name);
    assert.ok(a.title && a.title.length > 0, name);
  }
});

test("discovery/query tools are read-only", () => {
  for (const name of ["acumatica_run_inquiry", "acumatica_list_entities", "acumatica_describe_entity",
    "acumatica_list_generic_inquiries", "acumatica_describe_inquiry", "acumatica_explain_gi_xml"]) {
    assert.equal(annotationsFor(name, writers).readOnlyHint, true, name);
  }
});

test("writer tools are never labelled read-only", () => {
  assert.ok(writers.size > 0);
  for (const name of writers) {
    const a = annotationsFor(name, writers);
    assert.equal(a.readOnlyHint, false, name);
    // Upsert overwrites existing values when keyed...
    assert.equal(a.destructiveHint, true, name);
    // ...and auto-numbers a new record when the key is omitted, so a
    // repeated call is NOT a no-op.
    assert.equal(a.idempotentHint, false, name);
  }
});

test("clear_cache is not labelled read-only", () => {
  assert.deepEqual([...NON_WRITER_MUTATING_TOOLS], ["acumatica_clear_cache"]);
  const a = annotationsFor("acumatica_clear_cache", writers);
  assert.equal(a.readOnlyHint, false);
  assert.equal(a.destructiveHint, false);
  assert.equal(a.idempotentHint, true);
});

test("titles", () => {
  assert.equal(titleFromName("acumatica_get_project_budget"), "Get Project Budget");
  assert.equal(titleFromName("acumatica_explain_gi_xml"), "Explain GI XML");
});

test("writesEnabled matches runWriter kill-switch rule", () => {
  assert.equal(writesEnabled("true"), true);
  assert.equal(writesEnabled(" TRUE "), true);
  assert.equal(writesEnabled("false"), false);
  assert.equal(writesEnabled(undefined), false);
  assert.equal(writesEnabled(""), false);
});
