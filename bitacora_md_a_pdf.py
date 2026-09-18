#!/usr/bin/env python3
"""Convierte BITACORA.md a BITACORA.pdf (formato bitacora-viva del usuario).

Uso:
    python bitacora_md_a_pdf.py

Lee BITACORA.md en esta misma carpeta y genera BITACORA.pdf al lado (gitignored:
la bitácora en PDF nunca se sube al repo, solo el .md). Sin dependencias externas
más allá de reportlab.
"""
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

HERE = Path(__file__).resolve().parent
SRC = HERE / "BITACORA.md"
DEST = HERE / "BITACORA.pdf"

NAVY = colors.HexColor("#1e3a72")
TEAL = colors.HexColor("#0d8f7f")
GOLD = colors.HexColor("#d99a2b")
INK = colors.HexColor("#101827")
MUTED = colors.HexColor("#5b6478")
BORDER = colors.HexColor("#dde3ee")
CARD = colors.HexColor("#f1f4fa")

styles = getSampleStyleSheet()
base_font = "Helvetica"

STYLES = {
    "h1": ParagraphStyle("h1", parent=styles["Title"], fontName=base_font + "-Bold",
                          fontSize=20, textColor=NAVY, spaceAfter=14, spaceBefore=6),
    "h2": ParagraphStyle("h2", parent=styles["Heading1"], fontName=base_font + "-Bold",
                          fontSize=15, textColor=NAVY, spaceBefore=18, spaceAfter=8,
                          borderColor=BORDER, borderWidth=0, borderPadding=0),
    "h3": ParagraphStyle("h3", parent=styles["Heading2"], fontName=base_font + "-Bold",
                          fontSize=12.5, textColor=TEAL, spaceBefore=14, spaceAfter=6),
    "body": ParagraphStyle("body", parent=styles["BodyText"], fontName=base_font,
                            fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=6),
    "bullet": ParagraphStyle("bullet", parent=styles["BodyText"], fontName=base_font,
                              fontSize=9.5, leading=13.5, textColor=INK,
                              leftIndent=14, bulletIndent=2, spaceAfter=3),
    "quote": ParagraphStyle("quote", parent=styles["BodyText"], fontName=base_font + "-Oblique",
                             fontSize=9, leading=13, textColor=MUTED, leftIndent=10,
                             spaceAfter=6),
    "code": ParagraphStyle("code", parent=styles["Code"], fontName="Courier",
                            fontSize=8.3, leading=11.5, textColor=INK,
                            backColor=CARD, borderPadding=6, spaceAfter=8),
    "cell": ParagraphStyle("cell", parent=styles["BodyText"], fontName=base_font,
                            fontSize=8.3, leading=11, textColor=INK),
    "cellhead": ParagraphStyle("cellhead", parent=styles["BodyText"], fontName=base_font + "-Bold",
                                fontSize=8.3, leading=11, textColor=colors.white),
}


# Helvetica/WinAnsiEncoding no cubre estos símbolos (a diferencia de áéíóúñ–—…‹›« que sí);
# sin este reemplazo el glifo se pierde (queda en blanco o como un cuadro) al renderizar.
UNSUPPORTED_GLYPHS = {
    "→": "->",   # →
    "≈": "~",    # ≈
    "≤": "<=",   # ≤
    "≥": ">=",   # ≥
    "▶": "»",  # ▶ -> »
    "◷": "[icono]",  # ◷ (glifo de ejemplo mencionado en el texto)
}


def inline(text: str) -> str:
    """Convierte **bold**, `code` y enlaces markdown básicos a marcado de reportlab."""
    for bad, good in UNSUPPORTED_GLYPHS.items():
        text = text.replace(bad, good)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"&lt;br&gt;", "<br/>", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font face="Courier" size="8.3">\1</font>', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<link href="\2" color="#0d8f7f">\1</link>', text)
    return text


def split_row(line: str):
    """Divide una fila de tabla markdown por '|', ignorando los '|' que caigan
    dentro de un tramo entre backticks (ej. una celda con `a || b`)."""
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    cells = []
    buf = []
    in_code = False
    for ch in line:
        if ch == "`":
            in_code = not in_code
            buf.append(ch)
        elif ch == "|" and not in_code:
            cells.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    cells.append("".join(buf).strip())
    return cells


