import { useState } from 'react';

import { API_URL } from 'src/config-data';
import type { GptModel } from 'src/config-data';

import type { RefactorSuggestion, SmellRecord } from './types';

export function useRefactorSuggestion(refactorType: string) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RefactorSuggestion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const suggestRefactoring = async (record: SmellRecord, model: GptModel) => {
    setLoading(true);
    setDialogOpen(true);
    setSuggestions([]);

    const codeSnippet = record.message ?? record.code ?? '';

    try {
      const response = await fetch(`${API_URL}/get-refactoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: record.filePath,
          type: refactorType,
          codeSnippet,
          line: record.line,
          functionName: record.functionName,
          model,
        }),
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([
          {
            title: 'Error',
            explanation: data.error ?? 'Failed to get refactoring suggestions.',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching refactoring suggestion:', error);
      setSuggestions([
        {
          title: 'Error',
          explanation: 'An error occurred while fetching suggestions.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSuggestions([]);
  };

  return {
    loading,
    suggestions,
    dialogOpen,
    suggestRefactoring,
    closeDialog,
  };
}
