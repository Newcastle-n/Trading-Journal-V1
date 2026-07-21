# -*- coding: utf-8 -*-
"""Build Knowledge-2 booklet JSON: 12 chapters, full source content, no truncation."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"D:\Cursor-Projects\Trading-Journal")
OUT = ROOT / "data" / "notes-booklet.json"
BACKUP = ROOT / "data" / "notes.v1.backup.json"

EXTRACTS = {
    "samadi": ROOT / "handbook_build" / "جزوه سبحان صمدی_extract.txt",
    "notes": ROOT / "handbook_build" / "نکات مهم_extract.txt",
    "plan": ROOT / "handbook_build" / "Trading Plan - Real Account_extract.txt",
}


def parse_extract(path: Path) -> list[str]:
    lines = []
    if not path.exists():
        return lines
    for raw in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\[(?:List Paragraph|Normal)\]\s*(.*)$", raw)
        if not m:
            continue
        t = m.group(1).strip()
        if not t or t in ("SobhanSamadi", "SSNT", "Trading Plan", "_____________________________________", "--------------------------------------------------"):
            continue
        if re.fullmatch(r"\d+-?\s*", t) or re.fullmatch(r"\d+\s*", t):
            continue
        # skip section headers that are just part labels like "15-"
        if re.match(r"^\d+-?\s*$", t):
            continue
        lines.append(t)
    return lines


def h2(text, hid):
    return {"type": "heading", "level": 2, "text": text, "id": hid}


def h3(text, hid):
    return {"type": "heading", "level": 3, "text": text, "id": hid}


def p(text):
    return {"type": "paragraph", "text": text}


def ul(items):
    return {"type": "list", "ordered": False, "items": [i for i in items if i]}


def callout(kind, title, text):
    # kind: definition | rule | key
    return {"type": "callout", "variant": kind, "title": title, "text": text}


def chapter(cid, number, title, intro, blocks, mode="docs"):
    ch = {
        "id": cid,
        "number": number,
        "title": title,
        "intro": intro,
        "mode": mode,
        "blocks": blocks,
    }
    if mode == "journal":
        ch["items"] = []
        ch["placeholder"] = "هنوز موردی ثبت نشده. اولین نکته، استراتژی یا چک‌لیست را اضافه کن."
        ch["addLabel"] = "افزودن مورد جدید"
    return ch


def items_from_backup(section_id: str) -> list[str]:
    old = json.loads(BACKUP.read_text(encoding="utf-8"))
    for s in old["sections"]:
        if s["id"] == section_id:
            return [it["text"] for it in s.get("items", []) if it.get("text")]
    return []


def merge_unique(*groups: list[str]) -> list[str]:
    seen = set()
    out = []
    for group in groups:
        for t in group:
            key = re.sub(r"\s+", " ", t).strip().lower()
            if key in seen or not t.strip():
                continue
            seen.add(key)
            out.append(t.strip())
    return out


def main():
    plan_lines = parse_extract(EXTRACTS["plan"])
    note_lines = parse_extract(EXTRACTS["notes"])
    samadi = parse_extract(EXTRACTS["samadi"])

    # Also keep backup items
    v1_plan = items_from_backup("trading-plan")
    v1_notes = items_from_backup("important-notes")
    v1_pin = items_from_backup("subhan-pinbar")
    v1_struct = items_from_backup("subhan-structure")
    v1_tr = items_from_backup("subhan-tr")
    v1_risk = items_from_backup("subhan-risk")
    v1_spike = items_from_backup("subhan-spike")
    v1_strat = items_from_backup("subhan-strategy")

    # ——— Chapter 1: Trading Plan ———
    plan_all = merge_unique(plan_lines, v1_plan)
    ch1 = chapter(
        "trading-plan",
        1,
        "پلن معاملاتی",
        "قوانین حساب واقعی New SSNT: اهداف سود، سقف ضرر، توقف‌ها و تعهد اجرایی.",
        [
            h2("اهداف سود", "goals"),
            callout("rule", "قانون / خط قرمز", "هدف روزانه: اگر روزانه به ۲٪ سود رسیدم، دیگر اجازه معامله ندارم."),
            ul([t for t in plan_all if any(k in t for k in ("هدف", "۲٪", "2%", "هفتگی", "ماهیانه", "ماهانه", "۵٪", "۱۷٪", "4٪", "۴٪"))]),
            h2("توالی معاملات روزانه", "sequence"),
            ul([t for t in plan_all if any(k in t for k in ("معامله اول", "معامله دوم", "موقعیت عالی"))]),
            h2("حدضرر و سقف ریسک", "risk"),
            callout("rule", "قانون / خط قرمز", "ریسک هر معامله ۱٪. اگر مجموع ضرر روزانه به ۳٪ رسید، دیگر اجازه معامله ندارم."),
            ul([t for t in plan_all if any(k in t for k in ("حدضرر", "ریسک", "Drawdown", "دراداون", "دراودان", "۳٪", "3%", "هفته اگر", "۱۰٪"))]),
            h2("قوانین رفتاری و زمانی", "behavior"),
            ul([t for t in plan_all if any(k in t for k in ("خواب", "holiday", "خبر", "خسته", "۲۰دقیقه", "20دقیقه", "آمادگی", "حداقل ۲۰"))]),
            h2("سیستم New SSNT", "ssnt"),
            callout("definition", "تعریف", "بطور کلی، یا شکست اتفاق می‌افتد و ترید می‌کنم، یا فیک بریک‌اوت — پیش از باز شدن NYSE دیدگاه باید کاملاً شفاف باشد."),
            ul([t for t in plan_all if any(k in t for k in ("New SSNT", "BO", "FBO", "Double", "رنج یا RV", "هیجانی", "CH-BO", "فیلتر"))]),
            h2("نقاط مثبت و منفی شخصی", "self"),
            ul([t for t in plan_all if any(k in t for k in ("مثبت", "منفی", "صبور", "احساس", "تمرکز", "نظم", "طمع", "سود دهی", "عقب"))]),
            h2("تعهد", "pledge"),
            callout("key", "نکته کلیدی", "این‌جانب سپهر نیلی تعهد می‌دهم به تمام نکات و موارد Trading Plan بدون چون‌وچرا عمل کنم."),
            # catch-all remaining
            h2("سایر نکات پلن", "plan-rest"),
            ul([t for t in plan_all if t not in _used_texts(plan_all, [
                ("هدف", "۲٪", "2%", "هفتگی", "ماهیانه", "ماهانه", "۵٪", "۱۷٪", "4٪", "۴٪"),
                ("معامله اول", "معامله دوم", "موقعیت عالی"),
                ("حدضرر", "ریسک", "Drawdown", "دراداون", "دراودان", "۳٪", "3%", "هفته اگر", "۱۰٪"),
                ("خواب", "holiday", "خبر", "خسته", "۲۰دقیقه", "20دقیقه", "آمادگی", "حداقل ۲۰"),
                ("New SSNT", "BO", "FBO", "Double", "رنج یا RV", "هیجانی", "CH-BO", "فیلتر"),
                ("مثبت", "منفی", "صبور", "احساس", "تمرکز", "نظم", "طمع", "سود دهی", "عقب"),
                ("تعهد", "سپهر"),
            ])]),
        ],
    )

    # ——— Chapter 2: Personal important notes ———
    notes_all = merge_unique(note_lines, v1_notes)
    ch2 = chapter(
        "important-notes",
        2,
        "نکات مهم شخصی",
        "نکات فشرده لایو که همیشه باید دم‌دست باشند: ساختار، فیلترها، خروج و ذهن.",
        [
            h2("ساختار و سطوح", "structure"),
            callout("key", "نکته کلیدی", "باید بدانیم در چه ساختاری هستیم (اسپایک، کانال، تریدینگ رنج) تا رفتار درست داشته باشیم."),
            ul([t for t in notes_all if any(k in t for k in ("کلوز", "ساختار", "2leg", "۲leg", "2Leg", "الگو V", "روند قبلی", "سقف/کف اولین"))]),
            h2("حدضرر و خروج", "sl-exit"),
            callout("definition", "تعریف", "فلسفه حدضرر این است که اگر تاچ شد، به منزله Failed شدن سناریو است؛ پس باید جای درست قرار بگیرد."),
            ul([t for t in notes_all if any(k in t for k in ("حدضرر", "استاپ", "TP", "نواحی تصمیم", "نقطه ورود", "خروج"))]),
            h2("BO و FBO", "bo-fbo"),
            callout("rule", "قانون / خط قرمز", "آن تریدینگ رنجی فیک بریک‌اوت دارد نه وقتی که قیمت در کانال رونددار است — مگر کانال ضعیف و شبیه رنج شده باشد."),
            ul([t for t in notes_all if any(k in t for k in ("FBO", "فیک", "BO", "بریک", "فاصله کف", "راس ساعت", "Double"))]),
            h2("سشن آمریکا و فیلتر ثانیه", "nyse"),
            callout("key", "نکته کلیدی", "فیلتر ثانیه پس از باز شدن بازار بورس آمریکا به شدت مهم است."),
            ul([t for t in notes_all if any(k in t for k in ("NYSE", "آمریکا", "ثانیه", "راس باز", "روبو"))]),
            h2("ذهن و انضباط لایو", "mind"),
            callout("rule", "قانون / خط قرمز", "اضافه‌کاری مطلقاً ممنوع! ۲ پیپ بیشتر، ریسک‌فری بی‌مورد، خروج خارج از پلن نباید انجام شود."),
            ul([t for t in notes_all if any(k in t for k in ("ذهن", "تنیس", "آمادگی", "سیستم", "معامله اول", "معامله سوم", "اضافه", "چرا", "مانیتور", "پلن"))]),
            h2("سایر نکات مهم", "notes-rest"),
            ul([t for t in notes_all if t not in _used_texts(notes_all, [
                ("کلوز", "ساختار", "2leg", "۲leg", "2Leg", "الگو V", "روند قبلی", "سقف/کف اولین"),
                ("حدضرر", "استاپ", "TP", "نواحی تصمیم", "نقطه ورود", "خروج"),
                ("FBO", "فیک", "BO", "بریک", "فاصله کف", "راس ساعت", "Double"),
                ("NYSE", "آمریکا", "ثانیه", "راس باز", "روبو"),
                ("ذهن", "تنیس", "آمادگی", "سیستم", "معامله اول", "معامله سوم", "اضافه", "چرا", "مانیتور", "پلن"),
            ])]),
        ],
    )

    # Split samadi lines into topic buckets for chapters 3-8
    pin_kw = ("پین", "pin", "RS", "رند", "تأیید", "تایید", "سیگنال بار", "شدو پین")
    struct_kw = ("اسپایک", "کانال", "چرخه", "پولبک", "MTR", "۱۲۳", "123", "ترند", "روند", "فشردگی", "سقف و کف روز", "خط ترند", "۵۰٪", "50%")
    tr_kw = ("تریدینگ رنج", "TR", "وسط رنج", "برخورد", "آهنربا", "۸۰٪", "80%")
    risk_kw = ("مدیریت سرمایه", "ریسک", "بقا", "۶۰/۴۰", "60/40", "حدضرر", "استاپ", "۱.۵٪", "1.5%", "ضرر", "دراودان")
    spike_kw = ("میکرو", "گپ", "2Leg", "2leg", "۲لگ", "۲ لگ", "BreakEven", "بریک ایون", "بریک‌ایون", "الگو V", "الگوی V", "Spike", "BO", "FBO", "بریک اوت")
    strat_kw = ("استراتژی", "فیلتر معاملاتی", "نمونه", "شکست سقف", "پین بار روی", "نوشتن")

    def bucket(lines, keywords):
        return [t for t in lines if any(k.lower() in t.lower() if k.isascii() else k in t for k in keywords)]

    # Use explicit chapter assignment from lesson order in extract + v1
    # Prefer putting each samadi line into ONE chapter to avoid massive duplication
    assigned = set()

    def take(lines, keywords, also=None):
        nonlocal assigned
        out = []
        pool = list(lines) + list(also or [])
        for t in pool:
            key = re.sub(r"\s+", " ", t).strip().lower()
            if key in assigned:
                continue
            if any((k.lower() in t.lower()) if all(ord(c) < 128 for c in k) else (k in t) for k in keywords):
                assigned.add(key)
                out.append(t.strip())
        return out

    # Order matters: more specific chapters first
    pin_items = merge_unique(v1_pin, take(samadi, pin_kw))
    # structure gets remaining cycle/channel items
    struct_items = merge_unique(v1_struct, take(samadi, struct_kw))
    tr_items = merge_unique(v1_tr, take(samadi, tr_kw + ("رنج",)))
    risk_items = merge_unique(v1_risk, take(samadi, risk_kw))
    spike_items = merge_unique(v1_spike, take(samadi, spike_kw))
    strat_items = merge_unique(v1_strat, take(samadi, strat_kw))
    # leftover samadi into structure as archive so nothing is lost
    leftover = []
    for t in samadi:
        key = re.sub(r"\s+", " ", t).strip().lower()
        if key not in assigned:
            assigned.add(key)
            leftover.append(t)

    ch3 = chapter(
        "subhan-pinbar",
        3,
        "جزوه سبحان — پین بار و سطوح",
        "پین‌بار به‌تنهایی استراتژی نیست؛ سیگنالی است که قدرت آن به اصالت منطقه، سایه و کندل تأیید بستگی دارد.",
        [
            h2("پین‌بار به‌عنوان سیگنال", "pin-signal"),
            callout("definition", "تعریف", "پین بار در جای درست سیگنال مهمی است؛ اصالت منطقه مهم است. پین بار به‌تنهایی استراتژی نیست."),
            ul([t for t in pin_items if any(k in t for k in ("پین", "سیگنال", "شدو", "سایه", "کی بار", "کی‌بار"))]),
            h2("سطوح RS و اعداد رند", "rs"),
            callout("key", "نکته کلیدی", "هرچه تعداد برخورد به RS بیشتر باشد، آن سطح در آینده مهم‌تر است."),
            ul([t for t in pin_items if any(k in t for k in ("RS", "رند", "برخورد", "واکنش", "چرا"))]),
            h2("کندل تأیید و ورود", "confirm"),
            callout("rule", "قانون / خط قرمز", "پس از شکست ترند، اولین پین بار در جهت روند + کندل بعدی در جهت + زدن آخرین سقف/کف = ورود (حکم استراتژی)."),
            ul([t for t in pin_items if any(k in t for k in ("تأیید", "تایید", "ورود", "شکست ترند", "حد ضرر", "حدضرر"))]),
            h2("سایر نکات این فصل", "pin-rest"),
            ul([t for t in pin_items if t not in _used_texts(pin_items, [
                ("پین", "سیگنال", "شدو", "سایه", "کی بار", "کی‌بار"),
                ("RS", "رند", "برخورد", "واکنش", "چرا"),
                ("تأیید", "تایید", "ورود", "شکست ترند", "حد ضرر", "حدضرر"),
            ])]),
        ],
    )

    ch4 = chapter(
        "subhan-structure",
        4,
        "جزوه سبحان — ساختار بازار (اسپایک / کانال / رنج)",
        "قبل از هر سیگنال، چرخه بازار را تشخیص بده: اسپایک، کانال یا تریدینگ رنج.",
        [
            h2("چرخه بازار", "cycles"),
            callout("definition", "تعریف", "اولین اصلاح پس از اسپایک = ورود به چرخه کانال. شکست کانال = رفتن به تریدینگ رنج."),
            ul([t for t in struct_items if any(k in t for k in ("چرخه", "اسپایک", "کانال", "تریدینگ", "مستقیم"))]),
            h2("روند، سقف و کف، قدرت", "trend"),
            callout("key", "نکته کلیدی", "فاصله سقف و کف‌ها نشانه قدرت روند است. پایان روند = شکسته شدن آخرین سقف/کف."),
            ul([t for t in struct_items if any(k in t for k in ("روند", "سقف", "کف", "۵۰٪", "50%", "قدرت", "خریدار", "فروشنده"))]),
            h2("پولبک", "pullback"),
            callout("rule", "قانون / خط قرمز", "اگر فاصله دو سقف/کف خیلی زیاد بود (حداقل ۱ روز)، با اولین شکست وارد نشو؛ در پولبک اقدام کن."),
            ul([t for t in struct_items if "پولبک" in t or "اصلاح" in t]),
            h2("کانال و RR", "channel"),
            callout("rule", "قانون / خط قرمز", "خلاف جهت کانال = ریسک‌به‌ریوارد ۱ به ۱. این نکته هیچ‌وقت نباید فراموش شود."),
            ul([t for t in struct_items if any(k in t for k in ("کانال", "RR", "ریسک‌به‌ریوارد", "دو‌طرفه", "دوطرفه", "خط ترند", "شکست کانال"))]),
            h2("الگوی MTR / ۱۲۳", "mtr"),
            ul([t for t in struct_items if any(k in t for k in ("MTR", "۱۲۳", "123", "مثلث"))]),
            h2("روال باز کردن چارت", "routine"),
            callout("key", "نکته کلیدی", "اولین کار پس از باز کردن چارت: رسم سقف و کف روز."),
            ul([t for t in struct_items if any(k in t for k in ("چارت", "روز", "فشردگی", "تایم", "داوجونز", "رسم"))]),
            h2("نکات باقی‌مانده ساختار + آرشیو جزوه", "struct-rest"),
            ul(merge_unique(
                [t for t in struct_items if t not in _used_texts(struct_items, [
                    ("چرخه", "اسپایک", "کانال", "تریدینگ", "مستقیم"),
                    ("روند", "سقف", "کف", "۵۰٪", "50%", "قدرت", "خریدار", "فروشنده"),
                    ("پولبک", "اصلاح"),
                    ("کانال", "RR", "ریسک‌به‌ریوارد", "دو‌طرفه", "دوطرفه", "خط ترند", "شکست کانال"),
                    ("MTR", "۱۲۳", "123", "مثلث"),
                    ("چارت", "روز", "فشردگی", "تایم", "داوجونز", "رسم"),
                ])],
                leftover,
            )),
        ],
    )

    ch5 = chapter(
        "subhan-tr",
        5,
        "جزوه سبحان — تریدینگ رنج",
        "پرریسک‌ترین و پرتکرارترین چرخه بازار؛ اولویت اول بقاست و وسط رنج ممنوع است.",
        [
            h2("ماهیت تریدینگ رنج", "nature"),
            callout("definition", "تعریف", "پرریسک‌ترین و پرتکرارترین چرخه بازار تریدینگ رنج است؛ از نظر سبحان پرسودترین هم هست، ولی برای مبتدی گمراه‌کننده."),
            callout("rule", "قانون / خط قرمز", "وسط رنج معامله کردن ممنوع. اولویت اول = بقا."),
            ul([t for t in tr_items if any(k in t for k in ("پر ریسک", "پرریسک", "۸۰٪", "80%", "بقا", "بیننده", "نامفهوم", "وسط"))]),
            h2("نحوه معامله در رنج", "how"),
            ul([t for t in tr_items if any(k in t for k in ("سقف", "کف", "خروج", "بخر", "بفروش", "تمایل", "روند اصلی", "خلاف"))]),
            h2("برخوردها، فشردگی، آهنربا", "touches"),
            callout("key", "نکته کلیدی", "برخورد دوم به سقف/کف عالی است؛ سوم مناسب؛ چهارم به بعد ریسکی."),
            ul([t for t in tr_items if any(k in t for k in ("برخورد", "فشردگی", "آهنربا", "۲۰ کندل", "20 کندل", "اعتبار"))]),
            h2("۵۰٪ و تارگت شکست", "fifty"),
            callout("key", "نکته کلیدی", "۵۰٪ تریدینگ رنج خیلی مهم است؛ اگر بشکند می‌تواند تا ۱۰۰٪ برود. تارگت شکست = اندازه خود رنج."),
            ul([t for t in tr_items if any(k in t for k in ("۵۰٪", "50%", "۱۰۰٪", "100%", "تارگت", "اندازه"))]),
            h2("سایر نکات تریدینگ رنج", "tr-rest"),
            ul([t for t in tr_items if t not in _used_texts(tr_items, [
                ("پر ریسک", "پرریسک", "۸۰٪", "80%", "بقا", "بیننده", "نامفهوم", "وسط"),
                ("سقف", "کف", "خروج", "بخر", "بفروش", "تمایل", "روند اصلی", "خلاف"),
                ("برخورد", "فشردگی", "آهنربا", "۲۰ کندل", "20 کندل", "اعتبار"),
                ("۵۰٪", "50%", "۱۰۰٪", "100%", "تارگت", "اندازه"),
            ])]),
        ],
    )

    ch6 = chapter(
        "subhan-risk",
        6,
        "جزوه سبحان — مدیریت سرمایه و ریسک",
        "بقا بر سود مقدم است؛ حدضرر خط قرمز است و اعداد ریسک باید از قبل قفل شوند.",
        [
            h2("فلسفه بقا و پذیرش ضرر", "survival"),
            callout("definition", "تعریف", "اولویت اول تریدر باید بقا باشد. با واژه ضرر رفیق شو."),
            callout("key", "نکته کلیدی", "قانون ۶۰/۴۰: حتی در بهترین حالت حدود ۶۰٪ احتمال رسیدن به حدسود است."),
            ul([t for t in risk_items if any(k in t for k in ("بقا", "ضرر", "۶۰", "60", "پذیرش", "اعتماد", "بک تست", "بک‌تست", "روان", "اشتباه", "عدم قطعیت"))]),
            h2("اعداد ریسک", "numbers"),
            callout("rule", "قانون / خط قرمز", "حداکثر ریسک هر معامله ۱.۵٪ (با سقف ضرر روزانه ۳٪). اول کار RR حداقل ۲."),
            ul([t for t in risk_items if any(k in t for k in ("۱.۵", "1.5", "۲٪", "2%", "ریسک", "RR", "شناور", "تقسیم حجم", "درآمد"))]),
            h2("حدضرر", "stoploss"),
            callout("rule", "قانون / خط قرمز", "خط قرمز: نگذاشتن حدضرر یا تغییر حدضرر. بعد از معامله حتی یک تیک جابه‌جا نکن."),
            ul([t for t in risk_items if any(k in t for k in ("حدضرر", "استاپ", "سیگنال", "۵۰٪", "سناریو"))]),
            h2("سایر نکات ریسک", "risk-rest"),
            ul([t for t in risk_items if t not in _used_texts(risk_items, [
                ("بقا", "ضرر", "۶۰", "60", "پذیرش", "اعتماد", "بک تست", "بک‌تست", "روان", "اشتباه", "عدم قطعیت"),
                ("۱.۵", "1.5", "۲٪", "2%", "ریسک", "RR", "شناور", "تقسیم حجم", "درآمد"),
                ("حدضرر", "استاپ", "سیگنال", "۵۰٪", "سناریو"),
            ])]),
        ],
    )

    ch7 = chapter(
        "subhan-spike",
        7,
        "جزوه سبحان — اسپایک، گپ، 2Leg، BE، الگوی V",
        "الگوها و فازهای پرشتاب: اسپایک، گپ خستگی، دو لگ، بریک‌ایون و الگوی V.",
        [
            h2("اسپایک و بریک‌اوت", "spike"),
            callout("definition", "تعریف", "اسپایک = شکست با کندل فول‌بادی یا چند کندل پشت‌سرهم بدون پولبک. Spike ≈ Breakout. در اسپایک یک‌طرفه معامله کن."),
            callout("key", "نکته کلیدی", "حدود ۸۰٪ خروج از تریدینگ رنج Failed می‌شود."),
            ul([t for t in spike_items if any(k in t for k in ("اسپایک", "Spike", "بریک", "BO", "FBO", "مگنت", "مغناطیس", "یک طرفه", "یک‌طرفه", "نشانه"))]),
            h2("میکروکانال", "micro"),
            ul([t for t in spike_items if "میکرو" in t or "فلگ" in t]),
            h2("گپ‌ها", "gaps"),
            callout("definition", "تعریف", "گپ بدون کندل همان اسپایک بسیار قوی است. گپ خستگی: بدنه خیلی قوی در آخر روند؛ آخرین زور خریدار/فروشنده."),
            ul([t for t in spike_items if "گپ" in t]),
            h2("2Leg", "twoleg"),
            callout("rule", "قانون / خط قرمز", "اگر قبل از سشن ۲لگ تکمیل شده، در جهت لگ‌ها وارد نشو مگر اصلاح و شکست مجدد سطح."),
            ul([t for t in spike_items if any(k in t for k in ("2Leg", "2leg", "۲لگ", "۲ لگ", "لگ"))]),
            h2("بریک‌ایون (BE)", "be"),
            ul([t for t in spike_items if any(k in t for k in ("BE", "بریک ایون", "بریک‌ایون", "BreakEven", "پیپ به پیپ"))]),
            h2("الگوی V", "vpattern"),
            callout("key", "نکته کلیدی", "الگوی V مکرر در رنج دیده می‌شود؛ طلا خیلی Vمحور است. ترجیح: نقاط ۵۰٪ تا تکمیل V."),
            ul([t for t in spike_items if "V" in t or "وی" in t]),
            h2("تمرین و روان اجرا", "practice"),
            ul([t for t in spike_items if any(k in t for k in ("۳ ساعت", "3 ساعت", "نظار", "شدو", "RR", "خلاف"))]),
            h2("سایر نکات این فصل", "spike-rest"),
            ul([t for t in spike_items if t not in _used_texts(spike_items, [
                ("اسپایک", "Spike", "بریک", "BO", "FBO", "مگنت", "مغناطیس", "یک طرفه", "یک‌طرفه", "نشانه"),
                ("میکرو", "فلگ"),
                ("گپ",),
                ("2Leg", "2leg", "۲لگ", "۲ لگ", "لگ"),
                ("BE", "بریک ایون", "بریک‌ایون", "BreakEven", "پیپ به پیپ"),
                ("V", "وی"),
                ("۳ ساعت", "3 ساعت", "نظار", "شدو", "RR", "خلاف"),
            ])]),
        ],
    )

    ch8 = chapter(
        "subhan-strategy",
        8,
        "جزوه سبحان — ساخت استراتژی",
        "استراتژی مجموعه قوانین مشخص برای ورود، مدیریت و خروج است؛ فیلتر معاملاتی آن را بهینه می‌کند.",
        [
            h2("تعریف و اصول", "principles"),
            callout("definition", "تعریف", "استراتژی = مجموعه قوانین مشخص برای ورود، مدیریت و خروج در رنج/اسپایک/کانال."),
            callout("rule", "قانون / خط قرمز", "در لایو جای فکر نیست؛ فقط عمل. فکر را در گذشته مارکت کرده باش."),
            ul([t for t in strat_items if any(k in t for k in ("استراتژی", "کپی", "لایو", "فکر", "اعتماد", "محدودیت", "ذهن", "صبر", "نظم", "یک ماه", "فیلتر"))]),
            h2("اجزای استراتژی", "parts"),
            ul([t for t in strat_items if any(k in t for k in ("نقطه ورود", "حدضرر", "خروج", "ریسک فری", "تایم", "سایکل", "چه مواردی"))]),
            h2("نمونه‌های ستاپ برای بررسی", "samples"),
            callout("key", "نکته کلیدی", "فیلتر معاملاتی استراتژی را بهینه می‌کند و بسیار مهم است."),
            ul([t for t in strat_items if any(k in t for k in ("نمونه", "شکست", "پین", "فشردگی", "لگ دوم", "BE", "123", "۱۲۳", "مووینگ", "الگو"))]),
            h2("تمرین پیشنهادی", "drill"),
            ul([t for t in strat_items if any(k in t for k in ("تمرین", "یکسال", "۱۰ مورد", "10 مورد", "نماد"))]),
            h2("سایر نکات استراتژی", "strat-rest"),
            ul([t for t in strat_items if t not in _used_texts(strat_items, [
                ("استراتژی", "کپی", "لایو", "فکر", "اعتماد", "محدودیت", "ذهن", "صبر", "نظم", "یک ماه", "فیلتر"),
                ("نقطه ورود", "حدضرر", "خروج", "ریسک فری", "تایم", "سایکل", "چه مواردی"),
                ("نمونه", "شکست", "پین", "فشردگی", "لگ دوم", "BE", "123", "۱۲۳", "مووینگ", "الگو"),
                ("تمرین", "یکسال", "۱۰ مورد", "10 مورد", "نماد"),
            ])]),
        ],
    )

    # Chapters 9-12: empty journal sections
    ch9 = chapter(
        "strategies",
        9,
        "استراتژی‌های فعال",
        "ستاپ‌ها و استراتژی‌هایی که خودت فعالانه استفاده می‌کنی — اینجا به‌مرور پر کن.",
        [
            h2("فضای شخصی", "space"),
            p("این فصل برای ثبت استراتژی‌های فعال خودت است. محتوای ثابت آموزشی اینجا نمی‌آید."),
        ],
        mode="journal",
    )
    ch9["addLabel"] = "افزودن استراتژی"

    ch10 = chapter(
        "mistakes",
        10,
        "اشتباهات و درس‌ها",
        "درس‌های واقعی از معاملات خودت — ثبت کن تا تکرار نشوند.",
        [
            h2("فضای شخصی", "space"),
            p("هر اشتباه یا درس را کوتاه و مشخص بنویس. بعداً می‌توانی تگ و دسته‌بندی اضافه کنی."),
        ],
        mode="journal",
    )
    ch10["addLabel"] = "افزودن درس"

    ch11 = chapter(
        "checklist",
        11,
        "چک‌لیست",
        "چک‌لیست‌های شخصی پیش از سشن، حین معامله و پایان روز.",
        [
            h2("فضای شخصی", "space"),
            p("آیتم‌های چک‌لیست خودت را اینجا بساز و قبل از سشن مرور کن."),
        ],
        mode="journal",
    )
    ch11["addLabel"] = "افزودن آیتم چک‌لیست"

    ch12 = chapter(
        "quick",
        12,
        "یادداشت‌های سریع",
        "اینباکس نکات کوتاه؛ بعداً به فصل‌های اصلی منتقل کن.",
        [
            h2("Inbox", "inbox"),
            p("نکات سریع و خام اینجا جمع می‌شوند تا بعداً پردازش شوند."),
        ],
        mode="journal",
    )
    ch12["addLabel"] = "افزودن یادداشت سریع"

    booklet = {
        "version": 1,
        "title": "جزوه معاملاتی",
        "activeChapterId": "trading-plan",
        "chapters": [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, ch12],
    }

    # Strip empty lists from blocks
    for ch in booklet["chapters"]:
        cleaned = []
        for b in ch.get("blocks", []):
            if b.get("type") == "list" and not b.get("items"):
                continue
            cleaned.append(b)
        ch["blocks"] = cleaned

    # Coverage stats
    total_list = 0
    for ch in booklet["chapters"]:
        for b in ch.get("blocks", []):
            if b.get("type") == "list":
                total_list += len(b.get("items") or [])
            if b.get("type") == "callout":
                total_list += 1

    OUT.write_text(json.dumps(booklet, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", OUT)
    print("chapters", len(booklet["chapters"]), "content_units≈", total_list)
    print("samadi lines", len(samadi), "assigned leftovers", len(leftover))
    for ch in booklet["chapters"]:
        n = sum(len(b.get("items") or []) for b in ch.get("blocks", []) if b.get("type") == "list")
        print(f"  {ch['number']:02d} {ch['id']:20} mode={ch['mode']:7} list_items={n}")


def _used_texts(all_items, keyword_groups):
    used = set()
    for t in all_items:
        for keys in keyword_groups:
            if any(k in t for k in keys):
                used.add(t)
                break
    return used


if __name__ == "__main__":
    main()
