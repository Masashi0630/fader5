# 画像の元データ

`public/og.png`(OGP 1200×630)と `public/apple-touch-icon.png`(180×180)はここの HTML を Chrome で書き出したもの。
絵を変えたら、プロジェクトのルートで次を実行して PNG を作り直す(macOS の Chrome の場合)。

```bash
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CH" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot="$PWD/public/og.png" "file://$PWD/scripts/art/og.html"
"$CH" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=180,180 --screenshot="$PWD/public/apple-touch-icon.png" "file://$PWD/scripts/art/icon.html"
```

`public/favicon.svg` は手書きの SVG。アイコンの PNG はこれを元にしている。
