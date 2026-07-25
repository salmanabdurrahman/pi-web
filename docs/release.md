# Release Checklist

This repo publishes these artifacts for each release:

- npm package: `@agegr/pi-web`
- macOS desktop app: `Pi Web.app` (unsigned `.dmg` and `.zip`)
- GitHub Release: `agegr/pi-web`

Use this checklist from a clean `main` checkout.

## 1. Preflight

```bash
git status --short --branch
git log --oneline --decorate -5
gh auth status
npm whoami  # registry auth — no bun equivalent; keep npm CLI for this
node -e "const p=require('./package.json'); console.log(p.version)"
```

Expected:

- `git status` is clean, or only contains changes you intentionally plan to release.
- GitHub is authenticated as an account that can push and create releases.
- npm is authenticated as an account that can publish `@agegr/pi-web` (use `npm whoami` — bun shares npm's auth).

## 2. Publish to npm

```bash
bun run release
```

The release script runs:

```bash
npm version patch --no-git-tag-version && bun run build && bun publish --access public
```

Notes:

- This bumps `package.json` and `package-lock.json`.
- It intentionally runs a production build. Do not run `next build` during normal development; release work is the exception.
- If `npm view @agegr/pi-web version` briefly shows the previous version, check the exact version instead (no bun equivalent for `npm view`):

```bash
npm view @agegr/pi-web@<version> version --registry https://registry.npmjs.org/
npm view @agegr/pi-web versions --json --registry https://registry.npmjs.org/
```

## 3. Commit the Version Bump

Replace `<version>` with the new package version, for example `0.7.5`.

```bash
git diff -- package.json bun.lockb
git add package.json bun.lockb
git commit -m "Release v<version>"
```

## 4. Tag and Push

```bash
git tag -a v<version> -m "v<version>"
git push origin main --tags
```

Confirm the tag does not already exist before creating it when unsure:

```bash
git ls-remote --tags origin v<version>
gh release view v<version> --repo agegr/pi-web
```

## 5. Generate Release Notes from Commits

Use the previous release tag as the base.

```bash
git log --oneline --decorate v<previous>..v<version>
git log --format='%h%x09%s%n%b' v<previous>..v<version>
git diff --stat v<previous>..v<version>
```

Write the release notes from those commits, not from memory. Include both Chinese and English sections. Keep commit hashes next to each item when useful.

Suggested structure:

```markdown
## 中文

基于 `v<previous>..v<version>` 的提交整理。

### 新增

- ...

### 修复

- ...

### 改进

- ...

### 内部调整

- 发布 npm 包 `@agegr/pi-web@<version>`。

## English

Prepared from commits in `v<previous>..v<version>`.

### Added

- ...

### Fixed

- ...

### Improved

- ...

### Internal

- Published npm package `@agegr/pi-web@<version>`.
```

## 6. Create or Update the GitHub Release

Create a new release:

```bash
gh release create v<version> \
  --repo agegr/pi-web \
  --verify-tag \
  --title "v<version>" \
  --notes-file release-notes.md
```

If the release already exists and only the notes need updating:

```bash
gh release edit v<version> \
  --repo agegr/pi-web \
  --notes-file release-notes.md
```

You can avoid a temporary file by passing notes through stdin:

```bash
gh release edit v<version> --repo agegr/pi-web --notes-file - <<'EOF'
## 中文

...

## English

...
EOF
```

## 7. Build and Attach Desktop Artifacts

Desktop packaging must run on macOS. The build creates unsigned artifacts —
configure code signing and notarization in `desktop/electron-builder.config.ts`
before publishing a signed release.

```bash
# From project root
bun run desktop:package:mac
```

Artifacts land in `desktop/dist/`:
- `Pi Web-<version>-mac.zip`
- `Pi Web-<version>-mac.dmg`

Attach both to the GitHub Release:

```bash
gh release upload v<version> \
  --repo agegr/pi-web \
  desktop/dist/Pi\ Web-<version>-mac.dmg \
  desktop/dist/Pi\ Web-<version>-mac.zip
```

## 8. Final Verification

```bash
gh release view v<version> --repo agegr/pi-web
npm view @agegr/pi-web@<version> version --registry https://registry.npmjs.org/
git status --short --branch
git log --oneline --decorate -3
```

Expected:

- GitHub Release exists and is not a draft unless intentionally published as one.
- npm exact version resolves.
- macOS `.dmg` and `.zip` are attached to the release.
- `main` is aligned with `origin/main`.
- `HEAD` points at the release commit and `v<version>` tag.
