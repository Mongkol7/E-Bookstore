import React from 'react';

const DEFAULT_SCOPE_OPTIONS = [
  { value: 'all', label: 'Search: All' },
  { value: 'name', label: 'Search: Book Name' },
  { value: 'author', label: 'Search: Author' },
  { value: 'category', label: 'Search: Category' },
];

const DEFAULT_FILTER_OPTIONS = [
  { value: 'none', label: 'No Filter' },
  { value: 'categories', label: 'Categories' },
  { value: 'authors', label: 'Authors' },
  { value: 'price', label: 'Price' },
  { value: 'trending', label: 'Trending (Most Sales)' },
];

function BookSearchControls({
  searchText,
  onSearchTextChange,
  searchScope,
  onSearchScopeChange,
  filterType,
  onFilterTypeChange,
  searchPlaceholder = 'Search by book, author, category',
  scopeOptions = DEFAULT_SCOPE_OPTIONS,
  filterOptions = DEFAULT_FILTER_OPTIONS,
  hintText = '',
  authorCount = 0,
  className = '',
}) {
  const resolvedHintText = hintText
    ? hintText
    : filterType === 'authors'
      ? `${authorCount} authors available`
      : filterType === 'categories'
        ? 'Sorted by category name'
        : filterType === 'price'
          ? 'Sorted by lowest price first'
          : filterType === 'trending'
            ? 'Sorted by most sales (fallback: rating)'
            : searchText.trim()
              ? `Search "${searchText.trim()}" in ${searchScope === 'all' ? 'all fields' : searchScope}`
              : 'Showing default order';

  return (
    <div
      className={`rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 sm:p-4 ${className}`.trim()}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <input
          type="text"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <select
          value={searchScope}
          onChange={(event) => onSearchScopeChange(event.target.value)}
          className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          {scopeOptions.map((option) => (
            <option
              key={`scope-${option.value}`}
              value={option.value}
              className="bg-slate-900"
            >
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(event) => onFilterTypeChange(event.target.value)}
          className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          {filterOptions.map((option) => (
            <option
              key={`filter-${option.value}`}
              value={option.value}
              className="bg-slate-900"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-300">
          {resolvedHintText}
        </div>
      </div>
    </div>
  );
}

export default BookSearchControls;
