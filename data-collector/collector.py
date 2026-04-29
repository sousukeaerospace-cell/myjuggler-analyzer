"""
P'sCUBE データ収集スクリプト - マイジャグラーV (前橋ガーデン店)

使い方:
  1. pip install -r requirements.txt && playwright install chromium
  2. python collector.py --login   # 初回: ブラウザでhCaptchaを手動突破→Ctrl+C
  3. python collector.py           # 通常実行 (セッション済みなら自動通過)
  4. python collector.py --dump    # DOMダンプ: セレクタ調整に使う
  5. python collector.py --ocr     # OCRモード: スクリーンショットから数値抽出

OCRモードについて:
  - easyocr を使用して日本語・数字をスクリーンショットから読み取る
  - DOMセレクタ不要なためサイト改修に強い
  - 初回起動時にモデルダウンロード (約200MB)
"""

import asyncio
import json
import argparse
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from io import BytesIO

from playwright.async_api import async_playwright, Page
from PIL import Image
import numpy as np

# ─── 設定 ──────────────────────────────────────────────────────────────────────
USER_DATA_DIR = str(Path(__file__).parent / "browser_data")
OUTPUT_FILE   = str(Path(__file__).parent / "maebashi_garden_data.json")
SCREENSHOT_DIR = Path(__file__).parent / "screenshots"

# 台一覧ページURL (マイジャグラーV のみ表示)
LIST_URL = (
    "https://www.pscube.jp/h/a718706/cgi-bin/nc-v05-003.php"
    "?cd_ps=2&bai=21.7"
    "&nmk_kisyu=%EF%BE%8F%EF%BD%B2%EF%BD%BC%EF%BE%9E%EF%BD%AC%EF%BD%B8%EF%BE%9E%EF%BE%97%EF%BD%B0V"
)
BASE_URL     = "https://www.pscube.jp"
TARGET_MODEL = "マイジャグラーV"

# 台番号指定 (空 = 全台)
MACHINE_NUMBERS: list[str] = []


# ─── easyocr 遅延ロード ──────────────────────────────────────────────────────
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            print("  [OCR] easyocrリーダーを初期化中 (初回のみ数分かかります)...")
            _ocr_reader = easyocr.Reader(["ja", "en"], gpu=False)
            print("  [OCR] 初期化完了")
        except ImportError:
            print("  [WARN] easyocr未インストール。pip install easyocr を実行してください。")
    return _ocr_reader


