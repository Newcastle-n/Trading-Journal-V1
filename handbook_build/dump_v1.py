# -*- coding: utf-8 -*-
"""Dump v1 notes and build booklet JSON for Knowledge 2."""
import json
from pathlib import Path

ROOT = Path(r"D:\Cursor-Projects\Trading-Journal")
BACKUP = ROOT / "data" / "notes.v1.backup.json"
OUT = ROOT / "data" / "notes-booklet.json"
DUMP = ROOT / "handbook_build" / "v1_sections_dump.txt"

old = json.loads(BACKUP.read_text(encoding="utf-8"))
lines = []
for i, s in enumerate(old["sections"], 1):
    lines.append(f"\n=== {i:02d} id={s['id']} title={s['title']} count={len(s.get('items',[]))} ===")
    for it in s.get("items", []):
        fav = "*" if it.get("favorite") else " "
        tags = ",".join(it.get("tags") or [])
        lines.append(f"  [{fav}] {it['id']} |{tags}| {it['text']}")
DUMP.write_text("\n".join(lines), encoding="utf-8")
print("dumped", DUMP)
for i, s in enumerate(old["sections"], 1):
    print(f"{i:02d}", s["id"], len(s.get("items", [])), s["title"])
