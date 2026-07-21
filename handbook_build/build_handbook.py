# -*- coding: utf-8 -*-
"""Build premium SSNT Price Action Handbook HTML."""
from pathlib import Path

OUT = Path(__file__).parent / "SSNT_Price_Action_Handbook.html"

CSS = r"""
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 300;
  src: url('fonts/vazir-1.ttf') format('truetype');
}
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 400;
  src: url('fonts/vazir-2.ttf') format('truetype');
}
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 500;
  src: url('fonts/vazir-3.ttf') format('truetype');
}
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 600;
  src: url('fonts/vazir-4.ttf') format('truetype');
}
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 700;
  src: url('fonts/vazir-5.ttf') format('truetype');
}
@font-face {
  font-family: 'Vazirmatn';
  font-style: normal;
  font-weight: 800;
  src: url('fonts/vazir-6.ttf') format('truetype');
}

:root {
  --ink: #1c1917;
  --ink-soft: #44403c;
  --muted: #78716c;
  --line: #e7e5e4;
  --paper: #fafaf9;
  --white: #ffffff;
  --blue: #1d4ed8;
  --blue-bg: #eff6ff;
  --blue-border: #bfdbfe;
  --green: #047857;
  --green-bg: #ecfdf5;
  --green-border: #a7f3d0;
  --amber: #b45309;
  --amber-bg: #fffbeb;
  --amber-border: #fde68a;
  --rose: #be123c;
  --rose-bg: #fff1f2;
  --rose-border: #fecdd3;
  --slate: #334155;
  --slate-bg: #f8fafc;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

@page {
  size: A4;
  margin: 18mm 16mm 20mm 16mm;
  @bottom-center {
    content: counter(page);
    font-family: 'Vazirmatn', sans-serif;
    font-size: 9pt;
    color: #a8a29e;
  }
}

html {
  font-size: 11pt;
}

body {
  font-family: 'Vazirmatn', sans-serif;
  color: var(--ink);
  background: var(--white);
  direction: rtl;
  text-align: right;
  line-height: 1.85;
  font-weight: 400;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page-break { page-break-before: always; break-before: page; }
.avoid-break { page-break-inside: avoid; break-inside: avoid; }

/* ——— Cover ——— */
.cover {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12mm 4mm 10mm;
  background:
    linear-gradient(165deg, #0c1222 0%, #1e293b 42%, #0f172a 100%);
  color: #f8fafc;
  position: relative;
  overflow: hidden;
}

.cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 10%, rgba(59,130,246,.25), transparent 55%),
    radial-gradient(ellipse 60% 40% at 90% 80%, rgba(16,185,129,.12), transparent 50%);
  pointer-events: none;
}

.cover-inner { position: relative; z-index: 1; }

.cover-eyebrow {
  display: inline-block;
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #93c5fd;
  border: 1px solid rgba(147,197,253,.35);
  padding: .45em 1.1em;
  border-radius: 999px;
  margin-bottom: 28mm;
}

.cover h1 {
  font-size: 28pt;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -.02em;
  max-width: 90%;
  margin-bottom: 8mm;
}

.cover .subtitle {
  font-size: 13pt;
  font-weight: 400;
  color: #cbd5e1;
  max-width: 85%;
  line-height: 1.7;
  margin-bottom: 14mm;
}

.cover-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6mm;
  max-width: 140mm;
  border-top: 1px solid rgba(148,163,184,.35);
  padding-top: 8mm;
}

.cover-meta dt {
  font-size: 8pt;
  color: #94a3b8;
  font-weight: 500;
  margin-bottom: 1mm;
}

.cover-meta dd {
  font-size: 11pt;
  font-weight: 600;
  color: #e2e8f0;
}

.cover-footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 9pt;
  color: #94a3b8;
  border-top: 1px solid rgba(148,163,184,.25);
  padding-top: 6mm;
}

.cover-brand {
  font-weight: 700;
  font-size: 14pt;
  color: #fff;
  letter-spacing: .06em;
}

/* ——— Copyright ——— */
.legal {
  padding: 40mm 8mm 20mm;
  color: var(--muted);
  font-size: 9.5pt;
  line-height: 1.9;
}

.legal h2 {
  color: var(--ink);
  font-size: 16pt;
  margin-bottom: 8mm;
}

/* ——— TOC ——— */
.toc h1 {
  font-size: 22pt;
  font-weight: 800;
  margin-bottom: 10mm;
  color: var(--ink);
}

.toc-list { list-style: none; }

.toc-list li {
  display: flex;
  align-items: baseline;
  gap: 3mm;
  padding: 3.2mm 0;
  border-bottom: 1px dotted var(--line);
  font-size: 10.5pt;
}

.toc-list .num {
  font-weight: 700;
  color: var(--blue);
  min-width: 8mm;
}

.toc-list .title { flex: 1; font-weight: 500; }

.toc-list .dots {
  flex: 1;
  border-bottom: 1px dotted #d6d3d1;
  margin: 0 2mm 2mm;
  min-width: 10mm;
}

.toc-list .page {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.toc-section {
  margin-top: 6mm;
  font-size: 9pt;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: .08em;
  text-transform: uppercase;
}

/* ——— Chapters ——— */
.chapter-opener {
  padding-top: 8mm;
  margin-bottom: 10mm;
  border-bottom: 2px solid var(--ink);
  padding-bottom: 6mm;
}

.chapter-label {
  font-size: 9pt;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: .12em;
  margin-bottom: 3mm;
}

.chapter-opener h1 {
  font-size: 22pt;
  font-weight: 800;
  line-height: 1.35;
  margin-bottom: 4mm;
}

.chapter-lead {
  font-size: 11.5pt;
  color: var(--ink-soft);
  max-width: 95%;
  margin-bottom: 5mm;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3mm;
  margin-top: 2mm;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 1.5mm;
  font-size: 8.5pt;
  font-weight: 600;
  padding: 1.2mm 3.5mm;
  border-radius: 999px;
  background: var(--slate-bg);
  color: var(--slate);
  border: 1px solid var(--line);
}

.objectives {
  background: var(--slate-bg);
  border: 1px solid var(--line);
  border-radius: 3mm;
  padding: 5mm 6mm;
  margin: 6mm 0 8mm;
}

.objectives h3 {
  font-size: 10pt;
  font-weight: 700;
  margin-bottom: 3mm;
  color: var(--slate);
}

.objectives ul {
  padding-right: 5mm;
  margin: 0;
}

.objectives li {
  margin-bottom: 1.5mm;
  font-size: 10pt;
  color: var(--ink-soft);
}

h2 {
  font-size: 14pt;
  font-weight: 750;
  font-weight: 700;
  margin: 9mm 0 3.5mm;
  color: var(--ink);
  letter-spacing: -.01em;
}

h3 {
  font-size: 11.5pt;
  font-weight: 700;
  margin: 6mm 0 2.5mm;
  color: var(--ink);
}

p {
  margin-bottom: 3.5mm;
  color: var(--ink-soft);
  orphans: 3;
  widows: 3;
}

strong { color: var(--ink); font-weight: 700; }

ul, ol {
  margin: 0 0 4mm;
  padding-right: 6mm;
}

li {
  margin-bottom: 2mm;
  color: var(--ink-soft);
}

li strong { color: var(--ink); }

/* ——— Callouts ——— */
.callout {
  border-radius: 2.5mm;
  padding: 4.5mm 5mm;
  margin: 5mm 0;
  border: 1px solid;
  page-break-inside: avoid;
  break-inside: avoid;
}

.callout .label {
  font-size: 8pt;
  font-weight: 800;
  letter-spacing: .1em;
  margin-bottom: 2mm;
  display: flex;
  align-items: center;
  gap: 2mm;
}

.callout p:last-child { margin-bottom: 0; }

.callout.info { background: var(--blue-bg); border-color: var(--blue-border); }
.callout.info .label { color: var(--blue); }

.callout.tip { background: var(--green-bg); border-color: var(--green-border); }
.callout.tip .label { color: var(--green); }

.callout.warn { background: var(--amber-bg); border-color: var(--amber-border); }
.callout.warn .label { color: var(--amber); }

.callout.danger { background: var(--rose-bg); border-color: var(--rose-border); }
.callout.danger .label { color: var(--rose); }

.callout.note { background: #f5f5f4; border-color: #d6d3d1; }
.callout.note .label { color: #57534e; }

.callout.key {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: none;
  color: #e2e8f0;
}
.callout.key .label { color: #93c5fd; }
.callout.key p, .callout.key li { color: #cbd5e1; }
.callout.key strong { color: #fff; }

/* ——— Tables ——— */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 5mm 0 7mm;
  font-size: 9.5pt;
  page-break-inside: avoid;
}

th, td {
  border: 1px solid var(--line);
  padding: 2.8mm 3.2mm;
  text-align: right;
  vertical-align: top;
}

th {
  background: #f5f5f4;
  font-weight: 700;
  color: var(--ink);
  font-size: 9pt;
}

td { color: var(--ink-soft); }

tr:nth-child(even) td { background: #fafaf9; }

/* ——— Process / steps ——— */
.steps {
  counter-reset: step;
  list-style: none;
  padding: 0;
  margin: 4mm 0 6mm;
}

.steps li {
  counter-increment: step;
  position: relative;
  padding: 3.5mm 12mm 3.5mm 3mm;
  margin-bottom: 2.5mm;
  background: var(--slate-bg);
  border-radius: 2mm;
  border: 1px solid var(--line);
}

.steps li::before {
  content: counter(step);
  position: absolute;
  right: 3mm;
  top: 50%;
  transform: translateY(-50%);
  width: 6mm;
  height: 6mm;
  border-radius: 50%;
  background: var(--blue);
  color: #fff;
  font-size: 8pt;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 6mm;
  text-align: center;
}

/* ——— Summary card ——— */
.summary-card {
  background: var(--paper);
  border: 1.5px solid var(--ink);
  border-radius: 3mm;
  padding: 5mm 6mm;
  margin: 8mm 0 4mm;
  page-break-inside: avoid;
}

.summary-card h3 {
  margin-top: 0;
  font-size: 11pt;
  border-bottom: 1px solid var(--line);
  padding-bottom: 2.5mm;
  margin-bottom: 3.5mm;
}

.checklist {
  list-style: none;
  padding: 0;
}

.checklist li {
  padding: 2mm 7mm 2mm 0;
  position: relative;
  border-bottom: 1px solid var(--line);
  margin: 0;
}

.checklist li:last-child { border-bottom: none; }

.checklist li::before {
  content: "☐";
  position: absolute;
  right: 0;
  color: var(--blue);
  font-size: 11pt;
}

/* ——— Quote ——— */
.quote {
  margin: 7mm 0;
  padding: 5mm 6mm;
  border-right: 3px solid var(--blue);
  background: var(--blue-bg);
  font-size: 12pt;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.75;
  page-break-inside: avoid;
}

.quote cite {
  display: block;
  margin-top: 3mm;
  font-size: 8.5pt;
  font-weight: 600;
  color: var(--muted);
  font-style: normal;
}

/* ——— Diagram boxes ——— */
.diagram {
  margin: 5mm 0 7mm;
  padding: 5mm;
  border: 1px solid var(--line);
  border-radius: 3mm;
  background: #fff;
  page-break-inside: avoid;
}

.diagram-title {
  font-size: 9pt;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 4mm;
  letter-spacing: .06em;
}

.flow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2.5mm;
}

.flow-box {
  background: #0f172a;
  color: #f8fafc;
  padding: 3mm 4.5mm;
  border-radius: 2mm;
  font-size: 9.5pt;
  font-weight: 600;
  text-align: center;
  min-width: 28mm;
}

.flow-box.alt { background: var(--blue); }
.flow-box.soft { background: #e2e8f0; color: var(--ink); }

.flow-arrow {
  color: var(--muted);
  font-weight: 700;
  font-size: 14pt;
}

.cycle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 3mm;
}

.cycle-card {
  border: 1px solid var(--line);
  border-radius: 2mm;
  padding: 4mm;
  background: var(--slate-bg);
}

.cycle-card h4 {
  font-size: 10pt;
  font-weight: 700;
  margin-bottom: 2mm;
  color: var(--ink);
}

.cycle-card p {
  font-size: 8.5pt;
  margin: 0;
  line-height: 1.65;
}

/* ——— Cheat sheet ——— */
.cheat {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
  margin: 4mm 0;
}

.cheat-item {
  border: 1px solid var(--line);
  border-radius: 2mm;
  padding: 3.5mm 4mm;
  background: #fff;
  page-break-inside: avoid;
}

.cheat-item h4 {
  font-size: 9.5pt;
  font-weight: 700;
  margin-bottom: 2mm;
  color: var(--blue);
}

.cheat-item p, .cheat-item li {
  font-size: 8.5pt;
  margin-bottom: 1mm;
  line-height: 1.6;
}

/* ——— Glossary ——— */
.glossary dt {
  font-weight: 700;
  color: var(--ink);
  margin-top: 3.5mm;
  font-size: 10.5pt;
}

.glossary dd {
  color: var(--ink-soft);
  font-size: 10pt;
  margin-bottom: 1mm;
  padding-right: 2mm;
}

/* ——— Intro special ——— */
.intro-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
  margin: 6mm 0;
}

.stat-card {
  padding: 5mm;
  border-radius: 2.5mm;
  background: var(--slate-bg);
  border: 1px solid var(--line);
}

.stat-card .num {
  font-size: 20pt;
  font-weight: 800;
  color: var(--blue);
  line-height: 1.2;
}

.stat-card .desc {
  font-size: 9pt;
  color: var(--muted);
  margin-top: 1mm;
}

hr.sep {
  border: none;
  border-top: 1px solid var(--line);
  margin: 8mm 0;
}

.footer-note {
  margin-top: 12mm;
  padding-top: 4mm;
  border-top: 1px solid var(--line);
  font-size: 8.5pt;
  color: var(--muted);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5mm;
  margin: 4mm 0;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2mm;
  margin: 3mm 0 5mm;
}
"""

