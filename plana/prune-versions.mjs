#!/usr/bin/env node
/**
 * Keep the newest KEEP versions of @plana-solutions/distilled-scaleway on
 * GitHub Packages (500 MB free storage; each version is ~1.6 MB) and delete
 * the rest. Needs GH_TOKEN with delete:packages.
 */
const ORG = "Plana-Solutions";
const PACKAGE = "distilled-scaleway";
const KEEP = 30;
const token = process.env.GH_TOKEN;
if (!token) throw new Error("GH_TOKEN is not set");

const api = (path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });

const versions = [];
for (let page = 1; ; page++) {
  const r = await api(`/orgs/${ORG}/packages/npm/${PACKAGE}/versions?per_page=100&page=${page}`);
  if (!r.ok) throw new Error(`list versions: ${r.status} ${await r.text()}`);
  const batch = await r.json();
  versions.push(...batch);
  if (batch.length < 100) break;
}
versions.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
for (const v of versions.slice(KEEP)) {
  const r = await api(`/orgs/${ORG}/packages/npm/${PACKAGE}/versions/${v.id}`, {
    method: "DELETE",
  });
  console.log(`delete ${v.name}: ${r.status}`);
}
console.log(`kept ${Math.min(KEEP, versions.length)} of ${versions.length} version(s)`);
