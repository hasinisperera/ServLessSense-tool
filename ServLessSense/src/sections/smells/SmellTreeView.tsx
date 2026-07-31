import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react';

import type { GptModel } from 'src/config-data';
import { getSmellDisplayText } from 'src/utils/smell-display';

import { RefactorAction } from './RefactorAction';
import { getSeverityColor } from './severity';
import type { SmellRecord, TreeNode } from './types';

type SmellTreeViewProps = {
  nodes: TreeNode[];
  expandedNodes: Set<string>;
  onToggleNode: (nodeId: string) => void;
  treeSmellFilter?: (record: SmellRecord) => boolean;
  enableRefactor?: boolean;
  onSuggestRefactoring?: (record: SmellRecord, model: GptModel) => void;
};

export function SmellTreeView({
  nodes,
  expandedNodes,
  onToggleNode,
  treeSmellFilter,
  enableRefactor,
  onSuggestRefactoring,
}: SmellTreeViewProps) {
  const theme = useTheme();

  const renderTreeNode = (node: TreeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const nodeSmells =
      node.smells && treeSmellFilter ? node.smells.filter(treeSmellFilter) : node.smells;

    return (
      <Box key={node.id}>
        <Box
          onClick={() => onToggleNode(node.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            pl: level * 2.5,
            pb: 1.25,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? (
                <ChevronDown size={16} style={{ marginRight: 8 }} />
              ) : (
                <ChevronRight size={16} style={{ marginRight: 8 }} />
              )}
              <Folder size={16} style={{ marginRight: 8 }} />
            </>
          ) : (
            <FileText size={16} style={{ marginRight: 8 }} />
          )}
          <span>{node.name}</span>
          {nodeSmells && nodeSmells.length > 0 && (
            <>
              <Box component="span" sx={{ ml: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                ({nodeSmells.length} smell{nodeSmells.length !== 1 ? 's' : ''})
              </Box>
              {node.severity && (
                <Chip
                  label={node.severity}
                  size="small"
                  sx={{
                    ml: 1,
                    bgcolor: getSeverityColor(node.severity, {
                      palette: {
                        success: { main: theme.palette.success.main },
                        warning: { main: theme.palette.warning.main },
                        error: { main: theme.palette.error.main },
                        grey: { 500: theme.palette.grey[500] },
                      },
                    }),
                    color: 'common.white',
                    textTransform: 'capitalize',
                  }}
                />
              )}
            </>
          )}
        </Box>

        {isExpanded && (
          <>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
            {nodeSmells && nodeSmells.length > 0 && (
              <Box sx={{ pl: (level + 1) * 2.5 }}>
                <TableContainer component={Paper} sx={{ mt: 1, mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {nodeSmells.some((s) => s.type) && <TableCell>Type</TableCell>}
                        <TableCell>Line</TableCell>
                        <TableCell>Detail</TableCell>
                        {enableRefactor && <TableCell>Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {nodeSmells.map((smell) => (
                        <TableRow key={`${smell.filePath}-${smell.line}-${smell.type ?? ''}`}>
                          {nodeSmells.some((s) => s.type) && <TableCell>{smell.type}</TableCell>}
                          <TableCell>{smell.line}</TableCell>
                          <TableCell>
                            <Box
                              component="pre"
                              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}
                            >
                              {getSmellDisplayText(smell)}
                            </Box>
                          </TableCell>
                          {enableRefactor && onSuggestRefactoring && (
                            <TableCell>
                              <RefactorAction
                                record={smell}
                                onSuggestRefactoring={onSuggestRefactoring}
                              />
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </Box>
    );
  };

  return <Box>{nodes.map((node) => renderTreeNode(node))}</Box>;
}
