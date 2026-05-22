import { LoginForm } from "./LoginForm"

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Alto Alcance CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresá a tu cuenta para continuar</p>
      </div>
      <LoginForm />
    </div>
  )
}