def callout(kind, label, body):
    return f'<div class="callout {kind}"><div class="label">{label}</div>{body}</div>'

def chapter_open(num, title, lead, minutes, objectives):
    objs = "".join(f"<li>{o}</li>" for o in objectives)
    return f"""
<section class="chapter-opener avoid-break">
  <div class="chapter-label">فصل {num}</div>
  <h1>{title}</h1>
  <p class="chapter-lead">{lead}</p>
  <div class="meta-row">
    <span class="chip">⏱ حدود {minutes} دقیقه مطالعه</span>
    <span class="chip">سیستم SSNT</span>
  </div>
</section>
<div class="objectives avoid-break">
  <h3>اهداف یادگیری</h3>
  <ul>{objs}</ul>
</div>
"""

def summary(title, items, checklist=None):
    lis = "".join(f"<li>{i}</li>" for i in items)
    html = f'<div class="summary-card avoid-break"><h3>{title}</h3><ul>{lis}</ul>'
    if checklist:
        cl = "".join(f"<li>{c}</li>" for c in checklist)
        html += f'<h3 style="margin-top:4mm">چک‌لیست</h3><ul class="checklist">{cl}</ul>'
    html += "</div>"
    return html

html_parts = []

# COVER
html_parts.append("""
<section class="cover">
  <div class="cover-inner">
    <div class="cover-eyebrow">SSNT · Price Action Handbook</div>
    <h1>راهنمای جامع<br>معامله‌گری پرایس‌اکشن</h1>
    <p class="subtitle">
      یک هندبوک آموزشی و عملی بر اساس جزوه و نکات آموزش‌های سبحان صمدی،
      همراه با پلن معاملاتی حساب واقعی سیستم New SSNT.
    </p>
    <dl class="cover-meta">
      <div>
        <dt>سطح</dt>
        <dd>متوسط تا پیشرفته</dd>
      </div>
      <div>
        <dt>تمرکز</dt>
        <dd>چرخه بازار · ساختار · ریسک</dd>
      </div>
      <div>
        <dt>سبک</dt>
        <dd>Price Action / Session Trading</dd>
      </div>
      <div>
        <dt>نسخه</dt>
        <dd>۱.۰ · ۲۰۲۶</dd>
      </div>
    </dl>
  </div>
  <div class="cover-footer">
    <div>
      <div class="cover-brand">SSNT</div>
      <div>Sobhan Samadi Notes · Trading Plan</div>
    </div>
    <div style="text-align:left; direction:ltr">Educational Handbook</div>
  </div>
</section>
""")

# LEGAL
html_parts.append("""
<section class="page-break legal">
  <h2>یادداشت حقوقی و استفاده</h2>
  <p>این سند یک هندبوک آموزشی شخصی است که از منابع زیر گردآوری، بازنویسی و ساختاردهی شده است:</p>
  <ul>
    <li>جزوه سبحان صمدی</li>
    <li>نکات مهم SSNT</li>
    <li>Trading Plan — Real Account</li>
  </ul>
  <p style="margin-top:6mm">
    محتوای این کتابچه صرفاً جنبه آموزشی دارد و توصیه مالی، سرمایه‌گذاری یا تضمین سود نیست.
    معامله در بازارهای مالی ریسک از دست دادن سرمایه دارد. مسئولیت هر تصمیم معاملاتی با خود معامله‌گر است.
  </p>
  <p style="margin-top:4mm">
    متن برای وضوح، انسجام و خوانایی بازنویسی شده است؛ معنای آموزشی منابع حفظ شده است.
  </p>
</section>
""")

# TOC
html_parts.append("""
<section class="page-break toc">
  <h1>فهرست مطالب</h1>
  <p class="toc-section">شروع</p>
  <ul class="toc-list">
    <li><span class="num">۰</span><span class="title">مقدمه: چرا این هندبوک؟</span></li>
  </ul>
  <p class="toc-section">بخش اول — ذهن و چارچوب</p>
  <ul class="toc-list">
    <li><span class="num">۱</span><span class="title">فلسفه معامله‌گری و اولویت بقا</span></li>
    <li><span class="num">۲</span><span class="title">چرخه‌های بازار: اسپایک، کانال، تریدینگ رنج</span></li>
  </ul>
  <p class="toc-section">بخش دوم — خواندن قیمت</p>
  <ul class="toc-list">
    <li><span class="num">۳</span><span class="title">سطوح، پین‌بار و کندل تأیید</span></li>
    <li><span class="num">۴</span><span class="title">تریدینگ رنج به‌صورت عمیق</span></li>
    <li><span class="num">۵</span><span class="title">اسپایک، بریک‌اوت و شکست جعلی</span></li>
    <li><span class="num">۶</span><span class="title">الگوها: ۱۲۳، V، دو لگ، گپ و میکروکانال</span></li>
  </ul>
  <p class="toc-section">بخش سوم — اجرا و سرمایه</p>
  <ul class="toc-list">
    <li><span class="num">۷</span><span class="title">مدیریت سرمایه و ریسک</span></li>
    <li><span class="num">۸</span><span class="title">حد ضرر، بریک‌ایون و مدیریت پوزیشن</span></li>
    <li><span class="num">۹</span><span class="title">چگونه استراتژی بنویسیم</span></li>
  </ul>
  <p class="toc-section">بخش چهارم — لایو مارکت</p>
  <ul class="toc-list">
    <li><span class="num">۱۰</span><span class="title">قوانین عملیاتی و نکات حیاتی لایو</span></li>
    <li><span class="num">۱۱</span><span class="title">پلن معاملاتی حساب واقعی (New SSNT)</span></li>
  </ul>
  <p class="toc-section">پایان</p>
  <ul class="toc-list">
    <li><span class="num">۱۲</span><span class="title">چیـت‌شیت یک‌صفحه‌ای</span></li>
    <li><span class="num">۱۳</span><span class="title">واژه‌نامه و جمع‌بندی نهایی</span></li>
  </ul>
</section>
""")

