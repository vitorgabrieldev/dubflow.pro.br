"use client";

type MainShellProps = {
  children: React.ReactNode;
};

export function MainShell({ children }: MainShellProps) {
  return (
    <main
      className="page-enter mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-8"
    >
      {children}
    </main>
  );
}
