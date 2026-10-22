import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, UserButton, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ArrowRight, Check, ShieldCheck, ShoppingBasket, TrendingDown } from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import App from './App';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#245a4e',
    colorForeground: '#24453c',
    colorMutedForeground: '#718078',
    colorDanger: '#a34539',
    colorBackground: '#fbfaf5',
    colorInput: '#fffdf8',
    colorInputForeground: '#24453c',
    colorNeutral: '#dcd8cc',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '0.65rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf5] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#e1dccf] shadow-[0_20px_55px_rgba(58,74,57,0.10)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#1d4038] font-bold tracking-tight',
    headerSubtitle: 'text-[#718078]',
    socialButtonsBlockButtonText: 'text-[#294b41] font-semibold',
    formFieldLabel: 'text-[#476258] font-semibold',
    footerActionLink: 'text-[#245a4e] font-semibold',
    footerActionText: 'text-[#718078]',
    dividerText: 'text-[#76857d]',
    identityPreviewEditButton: 'text-[#245a4e]',
    formFieldSuccessText: 'text-[#397456]',
    alertText: 'text-[#8c4138]',
    logoBox: 'rounded-xl overflow-hidden',
    logoImage: 'w-9 h-9',
    socialButtonsBlockButton: 'border-[#ded9cd] bg-[#fffef9] hover:bg-[#f3f0e7]',
    formButtonPrimary: 'bg-[#245a4e] hover:bg-[#1b493f] text-white shadow-none',
    formFieldInput: 'border-[#dcd8cc] bg-[#fffdf8] text-[#24453c] focus:border-[#648c79] focus:ring-[#648c79]',
    footerAction: 'text-[#718078]',
    dividerLine: 'bg-[#e5e1d7]',
    alert: 'border-[#ecd1c9] bg-[#fff8f4]',
    otpCodeFieldInput: 'border-[#dcd8cc] bg-[#fffdf8] text-[#24453c]',
    formFieldRow: 'gap-1.5',
    main: 'gap-5',
  },
};

function LoadingView() {
  return <main className="auth-loading" aria-label="Loading StockSync account">
    <div className="auth-loading-card" aria-hidden="true">
      <div className="skeleton"/><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/>
    </div>
  </main>;
}

class AuthFailureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('StockSync authentication screen failed', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="auth-loading"><section className="auth-error" role="alert">
      <b>We couldn’t load this account screen.</b><br/>Check your connection, then try again.
      <button className="button" style={{ marginTop: 14 }} onClick={() => this.setState({ failed: false })}>Try again</button>
    </section></main>;
    return this.props.children;
  }
}

function Brand() {
  return <span className="public-brand">
    <img src={`${basePath}/logo.svg`} alt="" />
    <span><strong>StockSync AI</strong><small>STORE OPERATIONS</small></span>
  </span>;
}

