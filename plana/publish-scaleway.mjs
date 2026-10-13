#!/usr/bin/env node
/**
 * Publish packages/scaleway as @plana-solutions/distilled-scaleway to GitHub
 * Packages. The package is packed under its upstream name (so `workspace:` and
 * `catalog:` ranges resolve to real versions), then renamed and re-versioned
 * inside the tarball: `<upstream version>-plana.<UTC yyyyMMddHHmm>`.
 * Needs NODE_AUTH_TOKEN (write:packages). Run after `tsc -b packages/scaleway`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NAME = "@plana-solutions/distilled-scaleway";
const REGISTRY = "https://npm.pkg.github.com";
if (!process.env.NODE_AUTH_TOKEN) throw new Error("NODE_AUTH_TOKEN is not set");

const work = mkdtempSync(join(tmpdir(), "scaleway-publish-"));
execFileSync("pnpm", ["pack", "--pack-destination", work], {
  cwd: "packages/scaleway",
  stdio: "inherit",
});
const tarball = readdirSync(work).find((f) => f.endsWith(".tgz"));
if (!tarball) throw new Error("pnpm pack produced no tarball");
execFileSync("tar", ["-xzf", tarball], { cwd: work });

const pkgPath = join(work, "package", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
pkg.name = NAME;
pkg.version = `${pkg.version}-plana.${stamp}`;
pkg.repository = {
  type: "git",
  url: "https://github.com/Plana-Solutions/distilled",
  directory: "packages/scaleway",
};
pkg.publishConfig = { registry: REGISTRY };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
writeFileSync(
  join(work, "package", ".npmrc"),
  `@plana-solutions:registry=${REGISTRY}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`,
);

execFileSync("npm", ["publish", "--registry", REGISTRY], {
  cwd: join(work, "package"),
  stdio: "inherit",
});
console.log(`Published ${NAME}@${pkg.version}`);
