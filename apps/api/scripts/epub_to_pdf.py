#!/usr/bin/env python3

import sys
import zipfile
import tempfile
import shutil
from pathlib import Path
from urllib.parse import quote
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup
from weasyprint import HTML


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def find_opf(root: Path) -> Path:
    container = root / "META-INF" / "container.xml"

    if not container.exists():
        raise RuntimeError("EPUB tidak memiliki META-INF/container.xml")

    tree = ET.parse(container)
    ns = {
        "c": "urn:oasis:names:tc:opendocument:xmlns:container"
    }

    node = tree.find(
        ".//c:rootfile",
        ns,
    )

    if node is None:
        raise RuntimeError("OPF EPUB tidak ditemukan")

    full_path = node.attrib.get("full-path")

    if not full_path:
        raise RuntimeError("Path OPF tidak ditemukan")

    return root / full_path


def local_name(tag):
    return tag.split("}", 1)[-1]


def parse_opf(opf: Path):
    tree = ET.parse(opf)
    root = tree.getroot()

    manifest = {}
    spine = []

    for element in root.iter():
        if local_name(element.tag) == "item":
            item_id = element.attrib.get("id")
            href = element.attrib.get("href")
            media = element.attrib.get("media-type")

            if item_id and href:
                manifest[item_id] = {
                    "href": href,
                    "media": media,
                }

    for element in root.iter():
        if local_name(element.tag) == "itemref":
            item_id = element.attrib.get("idref")

            if item_id in manifest:
                spine.append(manifest[item_id])

    return manifest, spine


def rewrite_resources(soup, chapter_path: Path):
    for tag in soup.find_all(["img", "image"]):
        attr = "src"

        if tag.name == "image":
            attr = "href"

        value = tag.get(attr)

        if not value:
            continue

        if value.startswith(("data:", "http:", "https:", "file:")):
            continue

        clean = value.split("#", 1)[0]

        if not clean:
            continue

        target = (chapter_path.parent / clean).resolve()

        if target.exists():
            tag[attr] = file_url(target)

    for tag in soup.find_all(["link", "script"]):
        href = tag.get("href") or tag.get("src")

        if not href:
            continue

        if href.startswith(("data:", "http:", "https:", "file:")):
            continue

        target = (chapter_path.parent / href).resolve()

        if target.exists():
            if tag.name == "link":
                tag["href"] = file_url(target)
            else:
                tag["src"] = file_url(target)


def main():
    if len(sys.argv) != 3:
        print(
            "Usage: epub_to_pdf.py INPUT.epub OUTPUT.pdf",
            file=sys.stderr,
        )
        sys.exit(2)

    epub_path = Path(sys.argv[1]).resolve()
    pdf_path = Path(sys.argv[2]).resolve()

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
    ) as temp:
        root = Path(temp)

        with zipfile.ZipFile(
            epub_path,
            "r",
        ) as archive:
            archive.extractall(root)

        opf = find_opf(root)

        manifest, spine = parse_opf(opf)

        if not spine:
            raise RuntimeError(
                "EPUB tidak memiliki spine/chapter yang dapat dibaca"
            )

        combined = BeautifulSoup(
            "<!DOCTYPE html><html><head></head><body></body></html>",
            "html.parser",
        )

        head = combined.head
        body = combined.body

        # Metadata dasar
        title = combined.new_tag("title")
        title.string = epub_path.stem
        head.append(title)

        # CSS dari EPUB
        css_items = [
            item
            for item in manifest.values()
            if item.get("media") == "text/css"
        ]

        for item in css_items:
            css_path = (
                opf.parent /
                item["href"].split("#", 1)[0]
            ).resolve()

            if not css_path.exists():
                continue

            link = combined.new_tag("link")
            link["rel"] = "stylesheet"
            link["href"] = file_url(css_path)
            head.append(link)

        # Render setiap chapter sesuai spine
        for index, item in enumerate(spine):
            chapter_path = (
                opf.parent /
                item["href"].split("#", 1)[0]
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

            rewrite_resources(
                chapter,
                chapter_path,
            )

            chapter_body = chapter.body

            if chapter_body:
                wrapper = combined.new_tag(
                    "section",
                    attrs={
                        "class": "epub-chapter",
                        "data-chapter": str(index + 1),
                    },
                )

                for child in list(
                    chapter_body.contents
                ):
                    wrapper.append(child)

                body.append(wrapper)

        style = combined.new_tag("style")
        style.string = """
        @page {
            size: A4;
            margin: 22mm 18mm 22mm 18mm;
        }

        html, body {
            margin: 0;
            padding: 0;
        }

        img, svg {
            max-width: 100%;
            height: auto;
        }

        .epub-chapter {
            break-before: page;
        }

        .epub-chapter:first-child {
            break-before: auto;
        }

        table {
            max-width: 100%;
            border-collapse: collapse;
        }

        pre, code {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        """
        head.append(style)

        html_path = root / "combined.html"

        html_path.write_text(
            str(combined),
            encoding="utf-8",
        )

        HTML(
            filename=str(html_path),
            base_url=str(root),
        ).write_pdf(
            str(pdf_path)
        )

    if not pdf_path.exists():
        raise RuntimeError(
            "PDF gagal dibuat"
        )

    if pdf_path.stat().st_size < 1024:
        raise RuntimeError(
            "PDF yang dihasilkan terlalu kecil"
        )

    print(
        f"PDF berhasil dibuat: {pdf_path}"
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
