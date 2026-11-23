# 願望理財屋 · AImoneygame

小學生生活理財投資教育遊戲。兩關互動、巡夜者追逐、90 秒解題壓力、答對取得 KEY、各關得分與最後進步紀錄。

## 操作

WASD／方向鍵移動、E 互動／提交、Ctrl 蹲下、空白鍵跳躍、Esc 暫停、R 回到安全點、M 靜音。觸控裝置提供方向與互動按鈕。暫停會停止追逐與倒數。

1. 金幣採買：100 枚金幣，買午餐與車票，至少留下 20 枚儲蓄。
2. 願望種子：至少 40 枚備用金，兩個計畫各 10–40 枚，觀察同一配置的晴天與雨天結果。

兩關通過才開出口。錯誤答案不會拿到 KEY。每關基礎分 100；再次提交每次扣 4 分（上限 20），提示每次扣 3 分（上限 15）。速度不計分。進步顯示首次與最後作答達成度，不代表經實驗驗證的學習成效。完整課堂說明見 teacher.html。

## 美術與實作

目前發布版為 **2.5D**：依使用者提供參考圖，以內建 imagegen 製作電影感背景與透明角色圖，再由 Canvas 即時繪製角色移動、追逐、浮塵、光效與鑰匙。不是可自由轉動鏡頭的完整即時 3D；角色使用六格逐格走路動畫，按實際位移播放；仍不是骨架 3D 動畫。推車與木箱有實體碰撞，W／S 可繞行，空白鍵可跳上或跳過矮箱；重力、落地與防止空中連跳均有判定。保留參考圖的冷暖光、舊木頭、斑駁牆面與人物服裝，但不宣稱像素完全一致。Blender／Godot 原型與模型保留在本機專案，沒有放進這個精簡網頁發布包。

Three.js 0.182.0 僅用於位置／狀態數學，MIT 授權見 THREE-LICENSE.txt（原始 web 目錄為 vendor/THREE-LICENSE.txt）。環境音為本專案生成。沒有外部 CDN、登入、追蹤器或後端。學習紀錄只存在瀏覽器 localStorage，可用重新開始清除。

## GitHub Pages

儲存庫： https://github.com/profchwu/AImoneygame

發布檔案位於儲存庫根目錄。Settings → Pages → Deploy from a branch → main → /(root) → Save。不需要 npm 安裝或建置，也不需要 WebAssembly／跨來源隔離標頭。所有網址使用相對路徑，可部署於 /AImoneygame/ 子路徑。

本機完整專案可執行 node web/serve.mjs；測試 node --test web/tests/core.test.mjs；tools/package_web.py 會建立只含發布所需檔案的 builds/github-pages 與 ZIP。此發布儲存庫可用任意本機 HTTP 靜態伺服器預覽。
