"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken, sitePassword } from "@/lib/auth";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const password = sitePassword();
  const next = safeNextPath(formData.get("next"));
  if (!password) redirect(next);

  if (formData.get("password") !== password) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { error: "Wrong password" };
  }

  (await cookies()).set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(next);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
