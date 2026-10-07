const ALLOWED_IMAGE_HOSTS = new Set([
  "image.pollinations.ai",
  "oaidalleapiprodscus.blob.core.windows.net",
  "oaidalleapiprodscus002.blob.core.windows.net",
  "oaidalleapiprodscus003.blob.core.windows.net",
]);

function hostAllowed(hostname: string): boolean {
  if (ALLOWED_IMAGE_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".blob.core.windows.net")) return true;
  return false;
}

/** Restrict server-side fetches (e.g. Cloudinary upload by URL) to known AI CDNs. */
export function assertAllowedRemoteImageUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid image URL from AI provider.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Image URL must use HTTPS.");
  }

  if (!hostAllowed(parsed.hostname)) {
    throw new Error("Image URL host is not allowed.");
  }
}