# INTRO
html_parts.append("""
<section class="page-break">
  <div class="chapter-opener">
    <div class="chapter-label">مقدمه</div>
    <h1>چرا این هندبوک؟</h1>
    <p class="chapter-lead">
      جزوه‌ها وقتی پراکنده باشند، در لحظه معامله به کار نمی‌آیند.
      این کتابچه همان محتوا را به یک نقشه ذهنی واحد تبدیل می‌کند:
      از تشخیص چرخه بازار تا ورود، خروج و قوانین بقا.
    </p>
  </div>

  <p>
    بازار فقط کندل نیست. بازار یک چرخه تکرارشونده از <strong>اطمینان</strong>، <strong>تردید</strong> و <strong>تعادل</strong> است.
    وقتی ساختار را ببینید، سیگنال‌ها معنا پیدا می‌کنند. وقتی ساختار را نبینید، هر پین‌بار فریبنده به نظر می‌رسد.
  </p>

  <div class="intro-grid">
    <div class="stat-card avoid-break">
      <div class="num">۸۰٪</div>
      <div class="desc">زمان بازار معمولاً در چرخه تریدینگ رنج سپری می‌شود</div>
    </div>
    <div class="stat-card avoid-break">
      <div class="num">۶۰/۴۰</div>
      <div class="desc">حتی در بهترین حالت، احتمال برخورد به حد سود حدود ۶۰٪ است</div>
    </div>
    <div class="stat-card avoid-break">
      <div class="num">۱٪</div>
      <div class="desc">ریسک پایه هر معامله در پلن حساب واقعی</div>
    </div>
    <div class="stat-card avoid-break">
      <div class="num">بقا</div>
      <div class="desc">اولویت اول تریدر؛ قبل از سود، قبل از طمع، قبل از انتقام</div>
    </div>
  </div>

  <div class="quote">
    «جایی که بازار برای شما نامفهوم است، بیننده باشید.»
    <cite>— اصل محوری جزوه سبحان صمدی</cite>
  </div>

  <h2>چگونه از این کتابچه استفاده کنید</h2>
  <ol class="steps">
    <li>یک‌بار از ابتدا تا انتها بخوانید تا نقشه کلی در ذهن بنشیند.</li>
    <li>هر فصل را با چارت لایو یا ریپلی همان روز تمرین کنید.</li>
    <li>چیـت‌شیت انتهایی را کنار مانیتور نگه دارید.</li>
    <li>پلن حساب واقعی را بدون استثنا اجرا کنید؛ اصلاح فقط بعد از جلسه بررسی.</li>
  </ol>
</section>
""")

# CH 1
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۱",
    "فلسفه معامله‌گری و اولویت بقا",
    "سود نتیجه جانبیِ انضباط است. بدون پذیرش ضرر، بدون اعتماد به سیستم، و بدون کنترل ریسک، هیچ استراتژی دوام نمی‌آورد.",
    "۸",
    [
        "اولویت بقا را به‌عنوان قانون غیرقابل مذاکره درک کنید",
        "رابطه اعتمادبه‌نفس، بک‌تست و پذیرش ریسک را بفهمید",
        "خط قرمزهای روان‌شناختی معامله‌گر را بشناسید",
    ],
))
html_parts.append("""
<p>
  اولین اصل این مکتب ساده است: <strong>اولویت اول یک تریدر باید بقا باشد</strong>.
  بقا یعنی اکانت زنده بماند، ذهن آرام بماند، و فردا هم بتوانید طبق پلن بنشینید.
</p>

<p>
  بازار بازارِ عدم قطعیت است. قانون ذهنی ۶۰/۴۰ را جدی بگیرید:
  حتی در بهترین شرایط، تقریباً ۴۰٪ مواقع ممکن است حد ضرر فعال شود.
  اگر با این واقعیت دوست نشوید، اولین ضرر ذهنتان را قفل می‌کند.
</p>

""" + callout("warn", "⚠ هشدار",
"<p>خط قرمز یک تریدر: <strong>نگذاشتن حد ضرر</strong> یا <strong>جابه‌جا کردن حد ضرر بعد از ورود</strong>. دیر یا زود به خودتان آسیب می‌زنید.</p>") + """

<h2>اعتمادبه‌نفس از کجا می‌آید؟</h2>
<p>
  کسی می‌تواند ریسک را بپذیرد که اعتمادبه‌نفس دارد.
  اعتمادبه‌نفس از شعار نمی‌آید؛ از <strong>بک‌تست</strong>، <strong>تسلط روی استراتژی</strong> و <strong>ثبت منظم معاملات</strong> می‌آید.
  هرچه تسلط بیشتر شود، پذیرش ریسک سالم‌تر می‌شود.
</p>

""" + callout("tip", "✓ نکته",
"<p>کنترل ریسک خسته‌کننده است. حتی ذهن حرفه‌ای‌ها هم وسوسه حجم بالا را می‌شناسد. تفاوت در این است که وسوسه را اجرا نمی‌کنند.</p>") + """

<h2>پنج محور پلن مدیریت ریسک</h2>
<table>
  <thead><tr><th>محور</th><th>سؤال کلیدی</th></tr></thead>
  <tbody>
    <tr><td>ریسک هر معامله</td><td>حداکثر چند درصد اکانت در یک پوزیشن؟</td></tr>
    <tr><td>ریسک دوره معاملاتی</td><td>در روز / هفته تا چه ضرری توقف اجباری است؟</td></tr>
    <tr><td>ریسک افزایش سایز</td><td>چه شرطی اجازه بزرگ‌تر شدن حجم را می‌دهد؟</td></tr>
    <tr><td>ریسک درآمد ناکافی</td><td>آیا فشار مالی باعث نقض پلن می‌شود؟</td></tr>
    <tr><td>ریسک ضرر جاری</td><td>در دراودان، چه رفتاری ممنوع است؟</td></tr>
  </tbody>
</table>

""" + callout("note", "◎ یادداشت شخصی",
"<p>تا رسیدن به حدود دو برابر درآمد فعلی، ترک شغل اول توصیه نمی‌شود. معامله باید مکمل امنیت مالی باشد، نه جایگزین عجولانه آن.</p>") + """

""" + summary("جمع‌بندی فصل ۱", [
    "بقا بر سود مقدم است.",
    "ضرر بخشی از بازی است؛ انکار ضرر، شروع فروپاشی روان است.",
    "اعتمادبه‌نفس محصول بک‌تست و محدودیت است، نه هیجان لایو.",
], [
    "قبل از سشن، پلن ریسک را مرور کردم",
    "حد ضرر را قبل از ورود مشخص می‌کنم",
    "امروز هدفم اجرای پلن است، نه جبران دیروز",
]) + """
</section>
""")

