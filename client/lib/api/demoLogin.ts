export type DemoRole = "user" | "instructor" | "admin";

export const demoLogin = async (role: DemoRole) => {
  const serverURI = process.env.NEXT_PUBLIC_SERVER_URI;
  const res = await fetch(`${serverURI}/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Demo login failed");
  return result;
};
