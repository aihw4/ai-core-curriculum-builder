"""Embed screenshots as base64 so report.html and slides.html are self-contained.

Run from the repo root:  python docs/build_docs.py
"""
import base64
import re
from pathlib import Path

DOCS = Path(__file__).resolve().parent


def inline(src_name, out_path):
    html = (DOCS / src_name).read_text()

    def repl(m):
        data = base64.b64encode((DOCS / m.group(1)).read_bytes()).decode()
        return 'src="data:image/jpeg;base64,{}"'.format(data)

    out_path.write_text(re.sub(r'src="(screens/[^"]+\.jpg)"', repl, html))
    print("wrote", out_path)


inline("report_src.html", DOCS.parent / "report.html")
inline("slides_src.html", DOCS.parent / "slides.html")
