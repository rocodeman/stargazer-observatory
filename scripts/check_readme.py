from pathlib import Path
import re
import sys
from markdown import markdown

root = Path(__file__).resolve().parents[1]
readme = root / "README.md"
text = readme.read_text(encoding="utf-8")
errors = []

# Fenced code blocks must be balanced.
if text.count("```") % 2:
    errors.append("代码围栏数量为奇数，存在未闭合代码块")

# Basic bracket/parenthesis balance for Markdown links and images.
for label, pattern, open_char, close_char in [
    ("链接文本", r"\[[^\n\]]*\]", "[", "]"),
    ("链接地址", r"\([^\n\)]*\)", "(", ")"),
]:
    if text.count(open_char) != text.count(close_char):
        errors.append(f"{label}括号数量不一致：{text.count(open_char)} vs {text.count(close_char)}")

links = re.findall(r"!?(?:\[([^\]]*)\])\(([^)]+)\)", text)
local_targets = []
for label, target in links:
    if target.startswith(("http://", "https://", "mailto:", "#")):
        continue
    local_targets.append((label, target))
    target_path = (root / target).resolve()
    if not target_path.exists():
        errors.append(f"本地引用不存在：{target}")

# Parse to HTML and ensure expected structural elements are present.
html = markdown(text, extensions=["tables", "fenced_code"])
for marker, needle in [
    ("标题", "<h1>"),
    ("表格", "<table>"),
    ("截图", "<img"),
    ("代码块", "<pre><code"),
    ("Manus 官方链接", "https://manus.im/"),
]:
    if needle not in html:
        errors.append(f"渲染结果缺少{marker}：{needle}")

print(f"README 字符数：{len(text)}")
print(f"Markdown 链接/图片引用数：{len(links)}")
print(f"本地引用数：{len(local_targets)}")
print(f"渲染 HTML 字符数：{len(html)}")
if errors:
    print("检查失败：")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)
print("检查通过：Markdown 结构、链接闭合、本地路径和基础渲染元素均正常。")
