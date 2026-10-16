// ساخت بسته‌ی آماده (dist/gameqj.bundle.js) از روی فایل‌های src
// پیش‌نیاز: npm install typescript     اجرا: node build.js
const fs = require('fs'), path = require('path'), ts = require('typescript');
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/modules.json'), 'utf8'));
const opts = { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } };
const parts = list.map(f => {
    const code = fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
    const js = f.endsWith('.jsx') ? ts.transpileModule(code, opts).outputText : code;
    return '/* ===== ' + f + ' ===== */\n' + js;
});
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/gameqj.bundle.js'),
    '/* خودکار ساخته شده توسط build.js — مستقیم ویرایش نشود */\n' + parts.join('\n'));
const webRoot = path.join(__dirname, 'www');
fs.mkdirSync(path.join(webRoot, 'dist'), { recursive: true });
fs.mkdirSync(path.join(webRoot, 'css'), { recursive: true });
fs.mkdirSync(path.join(webRoot, 'config'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'gameqj.html'), path.join(webRoot, 'index.html'));
fs.copyFileSync(path.join(__dirname, 'dist/gameqj.bundle.js'), path.join(webRoot, 'dist/gameqj.bundle.js'));
for (const file of ['styles.css', 'styles-frames.css']) {
    fs.copyFileSync(path.join(__dirname, 'css', file), path.join(webRoot, 'css', file));
}
fs.copyFileSync(path.join(__dirname, 'config/tailwind.config.js'), path.join(webRoot, 'config/tailwind.config.js'));
console.log('dist/gameqj.bundle.js ساخته شد (' + list.length + ' ماژول)');
console.log('فایل‌های وب برای Capacitor در www/ آماده شدند');
