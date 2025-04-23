import { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Download, Eye, Edit, Trash } from 'lucide-react';
import Button from './Button';

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
}

interface ExtraAction {
  icon: React.ReactNode;
  label: string;
  onClick: (item: any) => void;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  onFilter?: (filters: any) => void;
  onExport?: () => void;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onAdd?: () => void;
  addButtonText?: string;
  filterOptions?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
  extraActions?: ExtraAction[];
}

export default function DataTable({
  columns,
  data,
  title,
  subtitle,
  searchPlaceholder = 'Search...',
  onSearch,
  onFilter,
  onExport,
  onView,
  onEdit,
  onDelete,
  onAdd,
  addButtonText = 'Add New',
  filterOptions = [],
  extraActions = []
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  const sortedData = [...data];
  if (sortConfig) {
    sortedData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-luxury overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-heading">{title}</h2>
            {subtitle && <p className="text-sm text-body mt-1">{subtitle}</p>}
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <form onSubmit={handleSearch} className="flex w-full md:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-luxury-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-luxury-500 text-white rounded-r-lg hover:bg-luxury-600"
              >
                Search
              </button>
            </form>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {showFilters ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {onExport && (
                <Button
                  variant="outline"
                  onClick={onExport}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}

              {onAdd && (
                <Button
                  variant="luxury"
                  onClick={onAdd}
                  className="flex items-center"
                >
                  {addButtonText}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && filterOptions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {filterOptions.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-body mb-1">
                  {filter.label}
                </label>
                <select
                  value={filters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:ring-2 focus:ring-luxury-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {sortedData.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {sortedData.map((row, rowIndex) => (
              <div key={rowIndex} className="p-4 hover:bg-luxury-50">
                {columns.map((column) => (
                  <div key={column.key} className="mb-2">
                    <div className="text-sm font-medium text-body">{column.header}</div>
                    <div>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </div>
                  </div>
                ))}
                {(onView || onEdit || onDelete || extraActions.length > 0) && (
                  <div className="mt-4 flex justify-end space-x-2">
                    {onView && (
                      <button
                        onClick={() => onView(row)}
                        className="p-2 text-indigo-600 hover:text-indigo-900 rounded-full hover:bg-indigo-50"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="p-2 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {extraActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => action.onClick(row)}
                        className="p-2 text-luxury-500 hover:text-luxury-700 rounded-full hover:bg-luxury-50"
                        title={action.label}
                      >
                        {action.icon}
                      </button>
                    ))}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-body">
            No data available
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-luxury-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-heading uppercase tracking-wider"
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="ml-2 focus:outline-none"
                      >
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4 text-luxury-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-luxury-500" />
                          )
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {(onView || onEdit || onDelete || extraActions.length > 0) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-heading uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length > 0 ? (
              sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-luxury-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {(onView || onEdit || onDelete || extraActions.length > 0) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {extraActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => action.onClick(row)}
                          className="text-luxury-500 hover:text-luxury-700 mr-3"
                          title={action.label}
                        >
                          {action.icon}
                        </button>
                      ))}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (onView || onEdit || onDelete || extraActions.length > 0 ? 1 : 0)}
                  className="px-6 py-4 text-center text-sm text-body"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between">
        <p className="text-sm text-body mb-4 sm:mb-0">
          Showing <span className="font-medium">{Math.min(10, data.length)}</span> of{' '}
          <span className="font-medium">{data.length}</span> results
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}