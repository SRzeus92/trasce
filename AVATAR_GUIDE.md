# Avatar Guide

End-to-end guide to upload and display user avatars across services.

## Overview

- Storage path: `/avatars/{username}/{filename}` (inside user-service)
- Frontend uploads to game-service: `POST /profile/avatar` (multipart, field: `avatar`)
- Game-service forwards stream to user-service: `POST /internal/users/:id/avatar`
- Responses include both:
  - `avatar`: `{ content_type, data_base64 }` (inline image payload)
  - `avatar_url`: `string|null` (relative filesystem path, kept for backward compatibility)

Prefer using `avatar` for rendering in the frontend; `avatar_url` is not publicly accessible.

## Upload from Frontend (multipart)

Endpoint: `POST /profile/avatar` (game-service)

Auth: `Authorization: Bearer <JWT>`

Body: `multipart/form-data` with file field `avatar`.

Example (browser / React):

```js
async function uploadAvatar(file, token) {
  const fd = new FormData()
  fd.append('avatar', file) // file is a Blob (e.g., from <input type="file" />)

  const res = await fetch('/profile/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload failed (${res.status})`)
  }

  // Response contains { success, avatar_url, avatar }
  return res.json()
}
```

## Display the Avatar

Given a user object with:

```json
{
  "avatar": { "content_type": "image/png", "data_base64": "..." },
  "avatar_url": "avatars/alice/mypic.png"
}
```

Render inline without extra requests:

```js
function avatarSrc(user) {
  if (user?.avatar?.data_base64 && user?.avatar?.content_type) {
    return `data:${user.avatar.content_type};base64,${user.avatar.data_base64}`
  }
  // Fallback to a placeholder
  return '/images/avatar-placeholder.png'
}
```

```jsx
<img alt="avatar" src={avatarSrc(user)} width={96} height={96} />
```

Tips:
- For lists (leaderboards), consider lazy-loading or smaller thumbnails to reduce payload.
- Cache the `avatar` object in state/store to avoid unnecessary re-renders.

## API Quick Reference

User-service (internal):
- `POST /internal/users/:id/avatar` (multipart preferred)
  - Input (multipart): field `avatar` (file)
  - Fallback (JSON): `{ filename, data_base64 }`
  - Output: `{ id, username, avatar_url, avatar }`

Game-service (public):
- `POST /profile/avatar` (multipart)
  - Input: field `avatar` (file)
  - Output: `{ success, avatar_url, avatar }`

User payloads (returned by various endpoints) include:
- `avatar`: `{ content_type, data_base64 } | null`
- `avatar_url`: `string|null`

## Troubleshooting

- 401 Unauthorized: Ensure you pass a valid JWT in `Authorization: Bearer <token>`.
- 413 Payload Too Large: The default max upload size is 20 MB; compress/resize larger images or increase the limit in service configs.
- 503 Service Unavailable: One of the services is down or timeouts occurred (default timeout is 10s in orchestration).
- Invalid file type: The content type is inferred from filename extension; ensure the file extension matches the actual type.
- INTERNAL auth error: Make sure `INTERNAL_SECRET` matches between game-service and user-service.

## Security & Storage Notes

- Filenames and usernames are sanitized; paths are constrained to `/avatars` to prevent traversal.
- On collision, filenames are suffixed (`name-1.ext`, `name-2.ext`, ...).
- `avatar_url` is a relative, non-public path inside user-service. Prefer `avatar` for rendering in the browser.

## Performance Considerations

- Inline base64 increases payload size by ~33%. For large lists, consider server-side options later (e.g., thumbnail generation, conditional inclusion, or a proxied streaming endpoint).
- Current flow prioritizes simplicity and isolation (no direct exposure of `/avatars` over HTTP).
