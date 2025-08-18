/**
 * Bulk Action Toolbar Component
 * 
 * Displays when emails are selected, provides bulk operations like reclassification.
 * Extracted from InboxView to improve component modularity.
 */

import { RefreshCw, Tag } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  isRunningClassification: boolean;
  onClearSelection: () => void;
  onBulkReclassify: () => Promise<void>;
}

export default function BulkActionToolbar({
  selectedCount,
  isRunningClassification,
  onClearSelection,
  onBulkReclassify
}: BulkActionToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mx-4 mt-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-blue-700 font-medium">
            {selectedCount} email{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Clear selection
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onBulkReclassify}
            disabled={isRunningClassification}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunningClassification ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Reclassifying...
              </>
            ) : (
              <>
                <Tag className="w-4 h-4 mr-2" />
                Reclassify Selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}