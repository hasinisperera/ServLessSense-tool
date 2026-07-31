import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { RefactorSuggestion } from './types';

type RefactorDialogProps = {
  open: boolean;
  loading: boolean;
  suggestions: RefactorSuggestion[];
  onClose: () => void;
};

export function RefactorDialog({ open, loading, suggestions, onClose }: RefactorDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Refactoring Suggestions</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ pb: 1 }}>
            {suggestions.map((suggestion, index) => (
              <Card key={`${suggestion.title}-${index}`} variant="outlined">
                <CardHeader title={suggestion.title} titleTypographyProps={{ variant: 'h6' }} />
                <CardContent sx={{ pt: 0 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {suggestion.explanation}
                  </Typography>
                  {suggestion.refactoredCode && (
                    <Box
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        mt: 2,
                        p: 2,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      {suggestion.refactoredCode}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
