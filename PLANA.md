# Plana-Solutions/distilled

A fork of [alchemy-run/distilled](https://github.com/alchemy-run/distilled)
that builds and publishes the Scaleway SDK for Plana, independently of
whether upstream merges it
([alchemy-run/distilled#872](https://github.com/alchemy-run/distilled/pull/872)).

## How it fits together

```
Scaleway developer portal + scaleway-sdk-js
  │  daily 00:00 UTC — GitHub Actions in Plana-Solutions/spec-mirror-scaleway
  ▼
Plana-Solutions/spec-mirror-scaleway          (public; specs/*.json + _manifest.json)
  │  git submodule: packages/scaleway/specs/spec-mirror-scaleway
  │  daily 02:00 UTC — Depot CI: .depot/workflows/scaleway-release.yml
  ▼
packages/scaleway  → regenerate → gate → commit to main
  ▼
@plana-solutions/distilled-scaleway           (GitHub Packages, npm.pkg.github.com)
```

- `.depot/workflows/ci.yml` runs the upstream CI (typecheck incl. generated
  code, tests, stacks, website, formatting) on Depot for every push.
- `.depot/workflows/scaleway-release.yml` only regenerates and publishes when
  the mirror moved; run it by hand with `force` to publish regardless.
- Published versions are `<upstream version>-plana.<UTC yyyyMMddHHmm>`; the
  newest 30 are kept.

Plana-only changes against upstream, kept small so syncing stays easy:
`.gitmodules` (Scaleway mirror URL), `scripts/specs.ts` and
`stacks/distilled-submodules/SpecRepos.ts` (a per-mirror `owner`),
`.depot/`, `plana/` and this file.

## Using the package

The package is private. In the consuming project's `.npmrc` (committed), map
the scope only:

```
@plana-solutions:registry=https://npm.pkg.github.com
```

The token goes in a trusted, uncommitted place, because pnpm does not expand
`${...}` credentials from a project `.npmrc`. Use your user-level `~/.npmrc`
(or the CI equivalent) with a token that has `read:packages`:

```
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then:

```sh
pnpm add @plana-solutions/distilled-scaleway effect
```

```ts
import * as Scaleway from "@plana-solutions/distilled-scaleway";
```

The API is the same as upstream's `@distilled.cloud/scaleway` (see
`packages/scaleway/README.md`); it depends on `@distilled.cloud/core` from npm.

## Secrets

Depot CI secret `PLANA_GH_TOKEN`, scoped to this repository: a classic GitHub
token with `repo`, `write:packages` and `delete:packages`.

```sh
depot ci secrets add PLANA_GH_TOKEN --repo Plana-Solutions/distilled
```

## Syncing with upstream

```sh
git fetch upstream            # https://github.com/alchemy-run/distilled
git merge upstream/main       # conflicts, if any, are in the files listed above
```

If upstream merges #872, `packages/scaleway` comes from upstream and the
official `@distilled.cloud/scaleway` can replace this package.

## Regenerating by hand

```sh
pnpm --filter @distilled.cloud/scaleway run specs:update
pnpm generate scaleway
```
