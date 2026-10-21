# n8n-nodes-qpost

An [n8n](https://n8n.io) community node for [QPost](https://qpost.dev): publish
videos and images to **TikTok, Instagram and YouTube** from a workflow.

Posting to these platforms through their own APIs needs app reviews that take
weeks (an unaudited TikTok app can only post privately). QPost already has
them: you connect your accounts on qpost.dev, paste an API key into n8n, and
publish publicly.

## Install

In n8n: **Settings → Community Nodes → Install**, and enter `n8n-nodes-qpost`.

## Credentials

1. Create a free account at [qpost.dev/n8n](https://qpost.dev/n8n) and
   connect TikTok, Instagram and/or YouTube under **Accounts**.
2. Create an API key under **API Keys**.
3. In n8n, add a **QPost API** credential and paste the key.

## Operations

**Post**
- **Create**: publish now, schedule, or save a draft. Media comes from a
  previous node's binary data (e.g. an HTTP Request download, or a generated
  video) or from a public URL, which QPost downloads and re-hosts, so signed or
  expiring URLs work. Options: TikTok privacy, the TikTok commercial
  disclosure ("Your brand" / "Branded content"), the AI-generated label, YouTube
  privacy and category.
- **Get**: per-platform publish status, plus each platform's public URL once live.
- **Get Many**: filter by status and platform.
- **Get Stats**: views, likes, comments and shares per platform.
- **Retry**: publish a draft, or retry only the platforms that failed.
- **Delete**: remove the post from QPost (already-published videos stay live).

**Account**
- **Get Many**: the accounts connected to your QPost account.

Every platform needs media: text-only posts are rejected.

## Releasing

Releases are published by GitHub Actions with npm trusted publishing and
provenance (see `.github/workflows/publish.yml`): bump `version` in
`package.json`, commit, and push a matching tag.

## Links

- [QPost API & MCP docs](https://qpost.dev/docs/)
- [What publishing API access takes](https://qpost.dev/guides/publishing-api-access/)

Built by the QPost team.
