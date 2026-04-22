import Link from 'next/link';

type LoginSearchParams = Promise<{
  from?: string;
  error?: string;
  reason?: string;
}>;

/**
 * /login — the only public page.
 *
 * Renders a minimalist password form that POSTs to /api/login. Works without
 * JavaScript (progressive enhancement): the form is plain HTML, and the API
 * route responds with a 303 redirect.
 *
 * Query params:
 *   - from=<path>   the protected page the user tried to visit first
 *   - error=1       shown when the last attempt had the wrong password
 *   - reason=misconfigured  shown when APP_PASSWORD / APP_SECRET envs are missing
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const params = await searchParams;
  const from = typeof params.from === 'string' ? params.from : '/';
  const showError = params.error === '1';
  const misconfigured = params.reason === 'misconfigured';

  return (
    <main className="login-wrap">
      <a className="skip" href="#pw">Skip to password field</a>

      <section className="surface login-card" aria-labelledby="login-title">
        <div className="flex items-center gap-2 mb-6">
          <span
            aria-hidden="true"
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: 'var(--brand)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            LeadRadar
          </span>
        </div>

        <h1 id="login-title" style={{ fontSize: 28, marginBottom: 10 }}>
          Private preview
        </h1>
        <p style={{ marginBottom: 24 }}>
          Enter the access password to continue.
        </p>

        {misconfigured && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Server is missing <code>APP_PASSWORD</code> or <code>APP_SECRET</code>.
            Set both environment variables and redeploy.
          </div>
        )}

        {showError && !misconfigured && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            That password didn&rsquo;t match. Try again.
          </div>
        )}

        <form method="post" action="/api/login" noValidate>
          <input type="hidden" name="from" value={from} />

          <label htmlFor="pw" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Password
          </label>
          <input
            id="pw"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={showError ? 'true' : 'false'}
            className="login-input"
            placeholder="••••••••••••"
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16 }}
          >
            Continue
          </button>
        </form>

        <p
          className="muted"
          style={{ fontSize: 13, marginTop: 20, textAlign: 'center' }}
        >
          Invite-only MVP.{' '}
          <Link href="mailto:hello@leadradar.local" style={{ color: 'var(--brand)' }}>
            Request access
          </Link>
        </p>
      </section>
    </main>
  );
}
