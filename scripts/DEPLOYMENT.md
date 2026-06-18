# Deployment Guide

## Overview

This project is deployed to Vercel as a static SPA (Single Page Application). Each pull request gets a preview deployment, and commits to `main`/`master` trigger production deployments.

## Installation

**Important:** Always use the shared npm cache to avoid permission issues:

```bash
NODE_ENV=development npm install --include=dev --cache /tmp/npm-cache-ple78
```

The `--cache /tmp/npm-cache-ple78` flag is required because the shared npm cache is permission-locked. Without it, installations will fail.

## Local Development

```bash
npm install
npm run dev
```

Starts the dev server at `http://localhost:5173` (Vite default).

## Testing & Building

```bash
npm test          # Run §6.4 dual-verification tests (must pass)
npm run build     # Production build
```

The CI pipeline (`.github/workflows/ci.yml`) runs these checks on every PR and push to main/master.

## Vercel Deployments

### Preview Deployments (Pull Requests)
- Automatically triggered when a PR is opened
- URL format: `https://<repo>-<pr-number>.<team>.vercel.app`
- Each preview gets a unique, unguessable URL by default
- Preview URLs expire when the PR is closed

### Production Deployments (main/master)
- Automatically triggered on push to `main` or `master`
- URL: https://default-tau-neon.vercel.app
- Immutable deployment URL (if needed): use the individual deployment links in Vercel dashboard

## Access Control

### Current Model
- **Preview URLs** default to unguessable, long-form URLs (no authentication required)
- **Production URL** is public at https://default-tau-neon.vercel.app

### Enabling Protected Access (if CEO requests)

If you need to gate access to preview or production URLs:

1. **Vercel Password Protection:**
   - Go to Vercel project settings → Deployments → Edit
   - Enable "Protect With Password"
   - Share password with authorized users

2. **Vercel SSO (Recommended for teams):**
   - Go to Vercel project settings → Security
   - Configure SSO with your identity provider (GitHub, Okta, etc.)
   - Only team members can access deployments

### Deployment URL Details
- **Immutable URL:** Points to a specific deployment build; currently protected (401)
- **Alias URL:** Points to the active production deployment; currently public
- Both are documented in the Vercel dashboard under "Deployments"

## Environment Variables

The Vercel integration uses tokens already configured in CI/CD:
- `VERCEL_TOKEN`: Personal access token (in secrets)
- `VERCEL_ORG_TOKEN`: Organization token (in secrets)

No manual configuration needed—GitHub Actions automatically deploys to Vercel.

## Troubleshooting

### Build Fails: "npm: not found" or cache errors
- Verify `NODE_ENV=development npm ci --include=dev --cache /tmp/npm-cache-ple78` is used
- Check that `/tmp/npm-cache-ple78` exists and is readable

### Tests Fail
- Run `npm test` locally first
- §6.4 tests must pass (dual-verification of demand math)
- If a test fails, the build is blocked until fixed

### Vercel Preview Not Updating
- Check that the GitHub Action ran successfully in the PR
- Verify the commit message and branch name
- Check Vercel project dashboard for deployment logs

## References

- **PRD:** Timeline For SQ4D (v13) (PLE-77)
- **CI Configuration:** `.github/workflows/ci.yml`
- **Vercel Config:** `vercel.json`
- **Build Contract:** See issue PLE-79
