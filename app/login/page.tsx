import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_45%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.16),transparent_50%)]">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs text-white/70">
                USSD Builder
              </div>
              <h1 className="text-3xl font-semibold leading-tight">
                Build, test, and ship USSD flows fast.
              </h1>
              <p className="text-sm text-white/70">
                Manage flows, audit events, and live sessions in one focused
                workspace.
              </p>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Secure access for team members and admins.
              </div>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
