const particles = [
  { size: "h-5 w-8", color: "bg-brick", left: "5%", duration: "12s", delay: "0s" },
  { size: "h-3 w-5", color: "bg-sun", left: "15%", duration: "16s", delay: "2s" },
  { size: "h-5 w-10", color: "bg-ink-deep", left: "80%", duration: "14s", delay: "4s" },
  { size: "h-4 w-6", color: "bg-brick/70", left: "90%", duration: "10s", delay: "1s" },
  { size: "h-5 w-8", color: "bg-sun-deep", left: "60%", duration: "18s", delay: "6s" },
  { size: "h-3 w-4", color: "bg-ink-deep", left: "40%", duration: "13s", delay: "3s" },
  { size: "h-4 w-7", color: "bg-brick/85", left: "25%", duration: "15s", delay: "1.5s" },
  { size: "h-6 w-6", color: "bg-sun", left: "70%", duration: "17s", delay: "3.5s" },
  { size: "h-5 w-9", color: "bg-ink-deep", left: "30%", duration: "14s", delay: "5s" },
  { size: "h-3 w-5", color: "bg-brick", left: "55%", duration: "11s", delay: "2.5s" },
  { size: "h-6 w-12", color: "bg-ink", left: "85%", duration: "19s", delay: "0.5s" },
];

export function BackgroundParticles() {
  return (
    <div className="fixed inset-0 z-[-10] overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className={`particle ${p.size} ${p.color}`}
          style={{ left: p.left, animationDuration: p.duration, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}
