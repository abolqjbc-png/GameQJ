import pathlib
for p in [r"D:\Download\GameQJ\src\App.jsx", r"D:\Download\GameQJ\src\pages\GamesHub.jsx", r"D:\Download\GameQJ\src\core\dailyWheel.js", r"D:\Download\GameQJ\src\components\DailyWheel.jsx"]:
    txt = pathlib.Path(p).read_text(encoding="utf-8")
    print("="*60, p)
    print(txt[:3000])
    print()