# CH 2
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۲",
    "چرخه‌های بازار: اسپایک، کانال، تریدینگ رنج",
    "قبل از هر سیگنال، یک سؤال بپرسید: الان بازار در کدام چرخه است؟ پاسخ این سؤال، جهت معامله، ریسک به ریوارد و حتی اجازه ورود را مشخص می‌کند.",
    "۱۲",
    [
        "سه چرخه اصلی را تشخیص دهید",
        "گذار بین چرخه‌ها را بشناسید",
        "رفتار مجاز در هر چرخه را بدانید",
    ],
))
html_parts.append("""
<div class="diagram avoid-break">
  <div class="diagram-title">چرخه کلاسیک قیمت</div>
  <div class="flow">
    <div class="flow-box">اسپایک</div>
    <div class="flow-arrow">←</div>
    <div class="flow-box alt">کانال</div>
    <div class="flow-arrow">←</div>
    <div class="flow-box soft">تریدینگ رنج</div>
  </div>
  <p style="text-align:center;font-size:8.5pt;color:#78716c;margin:4mm 0 0">
    گاهی قیمت مستقیماً از اسپایک به تریدینگ رنج می‌رود و کانال را رد می‌کند.
  </p>
</div>

<div class="cycle-grid avoid-break">
  <div class="cycle-card">
    <h4>اسپایک</h4>
    <p>حرکت یک‌طرفه قوی. معامله عمدتاً در جهت حرکت. عدم‌قطعیت کمتر، سرعت تصمیم بالاتر.</p>
  </div>
  <div class="cycle-card">
    <h4>کانال</h4>
    <p>پس از اولین اصلاحِ پس از اسپایک شروع می‌شود. دو طرفه ممکن است؛ خلاف جهت معمولاً RR یک‌به‌یک.</p>
  </div>
  <div class="cycle-card">
    <h4>تریدینگ رنج</h4>
    <p>پرریسک‌ترین و پرتکرارترین چرخه. برای مبتدی گمراه‌کننده؛ اولویت: بقا و مشاهده.</p>
  </div>
</div>

<h2>قواعد انتقال چرخه</h2>
<ul>
  <li><strong>اولین اصلاح پس از اسپایک</strong> نشانه ورود به چرخه کانال است.</li>
  <li><strong>شکست کانال</strong> نشانه حرکت به سمت تریدینگ رنج است.</li>
  <li>وقتی قیمت به آخرین سقف/کف روند می‌رسد و آن را لمس/باطل می‌کند، پایان روند و آغاز فضای رنج محتمل است.</li>
  <li>کانال می‌تواند افقی باشد؛ در این حالت عملاً با تریدینگ رنج روبه‌رو هستید.</li>
</ul>

""" + callout("info", "ℹ تعریف پولبک",
"<p>تا وقتی قیمت آخرین سقف یا کف را نزده، هنوز در اسپایک است و پولبک کامل نشده. پولبک هم برای خروج و هم برای ادامه روند قابل استفاده است.</p>") + """

<h2>قدرت روند و فاصله سقف/کف</h2>
<p>
  فاصله سقف و کف‌ها نشانه قدرت روند است.
  اگر فاصله‌ها خیلی نزدیک شوند، روند در حال ضعیف شدن است.
  اگر فاصله بین دو سقف یا دو کف بسیار زیاد باشد (مثلاً حدود یک روز)،
  <strong>با اولین شکست وارد نشوید</strong>؛ صبر کنید تا پولبک فرصت بهتری بسازد.
</p>

""" + callout("tip", "✓ بهترین عادت پس از باز کردن چارت",
"<p>اول سقف و کف روز را مشخص کنید. سپس ساختار (اسپایک / کانال / رنج) را بنویسید. بعد به دنبال سیگنال بروید.</p>") + """

<table>
  <thead><tr><th>چرخه</th><th>جهت معامله</th><th>نکته RR</th></tr></thead>
  <tbody>
    <tr><td>اسپایک</td><td>یک‌طرفه (هم‌جهت)</td><td>حداقل ۲ در جهت روند</td></tr>
    <tr><td>کانال ضعیف</td><td>دو طرفه ممکن</td><td>خلاف جهت معمولاً ۱:۱</td></tr>
    <tr><td>تریدینگ رنج</td><td>کف بخر / سقف بفروش یا شکست تأییدشده</td><td>وسط رنج ممنوع</td></tr>
  </tbody>
</table>

""" + summary("جمع‌بندی فصل ۲", [
    "سیگنال بدون تشخیص چرخه، استراتژی نیست.",
    "اسپایک → کانال → رنج؛ ولی میان‌بر اسپایک به رنج هم رایج است.",
    "شکست‌های دوردست را با پولبک فیلتر کنید.",
], [
    "ساختار فعلی چارت را نام‌گذاری کردم",
    "سقف/کف روز مشخص است",
    "می‌دانم امروز یک‌طرفه معامله می‌کنم یا دو طرفه",
]) + """
</section>
""")

# CH 3
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۳",
    "سطوح، پین‌بار و کندل تأیید",
    "پین‌بار به‌تنهایی استراتژی نیست؛ یک سیگنال است. قدرت آن به اصالت منطقه، اندازه سایه، و کندل تأیید بستگی دارد.",
    "۱۰",
    [
        "اصالت منطقه پین‌بار را ارزیابی کنید",
        "کندل تأیید واقعی را از کندل معمولی تفکیک کنید",
        "اهمیت اعداد رند، ۵۰٪ روند و برخوردهای مکرر را بدانید",
    ],
))
html_parts.append("""
<h2>پین‌بار: سیگنال، نه سیستم</h2>
<p>
  پین‌بار در جای درست می‌تواند سیگنال بسیار مهمی بدهد.
  اما سؤال اصلی این است: <strong>این پین‌بار روی چه منطقه‌ای آمده؟</strong>
  اصالت منطقه مهم‌تر از شکل کندل است.
</p>

<ul>
  <li>اندازه سایه، قدرت و تمایل خرید/فروش را نشان می‌دهد.</li>
  <li>روی RS بسیار قوی، پین‌بار قوی می‌تواند نقطه ورود بسازد؛ حد ضرر معمولاً پشت پین‌بار است.</li>
  <li>در روند نزولی، اگر بعد از پین‌بار صعودی، کندل بعدی صعودی نباشد یا کی‌بار تشکیل نشود، کانال قیمتی نزولی تقویت می‌شود.</li>
</ul>

""" + callout("key", "◆ قانون ورود پس از شکست روند",
"<p>وقتی ترند شکسته شد و در اولین نشانه‌ها پین‌بار هم‌جهت دیدید، این ترکیب نزدیک به یک استراتژی کامل است: پین‌بار + کندل بعدی هم‌جهت + زده شدن آخرین سقف/کف.</p>") + """

<h2>کندل تأیید چیست؟</h2>
<p>
  کندل تأیید بعد از سیگنال‌بار باید «پول» را نشان بدهد:
  بدنه بزرگ‌تر از کندل‌های صعودی/نزولی قبلی، کاملاً قابل تشخیص، و هم‌جهت سناریو.
</p>

<h2>سطوحی که بازار به آن‌ها احترام می‌گذارد</h2>
<table>
  <thead><tr><th>سطح</th><th>اهمیت</th></tr></thead>
  <tbody>
    <tr><td>RS با برخوردهای متعدد</td><td>هرچه برخورد بیشتر، سطح برای آینده مهم‌تر</td></tr>
    <tr><td>اعداد رند</td><td>قیمت غالباً واکنش نشان می‌دهد</td></tr>
    <tr><td>۵۰٪ روند</td><td>اگر شکسته شود، تمایل پوشش کل روند بالاست</td></tr>
    <tr><td>سقف/کف روز و ۵۰٪ آن</td><td>باید همیشه مشخص باشد؛ اگر RS مهم نزدیک ۵۰٪ بود، همان ملاک است</td></tr>
    <tr><td>سقف/کف اولین اصلاح پس از اسپایک</td><td>RS بسیار مهم آینده؛ خط آن را رسم کنید</td></tr>
  </tbody>
</table>

""" + callout("info", "ℹ سؤال همیشگی",
"<p>همیشه بپرسید: <strong>چرا قیمت به این سطح واکنش نشان داده؟</strong> اگر جوابی ندارید، ورود را عقب بیندازید.</p>") + """

<h2>فشردگی قیمت</h2>
<p>
  فشردگی قیمت بسیار مهم است؛ محل تشکیل آن سنتیمنت می‌سازد و کمک می‌کند حدس بزنید شکست از کجا محتمل‌تر است.
  در سقف و کف تریدینگ رنج، فشردگی یک فیلتر معاملاتی قوی است.
</p>

""" + summary("جمع‌بندی فصل ۳", [
    "پین‌بار بدون منطقه معتبر، نویز است.",
    "تأیید یعنی بدنه واضح و قابل تشخیص.",
    "۵۰٪، اعداد رند، و برخوردهای مکرر نقشه تصمیم‌گیری‌اند.",
], [
    "منطقه سیگنال را از نظر اصالت بررسی کردم",
    "کندل تأیید معیار بدنه را دارد",
    "سقف/کف روز و ۵۰٪ مشخص شده",
]) + """
</section>
""")

# CH 4
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۴",
    "تریدینگ رنج به‌صورت عمیق",
    "تریدینگ رنج هم پرریسک‌ترین چرخه است، هم از نگاه این مکتب می‌تواند پرسودترین باشد. برای مبتدی اما بیشتر دام است تا فرصت.",
    "۱۲",
    [
        "قوانین بقا در رنج را حفظ کنید",
        "تعداد برخورد مطلوب را بشناسید",
        "تارگت شکست رنج و نقش ۵۰٪ را بدانید",
    ],
))
html_parts.append("""
""" + callout("danger", "✕ قانون طلایی",
"<p><strong>وسط رنج معامله نکنید.</strong> یا در کف/سقف با سناریوی مشخص، یا پس از شکست و تأیید خروج از رنج.</p>") + """

<p>
  حدود ۸۰٪ زمان، بازار در فضای رنج است.
  بهترین کار در ابتدای مسیر: <strong>بیننده بودن</strong>.
  اولویت اول در این چرخه همان بقا و حفظ اکانت است.
</p>

<h2>دو بازی اصلی در رنج</h2>
<ol class="steps">
  <li>قیمت سقف یا کف را می‌شکند و تأیید می‌دهد ← معامله در جهت خروج.</li>
  <li>شکست تأیید نشده ← در کف بخرید، در سقف بفروشید (با فیلتر).</li>
</ol>

""" + callout("tip", "✓ تمایل حرفه‌ای",
"<p>اگر روند کلی صعودی است، در رنج تمایل داشته باشید در کف بخرید تا اینکه در سقف بفروشید. هم‌سوی جریان بزرگ‌تر باشید.</p>") + """

<h2>تعداد برخورد و اعتبار سطح</h2>
<table>
  <thead><tr><th>برخورد</th><th>ارزیابی</th></tr></thead>
  <tbody>
    <tr><td>دومین برخورد</td><td>غالباً عالی و حرفه‌ای</td></tr>
    <tr><td>سومین برخورد</td><td>بسیار مناسب؛ حد مطلوب معامله تا ۳ برخورد</td></tr>
    <tr><td>چهارم به بعد</td><td>ریسکی‌تر؛ احتمال شکست سطح بالاتر می‌رود</td></tr>
  </tbody>
</table>

<p>
  خاصیت آهنربا: وقتی قیمت به سقف/کف نزدیک می‌شود، حرکت معمولاً تندتر می‌شود.
  اگر پولبک بیش از حدود ۲۰ کندل طول بکشد یا ظاهراً رنج ادامه‌دار شود، اعتبار روند قبلی کم‌رنگ می‌شود.
</p>

<h2>۵۰٪ رنج و تارگت شکست</h2>
<ul>
  <li>اگر قیمت لول ۵۰٪ رنج را بشکند، می‌تواند تا ۱۰۰٪ پیش برود.</li>
  <li>تارگت کلاسیک شکست تریدینگ رنج: اندازه‌ای معادل خود رنج (۱۰۰٪).</li>
  <li>اگر خلاف روند اصلی معامله می‌کنید، معمولاً از واکنش دوم اجازه بگیرید.</li>
</ul>

""" + callout("warn", "⚠ FBO فقط کجا؟",
"<p>فیک بریک‌اوت عمدتاً متعلق به تریدینگ رنج است. وقتی قیمت در کانال رونددار است، FBO نگیرید — مگر کانال ضعیف و شبیه رنج شده باشد.</p>") + """

""" + summary("جمع‌بندی فصل ۴", [
    "رنج = بقا اول، سود دوم.",
    "وسط ممنوع؛ برخورد ۲ و ۳ مطلوب.",
    "۵۰٪ و اندازه رنج، نقشه تارگت شماست.",
], [
    "۵٪ حاشیه‌های رنج را مشخص کردم",
    "تعداد برخورد سقف/کف را شمردم",
    "سناریوی BO و FBO را از قبل نوشتم",
]) + """
</section>
""")

