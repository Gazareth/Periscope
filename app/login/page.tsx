import type { Metadata } from "next";
import { Suspense } from "react";
import Centered from "@/components/Centered";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in · Periscope" };

export default function LoginPage() {
  return (
    <Centered>
      <Suspense>
        <LoginForm />
      </Suspense>
    </Centered>
  );
}
