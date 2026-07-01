"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";

export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <LockKeyhole aria-hidden className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      <input
        autoComplete="current-password"
        className={inputClass("min-h-12 pl-12 pr-12 text-base placeholder:text-slate-500")}
        name="password"
        placeholder="Enter your password"
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        {visible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="min-h-12 w-full text-base" disabled={pending} type="submit">
      {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <LogIn aria-hidden className="h-4 w-4" />}
      {pending ? "Signing in..." : "Sign In"}
    </Button>
  );
}
