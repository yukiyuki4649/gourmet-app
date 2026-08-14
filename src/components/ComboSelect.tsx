import { useState } from 'react';
import { OptionGroup } from '../lib/categories';

const NEW_OPTION = '__new__';

interface ComboSelectProps {
  name: string;
  placeholder: string;
  value: string;
  options: string[];
  // When provided, options are shown under <optgroup> category headers instead of a
  // flat list (e.g. cuisines grouped under "麺類"/"肉料理"/...). `options` above is
  // still used as the flat validity check ("is the current value a known option").
  groups?: OptionGroup[];
  onChange: (value: string) => void;
  required?: boolean;
}

export function ComboSelect({ name, placeholder, value, options, groups, onChange, required }: ComboSelectProps) {
  const [mode, setMode] = useState<'select' | 'new'>(
    value && !options.includes(value) ? 'new' : 'select',
  );

  if (mode === 'new') {
    return (
      <div className="flex gap-1">
        <input
          type="text"
          name={name}
          placeholder={`新しい${placeholder}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md"
          required={required}
        />
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMode('select');
              onChange('');
            }}
            className="px-2 text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            候補から選ぶ
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      name={name}
      value={options.includes(value) ? value : ''}
      onChange={e => {
        if (e.target.value === NEW_OPTION) {
          setMode('new');
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      required={required}
    >
      <option value="" disabled>
        {placeholder}を選択
      </option>
      {groups && groups.length > 0
        ? groups.map(group => (
            <optgroup key={group.label || '__uncategorized__'} label={group.label || placeholder}>
              {group.options.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </optgroup>
          ))
        : options.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
      <option value={NEW_OPTION}>+ 新規作成...</option>
    </select>
  );
}
