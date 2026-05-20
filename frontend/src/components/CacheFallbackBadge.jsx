export default function CacheFallbackBadge({ source }) {
  if (source !== "cache-fallback") return null;

  return (
    <div className="cache-fallback-badge" role="status" aria-live="polite">
      Menampilkan data offline tersimpan
    </div>
  );
}
