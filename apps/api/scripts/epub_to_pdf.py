#!/usr/bin/env python3

import sys
import re
import zipfile
import tempfile
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup
from weasyprint import HTML


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def find_opf(root: Path) -> Path:
    container = root / "META-INF" / "container.xml"

    if not container.exists():
        raise RuntimeError(
            "EPUB tidak memiliki META-INF/container.xml"
        )

    tree = ET.parse(container)

    ns = {
        "c": "urn:oasis:names:tc:opendocument:xmlns:container"
    }

    node = tree.find(
        ".//c:rootfile",
        ns,
    )

    if node is None:
        raise RuntimeError(
            "OPF EPUB tidak ditemukan"
        )

    full_path = node.attrib.get("full-path")

    if not full_path:
        raise RuntimeError(
            "Path OPF tidak ditemukan"
        )

    return (root / unquote(full_path)).resolve()


def local_name(tag):
    return tag.split("}", 1)[-1]


def parse_opf(opf: Path):
    tree = ET.parse(opf)
    root = tree.getroot()

    manifest = {}
    spine = []

    for element in root.iter():
        if local_name(element.tag) != "item":
            continue

        item_id = element.attrib.get("id")
        href = element.attrib.get("href")
        media = element.attrib.get("media-type")

        if item_id and href:
            manifest[item_id] = {
                "href": href,
                "media": media or "",
            }

    for element in root.iter():
        if local_name(element.tag) != "itemref":
            continue

        item_id = element.attrib.get("idref")

        if item_id in manifest:
            spine.append(manifest[item_id])

    return manifest, spine


def resolve_resource(base: Path, value: str):
    if not value:
        return None

    value = value.strip()

    if value.startswith(
        (
            "data:",
            "http:",
            "https:",
            "file:",
            "#",
        )
    ):
        return None

    value = value.split("#", 1)[0]
    value = unquote(value)

    if not value:
        return None

    target = (
        base.parent / value
    ).resolve()

    return target if target.exists() else None


def rewrite_html_resources(
    soup: BeautifulSoup,
    html_path: Path,
):
    # Images
    for tag in soup.find_all(
        ["img", "image"]
    ):
        attr = (
            "href"
            if tag.name == "image"
            else "src"
        )

        value = tag.get(attr)

        target = resolve_resource(
            html_path,
            value,
        )

        if target:
            tag[attr] = file_url(target)

    # SVG href / xlink:href
    for tag in soup.find_all(True):
        for attr in (
            "href",
            "xlink:href",
        ):
            value = tag.get(attr)

            target = resolve_resource(
                html_path,
                value,
            )

            if target:
                tag[attr] = file_url(target)

    # Remove JavaScript
    for tag in soup.find_all(
        ["script", "noscript"]
    ):
        tag.decompose()

    # Remove EPUB navigation metadata that
    # is not needed in the printed document.
    for tag in soup.find_all(
        ["nav"]
    ):
        epub_type = (
            tag.get("epub:type")
            or tag.get("type")
            or ""
        )

        if (
            "toc" in epub_type
            or "landmarks" in epub_type
            or "page-list" in epub_type
        ):
            tag.decompose()


def rewrite_css(
    css: str,
    css_path: Path,
) -> str:
    """
    Rewrite relative url(...) resources inside
    CSS to absolute file:// URLs.

    This is important for:
    - fonts
    - background images
    - SVG
    - other EPUB assets
    """

    def replace_url(match):
        raw = match.group(1).strip()

        if (
            raw.startswith(
                (
                    "data:",
                    "http:",
                    "https:",
                    "file:",
                    "#",
                )
            )
        ):
            return f"url({raw})"

        clean = raw.strip(
            "\"'"
        )

        target = resolve_resource(
            css_path,
            clean,
        )

        if target:
            return (
                "url("
                + file_url(target)
                + ")"
            )

        return f"url({raw})"

    css = re.sub(
        r"url\(\s*([^)]+?)\s*\)",
        replace_url,
        css,
        flags=re.IGNORECASE,
    )

    return css


def collect_css(
    root: Path,
    manifest: dict,
):
    css = []

    for item in manifest.values():
        if item.get("media") != "text/css":
            continue

        css_path = (
            root / item["href"]
        ).resolve()

        if not css_path.exists():
            continue

        raw = css_path.read_text(
            encoding="utf-8",
            errors="replace",
        )

        raw = rewrite_css(
            raw,
            css_path,
        )

        css.append(
            "\n/* USEFECT EPUB CSS */\n"
            + raw
        )

    return "\n".join(css)


def clean_document(
    chapter: BeautifulSoup,
    chapter_path: Path,
):
    rewrite_html_resources(
        chapter,
        chapter_path,
    )

    # If the EPUB chapter has a body,
    # return only the body contents.
    if chapter.body:
        return list(
            chapter.body.contents
        )

    return list(
        chapter.contents
    )