# CH 5
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۵",
    "اسپایک، بریک‌اوت و شکست جعلی",
    "سیستم New SSNT در لایو خلاصه می‌شود در دو حالت: یا شکست رخ می‌دهد، یا شکست جعلی. قبل از باز شدن نیویورک، دیدگاه باید شفاف باشد.",
    "۱۱",
    [
        "اسپایک را از حرکت معمولی تشخیص دهید",
        "نشانه‌های بریک‌اوت قوی را فهرست کنید",
        "فیلترهای BO و Double BO را درست به کار ببرید",
    ],
))
html_parts.append("""
<h2>اسپایک چیست؟</h2>
<p>
  هر سطحی که با کندل فول‌بادی یا چند کندل پشت‌سرهم بدون پولبک شکسته شود، اسپایک است.
  <strong>Spike ≈ Breakout</strong>.
  در اسپایک یک‌طرفه معامله کنید — و مراقب مغناطیس سطوح باشید.
</p>

<h3>اسپایک چگونه شکل می‌گیرد؟</h3>
<ul>
  <li>خروج از تریدینگ رنج</li>
  <li>پولبک‌های ادامه‌دهنده روند</li>
  <li>شکست سقف/کف کندل‌های قبلی</li>
  <li>گاهی شکست خط روند</li>
</ul>

""" + callout("warn", "⚠ آمار ذهنی مهم",
"<p>در حدود ۸۰٪ مواقع، خروج از تریدینگ رنج Failed می‌شود. بنابراین شکست خام، بدون فیلتر، خطرناک است.</p>") + """

<h2>نشانه‌های بریک‌اوت قوی</h2>
<table>
  <thead><tr><th>#</th><th>نشانه</th></tr></thead>
  <tbody>
    <tr><td>۱</td><td>کندل با بدنه بزرگ و بدون سایه زیاد</td></tr>
    <tr><td>۲</td><td>چندین کندل پشت‌سرهم هم‌جهت</td></tr>
    <tr><td>۳</td><td>کلوز بالای/زیر سقف یا کف کندل قبلی</td></tr>
    <tr><td>۴</td><td>تشکیل کندل بعد از نواحی مهم</td></tr>
    <tr><td>۵</td><td>گپ؛ گاهی انتهای روند را هم نشان می‌دهد</td></tr>
  </tbody>
</table>

<h2>فیلتر ورود در BO</h2>
<p>
  اگر ریت ورود بسیار بالا است، می‌توانید با فیلتر حدود ۳ ثانیه وارد شوید.
  اگر ریت بالا نیست، <strong>Double BO</strong> را اعمال کنید:
  یک‌بار بشکند، کمی اصلاح کند (حداقل تا سطح شکست و کمی بیشتر)، دوباره بشکند؛ سپس وارد شوید.
  در این حالت حد ضرر می‌تواند پشت سطح باشد.
</p>

""" + callout("tip", "✓ پین‌بار روی سقف شکسته‌شده",
"<p>اگر روی سقفِ شکسته‌شده پین‌بار صعودی دیدید، خرید منطقی است (و بالعکس برای کف). این یکی از ستاپ‌های شفاف اسپایک است.</p>") + """

<h2>شکست جعلی (FBO)</h2>
<p>
  داخل تریدینگ رنج، هر کندل را تا خلافش ثابت شود مغناطیس فرض کنید.
  اگر بریک‌اوت Fail شود، دو سناریو می‌ماند: ادامه روند مخالف یا بازگشت.
</p>
<p>
  نکته مهم FBO: وقتی با کندل بزرگ شکست جعلی می‌زند و برمی‌گردد، می‌توان با فیلتر ساده‌تر (مثلاً ۳ ثانیه) وارد شد.
</p>

""" + callout("danger", "✕ توقف اجباری",
"<p>اگر در رنج هم BO و هم FBO ضرر داد، معامله را متوقف کنید. روز را حفظ کنید.</p>") + """

<p>
  نقطه ضعف روان‌شناختی بریک‌اوت: باید سریع تصمیم بگیرید.
  تصمیم را از قبل گرفته باشید؛ اگر ضرر شد، با پذیرش ببندید.
</p>

""" + summary("جمع‌بندی فصل ۵", [
    "اسپایک = شکست پرشتاب بدون پولبک.",
    "اکثر خروج‌های رنج Fail می‌شوند؛ فیلتر واجب است.",
    "دو ضرر متوالی BO/FBO یعنی توقف.",
], [
    "قبل NYSE سناریوی BO یا FBO را نوشتم",
    "ریت ورود را برای فیلتر ۳s یا DoubleBO سنجیدم",
    "حد ضرر پشت سطح/سیگنال از پیش مشخص است",
]) + """
</section>
""")

# CH 6
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۶",
    "الگوها: ۱۲۳، V، دو لگ، گپ و میکروکانال",
    "الگوها میان‌بر ذهنی‌اند؛ جایگزین ساختار نیستند. وقتی چارت نامفهوم است، اول ساختار را بکشید، بعد الگو را.",
    "۱۴",
    [
        "ستاپ MTR/123 را درست زمان‌بندی کنید",
        "الگوی V و کاربرد ۵۰٪ را اجرا کنید",
        "گپ خستگی و میکروکانال را تشخیص دهید",
    ],
))
html_parts.append("""
<h2>الگوی MTR یا ۱۲۳</h2>
<p>
  با بررسی نقاط ۲ و ۳ و شکست آن می‌توان وارد شد (سیگنال‌بار + کی‌بار).
  نقاط ۳ در منطق سبحان صمدی، نقاط برگشتی مهم‌اند.
  در ستاپ MTR تا وقتی آخرین کف/سقف نخورده، وارد نشوید.
</p>
<p>
  سایه، مثلث و الگوی MTR از نشانه‌های تضعیف روندند.
  ممکن است قیمت همان‌جا نریزد، اما ضعیف شده است.
</p>

""" + callout("info", "ℹ کانال و شکست",
"<p>کانال نزولی تمایل به شکست از پایین دارد؛ کانال صعودی از بالا. اکثر شکست‌های کانال با حدود ۵ کندل رخ می‌دهد. تلاش ناموفق برای شکست، به روند سرعت می‌دهد.</p>") + """

<h2>الگوی V</h2>
<ul>
  <li>مکرر در فاز تریدینگ رنج دیده می‌شود.</li>
  <li>طلا بسیار Vمحور است.</li>
  <li>هرجا چارت نامفهوم بود، به دنبال رسم V بگردید.</li>
</ul>

<div class="two-col">
  <div class="cheat-item">
    <h4>نقاط معامله در V</h4>
    <ul>
      <li>شروع و پایان الگو</li>
      <li>میانه (۵۰٪) الگو</li>
    </ul>
  </div>
  <div class="cheat-item">
    <h4>ترجیح ریسک</h4>
    <p>معامله روی نقاط منشأ ریسک بیشتری دارد. ترجیح: نقاط ۵۰٪ تا تکمیل V؛ وگرنه معامله نکنید.</p>
  </div>
</div>

<p>
  اگر قیمت ۵۰٪ روند را پس بگیرد و بالای آن نگه دارد، احتمال حرکت تا ۱۰۰٪ بالاست —
  هرچند ممکن است روی ناحیه BE واکنش نشان دهد و کامل نرود.
  وقتی قیمت طی چند کندل پرقدرت حرکت کند، احتمال تشکیل V بیشتر می‌شود.
</p>

""" + callout("warn", "⚠ پایان دو لگ",
"<p>وقتی دو لگ نزولی تکمیل شد، دیگر وارد فروش نشوید مگر نشانه تازه ببینید. داخل رنج یا V، احتمال برگشت بالاست.</p>") + """

<h2>دو لگ (2Leg)</h2>
<p>کاربرد اصلی: تارگت‌گذاری و بازگشت قیمت.</p>
<ol class="steps">
  <li>پایان 2Leg را شناسایی کنید.</li>
  <li>اگزاستینگ گپ را بررسی کنید.</li>
  <li>با تأیید بعد از اگزاستینگ گپ وارد شوید.</li>
</ol>
<p>
  اگر در شروع سشن شما، قیمت قبلاً 2Leg را کامل کرده، در جهت همان لگ‌ها وارد نشوید —
  مگر اصلاح کند و دوباره سطح را بشکند.
  افتادن 2Leg روی سقف/کف تریدینگ رنج، دیدگاه معاملاتی بسیار خوبی می‌سازد.
</p>

<h2>گپ‌ها</h2>
<table>
  <thead><tr><th>نوع</th><th>خوانش</th></tr></thead>
  <tbody>
    <tr><td>گپ بدون کندل</td><td>اسپایک بسیار قدرتمند</td></tr>
    <tr><td>رفتار عمومی گپ</td><td>تمایل به پر شدن، سپس ادامه روند</td></tr>
    <tr><td>گپ خستگی</td><td>بدنه بسیار قوی در انتهای روند؛ آخرین زور خریدار/فروشنده</td></tr>
  </tbody>
</table>
<p>
  اگر انتهای 2Leg کندل پرقدرت بیاید، تأیید گپ خستگی است.
  اگر قیمت فاصله زیادی تا RS مهم داشته باشد ولی با یک کندل خودش را برساند، احتمالاً خستگی است — صبر کنید واکنش را ببینید.
</p>

<h2>میکروکانال</h2>
<p>
  کندل‌های پشت‌سرهم بدون پولبک، معمولاً بین ۲ تا ۱۰ کندل.
  میکروکانال صعودی در روند نزولی همان فلگی است که با شکستش وارد می‌شوید.
</p>

""" + summary("جمع‌بندی فصل ۶", [
    "123 بدون زدن آخرین سطح، ورود نیست.",
    "V را در نامفهومی چارت فعالانه جستجو کنید.",
    "گپ خستگی یعنی صبر، نه تعقیب.",
], [
    "الگوی فعال روی چارت را نام بردم",
    "نقطه ورود الگو با RR قابل قبول است",
    "پایان لگ دوم را برای عدم ورود عجولانه چک کردم",
]) + """
</section>
""")

