import pathlib, re

# --- 1) Fix App.jsx: showDailyWheel placement ---
app_path = pathlib.Path(r"D:\Download\GameQJ\src\App.jsx")
app = app_path.read_text(encoding="utf-8")
print("App has showDailyWheel:", "showDailyWheel" in app)
print("App has canSpinWheel button:", "canSpinWheel" in app)
print("App snippet around header:")
idx = app.find("🎡")
print(app[max(0,idx-500):idx+800] if idx!=-1 else "NOT FOUND - header button not found")
print("--- modal check ---")
print("DailyWheelModal" in app)

# --- 2) GamesHub.jsx ---
gh_path = pathlib.Path(r"D:\Download\GameQJ\src\pages\GamesHub.jsx")
gh = gh_path.read_text(encoding="utf-8")
print("\n GamesHub has DailyWheelCard:", "DailyWheelCard" in gh)
print("GamesHub length:", len(gh))
print(gh[12000:16000] if len(gh)>12000 else gh[-3000:])

# --- 3) DailyWheel.jsx ---
dw = pathlib.Path(r"D:\Download\GameQJ\src\components\DailyWheel.jsx").read_text(encoding="utf-8")
print("\n DailyWheel.jsx length:", len(dw))
# check for syntax issues: count braces/parens
print("DailyWheel has WheelSVG:", "WheelSVG" in dw)
print("DailyWheel has DailyWheelModal:", "DailyWheelModal" in dw)
print("DailyWheel has DailyWheelCard:", "DailyWheelCard" in dw)
