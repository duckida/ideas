import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the contract between api.ts queries and firestore.indexes.json.
 *
 * Firestore auto-creates single-field indexes only; any query that combines an
 * equality filter with an orderBy on another field needs a composite index.
 * A missing one fails at runtime ("The query requires an index"), and this
 * file gets wiped by `firebase init` — which has happened before. If this test
 * fails, either add the index to firestore.indexes.json or fix the query.
 */

interface IndexDef {
  collectionGroup: string;
  queryScope: "COLLECTION" | "COLLECTION_GROUP";
  fields: { fieldPath: string; order: "ASCENDING" | "DESCENDING" }[];
}

interface QuerySpec {
  /** What in api.ts needs it — shown on failure. */
  name: string;
  collectionGroup: string;
  queryScope: "COLLECTION" | "COLLECTION_GROUP";
  /** Equality-filtered fields, in the order the query applies them. */
  eqFields: string[];
  /** orderBy entries as [fieldPath, direction]. */
  orderBy: [string, "ASCENDING" | "DESCENDING"][];
}

const specs: QuerySpec[] = [
  {
    name: "getApprovedIdeas('new') — ideas feed sorted by newest",
    collectionGroup: "ideas",
    queryScope: "COLLECTION",
    eqFields: ["status"],
    orderBy: [["createdAt", "DESCENDING"]],
  },
  {
    name: "getApprovedIdeas('upvotes') — ideas feed sorted by most upvotes",
    collectionGroup: "ideas",
    queryScope: "COLLECTION",
    eqFields: ["status"],
    orderBy: [["upvoteCount", "DESCENDING"]],
  },
  {
    name: "getIdeasByAuthor — /me idea list",
    collectionGroup: "ideas",
    queryScope: "COLLECTION",
    eqFields: ["authorId"],
    orderBy: [["createdAt", "DESCENDING"]],
  },
  {
    name: "getPendingIdeas — moderation queue",
    collectionGroup: "ideas",
    queryScope: "COLLECTION",
    eqFields: ["status"],
    orderBy: [["createdAt", "ASCENDING"]],
  },
  {
    name: "getLeaderSupports — supports collection group by leader + recency",
    collectionGroup: "supports",
    queryScope: "COLLECTION_GROUP",
    eqFields: ["leaderId"],
    orderBy: [["createdAt", "DESCENDING"]],
  },
];

const config = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "firestore.indexes.json"), "utf8"),
) as { indexes: IndexDef[] };

/** Firestore's rule: an index matches when its fields equal the equality
 * filters (ascending) followed by every orderBy entry in exact order. */
function requiredFields(spec: QuerySpec): IndexDef["fields"] {
  return [
    ...spec.eqFields.map((fieldPath) => ({ fieldPath, order: "ASCENDING" as const })),
    ...spec.orderBy.map(([fieldPath, order]) => ({ fieldPath, order })),
  ];
}

describe("firestore.indexes.json covers every composite query in api.ts", () => {
  for (const spec of specs) {
    it(`${spec.name} has a matching composite index`, () => {
      const expected = requiredFields(spec);
      const found = config.indexes.some(
        (idx) =>
          idx.collectionGroup === spec.collectionGroup &&
          idx.queryScope === spec.queryScope &&
          JSON.stringify(idx.fields) === JSON.stringify(expected),
      );
      expect(found, `missing index for "${spec.name}": ${JSON.stringify(expected)}`).toBe(true);
    });
  }
});
