export function Header() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <svg aria-hidden="true" viewBox="0 0 48 32" className="h-8 w-12 text-sky-200">
            <circle cx="8" cy="16" r="4" fill="currentColor" />
            <circle cx="24" cy="8" r="4" fill="currentColor" />
            <circle cx="40" cy="20" r="4" fill="currentColor" />
            <path d="M12 15 L20 10 M28 10 L36 18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Advisor Attack-Path Graph</h1>
            <p className="text-sm text-sky-100">Cyber-to-Financial Incident Intelligence</p>
          </div>
        </div>
        <p className="text-right text-xs uppercase tracking-wide text-sky-100">
          LPL Financial University Hackathon 2026
          <span className="mt-1 block normal-case tracking-normal text-sky-200/90">
            Prototype · not an LPL production system
          </span>
        </p>
      </div>
    </header>
  );
}
