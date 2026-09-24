
export function decodeJwtPayload(tokenStr?: string | null) {
  const token = tokenStr !== undefined ? tokenStr : localStorage.getItem("accessToken");
  if (!token) return { token: null, payload: null };

  const parts = token.split('.');
  if (parts.length !== 3) {
    console.warn('Not a JWT (expected 3 parts).');
    return { token, payload: null };
  }

  const payloadB64 = parts[1];
  try {
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
      + '=='.slice((2 - payloadB64.length * 3) & 3);

    const json = atob(base64); // browser built-in
    const payload = JSON.parse(json);
    return { token, payload };
  } catch (err) {
    console.error('Failed to decode JWT payload:', err);
    return { token, payload: null };
  }
}

export function isTokenExpired(tokenStr?: string | null): boolean {
  if (!tokenStr) return true;
  const { payload } = decodeJwtPayload(tokenStr);
  if (!payload || typeof payload.exp !== 'number') return false;
  // Token is expired if current time exceeds expiration time (with 5s buffer)
  return payload.exp * 1000 <= Date.now() + 5000;
}
