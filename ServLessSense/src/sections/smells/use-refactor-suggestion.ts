import { useState } from 'react';

import type { GptModel } from 'src/config-data';
import { API_URL } from 'src/config-data';

export function useRefactorSuggestion(refactorType: string) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const suggestRefactoring = async (
    filePath: string,
    codeSnippet: string,
    model: GptModel
  ) => {
    setLoading(true);
    setDialogOpen(true);
    setSuggestion(null);

    try {
      const response = await fetch(`${API_URL}/get-refactoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          type: refactorType,
          codeSnippet,
          model,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuggestion(data.suggestion);
      } else {
        setSuggestion('Failed to get refactoring suggestions.');
      }
    } catch (error) {
      console.error('Error fetching refactoring suggestion:', error);
      setSuggestion('An error occurred while fetching suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSuggestion(null);
  };

  return {
    loading,
    suggestion,
    dialogOpen,
    suggestRefactoring,
    closeDialog,
  };
}
