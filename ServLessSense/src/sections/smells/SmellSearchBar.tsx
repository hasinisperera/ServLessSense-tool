import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { Search } from 'lucide-react';

import type { Severity } from './types';

type SmellSearchBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  severityFilter: Severity | 'all';
  onSeverityChange: (value: Severity | 'all') => void;
};

export function SmellSearchBar({
  searchTerm,
  onSearchChange,
  severityFilter,
  onSeverityChange,
}: SmellSearchBarProps) {
  return (
    <Box sx={{ p: 2.5, display: 'flex', gap: 2 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search by file name..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <Search size={16} />
            </Box>
          ),
        }}
      />
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Severity</InputLabel>
        <Select
          value={severityFilter}
          onChange={(e) => onSeverityChange(e.target.value as Severity | 'all')}
          label="Severity"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="low">Low (1-5)</MenuItem>
          <MenuItem value="medium">Medium (6-10)</MenuItem>
          <MenuItem value="high">High (above 10)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
