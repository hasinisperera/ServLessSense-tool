import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type RefactorDialogProps = {
  open: boolean;
  loading: boolean;
  suggestion: string | null;
  onClose: () => void;
};

export function RefactorDialog({ open, loading, suggestion, onClose }: RefactorDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Refactoring Suggestion</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography component="strong">Suggestion:</Typography>
            <Box
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 1 }}
            >
              {suggestion}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
