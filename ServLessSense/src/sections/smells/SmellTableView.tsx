import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import type { GptModel } from 'src/config-data';

import { RefactorAction } from './RefactorAction';
import type { SmellRecord, SmellTableColumn } from './types';

const COLUMN_LABELS: Record<SmellTableColumn, string> = {
  filePath: 'File Path',
  line: 'Line',
  type: 'Type of Call',
  code: 'Code',
  message: 'Message',
  actions: 'Suggest Edit',
};

type SmellTableViewProps = {
  records: SmellRecord[];
  columns: SmellTableColumn[];
  enableRefactor?: boolean;
  onSuggestRefactoring?: (record: SmellRecord, model: GptModel) => void;
};

export function SmellTableView({
  records,
  columns,
  enableRefactor,
  onSuggestRefactoring,
}: SmellTableViewProps) {
  const displayColumns = columns.filter((col) => col !== 'actions' || enableRefactor);

  return (
    <TableContainer component={Paper}>
      <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHead>
          <TableRow>
            {displayColumns.map((column) => (
              <TableCell key={column}>
                <strong>{COLUMN_LABELS[column]}</strong>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow key={`${record.filePath}-${record.line}-${record.type ?? ''}`}>
              {displayColumns.map((column) => {
                if (column === 'filePath') {
                  return (
                    <TableCell key={column}>
                      <Box
                        component="pre"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}
                      >
                        {record.filePath}: {record.line}
                      </Box>
                    </TableCell>
                  );
                }

                if (column === 'line') {
                  return <TableCell key={column}>{record.line}</TableCell>;
                }

                if (column === 'type') {
                  return <TableCell key={column}>{record.type}</TableCell>;
                }

                if (column === 'code' || column === 'message') {
                  return (
                    <TableCell key={column}>
                      <Box
                        component="pre"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}
                      >
                        {column === 'code' ? record.code : record.message}
                      </Box>
                    </TableCell>
                  );
                }

                if (column === 'actions' && enableRefactor && onSuggestRefactoring) {
                  return (
                    <TableCell key={column}>
                      <RefactorAction
                        record={record}
                        onSuggestRefactoring={onSuggestRefactoring}
                      />
                    </TableCell>
                  );
                }

                return null;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
