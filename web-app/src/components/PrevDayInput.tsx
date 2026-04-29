"use client";

import { useState } from "react";
import { MachineRecord } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSave: (machines: MachineRecord[]) => void;
  existing: MachineRecord[];
}

interface FormRow {
  id: number;
  machineNumber: string;
  totalSpins: string;
  bigCount: string;
  regCount: string;
  lastCoinDiff: string;
}

let nextId = 1;

function newRow(): FormRow {
  return {
    id: nextId++,
    machineNumber: "",
    totalSpins: "",
    bigCount: "",
    regCount: "",
    lastCoinDiff: "",
  };
}

function toNum(s: string): number | null {
  const v = parseInt(s.replace(/,/g, ""), 10);
  return isNaN(v) ? null : v;
}

export default function PrevDayInput({ onClose, onSave, existing }: Props) {
  const [rows, setRows] = useState<FormRow[]>([newRow()]);
  const [saved, setSaved] = useState(false);

  const update = (id: number, field: keyof FormRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows([...rows, newRow()]);

  const removeRow = (id: number) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const handleSave = () => {
    const validRows = rows.filter(r => r.machineNumber.trim());
    if (validRows.length === 0) return;

    const newRecords: MachineRecord[] = validRows.map(r => ({
      machineNumber: r.machineNumber.trim().padStart(4, "0"),
      date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      totalSpins:   toNum(r.totalSpins),
      bigCount:     toNum(r.bigCount),
      regCount:     toNum(r.regCount),
      lastCoinDiff: toNum(r.lastCoinDiff),
    }));

    // 既存データとマージ (同台番号は新データで上書き)
    const existingFiltered = existing.filter(
      e => !newRecords.some(n => n.machineNumber === e.machineNumber)
    );
    onSave([...existingFiltered, ...newRecords]);
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex flex-col">
      <div className="bg-gray-950 flex-1 overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
          <div>
            <h2 className="text-white font-bold text-lg">前日データ 手動入力</h2>
            <p className="text-gray-500 text-xs">
              P'sCUBEを見ながらBIG/REG/ゲーム数を入力してください
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl px-2 py-1">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* 入力行 */}
          {rows.map((row, idx) => (
            <div key={row.id} className="bg-gray-900 rounded-2xl p-4 space-y-3">
              {/* 台番号 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                  台 {idx + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-red-500 text-sm px-2"
                  >
                    削除
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">台番号</label>
                  <input
                    type="text"
                    placeholder="0791"
                    value={row.machineNumber}
                    onChange={e => update(row.id, "machineNumber", e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-base font-bold outline-none border border-gray-700 focus:border-blue-500"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">累計ゲーム数</label>
                  <input
                    type="number"
                    placeholder="例: 6500"
                    value={row.totalSpins}
                    onChange={e => update(row.id, "totalSpins", e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-base outline-none border border-gray-700 focus:border-blue-500"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-yellow-400 mb-1">BIG回数</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={row.bigCount}
                    onChange={e => update(row.id, "bigCount", e.target.value)}
                    className="w-full bg-gray-800 text-yellow-300 rounded-xl px-3 py-2 text-lg font-bold outline-none border border-gray-700 focus:border-yellow-500 text-center"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-400 mb-1">REG回数</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={row.regCount}
                    onChange={e => update(row.id, "regCount", e.target.value)}
                    className="w-full bg-gray-800 text-blue-300 rounded-xl px-3 py-2 text-lg font-bold outline-none border border-gray-700 focus:border-blue-500 text-center"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">差枚 (任意)</label>
                  <input
                    type="number"
                    placeholder="±0"
                    value={row.lastCoinDiff}
                    onChange={e => update(row.id, "lastCoinDiff", e.target.value)}
                    className="w-full bg-gray-800 text-gray-300 rounded-xl px-3 py-2 text-lg font-bold outline-none border border-gray-700 focus:border-gray-500 text-center"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* 入力補助: BIG/REG比率 */}
              {row.bigCount && row.regCount && row.totalSpins && (
                <div className="bg-gray-800 rounded-xl px-3 py-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500">BIG確率</p>
                    <p className="text-yellow-300 font-bold">
                      1/{Math.round(parseInt(row.totalSpins) / Math.max(1, parseInt(row.bigCount)))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">REG確率</p>
                    <p className="text-blue-300 font-bold">
                      1/{Math.round(parseInt(row.totalSpins) / Math.max(1, parseInt(row.regCount)))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">合算確率</p>
                    <p className="text-white font-bold">
                      1/{Math.round(parseInt(row.totalSpins) / Math.max(1, parseInt(row.bigCount) + parseInt(row.regCount)))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 台追加ボタン */}
          <button
            onClick={addRow}
            className="w-full bg-gray-800 text-gray-300 rounded-2xl py-3 text-sm font-semibold border border-dashed border-gray-600 active:bg-gray-700"
          >
            ＋ 台を追加
          </button>

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            className={`w-full rounded-2xl py-4 text-lg font-bold transition-colors touch-manipulation ${
              saved
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white active:bg-blue-700"
            }`}
          >
            {saved ? "✓ 保存しました" : "保存して事前確率に反映"}
          </button>

          {/* ガイド */}
          <div className="bg-gray-900 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
            <p className="text-gray-300 font-semibold text-sm">📱 P'sCUBEの見方</p>
            <p>1. P'sCUBEで「マイジャグラーV」台一覧を開く</p>
            <p>2. 各台番号をタップして詳細ページへ</p>
            <p>3. 「1日前」列の BIG回数・REG回数・累計ゲームを入力</p>
            <p>4. 保存後、⚙設定→「据え置き引き継ぎ」を選択</p>
          </div>
        </div>
      </div>
    </div>
  );
}
