export function Flame({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#FFB547" d="M12 2c1 3.5 5 5.6 5 10.2A5 5 0 0 1 7 12.5c0-2 1-3.3 2-4.3.2 1.6 1 2.6 2 3C11 8.6 11 5 12 2Z" />
      <path fill="#FFE2A8" d="M12 13c.6 1.4 2 2.1 2 3.7a2 2 0 0 1-4 0c0-1 .5-1.7 1-2.2.2.6.5.9 1 1-.2-.8-.2-1.6 0-2.5Z" />
    </svg>
  );
}
