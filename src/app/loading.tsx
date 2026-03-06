export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cream dark:bg-dark-bg">
      <span
        className="font-tamil font-bold text-emerald"
        style={{ fontSize: "5rem", animation: "fadeIn 0.4s ease forwards", opacity: 0 }}
      >
        அ
      </span>
    </div>
  );
}
