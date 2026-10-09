#!/usr/bin/env python3
"""Assemble the study site from src/ into two outputs:
   site.html  - page fragment (published as the claude.ai artifact)
   index.html - full standalone document (open locally in any browser)"""
from pathlib import Path

root = Path(__file__).parent
src = root / "src"
mathjax = """<script>
window.MathJax = {
  tex: { inlineMath: [["$", "$"]], displayMath: [["$$", "$$"]], processEscapes: true },
  svg: { fontCache: "global" },
  options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code", "template"] },
  startup: { typeset: false, ready() { MathJax.startup.defaultReady(); MathJax.startup.promise.then(() => window.__q1typeset && window.__q1typeset()); } }
};
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js" async></script>"""

parts = [
    (src / "shell.html").read_text(),
    (src / "topics.html").read_text(),
    (src / "problems-a.html").read_text(),
    (src / "problems-b.html").read_text(),
    mathjax,
    "<script>\n" + (src / "app.js").read_text() + "\n</script>\n",
]
fragment = "\n".join(parts)
(root / "site.html").write_text(fragment)

head_end = fragment.index("</style>") + len("</style>")
full = (
    "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
    + fragment[:head_end]
    + "\n</head>\n<body>\n"
    + fragment[head_end:]
    + "\n</body>\n</html>\n"
)
(root / "index.html").write_text(full)
print(f"site.html {len(fragment)//1024} KB, index.html {len(full)//1024} KB")
