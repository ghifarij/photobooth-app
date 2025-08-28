import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[var(--surface)]/80 backdrop-blur-sm border-b border-[var(--border)]/60 shadow-sm">
      <div className="container">
        <div className="px-4 py-3 2xl:py-4">
          <div className="flex items-center justify-center gap-3 2xl:gap-4">
            <div className="flex items-center gap-3">
              {/* Light mode logo */}
              <Image
                src="/AssessioLightMode.png"
                alt="Assessio logo light"
                width={200}
                height={48}
                className="h-6 2xl:h-8 w-auto dark:hidden"
                priority
              />
              {/* Dark mode logo */}
              <Image
                src="/AssessioDarkMode.png"
                alt="Assessio logo dark"
                width={200}
                height={48}
                className="h-6 2xl:h-8 w-auto hidden dark:block"
                priority
              />
              <span className="text-sm 2xl:text-base text-[var(--foreground)]">Assessio</span>
            </div>

            <div className="w-px h-4 bg-[var(--border)]"></div>

            <Link
              href="/"
              className="text-sm 2xl:text-base px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-md transition-all duration-200 text-[var(--foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)] hover:scale-105 active:scale-95"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
