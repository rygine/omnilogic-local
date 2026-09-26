// a well-formed IPv4 address or an RFC 1123 hostname
export const isValidHost = (host: string): boolean => {
  const h = host.trim();
  if (h.length === 0 || h.length > 253) {
    return false;
  }
  const labels = h.split(".");
  // all-digit labels must be four octets of 0–255, never a hostname
  if (labels.every((o) => /^\d+$/.test(o))) {
    return (
      labels.length === 4 &&
      labels.every((o) => o.length <= 3 && Number(o) <= 255)
    );
  }
  // labels of letters, digits, and inner hyphens, a bare label included
  return h
    .split(".")
    .every((label) =>
      /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label),
    );
};