# CH 7
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۷",
    "مدیریت سرمایه و ریسک",
    "استراتژی بدون سقف ریسک، قمار است. اعداد این فصل را به پلن شخصی قفل کنید.",
    "۹",
    [
        "سقف ریسک معامله، روز و هفته را حفظ کنید",
        "تفاوت ریسک شناور و ریسک ثابت مبتدی را بدانید",
        "حداقل RR مناسب ابتدای مسیر را رعایت کنید",
    ],
))
html_parts.append("""
<div class="diagram avoid-break">
  <div class="diagram-title">سقف‌های پیشنهادی ریسک</div>
  <div class="cycle-grid">
    <div class="cycle-card"><h4>هر معامله</h4><p>حداکثر حدود ۱٪ در پلن ریل (جزوه: سقف ۱.۵٪ با منطق سقف ضرر روزانه)</p></div>
    <div class="cycle-card"><h4>روزانه</h4><p>اگر مجموع ضرر به ۳٪ رسید، توقف کامل معاملات</p></div>
    <div class="cycle-card"><h4>هفتگی / دراودان</h4><p>۵٪ ضرر هفتگی = یک هفته توقف؛ ۱۰٪ دراودان = توقف کار با ریل تا رفع اشکال</p></div>
  </div>
</div>

""" + callout("info", "ℹ منطق ۱.۵٪",
"<p>سبحان تا ۲٪ را مطرح می‌کند؛ اما اگر سقف ضرر روزانه ۳٪ است، ریسک تک‌معامله بهتر است از ۱.۵٪ بیشتر نشود تا جا برای اشتباه دوم بماند.</p>") + """

<p>
  در ابتدای کار، ریسک به ریوارد حداقل ۲ را هدف بگیرید.
  خلاف جهت روند: RR یک‌به‌یک.
  هم‌جهت روند: حداقل ۲.
</p>

<h2>ریسک شناور — فقط بعد از تسلط</h2>
<p>ریسک می‌تواند بر اساس استراتژی، نماد، خبر، یا سفر متفاوت باشد. معیار باید بک‌تست و روان خودتان باشد. برای اول کار پیشنهاد نمی‌شود؛ هرچه محدودتر باشید بهتر است.</p>

""" + callout("note", "◎ تقسیم حجم",
"<p>تقسیم حجم در دو نقطه ورود می‌تواند RR بهینه‌تر بسازد، ولی برای ابتدای مسیر توصیه نمی‌شود.</p>") + """

""" + summary("جمع‌بندی فصل ۷", [
    "اعداد ریسک را از قبل قفل کنید.",
    "RR کمتر از ۲ برای مبتدی سم است (مگر خلاف‌جهت کانال با ۱:۱).",
    "دراودان ۱۰٪ یعنی توقف ریل، نه انتقام.",
], [
    "سایز معامله بر اساس ۱٪ حساب شد",
    "به سقف روزانه نزدیک نیستم",
    "امروز ریسک شناور فعال نکرده‌ام",
]) + """
</section>
""")

# CH 8
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۸",
    "حد ضرر، بریک‌ایون و مدیریت پوزیشن",
    "فلسفه حد ضرر این است: اگر تاچ شد، سناریو Failed شده. پس باید جایی باشد که باطل شدن ایده را ثابت کند — نه جایی که نویز بازار شما را بیرون کند.",
    "۱۰",
    [
        "قواعد جای‌گذاری استاپ را اجرا کنید",
        "انواع بریک‌ایون را بشناسید",
        "خروج منطقی را به TP اجباری ترجیح دهید",
    ],
))
html_parts.append("""
<h2>قواعد حد ضرر</h2>
<ol class="steps">
  <li>قبل از ورود مشخص شود.</li>
  <li>نه خیلی دور، نه خیلی نزدیک.</li>
  <li>معمولاً پشت سیگنال‌بار.</li>
  <li>در کندل‌های بدنه بزرگ: کمی بیشتر از ۵۰٪ کندل.</li>
  <li>اگر سناریو عوض شد، دستی ببندید.</li>
</ol>

<table>
  <thead><tr><th>نوع ورود</th><th>جای استاپ</th></tr></thead>
  <tbody>
    <tr><td>داخل روند</td><td>پشت روند (آخرین سقف/کف)</td></tr>
    <tr><td>ورود با شکست</td><td>پشت کندل شکست</td></tr>
    <tr><td>الگوی کوچک</td><td>پشت الگو</td></tr>
    <tr><td>الگوی بزرگ</td><td>بیش از ۵۰٪ الگو (بر اساس RR)</td></tr>
    <tr><td>Double BO</td><td>پشت سطح شکست</td></tr>
  </tbody>
</table>

""" + callout("danger", "✕ بعد از ورود",
"<p>حد ضرر را بعد از معامله «یک تیک» جابه‌جا نکنید. این عادت دیر یا زود حساب را می‌سوزاند.</p>") + """

<h2>بریک‌ایون (BreakEven)</h2>
<p>انواع: بریک‌ایون روند، کانال، تریدینگ رنج، و سقف/کف روز. ناحیه BE را درست رسم کنید.</p>
<p>
  اگر قیمت از بریک‌ایون کلوز روز گذشته، قبل از باز شدن نیویورک فاصله داشته باشد، تمایل بازگشت به آن ناحیه بالاست.
</p>

<div class="quote">
  قرار نیست پیپ‌به‌پیپ مارکت را ترید کنید؛ ولی باید پیپ‌به‌پیپ قیمت را درک کنید.
</div>

<h2>خروج هوشمند</h2>
<ul>
  <li>بازار کاری به TP2 شما ندارد. جایی که باید خارج شوید، سود را بردارید.</li>
  <li>نواحی تصمیم‌گیری مهم‌اند؛ اگر TP2 روی ناحیه خیلی مهم است، قبلش خارج شوید.</li>
  <li>اگر ورود به‌خاطر نقدینگی بهینه نشد و حد سودِ نقطه بهینه لمس شد — مخصوصاً با RS مهم جلوی قیمت — خارج شوید.</li>
</ul>

""" + callout("tip", "✓ سایه بعد از شکست",
"<p>سایه‌ای که روی سطح پس از شکست می‌زند، می‌تواند بگوید FBO ترید نکنید؛ همان سایه پولبک ادامه اسپایک است.</p>") + """

""" + summary("جمع‌بندی فصل ۸", [
    "استاپ = باطل‌کننده سناریو.",
    "جابه‌جایی استاپ بعد از ورود ممنوع.",
    "TP مقدس نیست؛ ناحیه تصمیم مقدس است.",
], [
    "استاپ قبل از کلیک مشخص شد",
    "ناحیه BE مرتبط رسم شد",
    "شرط خروج زودهنگام را از قبل نوشتم",
]) + """
</section>
""")

