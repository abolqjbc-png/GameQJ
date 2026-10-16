import pathlib

def show(path, lines=120):
    p = pathlib.Path(path)
    t = p.read_text(encoding='utf-8')
    print(f"\n{'='*70}\n{path}  ({len(t)} chars, {t.count(chr(10))+1} lines)\n{'='*70}")
    for i, line in enumerate(t.splitlines()[:lines], 1):
        print(f"{i:3d}│ {line}")
    if t.count(chr(10))+1 > lines:
        print(f"... ({t.count(chr(10))+1 - lines} more lines)")

show(r"D:\Download\GameQJ\src\App.jsx", 300)
show(r"D:\Download\GameQJ\src\pages\GamesHub.jsx", 500)
show(r"D:\Download\GameQJ\src\core\dailyWheel.js", 200)
show(r"D:\Download\GameQJ\src\components\DailyWheel.jsx", 300)
