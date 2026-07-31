import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import { useSmellData } from './use-smell-data';
import { useFileTree } from './use-file-tree';
import { useRefactorSuggestion } from './use-refactor-suggestion';
import { SmellSearchBar } from './SmellSearchBar';
import { SmellTreeView } from './SmellTreeView';
import { SmellTableView } from './SmellTableView';
import { RefactorDialog } from './RefactorDialog';
import type { SmellDetailConfig } from './types';

export function SmellDetailLayout({
  title,
  description,
  dataPath,
  tableColumns,
  recordFilter,
  treeSmellFilter,
  enableRefactor,
  refactorType = 'async',
}: SmellDetailConfig) {
  const { records, loading, error } = useSmellData(dataPath);
  const {
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    severityFilter,
    setSeverityFilter,
    expandedNodes,
    toggleNode,
    filteredRecords,
    filteredTree,
  } = useFileTree({ records, recordFilter, treeSmellFilter });

  const refactor = useRefactorSuggestion(refactorType);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ m: 1.25 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2.5, m: 1.25, p: 2.5 }}>
        <CardHeader
          title={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography variant="h5" component="h3">{title}</Typography>
              <Typography variant="body1" component="h4">{description}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={viewMode === 'tree' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('tree')}
                  size="small"
                >
                  View by File
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  size="small"
                >
                  View by Smell
                </Button>
              </Box>
            </Box>
          }
        />
      </Card>

      <Card sx={{ borderRadius: 2.5, m: 1.25, p: 2.5 }}>
        <CardContent>
          <SmellSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            severityFilter={severityFilter}
            onSeverityChange={setSeverityFilter}
          />

          {viewMode === 'tree' ? (
            filteredTree.length > 0 ? (
              <SmellTreeView
                nodes={filteredTree}
                expandedNodes={expandedNodes}
                onToggleNode={toggleNode}
                treeSmellFilter={treeSmellFilter}
                enableRefactor={enableRefactor}
                onSuggestRefactoring={enableRefactor ? refactor.suggestRefactoring : undefined}
              />
            ) : (
              <Typography sx={{ p: 2, color: 'text.secondary' }}>
                No files found matching your search and severity criteria.
              </Typography>
            )
          ) : (
            <SmellTableView
              records={filteredRecords}
              columns={tableColumns}
              enableRefactor={enableRefactor}
              onSuggestRefactoring={enableRefactor ? refactor.suggestRefactoring : undefined}
            />
          )}
        </CardContent>
      </Card>

      {enableRefactor && (
        <RefactorDialog
          open={refactor.dialogOpen}
          loading={refactor.loading}
          suggestions={refactor.suggestions}
          onClose={refactor.closeDialog}
        />
      )}
    </Box>
  );
}
