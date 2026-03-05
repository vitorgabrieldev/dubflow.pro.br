export default function SearchLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-5 shadow-sm">
        <div className="h-4 w-56 animate-pulse rounded bg-black/10" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="h-9 w-24 animate-pulse rounded-[9px] bg-black/10" />
          ))}
        </div>
      </section>

      <section className="rounded-[12px] border border-[var(--color-border-soft)] bg-white p-4 shadow-sm">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <section key={sectionIndex} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="h-4 w-24 animate-pulse rounded bg-black/10" />
                <span className="h-4 w-8 animate-pulse rounded-full bg-black/10" />
              </div>

              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <div
                    key={`${sectionIndex}-${rowIndex}`}
                    className="h-12 animate-pulse rounded-[10px] border border-[var(--color-border-soft)] bg-black/[0.03]"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