# CH 9
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۰۹",
    "چگونه استراتژی بنویسیم",
    "استراتژی مجموعه‌ای از قوانین مشخص برای رنج، اسپایک و کانال است: ورود، مدیریت، خروج، ریسک و فیلتر. بدون محدودیت، سود پایدار نیست.",
    "۱۰",
    [
        "اجزای اجباری یک استراتژی را فهرست کنید",
        "نقش فیلتر معاملاتی را درک کنید",
        "نمونه ستاپ‌های آماده را ببینید",
    ],
))
html_parts.append("""
""" + callout("key", "◆ تعریف",
"<p>استراتژی یعنی چارچوب ازپیش‌تصمیم‌گرفته. در لایو جای فکر کردن نیست؛ فقط اجرا. فکر را در گذشته بازار و بک‌تست انجام داده‌اید.</p>") + """

<p>
  استراتژی هیچ‌کس را ۱۰۰٪ کپی نکنید؛ الگو و دیدگاه بگیرید.
  استراتژی اعتمادبه‌نفس می‌آورد؛ آن‌قدر که ضرر لایو دیگر هویت شما را تهدید نمی‌کند.
</p>

<h2>چک‌لیست ساخت استراتژی</h2>
<table>
  <thead><tr><th>جزء</th><th>باید مشخص باشد؟</th></tr></thead>
  <tbody>
    <tr><td>نقطه ورود و نحوه ورود</td><td>بله</td></tr>
    <tr><td>حد ضرر و نقطه خروج</td><td>بله</td></tr>
    <tr><td>مدیریت معامله و ریسک‌فری</td><td>بله</td></tr>
    <tr><td>فیلتر معاملاتی</td><td>بله — به شدت مهم</td></tr>
    <tr><td>مدیریت سرمایه، تایم‌فریم، سیکل‌ها</td><td>بله</td></tr>
  </tbody>
</table>

<p>
  ساخت استراتژی جدی حداقل حدود یک ماه، روزی ۳–۴ ساعت زمان می‌برد.
  تمرین پیشنهادی: یک سال، یک نماد را کندل‌به‌کندل بررسی کنید؛ نقاط ورود بکشید؛ چرایی بازار را بپرسید؛ سشن‌ها و سیکل‌ها را رسم کنید.
  حداقل ۱۰ استراتژی مبتنی بر نقاط ورود بنویسید.
</p>

<h2>نمونه ستاپ‌ها برای بررسی</h2>
<table>
  <thead><tr><th>ستاپ</th><th>استاپ پیشنهادی</th></tr></thead>
  <tbody>
    <tr><td>شکست سقف/کف روز</td><td>پشت کندل و پشت سطح شکسته‌شده</td></tr>
    <tr><td>پین‌بار خلاف‌جهت در سقف/کف TR</td><td>پشت پین‌بار</td></tr>
    <tr><td>فشردگی در سقف/کف TR + شکست</td><td>پشت فشردگی یا ۵۰٪ آن</td></tr>
    <tr><td>انتهای لگ دوم در سقف/کف TR (خلاف جهت)</td><td>منطقی پشت ساختار لگ</td></tr>
    <tr><td>بازگشت قیمت به BE در جهت روند اصلی</td><td>پشت اصلاح قبلی</td></tr>
    <tr><td>۱۲۳ در برخورد سوم + پین‌بار در سقف/کف TR</td><td>پشت پین‌بار</td></tr>
    <tr><td>زده شدن آخرین سقف/کف کانال در روند</td><td>پشت سطح و کندل شکست</td></tr>
    <tr><td>شکست ۱۲۳ در جهت ترند اصلی</td><td>پشت ۱۲۳ و کندل شکست</td></tr>
    <tr><td>پین‌بار روی مووینگ در جهت ترند</td><td>پشت پین‌بار</td></tr>
    <tr><td>شکست الگو در جهت روند</td><td>۵۰٪ الگو یا پشت الگو</td></tr>
  </tbody>
</table>

""" + summary("جمع‌بندی فصل ۹", [
    "استراتژی = محدودیت هوشمند.",
    "فیلتر، استراتژی را بهینه می‌کند.",
    "در لایو فقط اجرا؛ تفکر برای بعد از سشن.",
], [
    "حداقل یک ستاپ مکتوب با ورود/استاپ/خروج دارم",
    "فیلتر ستاپ مشخص است",
    "امروز فقط ستاپ‌های داخل پلن را می‌گیرم",
]) + """
</section>
""")

# CH 10
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۱۰",
    "قوانین عملیاتی و نکات حیاتی لایو",
    "این فصل ترجمهٔ «نکات مهم» به پروتکل اجرایی است. نقض این‌ها معمولاً قبل از نقض استراتژی رخ می‌دهد.",
    "۱۱",
    [
        "آمادگی ذهنی پیش از سشن را جدی بگیرید",
        "قواعد سشن آمریکا و فیلتر ثانیه را بدانید",
        "رفتار بعد از ضرر اول را کنترل کنید",
    ],
))
html_parts.append("""
<h2>پروتکل قبل از باز شدن بازار</h2>
<ol class="steps">
  <li>حداقل ۲۰ دقیقه زودتر پای چارت باشید.</li>
  <li>کلوز جمعه / کلوز روز قبل را مشخص کنید.</li>
  <li>ساختار را نام ببرید: اسپایک، کانال یا رنج.</li>
  <li>اگر رنج است، حدود ۵٪، سقف/کف و سناریوها را بنویسید.</li>
  <li>چارت را روی منبع کامل (مثلاً TradingView / WM) چک کنید؛ برخی بروکرها کل چارت را ندارند.</li>
</ol>

""" + callout("warn", "⚠ فیلتر ثانیه NYSE",
"<p>فیلتر ثانیه پس از باز شدن بورس آمریکا بسیار مهم است. در ثانیه‌های اول (گاهی حدود ۳۰ ثانیه) عجله نکنید. همچنین ببینید قیمت رأس ساعت از کجا حرکت را شروع می‌کند؛ اگر از سطح شکست خیلی دور باشد، BO نگیرید و برای FBO فیلتر Double را رعایت کنید.</p>") + """

<h2>قوانین رفتاری</h2>
<ul>
  <li>اگر خواب‌آلود یا بدون آمادگی ذهنی هستید، اول آماده شوید؛ بعد چارت.</li>
  <li>خسته یا بی‌حوصله؟ چارت را ببندید. ضرر نکردن همان سود است.</li>
  <li>اضافه‌کاری مطلقاً ممنوع: ۲ پیپ بیشتر، ریسک‌فری بی‌مورد، خروج سلیقه‌ای روی TP1 خارج از پلن.</li>
  <li>معامله دوم بعد از ضرر اول «حق شما» برای جبران نیست؛ باید از نو با ریت بالا بررسی شود.</li>
  <li>معامله سوم فقط با ریت بالا.</li>
  <li>اگر در رنج/RV دو ضرر پشت‌سرهم خوردید، پوزیشن سوم ممنوع.</li>
</ul>

<div class="quote">
  من امروز صفر تا صد طبق پلن معاملاتی خودم عمل می‌کنم؛ مهم نیست انتهای روز سود شود یا ضرر.
</div>

<h2>ذهن مثل تنیس</h2>
<p>
  بدون تمرین ذهنی و تمرکز در لحظه، موفق نمی‌شوید.
  چند ساعت قبل ترید، ویدیوهای گذشته بازار را ببینید؛ هم انگیزه، هم اعتمادبه‌نفس.
  مانیتور را نزدیک کنید؛ کندل‌ها را دقیق ببینید؛ سریع ولی طبق پلن عمل کنید.
</p>

""" + callout("info", "ℹ چند قانون ساختاری لایو",
"""<ul>
<li>روند قبلی هرقدر طولانی باشد، با شکست آخرین سقف/کف تمام شده است.</li>
<li>تایم‌فریم بالاتر را به ۵ دقیقه تحمیل نکنید: یک خط دو روزه را منتظر واکنش دقیقه‌ای نگذارید.</li>
<li>یک روز به‌تنهایی پترن ۵ دقیقه‌ای نیست؛ تعداد کندل باید متناسب تایم‌فریم باشد.</li>
<li>داوجونز به سشن‌ها حساس‌تر است؛ طلا و بسیاری جفت‌ارزها مثل آن نیستند.</li>
</ul>""") + """

""" + summary("جمع‌بندی فصل ۱۰", [
    "آمادگی ذهنی بخشی از سیستم است.",
    "ضرر اول مجوز انتقام نیست.",
    "اضافه‌کاری = نقض پلن.",
], [
    "۲۰ دقیقه پیش‌تحلیل انجام شد",
    "جمله پلن را با صدای بلند مرور کردم",
    "منبع چارت کامل چک شد",
]) + """
</section>
""")