def is_separator_row(cells) -> bool:
    return all(re.fullmatch(r":?-{2,}:?", c.strip()) for c in cells if c.strip())


def build_table(rows):
    header, *body = rows
    data = [[Paragraph(inline(c), STYLES["cellhead"]) for c in header]]
    for r in body:
        data.append([Paragraph(inline(c), STYLES["cell"]) for c in r])
    n = len(header)
    avail_width = LETTER[0] - 2 * 2 * cm
    col_width = avail_width / n
    t = Table(data, colWidths=[col_width] * n, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CARD]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def starts_new_block(stripped: str) -> bool:
    """True si esta línea abre un bloque nuevo (no es continuación de párrafo)."""
    if not stripped:
        return True
    if stripped in ("---", "***", "___"):
        return True
    if re.match(r"^(#{1,3})\s+", stripped):
        return True
    if stripped.startswith(">"):
        return True
    if stripped.startswith("|"):
        return True
    if re.match(r"^[-*]\s+", stripped):
        return True
    if re.match(r"^\d+\.\s+", stripped):
        return True
    if stripped.startswith("```"):
        return True
    return False


def parse(md_text: str):
    lines = md_text.split("\n")
    story = []
    i = 0
    n = len(lines)
    in_code = False
    code_buf = []

    while i < n:
        line = lines[i]

        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_buf = []
            else:
                in_code = False
                escaped = "\n".join(code_buf).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(escaped.replace("\n", "<br/>"), STYLES["code"]))
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped in ("---", "***", "___"):
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=0.6, color=BORDER, spaceBefore=2, spaceAfter=10))
            i += 1
            continue

        m = re.match(r"^(#{1,3})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text_lines = [m.group(2)]
            i += 1
            while i < n and not starts_new_block(lines[i].strip()):
                text_lines.append(lines[i].strip())
                i += 1
            text = inline(" ".join(text_lines))
            key = {1: "h1", 2: "h2", 3: "h3"}[level]
            story.append(Paragraph(text, STYLES[key]))
            continue

        if stripped.startswith(">"):
            text_lines = [stripped.lstrip("> ").strip()]
            i += 1
            while i < n and not starts_new_block(lines[i].strip()):
                text_lines.append(lines[i].strip())
                i += 1
            text = inline(" ".join(text_lines))
            story.append(Paragraph(text, STYLES["quote"]))
            continue

        if stripped.startswith("|"):
            table_lines = []
            while i < n and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            rows = [split_row(r) for r in table_lines]
            if len(rows) >= 2 and is_separator_row(rows[1]):
                rows = [rows[0]] + rows[2:]
            story.append(build_table(rows))
            story.append(Spacer(1, 10))
            continue

        if re.match(r"^[-*]\s+", stripped):
            text_lines = [re.sub(r"^[-*]\s+", "", stripped)]
            i += 1
            while i < n and not starts_new_block(lines[i].strip()):
                text_lines.append(lines[i].strip())
                i += 1
            text = inline(" ".join(text_lines))
            story.append(Paragraph("&bull;&nbsp; " + text, STYLES["bullet"]))
            continue

        if re.match(r"^\d+\.\s+", stripped):
            text_lines = [re.sub(r"^\d+\.\s+", "", stripped)]
            i += 1
            while i < n and not starts_new_block(lines[i].strip()):
                text_lines.append(lines[i].strip())
                i += 1
            text = inline(" ".join(text_lines))
            story.append(Paragraph(text, STYLES["bullet"]))
            continue

        text_lines = [stripped]
        i += 1
        while i < n and not starts_new_block(lines[i].strip()):
            text_lines.append(lines[i].strip())
            i += 1
        story.append(Paragraph(inline(" ".join(text_lines)), STYLES["body"]))

    return story


def main():
    if not SRC.exists():
        raise SystemExit(f"No se encontró {SRC}")
    md_text = SRC.read_text(encoding="utf-8")
    story = parse(md_text)

    doc = SimpleDocTemplate(
        str(DEST), pagesize=LETTER,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title="Bitácora — Control de Turnos y Asistencia",
    )
    doc.build(story)
    print(f"Generado: {DEST}")


if __name__ == "__main__":
    main()
