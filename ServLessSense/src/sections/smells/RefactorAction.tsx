import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import { DEFAULT_GPT_MODEL, GPT_MODELS } from 'src/config-data';
import type { GptModel } from 'src/config-data';

import type { SmellRecord } from './types';

type RefactorActionProps = {
  record: SmellRecord;
  onSuggestRefactoring: (record: SmellRecord, model: GptModel) => void;
};

export function RefactorAction({ record, onSuggestRefactoring }: RefactorActionProps) {
  const [selectedModel, setSelectedModel] = useState<GptModel>(DEFAULT_GPT_MODEL);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as GptModel)}
        >
          {GPT_MODELS.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              {model.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="outlined"
        size="small"
        onClick={() => onSuggestRefactoring(record, selectedModel)}
      >
        Get Suggestion
      </Button>
    </Box>
  );
}
