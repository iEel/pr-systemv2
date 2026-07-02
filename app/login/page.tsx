import { LockKeyhole, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Field, inputClass } from "@/components/ui/Field";
import { loginAction } from "./actions";
import { LoginSubmitButton, PasswordInput } from "./LoginControls";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid place-items-center rounded-xl bg-[linear-gradient(135deg,#2563eb,#0f4fb8)] text-white shadow-[0_8px_18px_rgb(15_38_80_/_0.20)] ${
        compact ? "h-14 w-14" : "h-[3.25rem] w-[3.25rem]"
      }`}
    >
      <div className={`${compact ? "h-7 w-7" : "h-6 w-6"} rotate-45 rounded-[0.35rem] border-[6px] border-white/95 border-l-blue-200 border-t-blue-300`} />
    </div>
  );
}

function DocumentHeroImage() {
  return (
    <div className="mt-6 max-w-[39rem] [@media(min-width:1024px)_and_(max-height:820px)]:mt-3">
      <div className="relative h-[18.5rem] overflow-hidden sm:h-[21rem] lg:h-[20rem] xl:h-[22rem] [@media(min-width:1024px)_and_(max-height:820px)]:h-[16rem]">
        <div className="absolute inset-x-8 bottom-6 h-24 rounded-full bg-blue-500/18 blur-3xl" />
        <div className="absolute inset-x-4 bottom-2 h-16 rounded-full bg-slate-950/24 blur-2xl" />
        <img
          alt="PR document workflow illustration"
          className="relative h-full w-full scale-[1.28] object-contain opacity-[0.98] drop-shadow-[0_30px_46px_rgb(2_8_23_/_0.36)] [@media(min-width:1024px)_and_(max-height:820px)]:scale-[1.18]"
          src="/login-pr-illustration.png"
        />
      </div>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-ink lg:h-screen">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-[42%_58%]">
        <section className="relative order-2 overflow-hidden bg-[linear-gradient(145deg,#061634_0%,#082a60_48%,#020817_100%)] px-6 py-8 text-white sm:px-10 lg:order-1 lg:px-12 lg:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgb(59_130_246_/_0.22),transparent_20rem),radial-gradient(circle_at_86%_78%,rgb(14_165_233_/_0.16),transparent_24rem)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.055)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.045)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-slate-950/45 to-transparent" />

          <div className="relative flex min-h-full flex-col">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <div className="text-2xl font-bold leading-tight">IT PR</div>
                <div className="text-sm font-medium text-white/[0.78]">Document Management</div>
              </div>
            </div>

            <div className="mt-12 max-w-xl lg:mt-9 [@media(min-width:1024px)_and_(max-height:820px)]:mt-5">
              <h1 className="max-w-[12ch] text-[2.45rem] font-bold leading-tight tracking-normal text-white sm:text-5xl lg:text-[2.55rem] [@media(min-width:1024px)_and_(max-height:820px)]:text-[2.1rem]">
                IT PR Document Control
              </h1>
              <p className="mt-5 max-w-[38ch] text-lg font-medium leading-8 text-blue-50/[0.84] lg:mt-3 [@media(min-width:1024px)_and_(max-height:820px)]:text-base">
                ระบบบริหารจัดการเอกสารขอซื้อ สำหรับงานเอกสาร PR ที่ต้องควบคุมสถานะและตรวจสอบย้อนหลังได้
              </p>
              <div className="mt-7 h-1 w-12 rounded-full bg-blue-400 lg:mt-5 [@media(min-width:1024px)_and_(max-height:820px)]:mt-4" />

              <DocumentHeroImage />
            </div>

            <div className="mt-auto hidden pl-12 text-sm font-medium text-blue-50/70 lg:block">© 2026 IT PR Document Management System</div>
          </div>
        </section>

        <section className="relative order-1 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:order-2 lg:h-screen lg:min-h-0 lg:px-12 lg:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(15_38_80_/_0.048)_1px,transparent_0)] [background-size:22px_22px]" />
          <div className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent lg:block" />

          <div className="relative w-full max-w-[34.5rem]">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgb(15_38_80_/_0.09)] sm:p-9 lg:p-8">
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                  <BrandMark compact />
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-normal text-ink">เข้าสู่ระบบ IT PR</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Document Control Workspace</p>
              </div>

              <div className="my-6 h-px bg-border" />

              <form action={loginAction} className="space-y-4">
                <Field label="Username">
                  <div className="relative">
                    <UserRound aria-hidden className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                    <input
                      autoComplete="off"
                      className={inputClass("min-h-12 pl-12 text-base placeholder:text-slate-500")}
                      name="username"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </Field>
                <Field label="Password">
                  <PasswordInput />
                </Field>

                <div className="text-sm">
                  <label className="inline-flex items-center gap-2 font-semibold text-ink">
                    <input className="h-5 w-5 rounded border-border text-primary focus:ring-primary" name="remember" type="checkbox" />
                    Remember me
                  </label>
                </div>

                {params?.error ? (
                  <div aria-live="polite" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    Username หรือ password ไม่ถูกต้อง กรุณาตรวจสอบบัญชีอีกครั้ง
                  </div>
                ) : null}

                <LoginSubmitButton />
              </form>
            </div>

            <div className="mt-6 text-center text-sm text-muted lg:mt-4">
              <div className="inline-flex items-center gap-2 font-semibold">
                <LockKeyhole aria-hidden className="h-4 w-4" />
                For IT Department only
              </div>
              <div className="mt-4 lg:hidden">© 2026 IT PR Document Management. All rights reserved.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