# CH 11
html_parts.append('<section class="page-break">')
html_parts.append(chapter_open(
    "۱۱",
    "پلن معاملاتی حساب واقعی (New SSNT)",
    "این فصل متن تعهد شماست. اگر با پلن مخالفید، قبل از سشن اصلاحش کنید — نه وسط ضرر.",
    "۸",
    [
        "اهداف سود و سقف ضرر را حفظ کنید",
        "قوانین توقف روزانه/هفتگی را اجرا کنید",
        "نقاط ضعف شخصی را آگاهانه مهار کنید",
    ],
))
html_parts.append("""
<h2>اهداف سود</h2>
<table>
  <thead><tr><th>بازه</th><th>هدف</th><th>قانون توقف</th></tr></thead>
  <tbody>
    <tr><td>روزانه</td><td>۲٪</td><td>رسیدن به ۲٪ = پایان معاملات روز</td></tr>
    <tr><td>هفتگی</td><td>۵٪</td><td>تاچ هدف = توقف؛ ریسک مجدد فقط با اجازه روان و آگاهی</td></tr>
    <tr><td>ماهانه</td><td>۱۷٪</td><td>تاچ هدف = توقف؛ ریسک مجدد محدود و آگاهانه</td></tr>
  </tbody>
</table>

<h3>قوانین توالی معاملات روزانه</h3>
<ul>
  <li>اگر معامله اول ضرر و دوم سود شد ← دیگر اجازه معامله ندارید.</li>
  <li>اگر اول و دوم ضرر شد ← فقط در یک موقعیت عالی می‌توانید سومی را بگیرید؛ بعد از آن، چه سود چه ضرر، پایان روز.</li>
</ul>

""" + callout("key", "◆ هدف اول",
"<p>حفظ سرمایه و کنترل دراودان. بقیه اهداف فرعی‌اند.</p>") + """

<h2>سقف ضرر</h2>
<ul>
  <li>ریسک هر معامله: ۱٪</li>
  <li>ضرر روزانه ۳٪ ← توقف</li>
  <li>ضرر هفتگی ۵٪ ← یک هفته کنار گذاشتن و رفع اشکال</li>
  <li>دراودان ۱۰٪ ← توقف ریل تا رفع اشکال</li>
</ul>

<h2>ممنوعیت‌های زمانی</h2>
<ul>
  <li>روزهای US Bank Holiday ترید نکنید.</li>
  <li>۱۵ دقیقه قبل خبر و باز شدن بورس آمریکا: ترید ممنوع؛ اگر پوزیشن باز دارید ببندید.</li>
</ul>

<h2>هسته سیستم New SSNT</h2>
<p>
  یا شکست (BO) یا شکست جعلی (FBO).
  قبل از باز شدن NYSE دیدگاه باید کاملاً شفاف باشد.
  در انتهای روند، روی Channel Breakout زیادی حساب نکنید و دو طرفه فکر نکنید.
  وقتی بازار بیش از حد هیجانی است و یک تیک از کف تا سقف رنج می‌رود، صبر کنید برای فرصت BE؛ درگیر ترید بی‌خودی نشوید.
</p>

<h2>خودآگاهی: نقاط قوت و ضعف</h2>
<div class="two-col">
  <div class="cheat-item">
    <h4>نقاط قوت هدف</h4>
    <ul>
      <li>صبور و متعهد بودن؛ اگر ستاپ نیست، ترید نیست</li>
      <li>رفتار منطقی و غیرهیجانی هنگام معامله</li>
    </ul>
  </div>
  <div class="cheat-item">
    <h4>ریسک‌های شخصی برای مراقبت</h4>
    <ul>
      <li>کاهش تمرکز و پرش ذهن</li>
      <li>جابه‌جایی مکرر TP/SL وسط پوزیشن</li>
      <li>کاهش نظم پس از دوره سود</li>
      <li>طمع و خارج نشدن در TP2</li>
      <li>افزایش ریسک پس از سود برای «بیشتر»</li>
    </ul>
  </div>
</div>

""" + callout("danger", "✕ تعهد",
"<p>تعهد این پلن بدون چون‌وچرا است. نقض پلن در لایو، حتی با سود، شکست فرآیندی است.</p>") + """

""" + summary("جمع‌بندی فصل ۱۱", [
    "۲٪ روز / ۵٪ هفته / ۱۷٪ ماه — سقف رضایت.",
    "۱٪ ریسک، ۳٪ توقف روز، ۵٪ توقف هفته، ۱۰٪ توقف ریل.",
    "نقاط ضعف شخصی بخشی از پلن‌اند، نه حاشیه.",
], [
    "هدف روز را قبل سشن نوشتم",
    "وضعیت دراودان را می‌دانم",
    "ممنوعیت خبر/هالیدی را چک کردم",
]) + """
</section>
""")

# CH 12 Cheat sheet
html_parts.append("""
<section class="page-break">
  <div class="chapter-opener">
    <div class="chapter-label">فصل ۱۲</div>
    <h1>چیـت‌شیت یک‌صفحه‌ای</h1>
    <p class="chapter-lead">این صفحه را خلاصه عملیاتی کنار مانیتور نگه دارید.</p>
  </div>

  <div class="cheat">
    <div class="cheat-item">
      <h4>۱) قبل از سشن</h4>
      <ul>
        <li>کلوز قبلی / سقف و کف روز</li>
        <li>نام‌گذاری ساختار</li>
        <li>سناریوی BO و FBO</li>
        <li>آمادگی ذهنی</li>
      </ul>
    </div>
    <div class="cheat-item">
      <h4>۲) اجازه ورود</h4>
      <ul>
        <li>ستاپ داخل پلن؟</li>
        <li>فیلتر ثانیه / Double؟</li>
        <li>RR مناسب؟</li>
        <li>وسط رنج نیستم؟</li>
      </ul>
    </div>
    <div class="cheat-item">
      <h4>۳) ریسک</h4>
      <ul>
        <li>۱٪ هر معامله</li>
        <li>سقف ۳٪ روز</li>
        <li>استاپ از پیش</li>
        <li>بدون جابه‌جایی استاپ</li>
      </ul>
    </div>
    <div class="cheat-item">
      <h4>۴) توقف‌ها</h4>
      <ul>
        <li>۲٪ سود روز → تمام</li>
        <li>ضرر۱ + سود۲ → تمام</li>
        <li>دو ضرر BO/FBO در رنج → تمام</li>
        <li>دو ضرر در RV → بدون معامله۳</li>
      </ul>
    </div>
    <div class="cheat-item">
      <h4>۵) جهت‌گیری</h4>
      <ul>
        <li>اسپایک: یک‌طرفه</li>
        <li>کانال ضعیف/رنج: دو طرفه با قاعده</li>
        <li>خلاف روند: RR ۱:۱</li>
        <li>هم‌جهت: RR ≥ ۲</li>
      </ul>
    </div>
    <div class="cheat-item">
      <h4>۶) یادآوری</h4>
      <ul>
        <li>بقا اول</li>
        <li>چرا قیمت اینجاست؟</li>
        <li>بيننده بودن بهتر از ترید بد</li>
        <li>اجرای پلن = موفقیت روز</li>
      </ul>
    </div>
  </div>

  <div class="callout key" style="margin-top:6mm">
    <div class="label">◆ جمله روز</div>
    <p>مهم نیست امروز سود کنم یا ضرر؛ مهم این است که صفر تا صد طبق سیستم عمل کنم.</p>
  </div>
</section>
""")

# CH 13 Glossary + Final
html_parts.append("""
<section class="page-break">
  <div class="chapter-opener">
    <div class="chapter-label">فصل ۱۳</div>
    <h1>واژه‌نامه و جمع‌بندی نهایی</h1>
    <p class="chapter-lead">زبان مشترک باعث می‌شود در لایو کمتر دچار ابهام شوید.</p>
  </div>

  <dl class="glossary">
    <dt>Spike / اسپایک</dt>
    <dd>حرکت پرشتاب و اغلب بدون پولبک؛ معادل عملی Breakout قوی.</dd>
    <dt>Channel / کانال</dt>
    <dd>فاز پس از اصلاح اول اسپایک؛ قیمت بین دو خط مایل یا افقی نوسان می‌کند.</dd>
    <dt>Trading Range (TR)</dt>
    <dd>نوسان بین سقف و کف مشخص؛ چرخه پرتکرار و پرریسک.</dd>
    <dt>BO / Breakout</dt>
    <dd>شکست معتبر سطح.</dd>
    <dt>FBO / Failed Breakout</dt>
    <dd>شکست جعلی؛ عمدتاً در رنج معنا دارد.</dd>
    <dt>RS</dt>
    <dd>ناحیه حمایت/مقاومت مهم.</dd>
    <dt>Signal Bar / Key Bar</dt>
    <dd>کندل سیگنال و کندل کلیدی تأیید ورود.</dd>
    <dt>MTR / 123</dt>
    <dd>الگوی برگشتی چندمرحله‌ای؛ ورود پس از شکست و تأیید.</dd>
    <dt>2Leg</dt>
    <dd>حرکت دو مرحله‌ای برای تارگت یا بازگشت.</dd>
    <dt>BE / BreakEven Zone</dt>
    <dd>ناحیه تعادل/بازگشت مهم قیمت نسبت به کلوز یا ساختار.</dd>
    <dt>Double BO</dt>
    <dd>فیلتر شکست دوباره پس از اصلاح اولیه.</dd>
    <dt>Micro Channel</dt>
    <dd>دنباله کوتاه کندل‌های بدون پولبک.</dd>
    <dt>Exhaustion Gap</dt>
    <dd>گپ/کندل خستگی در انتهای حرکت.</dd>
  </dl>

  <hr class="sep">

  <h2>جمع‌بندی نهایی</h2>
  <p>
    این هندبوک سه منبع پراکنده را به یک سیستم واحد تبدیل کرد:
    <strong>خواندن ساختار</strong>، <strong>اجرای ستاپ</strong>، و <strong>بقای حساب</strong>.
  </p>
  <p>
    اگر فقط یک چیز از تمام صفحات بماند، این باشد:
    در بازاری که ۸۰٪ وقت رنج است و بهترین استراتژی‌ها هم کامل نیستند،
    برنده کسی است که پلن را اجرا می‌کند — نه کسی که هر کندل را تعقیب می‌کند.
  </p>

  <div class="summary-card avoid-break">
    <h3>سه اصل پایانی</h3>
    <ol class="steps">
      <li>اول ساختار، بعد سیگنال.</li>
      <li>اول استاپ، بعد ورود.</li>
      <li>اول بقا، بعد بازدهی.</li>
    </ol>
  </div>

  <h2>منابع</h2>
  <ul>
    <li>جزوه سبحان صمدی</li>
    <li>نکات مهم SSNT</li>
    <li>Trading Plan — Real Account (New SSNT)</li>
  </ul>

  <div class="footer-note">
    SSNT Price Action Handbook · نسخه ۱.۰ · بازنویسی و طراحی تحریریه‌ای برای استفاده آموزشی شخصی
  </div>
</section>
""")

doc = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SSNT Price Action Handbook</title>
<style>{CSS}</style>
</head>
<body>
{''.join(html_parts)}
</body>
</html>
"""

OUT.write_text(doc, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
