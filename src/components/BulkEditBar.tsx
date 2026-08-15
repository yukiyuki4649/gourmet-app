import { useState } from 'react';
import { Restaurant } from '../types/restaurant';
import { VisibilityGroup } from '../lib/appSettings';

const NO_CHANGE = '__no_change__';
const PUBLIC = '__public__';
const GROUP_PREFIX = 'group:';

interface BulkEditBarProps {
  count: number;
  areaOptions: string[];
  visibilityGroups: VisibilityGroup[];
  onApply: (patch: Partial<Restaurant>) => Promise<void> | void;
  onClear: () => void;
}

export function BulkEditBar({ count, areaOptions, visibilityGroups, onApply, onClear }: BulkEditBarProps) {
  const [area, setArea] = useState(NO_CHANGE);
  const [tasteRating, setTasteRating] = useState(NO_CHANGE);
  const [valuRating, setValuRating] = useState(NO_CHANGE);
  const [overallRating, setOverallRating] = useState(NO_CHANGE);
  const [visibilityChoice, setVisibilityChoice] = useState(NO_CHANGE);
  const [applying, setApplying] = useState(false);

  const hasAnyChange =
    area !== NO_CHANGE ||
    tasteRating !== NO_CHANGE ||
    valuRating !== NO_CHANGE ||
    overallRating !== NO_CHANGE ||
    visibilityChoice !== NO_CHANGE;

  const handleApply = async () => {
    const patch: Partial<Restaurant> = {};
    if (area !== NO_CHANGE) patch.area = area;
    if (tasteRating !== NO_CHANGE) patch.tasteRating = tasteRating;
    if (valuRating !== NO_CHANGE) patch.valuRating = valuRating;
    if (overallRating !== NO_CHANGE) patch.overallRating = overallRating;

    if (visibilityChoice === PUBLIC) {
      patch.visibility = 'public';
      patch.visibilityGroupIds = [];
      patch.visibleToUids = [];
    } else if (visibilityChoice.startsWith(GROUP_PREFIX)) {
      const groupId = visibilityChoice.slice(GROUP_PREFIX.length);
      const group = visibilityGroups.find(g => g.id === groupId);
      if (group) {
        patch.visibility = 'private';
        patch.visibilityGroupIds = [groupId];
        patch.visibleToUids = group.uids;
      }
    }

    if (Object.keys(patch).length === 0) return;
    if (!window.confirm(`選択中の${count}件をまとめて変更しますか?`)) return;

    setApplying(true);
    try {
      await onApply(patch);
      setArea(NO_CHANGE);
      setTasteRating(NO_CHANGE);
      setValuRating(NO_CHANGE);
      setOverallRating(NO_CHANGE);
      setVisibilityChoice(NO_CHANGE);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-yellow-900">{count}件を選択中 — まとめて編集</p>
        <button onClick={onClear} className="text-sm text-gray-500 hover:underline">
          選択解除
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <select value={area} onChange={e => setArea(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 rounded-md">
          <option value={NO_CHANGE}>エリア: 変更しない</option>
          {areaOptions.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select value={tasteRating} onChange={e => setTasteRating(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 rounded-md">
          <option value={NO_CHANGE}>味: 変更しない</option>
          <option value="A">味: A</option>
          <option value="B">味: B</option>
          <option value="C">味: C</option>
          <option value="D">味: D</option>
        </select>

        <select value={valuRating} onChange={e => setValuRating(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 rounded-md">
          <option value={NO_CHANGE}>コスパ: 変更しない</option>
          <option value="A">コスパ: A</option>
          <option value="B">コスパ: B</option>
          <option value="C">コスパ: C</option>
          <option value="D">コスパ: D</option>
        </select>

        <select value={overallRating} onChange={e => setOverallRating(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-300 rounded-md">
          <option value={NO_CHANGE}>総合評価: 変更しない</option>
          <option value="A">総合評価: A</option>
          <option value="B">総合評価: B</option>
          <option value="C">総合評価: C</option>
          <option value="D">総合評価: D</option>
        </select>

        <select
          value={visibilityChoice}
          onChange={e => setVisibilityChoice(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md"
        >
          <option value={NO_CHANGE}>公開範囲: 変更しない</option>
          <option value={PUBLIC}>公開にする</option>
          {visibilityGroups.map(g => (
            <option key={g.id} value={`${GROUP_PREFIX}${g.id}`}>
              非公開({g.name}に共有)
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleApply}
        disabled={!hasAnyChange || applying}
        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {applying ? '適用中...' : 'まとめて適用'}
      </button>
    </div>
  );
}