# ─── OCRでスクリーンショットからデータ抽出 ──────────────────────────────────
def ocr_extract_numbers(screenshot_bytes: bytes, machine_number: str, day_offset: int = 1) -> dict:
    """
    スクリーンショットから台のBIG/REG/ゲーム数を抽出する。

    P'sCUBEの画面レイアウト (ユーザー確認済み):
      列: 本日(0) | 1日前(1) | 2日前(2) | 3日前(3)
      行: BIG | REG | AT/ART | BIG確率 | REG確率 | 合成確率 | 累計ゲーム | 最終ゲーム | 最大放出数

    day_offset=1 が「1日前」=前日データ
    """
    reader = get_ocr_reader()
    if reader is None:
        return {"big": None, "reg": None, "games": None}

    img = Image.open(BytesIO(screenshot_bytes))
    img_array = np.array(img)

    # OCR実行
    results = reader.readtext(img_array, detail=1, paragraph=False)

    # テキストと座標を整理
    texts = []
    for (bbox, text, conf) in results:
        if conf < 0.3:
            continue
        # バウンディングボックスの中心座標
        cx = (bbox[0][0] + bbox[2][0]) / 2
        cy = (bbox[0][1] + bbox[2][1]) / 2
        texts.append({"text": text.strip(), "x": cx, "y": cy, "conf": conf})

    # ── 台番号の行を特定 ─────────────────────────────────────────
    machine_row_y = None
    for t in texts:
        if machine_number in t["text"] or t["text"] == machine_number:
            machine_row_y = t["y"]
            break

    # ── BIG/REGラベルのX座標を取得 ──────────────────────────────
    big_label_y = None
    reg_label_y = None
    games_label_y = None
    for t in texts:
        if t["text"] in ["BIG", "Ｂ１Ｇ"]:
            big_label_y = t["y"]
        elif t["text"] in ["REG", "ＲＥＧ"]:
            reg_label_y = t["y"]
        elif "累計" in t["text"] or "ゲーム" in t["text"]:
            games_label_y = t["y"]

    # ── 列のX座標を推定 ─────────────────────────────────────────
    # 「本日」「1日前」「2日前」「3日前」ラベルのX座標でカラム位置を決める
    col_xs = {}
    for t in texts:
        if "本日" in t["text"]:
            col_xs[0] = t["x"]
        elif "1日前" in t["text"] or "１日前" in t["text"]:
            col_xs[1] = t["x"]
        elif "2日前" in t["text"] or "２日前" in t["text"]:
            col_xs[2] = t["x"]
        elif "3日前" in t["text"] or "３日前" in t["text"]:
            col_xs[3] = t["x"]

    target_x = col_xs.get(day_offset)

    def find_num_near(label_y, target_x, tolerance_y=20, tolerance_x=50):
        """label_yの行でtarget_x付近の数値を探す"""
        if label_y is None:
            return None
        candidates = []
        for t in texts:
            if abs(t["y"] - label_y) < tolerance_y:
                num_text = re.sub(r"[^\d]", "", t["text"])
                if num_text:
                    dist = abs(t["x"] - (target_x or 0))
                    candidates.append((dist, int(num_text)))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]

    # ── フォールバック: 全テキストを順序でパース ────────────────
    def fallback_parse():
        # 全数値を行ごとに収集してパターンマッチ
        all_nums = [int(re.sub(r"[^\d]", "", t["text"])) for t in texts
                    if re.sub(r"[^\d]", "", t["text"]) and 0 < int(re.sub(r"[^\d]", "", t["text"])) < 100000]
        # BIG, REG は通常 0〜50 程度, ゲーム数は 100〜9999
        bigs  = [n for n in all_nums if n < 50]
        games = [n for n in all_nums if 100 <= n <= 9999]
        return {
            "big":   bigs[day_offset]  if len(bigs)  > day_offset else None,
            "reg":   bigs[day_offset + len(bigs)//2] if len(bigs) > day_offset + 1 else None,
            "games": games[day_offset] if len(games) > day_offset else None,
        }

    if target_x is not None:
        result = {
            "big":   find_num_near(big_label_y,   target_x),
            "reg":   find_num_near(reg_label_y,   target_x),
            "games": find_num_near(games_label_y, target_x),
        }
    else:
        result = fallback_parse()

    print(f"    OCR結果 台{machine_number} 1日前: BIG={result['big']} REG={result['reg']} G={result['games']}")
    return result


# ─── CAPTCHA 検出・待機 ──────────────────────────────────────────────────────
async def wait_for_captcha(page: Page) -> bool:
    if "captcha" not in page.url:
        return False

    print("\n" + "=" * 60)
    print("  hCaptchaが表示されています！")
    print("  ブラウザの「私は人間です」をチェックしてください。")
    print("  解決後、自動的に処理を再開します (最大5分)...")
    print("=" * 60 + "\n")

    for _ in range(300):
        await asyncio.sleep(1)
        if "captcha" not in page.url:
            print("  [OK] CAPTCHA突破を確認しました。\n")
            await page.wait_for_timeout(2000)
            return True
    print("  [TIMEOUT] CAPTCHA待機タイムアウト。")
    return False


# ─── JS抽出 (プライマリ) ────────────────────────────────────────────────────
EXTRACT_JS = """
() => {
    const results = [];

    // P'sCUBE DOM: 台番号ブロックを特定する複数戦略
    let machineNodes = [];

    // 戦略A: data属性
    for (const sel of ['[data-num]','[data-machine]','[data-cd]','[class*="slot"]','[class*="kisyu"]','[class*="machine"]']) {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length > 2) { machineNodes = [...nodes]; break; }
    }

    // 戦略B: 4桁台番号のテキストノードを持つ要素の親を探す
    if (machineNodes.length === 0) {
        for (const el of document.querySelectorAll('*')) {
            if (el.children.length === 0 && /^0\\d{3}$/.test((el.textContent||'').trim())) {
                const parent = el.closest('li,tr,div[class],section') || el.parentElement;
                if (parent && !machineNodes.includes(parent)) machineNodes.push(parent);
            }
        }
    }

    // データ抽出
    const seen = new Set();
    for (const node of machineNodes) {
        const txt = (node.innerText || node.textContent || '');
        const m = txt.match(/\\b(0\\d{3})\\b/);
        if (!m || seen.has(m[1])) continue;
        seen.add(m[1]);

        const cells = txt.split(/[\\t\\n]+/).map(s=>s.trim()).filter(Boolean);

        // BIG/REG/ゲーム数を行ごとに抽出
        const extract = (label) => {
            const idx = cells.findIndex(c => c === label || c.includes(label));
            if (idx < 0) return [null,null,null,null];
            const nums = [];
            for (let i=idx+1; i<cells.length && nums.length<4; i++) {
                if (/^\\d+$/.test(cells[i])) nums.push(+cells[i]);
            }
            return [nums[0]??null, nums[1]??null, nums[2]??null, nums[3]??null];
        };

        const [big_t, big_d1, big_d2, big_d3] = extract('BIG');
        const [reg_t, reg_d1, reg_d2, reg_d3] = extract('REG');
        const [g_t, g_d1, g_d2, g_d3] = extract('累計');

        results.push({ machine_number:m[1], big_d1, reg_d1, games_d1:g_d1, big_today:big_t, reg_today:reg_t, _cells:cells.slice(0,30) });
    }

    return { results, title:document.title, url:location.href, preview:(document.body?.innerText||'').slice(0,500) };
}
"""


async def extract_js(page: Page) -> list[dict]:
    try:
        await page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    await page.wait_for_timeout(2500)
    raw = await page.evaluate(EXTRACT_JS)
    print(f"  [JS] タイトル: {raw.get('title')}")
    print(f"  [JS] 本文: {raw.get('preview','')[:120]}")
    print(f"  [JS] 抽出台数: {len(raw.get('results',[]))}")
    for r in raw.get("results", []):
        print(f"    台{r['machine_number']}: BIG={r['big_d1']} REG={r['reg_d1']} G={r['games_d1']}")
    return raw.get("results", [])


# ─── OCRモード: 台ごとにスクリーンショット撮影 ──────────────────────────────
async def extract_ocr_mode(page: Page, machine_numbers: list[str]) -> list[dict]:
    """
    各台番号のページに遷移してスクリーンショット→OCRでデータ抽出する。
    台個別URLパターン例: nc-v05-003.php?cd_ps=2&bai=21.7&nmk_kisyu=...&cd_num=0791
    """
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    results = []

    # まず一覧ページで全台番号を取得
    if not machine_numbers:
        print("  台番号を一覧から自動取得中...")
        raw = await page.evaluate(EXTRACT_JS)
        machine_numbers = [r["machine_number"] for r in raw.get("results", [])]
        if not machine_numbers:
            # フォールバック: ページテキストから4桁番号を全抽出
            text = await page.evaluate("() => document.body?.innerText || ''")
            machine_numbers = list(dict.fromkeys(re.findall(r'\b0\d{3}\b', text)))
        print(f"  発見台数: {len(machine_numbers)}")

    for num in machine_numbers:
        print(f"  台 {num} を取得中...")

        # 台個別ページへ遷移 (cd_num パラメータ追加)
        url = LIST_URL + f"&cd_num={num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        if "captcha" in page.url:
            solved = await wait_for_captcha(page)
            if not solved:
                break

        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        await page.wait_for_timeout(1500)

        # スクリーンショット保存
        ss_path = SCREENSHOT_DIR / f"{num}.png"
        await page.screenshot(path=str(ss_path), full_page=True)

        # OCR抽出
        ss_bytes = ss_path.read_bytes()
        ocr_data = ocr_extract_numbers(ss_bytes, num, day_offset=1)

        # JS抽出も並行試行
        raw = await page.evaluate(EXTRACT_JS)
        js_machine = next((r for r in raw.get("results", []) if r["machine_number"] == num), None)

        # JSが取れた場合優先、なければOCR
        big   = (js_machine["big_d1"]   if js_machine else None) or ocr_data["big"]
        reg   = (js_machine["reg_d1"]   if js_machine else None) or ocr_data["reg"]
        games = (js_machine["games_d1"] if js_machine else None) or ocr_data["games"]

        results.append({"machine_number": num, "big_d1": big, "reg_d1": reg, "games_d1": games})
        await page.wait_for_timeout(800)

    return results


# ─── DOMダンプ ───────────────────────────────────────────────────────────────
async def dump_dom(page: Page):
    try:
        await page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    await page.wait_for_timeout(2000)

    # スクリーンショット保存
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    ss_path = SCREENSHOT_DIR / "dump_screenshot.png"
    await page.screenshot(path=str(ss_path), full_page=True)
    print(f"  スクリーンショット保存: {ss_path}")

    info = await page.evaluate("""() => ({
        title: document.title,
        url: location.href,
        inner_text: (document.body?.innerText || '').slice(0, 3000),
        classes: [...new Set([...document.querySelectorAll('*')].flatMap(el=>[...el.classList]))].sort().slice(0,100),
        first_list: (document.querySelector('ul,ol,table,[class*=list],[class*=slot]')||{}).outerHTML?.slice(0,2000)||'none',
    })""")

    dump_file = Path(__file__).parent / "dom_dump.json"
    with open(dump_file, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=2)

    print(f"DOMダンプ保存: {dump_file}")
    print(f"タイトル: {info['title']}")
    print(f"\n本文 (先頭500字):\n{info['inner_text'][:500]}")
    print(f"\nCSSクラス:\n{', '.join(info['classes'][:40])}")
    print(f"\nリスト/テーブルHTML:\n{info['first_list'][:800]}")


# ─── メイン ──────────────────────────────────────────────────────────────────
async def main(login_mode=False, dump_mode=False, ocr_mode=False):
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    print(f"=== P'sCUBE 自動収集 ({yesterday}) ===")
    print(f"モード: {'OCR' if ocr_mode else 'ダンプ' if dump_mode else 'ログイン' if login_mode else '通常'}\n")

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            viewport={"width": 390, "height": 844},  # iPhone 14相当 (P'sCUBEはモバイル向け)
            device_scale_factor=2,
            is_mobile=True,
            locale="ja-JP",
            args=["--disable-blink-features=AutomationControlled", "--lang=ja-JP"],
        )
        page = await context.new_page()

        # ── ログインモード ─────────────────────────────────────────
        if login_mode:
            print("[LOGIN MODE] 以下の手順:")
            print("  1. ブラウザに台一覧ページが開きます")
            print("  2. hCaptcha「私は人間です」にチェック")
            print("  3. 台一覧が表示されたら Ctrl+C")
            await page.goto(LIST_URL, wait_until="domcontentloaded")
            await wait_for_captcha(page)
            print("\nセッション保存完了！次回から --login 不要です。")
            await context.close()
            return

        # ── 一覧ページへ移動 ───────────────────────────────────────
        print(f"台一覧ページを読み込み中...")
        await page.goto(LIST_URL, wait_until="domcontentloaded", timeout=30000)

        if "captcha" in page.url:
            solved = await wait_for_captcha(page)
            if not solved:
                await context.close()
                return

        # ── 各モードの処理 ─────────────────────────────────────────
        if dump_mode:
            await dump_dom(page)
            await context.close()
            return

        machines: list[dict] = []

        if ocr_mode:
            machines = await extract_ocr_mode(page, list(MACHINE_NUMBERS))
        else:
            raw_results = await extract_js(page)
            machines = raw_results if raw_results else []

            if not machines:
                print("\n[WARN] JS抽出でデータが取得できませんでした。")
                print("  --dump でDOM構造を確認するか、--ocr で試してください。")

        await context.close()

    if MACHINE_NUMBERS:
        machines = [m for m in machines if m["machine_number"] in MACHINE_NUMBERS]

    if not machines:
        print("\n[ERROR] データが取得できませんでした。")
        return

    # ── JSON出力 ──────────────────────────────────────────────────
    output = {
        "generated_at": datetime.now().isoformat(),
        "date": yesterday,
        "store": "D-STATION前橋ガーデン店",
        "machine_model": TARGET_MODEL,
        "machines": [
            {
                "machine_number": m["machine_number"],
                "date": yesterday,
                "total_spins": m.get("games_d1"),
                "big_count":   m.get("big_d1"),
                "reg_count":   m.get("reg_d1"),
                "last_coin_diff": None,
                "graph_confidence": "none",
            }
            for m in machines
        ],
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 保存完了: {OUTPUT_FILE} ({len(machines)} 台)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="P'sCUBE データ収集スクリプト")
    ap.add_argument("--login", action="store_true", help="初回CAPTCHA突破モード")
    ap.add_argument("--dump",  action="store_true", help="DOMダンプ (構造確認)")
    ap.add_argument("--ocr",   action="store_true", help="OCRモード (スクリーンショット解析)")
    args = ap.parse_args()
    asyncio.run(main(login_mode=args.login, dump_mode=args.dump, ocr_mode=args.ocr))
