import React, { useState } from 'react';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from 'lucide-react';

export interface AppAccount {
  uid: string;
  displayName: string;
  email: string;
  mode: 'firebase' | 'local_account';
}

interface AuthViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onLoginSuccess: (account: AppAccount) => void;
  onGoogleLogin: () => Promise<void>;
  onEmailAuth: (params: {
    mode: 'login' | 'register';
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  externalError: string | null;
}

export const AuthView: React.FC<AuthViewProps> = ({
  isDark,
  onToggleTheme,
  onLoginSuccess,
  onGoogleLogin,
  onEmailAuth,
  externalError,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setLocalError('Informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setLocalError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setLocalError('Informe seu nome ou o nome da sua oficina 3D.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('As senhas digitadas não coincidem.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onEmailAuth({
        mode,
        name: name.trim(),
        email: trimmedEmail,
        password,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Erro ao autenticar sua conta.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccount = () => {
    onLoginSuccess({
      uid: 'local_studio',
      displayName: 'Oficina Maker Pro',
      email: 'contato@printgoals3d.com.br',
      mode: 'local_account',
    });
  };

  const activeError = localError || externalError;

  return (
    <div className="min-h-screen bg-[#EEF0F4] dark:bg-[#0B0D13] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 transition-colors">
      {/* Top Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 grid-cols-2 gap-0.5 rounded-2xl bg-[#1D63FF] p-2.5 text-white shadow-lg shadow-blue-600/30">
            <span className="rounded-full bg-white" />
            <span className="rounded-sm bg-white/70" />
            <span className="rounded-sm bg-white/70" />
            <span className="rounded-full bg-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            PrintGoals 3D
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Main Split Container */}
      <main className="mx-auto my-8 grid w-full max-w-6xl grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        {/* Left Brand Showcase Card (Blue in Dark Mode, Black in Light Mode for visual balance) */}
        <div className="flex flex-col justify-between rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-8 sm:p-10 text-white shadow-2xl lg:col-span-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white">
              <Box className="h-3.5 w-3.5" />
              Gestão & Precificação de Manufatura Aditiva
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Precifique suas impressões 3D com precisão cirúrgica.
            </h1>
            <p className="mt-4 text-sm text-slate-300 dark:text-blue-100 leading-relaxed">
              Controle cada grama de filamento ou resina, consumo elétrico em kWh, depreciação de máquina, risco de falha e fluxo de caixa em sua conta individual.
            </p>
          </div>

          <div className="my-8 space-y-3.5">
            <div className="flex items-start gap-3 rounded-2xl bg-white/10 dark:bg-slate-950/25 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400 dark:text-white" />
              <div>
                <div className="text-sm font-bold">Anatomia Real do Custo (FDM & SLA)</div>
                <div className="text-xs text-slate-300 dark:text-blue-100">
                  Cálculo instantâneo de material, energia, amortização, mão de obra e ROI da impressora.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-white/10 dark:bg-slate-950/25 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400 dark:text-white" />
              <div>
                <div className="text-sm font-bold">Conta Individual & Estoque de Bobinas</div>
                <div className="text-xs text-slate-300 dark:text-blue-100">
                  Cada usuário possui seus próprios orçamentos, carretéis e relatórios financeiros isolados.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/15 pt-5 text-xs text-slate-300 dark:text-blue-100">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4" /> Dados protegidos por conta
            </span>
            <span className="font-mono">FDM · SLA · DLP</span>
          </div>
        </div>

        {/* Right Login / Register Card */}
        <div className="flex flex-col justify-center rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 sm:p-10 shadow-xl lg:col-span-6">
          {/* Segmented Mode Switch: Login vs Cadastro */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 dark:bg-[#0D0F14] p-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
              }}
              className={`rounded-xl py-2.5 text-xs font-extrabold transition-all ${
                mode === 'login'
                  ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setLocalError(null);
              }}
              className={`rounded-xl py-2.5 text-xs font-extrabold transition-all ${
                mode === 'register'
                  ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login'
                ? 'Acesse sua Oficina 3D'
                : 'Cadastre sua Conta Profissional'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {mode === 'login'
                ? 'Entre com seu e-mail e senha ou conecte sua conta Google.'
                : 'Crie seu perfil exclusivo para salvar orçamentos, bobinas e fluxo de caixa.'}
            </p>
          </div>

          {activeError && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-500"
            >
              {activeError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Seu Nome ou Nome do Estúdio 3D
                </label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Daniel Impressões 3D"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                E-mail da Conta
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@oficina3d.com.br"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Senha
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Confirmar Senha
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha escolhida"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D63FF] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <span>
                {mode === 'login' ? 'Entrar na Minha Conta' : 'Concluir Cadastro e Entrar'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] font-semibold text-slate-400">
              OU ACESSE RÁPIDO
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onGoogleLogin}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors"
            >
              <span>Entrar com Google</span>
            </button>

            <button
              type="button"
              onClick={handleDemoAccount}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-4 py-2.5 text-xs font-bold text-[#1D63FF] dark:text-blue-400 hover:border-[#1D63FF] transition-colors"
            >
              <span>Explorar Conta Demo</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl text-center text-xs text-slate-400">
        PrintGoals 3D · Plataforma de Precificação, Estoque e Gestão Financeira para Impressão 3D
      </footer>
    </div>
  );
};
