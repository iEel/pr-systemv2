import { BarChart3, FileCheck2, FileText, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Field, inputClass } from "@/components/ui/Field";
import { loginAction } from "./actions";
import { LoginSubmitButton, PasswordInput } from "./LoginControls";

const featureItems = [
  {
    icon: FileText,
    title: "ออกเอกสาร PR",
    body: "สร้างและบันทึกเอกสารขอซื้อได้อย่างรวดเร็ว",
  },
  {
    icon: FileCheck2,
    title: "จัดการ Template",
    body: "ใช้แม่แบบเอกสารมาตรฐาน ลดความซ้ำซ้อน",
  },
  {
    icon: BarChart3,
    title: "ติดตามสถานะเอกสาร",
    body: "ตรวจสอบความคืบหน้าแบบเรียลไทม์",
  },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid place-items-center rounded-xl bg-blue-600 text-white shadow-[0_10px_24px_rgb(37_99_235_/_0.26)] ${
        compact ? "h-16 w-16" : "h-14 w-14"
      }`}
    >
      <div className="h-8 w-8 rotate-45 rounded-md border-[7px] border-white/95 border-l-blue-200 border-t-blue-300" />
    </div>
  );
}

function FeatureCards() {
  return (
    <div className="mt-8 grid gap-4 [@media(min-width:1024px)_and_(max-height:820px)]:mt-5 [@media(min-width:1024px)_and_(max-height:820px)]:gap-3">
      {featureItems.map((item) => {
        const Icon = item.icon;

        return (
          <div
            className="group flex items-center gap-4 rounded-lg border border-white/[0.14] bg-white/[0.09] p-4 shadow-[0_18px_40px_rgb(0_0_0_/_0.16)] transition-colors duration-200 hover:bg-white/[0.13] [@media(min-width:1024px)_and_(max-height:820px)]:p-3"
            key={item.title}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white/[0.12] text-blue-50 ring-1 ring-white/[0.12] transition-colors duration-200 group-hover:bg-white/[0.18] [@media(min-width:1024px)_and_(max-height:820px)]:h-10 [@media(min-width:1024px)_and_(max-height:820px)]:w-10">
              <Icon aria-hidden className="h-6 w-6 [@media(min-width:1024px)_and_(max-height:820px)]:h-5 [@media(min-width:1024px)_and_(max-height:820px)]:w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white [@media(min-width:1024px)_and_(max-height:820px)]:text-sm">{item.title}</div>
              <p className="mt-1 text-sm leading-6 text-blue-50/70 [@media(min-width:1024px)_and_(max-height:820px)]:text-xs [@media(min-width:1024px)_and_(max-height:820px)]:leading-5">
                {item.body}
              </p>
            </div>
          </div>
        );
      })}
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
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_48%,#172554_100%)] px-6 py-8 text-white sm:px-10 lg:px-12 lg:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgb(255_255_255_/_0.16),transparent_18rem),radial-gradient(circle_at_82%_72%,rgb(14_165_233_/_0.24),transparent_24rem)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255_/_0.11)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_82%,transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-slate-950/35 to-transparent" />

          <div className="relative flex min-h-full flex-col">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <div className="text-2xl font-bold leading-tight">IT PR</div>
                <div className="text-sm font-medium text-white/[0.78]">Document Management</div>
              </div>
            </div>

            <div className="mt-12 max-w-xl lg:mt-10 [@media(min-width:1024px)_and_(max-height:820px)]:mt-6">
              <h1 className="text-[2.35rem] font-bold leading-tight tracking-normal text-white sm:text-5xl lg:text-[2.35rem] [@media(min-width:1024px)_and_(max-height:820px)]:text-[2rem]">
                IT PR Document Management
              </h1>
              <p className="mt-5 text-xl font-medium leading-8 text-blue-50/[0.86] lg:mt-3 lg:text-lg [@media(min-width:1024px)_and_(max-height:820px)]:text-base">
                ระบบบริหารจัดการเอกสารขอซื้อ (Purchase Request)
              </p>
              <div className="mt-8 h-1 w-12 rounded-full bg-blue-500 lg:mt-5 [@media(min-width:1024px)_and_(max-height:820px)]:mt-4" />
              <div className="mt-8 lg:mt-7 [@media(min-width:1024px)_and_(max-height:820px)]:mt-4">
                <h2 className="text-xl font-bold text-white [@media(min-width:1024px)_and_(max-height:820px)]:text-lg">ยินดีต้อนรับสู่ระบบบริหารจัดการเอกสาร PR</h2>
                <p className="mt-3 max-w-[40ch] text-base leading-7 text-blue-50/[0.82] [@media(min-width:1024px)_and_(max-height:820px)]:mt-2 [@media(min-width:1024px)_and_(max-height:820px)]:line-clamp-2 [@media(min-width:1024px)_and_(max-height:820px)]:text-sm [@media(min-width:1024px)_and_(max-height:820px)]:leading-6">
                  เพิ่มประสิทธิภาพการทำงาน ลดขั้นตอน และติดตามสถานะเอกสารได้อย่างง่ายดาย
                </p>
              </div>

              <FeatureCards />
            </div>

            <div className="mt-auto hidden pl-12 text-sm font-medium text-blue-50/70 lg:block">© 2026 IT PR Document Management System</div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:min-h-0 lg:px-12 lg:py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(15_38_80_/_0.055)_1px,transparent_0)] [background-size:20px_20px]" />

          <div className="relative w-full max-w-[39rem]">
            <div className="rounded-xl border border-border bg-white/[0.96] p-6 shadow-[0_24px_70px_rgb(15_38_80_/_0.12)] sm:p-9 lg:p-7">
              <div className="text-center">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-surface lg:h-20 lg:w-20">
                  <BrandMark compact />
                </div>
                <h2 className="mt-6 text-3xl font-bold tracking-normal text-ink lg:mt-4 lg:text-2xl">Sign In to Your Account</h2>
                <p className="mt-3 text-sm leading-6 text-muted lg:mt-2">เข้าสู่ระบบเพื่อใช้งาน IT PR Document Management</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-primary lg:mt-3">
                  <UserRound aria-hidden className="h-4 w-4" />
                  Local user / password
                </div>
              </div>

              <div className="my-7 h-px bg-border lg:my-5" />

              <form action={loginAction} className="space-y-5 lg:space-y-4">
                <Field label="Username or Email">
                  <div className="relative">
                    <UserRound aria-hidden className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                    <input
                      autoComplete="off"
                      className={inputClass("min-h-12 pl-12 text-base placeholder:text-slate-500")}
                      name="username"
                      placeholder="Enter username or email"
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

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 lg:p-3">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-primary">
                      <ShieldCheck aria-hidden className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-900">ระบบนี้สำหรับเจ้าหน้าที่ IT Department เท่านั้น</div>
                      <div className="mt-1 text-sm leading-6 text-blue-800">ข้อมูลของคุณจะถูกเข้ารหัสและจัดเก็บอย่างปลอดภัย</div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-7 text-center text-sm text-muted lg:mt-4">
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
