// Serverless proxy for photo uploads (Vercel-style function).
//
// The browser sends { filename, content } (content = base64 JPEG, no
// "data:image/jpeg;base64," prefix). This function holds the real GitHub
// token as a SERVER-SIDE secret (set in your hosting provider's dashboard,
// never in this file or in index.html) and pushes the file into your
// GitHub repo on the token's behalf. It replies with just the public
// raw.githubusercontent.com URL — the token never reaches the browser.
//
// Deploy this on Vercel (or Netlify/Cloudflare Workers with small tweaks —
// see the note at the bottom). GitHub Pages CANNOT run this: it only serves
// static files, it can't hide a secret or run server code.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GH_TOKEN     = process.env.GH_TOKEN;               // set this in Vercel → Settings → Environment Variables
  const PHOTO_OWNER  = process.env.PHOTO_OWNER  || 'qedrahul-sys';
  const PHOTO_REPO   = process.env.PHOTO_REPO   || 'lagansha-photos';
  const PHOTO_BRANCH = process.env.PHOTO_BRANCH || 'main';
  const PHOTO_DIR    = process.env.PHOTO_DIR    || 'images';

  if (!GH_TOKEN) {
    return res.status(500).json({ error: 'Server not configured: GH_TOKEN env var is missing.' });
  }

  try {
    const { filename, content } = req.body || {};
    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content (base64) are required.' });
    }

    // Build a safe, unique path so two uploads never collide.
    const safeName = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `${PHOTO_DIR}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

    const ghRes = await fetch(
      `https://api.github.com/repos/${PHOTO_OWNER}/${PHOTO_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add profile photo ${path}`,
          content,                 // GitHub Contents API wants base64 with no data: prefix
          branch: PHOTO_BRANCH
        })
      }
    );

    if (!ghRes.ok) {
      const errText = await ghRes.text().catch(() => '');
      return res.status(ghRes.status).json({ error: `GitHub upload failed: ${errText}` });
    }

    const url = `https://raw.githubusercontent.com/${PHOTO_OWNER}/${PHOTO_REPO}/${PHOTO_BRANCH}/${path}`;
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}

/*
  ── Deployment (Vercel) ──────────────────────────────────────────────────
  1. Put this file at:  api/upload-photo.js   (exactly this path, next to index.html)
  2. Push the project (index.html + api/upload-photo.js) to a GitHub repo.
  3. Go to vercel.com → "Add New Project" → import that repo. Vercel
     auto-detects index.html as static and api/*.js as serverless functions.
  4. In the new Vercel project → Settings → Environment Variables, add:
       GH_TOKEN     = ghp_xxxxxxxxxxxxxxxxxxxx   (your real token — secret, server-only)
       PHOTO_OWNER  = qedrahul-sys
       PHOTO_REPO   = lagansha-photos
       PHOTO_BRANCH = main
       PHOTO_DIR    = images
     (PHOTO_OWNER/REPO/BRANCH/DIR aren't secret, but keeping them as env vars
     means you never have to edit code to change them.)
  5. Deploy. Your site + the /api/upload-photo endpoint are now live together,
     and the token is never sent to any browser.

  ⚠ Rotate your token: since the token was pasted in chat/screenshots earlier,
  treat it as already compromised. Go to GitHub → Settings → Developer settings
  → Personal access tokens → revoke the old one and generate a fresh one, then
  put ONLY the new one into Vercel's environment variables.

  ── If you'd rather use Netlify instead of Vercel ───────────────────────
  Move this file to netlify/functions/upload-photo.js, change the export to:
    exports.handler = async (event) => { ... }  // req.body -> JSON.parse(event.body)
  and call it from the frontend as '/.netlify/functions/upload-photo' instead
  of '/api/upload-photo'. Environment variables are set the same way, under
  Netlify → Site settings → Environment variables.
*/