def main():
    if len(sys.argv) != 3:
        print(
            "Usage: epub_to_pdf.py INPUT.epub OUTPUT.pdf",
            file=sys.stderr,
        )
        sys.exit(2)

    epub_path = Path(
        sys.argv[1]
    ).resolve()

    pdf_path = Path(
        sys.argv[2]
    ).resolve()

    if not epub_path.exists():
        raise RuntimeError(
            f"EPUB tidak ditemukan: {epub_path}"
        )

    pdf_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with tempfile.TemporaryDirectory(
        prefix="usefect-epub-"
    ) as temp_dir:

        root = Path(temp_dir)

        # Extract EPUB
        with zipfile.ZipFile(
            epub_path,
            "r",
        ) as archive:
            archive.extractall(root)

        opf = find_opf(root)

        manifest, spine = parse_opf(
            opf
        )

        if not spine:
            raise RuntimeError(
                "EPUB tidak memiliki spine"
            )

        # -------------------------------------------------
        # Build complete HTML document
        # -------------------------------------------------

        document = BeautifulSoup(
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>USEFECT E-Book</title>
            </head>
            <body></body>
            </html>
            """,
            "html.parser",
        )

        head = document.head
        body = document.body

        # -------------------------------------------------
        # EPUB CSS
        # -------------------------------------------------

        css = collect_css(
            root,
            manifest,
        )

        style = document.new_tag(
            "style"
        )

        style.string = css

        head.append(style)

        # -------------------------------------------------
        # USEFECT PDF layout
        # -------------------------------------------------

        usefect_style = document.new_tag(
            "style"
        )

        usefect_style.string = """
        @page {
            size: A4;
            margin: 22mm 18mm 22mm 22mm;
        }

        html {
            background: white;
        }

        body {
            margin: 0;
            padding: 0;
            background: white;
            color: #111;
        }

        img,
        svg {
            max-width: 100%;
            height: auto;
        }

        svg {
            display: block;
        }

        table {
            max-width: 100%;
            border-collapse: collapse;
        }

        pre,
        code {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }

        .usefect-chapter {
            break-before: page;
        }

        .usefect-chapter:first-child {
            break-before: auto;
        }

        /*
         * Jangan biarkan elemen EPUB
         * menjadi halaman kosong.
         */
        .usefect-chapter > * {
            max-width: 100%;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            break-after: avoid;
        }

        p,
        blockquote,
        figure,
        table {
            break-inside: avoid;
        }
        """

        head.append(
            usefect_style
        )

        # -------------------------------------------------
        # Render spine
        # -------------------------------------------------

        rendered = 0

        for index, item in enumerate(
            spine
        ):
            href = item.get(
                "href",
                "",
            )

            chapter_path = (
                opf.parent / href
            ).resolve()

            if not chapter_path.exists():
                continue

            raw = chapter_path.read_text(
                encoding="utf-8",
                errors="replace",
            )

            chapter = BeautifulSoup(
                raw,
                "html.parser",
            )

            contents = clean_document(
                chapter,
                chapter_path,
            )

            if not contents:
                continue

            section = document.new_tag(
                "section",
                attrs={
                    "class": "usefect-chapter",
                    "data-chapter": str(
                        index + 1
                    ),
                },
            )

            for child in contents:
                section.append(
                    child
                )

            body.append(section)

            rendered += 1

        if rendered == 0:
            raise RuntimeError(
                "Tidak ada chapter EPUB yang berhasil dirender"
            )

        # -------------------------------------------------
        # Write intermediate HTML
        # -------------------------------------------------

        html_path = (
            root / "usefect-render.html"
        )

        html_path.write_text(
            str(document),
            encoding="utf-8",
        )

        # -------------------------------------------------
        # Generate PDF
        # -------------------------------------------------

        HTML(
            filename=str(
                html_path
            ),
            base_url=str(root),
        ).write_pdf(
            str(pdf_path)
        )

    # -----------------------------------------------------
    # Validate output
    # -----------------------------------------------------

    if not pdf_path.exists():
        raise RuntimeError(
            "PDF tidak berhasil dibuat"
        )

    size = pdf_path.stat().st_size

    if size < 10_000:
        raise RuntimeError(
            f"PDF terlalu kecil: {size} bytes"
        )

    with pdf_path.open(
        "rb"
    ) as f:
        header = f.read(5)

    if header != b"%PDF-":
        raise RuntimeError(
            "File output bukan PDF valid"
        )

    print(
        f"EPUB_TO_PDF_SUCCESS: {pdf_path} ({size} bytes)"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(
            f"EPUB_TO_PDF_ERROR: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)
