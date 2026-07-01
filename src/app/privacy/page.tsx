import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Obscura',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen text-gray-300 px-6 py-16 relative z-10">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="font-mono text-xs tracking-widest text-cyan-400 hover:text-cyan-300 uppercase"
        >
          ← Obscura
        </Link>
        <h1 className="font-display font-black text-4xl md:text-5xl text-white mt-6 mb-2">
          Privacy Policy
        </h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: July 1, 2026</p>

        <div className="space-y-8 leading-relaxed text-gray-400">
          <p>
            Obscura is a demonstration application built for the DoraHacks &ldquo;Stellar Hacks:
            Real-World ZK&rdquo; hackathon and runs on the Stellar{' '}
            <strong className="text-gray-200">test network</strong>. This policy describes the
            limited data the app touches.
          </p>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">No accounts, no personal data</h2>
            <p>
              Obscura has no sign-up and does not collect names, emails, or other personally
              identifying information. It sets no advertising or cross-site tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Wallet &amp; on-chain data</h2>
            <p>
              If you connect Freighter, the app reads your public Stellar address to construct
              testnet transactions that you explicitly approve in your wallet. Public keys and
              transactions recorded on the Stellar ledger are inherently public and outside our
              control.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Encrypted invoice data</h2>
            <p>
              Invoice amounts and metadata are encrypted client-side. In sandbox mode all
              cryptographic operations are simulated locally in your browser and nothing is
              transmitted to us. Where a demo backend is used, only ciphertext and public hashes are
              stored — never your keys.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Hosting &amp; logs</h2>
            <p>
              The site is hosted on Vercel, which may process standard request metadata (such as IP
              address and browser user-agent) in server logs for security and reliability. We do not
              sell or share your data.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-2">Contact</h2>
            <p>
              Questions? Reach the maintainer via the{' '}
              <a
                href="https://github.com/edycutjong/obscura"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300"
              >
                project repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
