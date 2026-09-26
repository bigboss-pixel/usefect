const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-production-a461.up.railway.app";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      credentials: "include",
    },
  );

  if (response.status !== 401 || path === "/auth/refresh") {
    return response;
  }

  const refreshResponse = await fetch(
    `${API_URL}/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!refreshResponse.ok) {
    window.location.href = "/login";
    throw new Error("Sesi telah berakhir");
  }

  return fetch(
    `${API_URL}${path}`,
    {
      ...options,
      credentials: "include",
    },
  );
}