const hues = ["#2CE0C7", "#FFB547", "#8B9CFF", "#F27FA5", "#7CD992", "#6FC3FF"];

export function Avatar({ name, url, size = 32, className = "" }: { name: string; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className={`${className} shrink-0 rounded-full object-cover ring-2 ring-surface`} />;
  }
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const bg = hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return (
    <span style={{ ...style, background: bg }} aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center rounded-full font-display font-bold text-night ring-2 ring-surface`}>
      {initials}
    </span>
  );
}
