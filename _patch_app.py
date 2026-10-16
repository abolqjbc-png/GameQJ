import pathlib
p = pathlib.Path(r"D:\Download\GameQJ\src\App.jsx")
t = p.read_text(encoding="utf-8")
print(t[:4000])
