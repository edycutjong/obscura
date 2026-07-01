import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10">
      <p className="font-mono text-xs tracking-[0.3em] text-cyan-400 mb-6 uppercase">Obscura</p>
      <h1 className="font-display font-black text-8xl md:text-9xl text-transparent bg-clip-text bg-linear-to-b from-white to-gray-600 leading-none">
        404
      </h1>
      <p className="text-gray-400 mt-6 mb-10 max-w-md">
        This route is obscured — the page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
      </p>
      <Link
        href="/"
        className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 font-semibold px-8 py-3.5 rounded-xl transition-all"
      >
        Back to the Settlement Console
      </Link>
    </main>
  );
}
