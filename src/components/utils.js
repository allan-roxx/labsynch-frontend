/** Small utility for conditionally joining class strings (no extra deps). */
export function clsx(...classes) {
  return classes.filter(Boolean).join(' ');
}
