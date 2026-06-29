/**
 * AniList Custom-Markdown-Parser (Pflichtenheft § Spezifikation).
 * XSS-sicher: HTML wird vor Regex-Ersetzungen escaped.
 */
export function parseAniListMarkdown(rawText: string): string {
  let safeHtml = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safeHtml = safeHtml.replace(
    /~!(.*?)!~/g,
    '<span class="markdown-spoiler" data-spoiler="true">$1</span>',
  );

  safeHtml = safeHtml.replace(
    /@([a-zA-Z0-9_]+)/g,
    '<a href="/user/$1" class="user-mention">@$1</a>',
  );

  safeHtml = safeHtml.replace(/~~(.*?)~~/g, "<del>$1</del>");

  safeHtml = safeHtml.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="custom-link">$1</a>',
  );

  return safeHtml;
}

/** Client-side spoiler reveal (onclick alternative without inline JS in HTML). */
export function bindSpoilerClicks(container: HTMLElement): () => void {
  function onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.dataset.spoiler === "true") {
      target.classList.toggle("revealed");
    }
  }
  container.addEventListener("click", onClick);
  return () => container.removeEventListener("click", onClick);
}