function LandingPage() {
  return <div className="public-shell">
    <header className="public-nav">
      <Brand/>
      <nav className="public-nav-actions" aria-label="Account">
        <Link href="/sign-in" className="public-nav-link" data-testid="link-sign-in">Sign in</Link>
        <Link href="/sign-up" className="public-nav-link primary" data-testid="link-create-account">Create account</Link>
      </nav>
    </header>
    <main>
      <section className="public-hero">
        <div className="public-hero-copy">
          <div className="public-kicker"><i/> PRACTICAL STOCK CONTROL FOR LOCAL STORES</div>
          <h1>Stay ahead of<br/><em>what runs out.</em></h1>
          <p className="public-lede">StockSync helps Malaysian store managers spot stock risk early, prepare sensible purchase orders and keep every decision in their hands.</p>
          <div className="public-ctas">
            <Link href="/sign-up" className="public-cta primary" data-testid="link-start-account">Create your account <ArrowRight size={15}/></Link>
            <Link href="/sign-in" className="public-cta secondary" data-testid="link-existing-account">I already have an account</Link>
          </div>
          <div className="public-footnote">Your workspace starts after sign-in. No guest or demo access.</div>
        </div>
        <div className="public-board" aria-label="StockSync inventory preview">
          <div className="board-card">
            <div className="board-top"><span className="board-label">Morning stock brief · KL</span><span className="board-live">LOCAL WORKSPACE</span></div>
            <div className="board-headline">A few items need a look.</div>
            <div className="board-sub">A clear signal, before the next delivery window.</div>
            <div className="board-item"><span className="board-icon"><ShoppingBasket size={16}/></span><span><b>Fresh milk</b><small>About 1.1 days of stock cover</small></span><strong>9 L</strong></div>
            <div className="board-item"><span className="board-icon warn"><TrendingDown size={16}/></span><span><b>Kopi beans, medium roast</b><small>Lead time is longer than current cover</small></span><strong>4.5 kg</strong></div>
            <div className="board-approval"><span><ShieldCheck size={14}/> Suggested order ready for review</span><Check size={15}/></div>
          </div>
          <div className="hero-note">A manager approves every order.<br/>Stock signals never send one for you.</div>
        </div>
      </section>
      <div className="public-proof"><strong>Built for the day-to-day</strong><span>Inventory signals, local supplier context and manager-approved orders.</span><span>Malaysian ringgit · Malaysian wholesale workflows</span></div>
      <section className="public-section">
        <div className="public-section-head">
          <div className="eyebrow">A simple operating rhythm</div>
          <h2>From shelf check to considered order.</h2>
          <p>Useful guidance, with the person running the store still firmly in charge.</p>
        </div>
        <div className="workflow">
          <article className="workflow-feature"><span className="step-number">01 / NOTICE</span><div><h3>See the risk before it becomes a rush.</h3><p>Keep an eye on stock cover against recent use, reorder lead times and a practical buffer.</p></div></article>
          <div className="workflow-stack">
            <article className="workflow-small"><span className="step-number">02 / PREPARE</span><h3>Put a useful suggestion on the table.</h3><p>Review the proposed quantity, supplier and indicative cost in one place.</p></article>
            <article className="workflow-small"><span className="step-number">03 / DECIDE</span><h3>Approve only when it makes sense.</h3><p>Make the call, keep a note, and track the order through a locally recorded receipt.</p></article>
          </div>
        </div>
      </section>
      <section className="public-bottom"><div><h2>Make the next stock decision clearer.</h2><p>Create an account to open your own StockSync workspace.</p></div><Link href="/sign-up" className="public-cta" data-testid="link-bottom-create-account">Create account <ArrowRight size={15}/></Link></section>
    </main>
  </div>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingView/>;
  return isSignedIn ? <Redirect to="/user-portal"/> : <LandingPage/>;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="auth-shell">
    <aside className="auth-aside">
      <Link href="/" aria-label="StockSync AI home"><Brand/></Link>
      <div className="auth-aside-copy">
        <div className="public-kicker"><i/> STOCK DECISIONS, MADE CLEARER</div>
        <h1>Good operations start with a good read on stock.</h1>
        <p>Keep everyday stock signals and manager-approved purchase decisions together, in a workspace for your store.</p>
      </div>
      <div className="auth-aside-quote">A practical helper for local store teams.<br/>Suggestions stay suggestions until you decide.</div>
    </aside>
    <main className="auth-main">
      <Link href="/" className="auth-back" data-testid="link-auth-home">← Back to StockSync</Link>
      <div className="auth-container"><AuthFailureBoundary>{children}</AuthFailureBoundary><p className="auth-caption">StockSync AI · Local workspace demo · Malaysia</p></div>
    </main>
  </div>;
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></AuthFrame>;
}

function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></AuthFrame>;
}

function ProtectedWorkspace() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  if (!isLoaded || (isSignedIn && !isUserLoaded)) return <LoadingView/>;
  if (!isSignedIn) return <Redirect to="/"/>;
  if (!user) return <main className="auth-loading"><div className="auth-error" role="alert">We couldn’t identify this account. Please sign in again.</div></main>;
  const name = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'Store manager';
  return <App key={user.id} userId={user.id} userName={name}/>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to return to your store workspace.' } },
      signUp: { start: { title: 'Create your account', subtitle: 'Set up a workspace for your store.' } },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  >
    <AuthFailureBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect}/>
        <Route path="/sign-in/*?" component={SignInPage}/>
        <Route path="/sign-up/*?" component={SignUpPage}/>
        <Route path="/user-portal" component={ProtectedWorkspace}/>
        <Route path="/inventory" component={ProtectedWorkspace}/>
        <Route path="/purchase-orders" component={ProtectedWorkspace}/>
        <Route path="/activity" component={ProtectedWorkspace}/>
        <Route component={() => <main className="auth-loading"><section className="auth-error">That StockSync page could not be found. <Link href="/" className="public-nav-link">Return home</Link></section></main>}/>
      </Switch>
    </AuthFailureBoundary>
  </ClerkProvider>;
}

export default function AuthApp() {
  return <WouterRouter base={basePath}><ClerkRoutes/></WouterRouter>;
}
