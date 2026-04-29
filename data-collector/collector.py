"""
P'sCUBE データ収集スクリプト - マイジャグラーV (前橋ガーデン店)

使い方:
  1. pip install -r requirements.txt
  2. playwright install chromium
  3. python collector.py --login   # 初回: 手動ログイン後 Ctrl+C
  4. python collector.py           # 通常実行: 自動巡回
"""

import asyncio
import json
import argparse
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

from playwright.async_api import async_playwright
from PIL import Image
import numpy as np
from io import BytesIO
import base64

# ─── 設定 ──────────────────────────────────────────────────────────────────────
USER_DATA_DIR = str(Path(__file__).parent / "browser_data")
OUTPUT_FILE   = str(Path(__file__).parent / "maebashi_garden_data.json")
BASE_URL      = "https://www.pscube.jp"

# 前橋ガーデン店 の店舗ID (実際のIDを確認して設定)
STORE_ID = "maebashi_garden"

# 巡回対象台番号 (適宜追加)
MACHINE_NUMBERS = [
    "0791", "0792", "0793", "0794", "0795",
    "0796", "0797", "0798", "0799", "0800",
]

# マイジャグラーV の機種名 (サイト表示に合わせて調整)
TARGET_MODEL = "マイジャグラーV"


# ─── スランプグラフ解析 ──────────────────────────────────────────────────────
def analyze_slump_graph(image_bytes: bytes) -> dict:
    """
    スランプグラフ画像を解析し最終差枚数を推定する。

    戦略:
      - グラフ描画領域を検出
      - ゼロライン (中央の1000枚点線付近) を特定
      - 右端のライン位置からY座標を読み取り差枚に変換
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)
    h, w = arr.shape[:2]

    # グラフライン色 (通常: 白背景に青/赤系ライン)
    # P'sCUBE の色に合わせて調整が必要
    # 差枚プラス: 赤系 (r>150, g<100, b<100)
    # 差枚マイナス: 青系 (r<100, g<100, b>150)

    def is_graph_pixel(r, g, b):
        is_red  = r > 160 and g < 120 and b < 120
        is_blue = r < 120 and g < 120 and b > 160
        is_line = r < 80  and g < 80  and b < 80   # 黒ライン
        return is_red or is_blue or is_line

    # グラフ領域推定: 上下左右10%を除外
    top    = int(h * 0.10)
    bottom = int(h * 0.90)
    left   = int(w * 0.10)
    right  = int(w * 0.95)

    # 右端から最終Y座標を検出 (右から5%幅を平均)
    scan_x_start = int(w * 0.90)
    graph_pixels_y = []
    for x in range(scan_x_start, right):
        for y in range(top, bottom):
            r, g, b = arr[y, x]
            if is_graph_pixel(int(r), int(g), int(b)):
                graph_pixels_y.append(y)

    if not graph_pixels_y:
        return {"last_coin_diff": None, "confidence": "low"}

    final_y = int(np.median(graph_pixels_y))

    # ゼロライン推定: 画像の垂直中心付近で水平な点線を探す
    # 簡易実装: グラフ領域の中央をゼロラインとみなす
    zero_y = (top + bottom) // 2

    # Y方向のスケール推定
    # P'sCUBEのグラフは通常 ±5000枚 程度を表示
    # 1ピクセル ≈ 5000*2 / (bottom-top) 枚
    pixels_range = bottom - top
    coin_per_pixel = 10000 / pixels_range  # ±5000枚想定

    # 上がプラス、下がマイナス
    diff_pixels = zero_y - final_y
    estimated_diff = int(diff_pixels * coin_per_pixel)

    return {
        "last_coin_diff": estimated_diff,
        "confidence": "medium",
        "final_y_pixel": final_y,
        "zero_y_pixel": zero_y,
    }


# ─── P'sCUBE スクレイパー ────────────────────────────────────────────────────
async def get_machine_data(page, machine_number: str, target_date: str) -> dict | None:
    """
    指定台番号の前日データを取得する。
    target_date: "YYYY-MM-DD" 形式
    """
    result = {
        "machine_number": machine_number,
        "date": target_date,
        "total_spins": None,
        "big_count": None,
        "reg_count": None,
        "last_coin_diff": None,
        "graph_confidence": "none",
        "fetched_at": datetime.now().isoformat(),
    }

    try:
        # P'sCUBE の台別ページ URL パターン (実際のURLに合わせて調整)
        # 例: https://www.pscube.jp/stores/{store_id}/machines/{machine_number}?date={date}
        url = f"{BASE_URL}/stores/{STORE_ID}/machines/{machine_number}?date={target_date}"
        print(f"  → {url}")

        response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        if response and response.status != 200:
            print(f"  [WARN] HTTP {response.status} for machine {machine_number}")
            return result

        await page.wait_for_timeout(1500)

        # ─── 機種名確認 ───────────────────────────────────────────────
        page_text = await page.inner_text("body")
        if TARGET_MODEL not in page_text:
            # 別機種の台はスキップ
            print(f"  [SKIP] {machine_number}: not {TARGET_MODEL}")
            return None

        # ─── 総回転数・BIG・REG 取得 ──────────────────────────────────
        # セレクタは実際のHTMLに合わせて調整
        selectors = {
            "total_spins": "[data-label='総回転数'], .game-count, .total-games",
            "big_count":   "[data-label='BIG'], .big-count, .bonus-big",
            "reg_count":   "[data-label='REG'], .reg-count, .bonus-reg",
        }

        for key, selector in selectors.items():
            try:
                el = await page.query_selector(selector)
                if el:
                    text = await el.inner_text()
                    num = re.sub(r"[^\d]", "", text)
                    result[key] = int(num) if num else None
            except Exception:
                pass

        # フォールバック: テキストから正規表現で抽出
        if result["total_spins"] is None:
            m = re.search(r"総回転[数]?\s*[：:]\s*([\d,]+)", page_text)
            if m:
                result["total_spins"] = int(m.group(1).replace(",", ""))

        if result["big_count"] is None:
            m = re.search(r"BIG\s*[：:]\s*(\d+)", page_text)
            if m:
                result["big_count"] = int(m.group(1))

        if result["reg_count"] is None:
            m = re.search(r"REG\s*[：:]\s*(\d+)", page_text)
            if m:
                result["reg_count"] = int(m.group(1))

        # ─── スランプグラフ画像取得・解析 ────────────────────────────
        graph_img_el = await page.query_selector(
            "img[src*='graph'], img[src*='slump'], .slump-graph img, canvas.graph"
        )
        if graph_img_el:
            img_src = await graph_img_el.get_attribute("src")
            if img_src:
                if img_src.startswith("data:image"):
                    # base64 inline
                    b64 = img_src.split(",", 1)[1]
                    img_bytes = base64.b64decode(b64)
                else:
                    # 外部URL
                    img_url = img_src if img_src.startswith("http") else BASE_URL + img_src
                    img_response = await page.request.get(img_url)
                    img_bytes = await img_response.body()

                graph_info = analyze_slump_graph(img_bytes)
                result["last_coin_diff"]  = graph_info["last_coin_diff"]
                result["graph_confidence"] = graph_info["confidence"]

        print(f"  [OK] {machine_number}: {result['total_spins']}G "
              f"BIG={result['big_count']} REG={result['reg_count']} "
              f"差枚≈{result['last_coin_diff']}")

    except Exception as e:
        print(f"  [ERROR] {machine_number}: {e}")

    return result


async def main(login_mode: bool = False):
    target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    print(f"=== P'sCUBE 自動収集 ({target_date}) ===")

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )

        page = await context.new_page()

        if login_mode:
            print("\n[LOGIN MODE] ブラウザでログインしてください。完了後 Ctrl+C を押してください。")
            await page.goto(BASE_URL)
            try:
                await asyncio.sleep(300)  # 5分待機
            except KeyboardInterrupt:
                pass
            await context.close()
            return

        # 既存セッション確認
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        current_url = page.url
        if "login" in current_url or "signin" in current_url:
            print("[ERROR] 未ログイン状態です。--login オプションで先にログインしてください。")
            await context.close()
            return

        print(f"ログイン確認済み。{len(MACHINE_NUMBERS)} 台を巡回します。\n")

        results = []
        for machine_num in MACHINE_NUMBERS:
            print(f"台番号 {machine_num} を取得中...")
            data = await get_machine_data(page, machine_num, target_date)
            if data is not None:
                results.append(data)
            await page.wait_for_timeout(1000)  # サーバー負荷軽減

        await context.close()

    # JSON 保存
    output = {
        "generated_at": datetime.now().isoformat(),
        "date": target_date,
        "store": "D-STATION前橋ガーデン店",
        "machine_model": TARGET_MODEL,
        "machines": results,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 保存完了: {OUTPUT_FILE}")
    print(f"   {len(results)} 台のデータを記録しました。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="P'sCUBE データ収集スクリプト")
    parser.add_argument("--login", action="store_true", help="手動ログインモードで起動")
    args = parser.parse_args()

    asyncio.run(main(login_mode=args.login))
