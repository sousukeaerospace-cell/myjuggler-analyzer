# マイジャグラーV 設定推定ツール - D-STATION前橋ガーデン店

## 構成

```
myjuggler-analyzer/
├── data-collector/          # Python: P'sCUBE 自動収集
│   ├── collector.py
│   ├── requirements.txt
│   └── maebashi_garden_data.json  (生成物)
└── web-app/                 # Next.js: ベイズ推定UI
```

---

## Web アプリ起動

```bash
# 初回のみ
cd web-app && npm install

# 毎回
npm run dev
# → http://localhost:3000
```

または `start-app.bat` をダブルクリック。

### iPhone でホーム画面に追加 (PWA)
1. iPhone の Safari で `http://<PCのIP>:3000` を開く
2. 共有ボタン → 「ホーム画面に追加」
3. 全画面ネイティブアプリとして使用可能

---

## Python データ収集

```bash
cd data-collector
pip install -r requirements.txt
playwright install chromium

# 初回: 手動ログイン
python collector.py --login

# 通常実行 (前日データを自動取得)
python collector.py
```

生成された `maebashi_garden_data.json` を Web アプリの「📂 JSON」ボタンでインポート。

### collector.py の調整ポイント
- `STORE_ID`: P'sCUBE 上の前橋ガーデン店の店舗ID
- `MACHINE_NUMBERS`: 巡回するマイジャグラーV の台番号リスト
- HTMLセレクタ: サイトの実際のDOM構造に合わせて調整

---

## 使い方

### 実戦前
1. 台番号を入力
2. 「⚙ 設定」から事前確率を選択:
   - **均等**: 通常日
   - **高設定期待日**: 3・9のつく日 / 第1土曜 (自動判定)
   - **据え置き引き継ぎ**: JSON インポート後に利用可能

### 実戦中
1. 総ゲーム数を適宜入力（+50/100/200/500 ボタンまたは直接入力）
2. BIG・REG・ブドウが揃うたびにタップ
3. チェリー重複モードをONにするとチェリー重複BIG/REGも個別記録

### 退台判断
- 緑バナー: 期待機械割プラス・継続推奨
- 黄バナー: 設定4以上の確率が閾値以下・要検討
- **赤バナー (全画面): 期待機械割100%以下・退台推奨**

---

## マイジャグラーV スペック

| 設定 | BIG確率 | REG確率 | ブドウ | 機械割 |
|------|---------|---------|--------|--------|
| 1    | 1/287.4 | 1/442.6 | 1/6.06 | 97.0%  |
| 2    | 1/282.5 | 1/399.6 | 1/5.98 | 98.4%  |
| 3    | 1/266.6 | 1/371.0 | 1/5.95 | 99.9%  |
| 4    | 1/260.9 | 1/334.8 | 1/5.89 | 102.3% |
| 5    | 1/252.5 | 1/292.6 | 1/5.81 | 105.1% |
| 6    | 1/241.3 | 1/252.5 | 1/5.66 | 109.4% |

---

## ベイズ推定の仕組み

各スピンは「BIG / REG / ブドウ / それ以外」の多項分布として扱います。

```
log P(設定i | データ) ∝
  BIG数 × log(BIG確率_i)
  + REG数 × log(REG確率_i)
  + ブドウ数 × log(ブドウ確率_i)
  + その他 × log(1 - 上記合計_i)
  + log(事前確率_i)
```

log-sum-exp で数値安定的に正規化し、設定1〜6の事後確率を返します。

**合算期待機械割** = Σ (設定iの事後確率 × 機械割_i)
