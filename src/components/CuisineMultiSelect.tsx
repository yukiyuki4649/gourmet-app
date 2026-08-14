import { useState } from 'react';
import { OptionGroup } from '../lib/categories';

interface CuisineMultiSelectProps {
  groups: OptionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function CuisineMultiSelect({ groups, selected, onChange }: CuisineMultiSelectProps) {
  const [newCuisine, setNewCuisine] = useState('');

  const toggle = (cuisine: string) => {
    onChange(selected.includes(cuisine) ? selected.filter(c => c !== cuisine) : [...selected, cuisine]);
  };

  const handleAddNew = () => {
    const trimmed = newCuisine.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setNewCuisine('');
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">料理種別(複数選択可)</label>
      {groups.length > 0 && (
        <div className="space-y-3 max-h-56 overflow-y-auto border border-gray-300 rounded-md p-3 mb-2">
          {groups.map(group => (
            <div key={group.label || '__uncategorized__'}>
              {group.label && <p className="text-xs font-semibold text-gray-500 mb-1">{group.label}</p>}
              <div className="flex flex-wrap gap-2">
                {group.options.map(opt => {
                  const isSelected = selected.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggle(opt)}
                      aria-pressed={isSelected}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        <input
          type="text"
          placeholder="新しい料理種別を追加"
          value={newCuisine}
          onChange={e => setNewCuisine(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddNew();
            }
          }}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <button
          type="button"
          onClick={handleAddNew}
          className="px-3 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300 whitespace-nowrap"
        >
          追加
        </button>
      </div>

      {selected.length > 0 ? (
        <p className="text-xs text-gray-500 mt-2">選択中: {selected.join('、')}</p>
      ) : (
        <p className="text-xs text-red-500 mt-2">1つ以上選んでください</p>
      )}
    </div>
  );
}
