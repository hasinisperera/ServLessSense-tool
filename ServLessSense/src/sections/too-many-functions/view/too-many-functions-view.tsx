import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Card, CardContent, CardHeader, Button, CircularProgress, Dialog, DialogContent, DialogTitle, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { ChevronRight, ChevronDown, Folder, FileText, Search } from 'lucide-react';
import { SMELLS } from 'src/config-global';

// Type for tree node structure
type TreeNode = {
  id: string; // Add unique identifier
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: TreeNode[];
  smells?: MethodDetail[];
  expanded: boolean; // Make expanded required
  severity?: Severity;
};

type MethodDetail = {
  filePath: string;
  line: number;
  message: string;
};

type Severity = 'low' | 'medium' | 'high';

export function TooManyFunctionsView() {
  const [methodDetails, setMethodDetails] = useState<MethodDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/src/scripts/lint-results/serverless-smells/too-many-functions.json');
        const data = await response.json();
        setMethodDetails(data);
        buildFileTree(data);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchData();
  }, []);

  const getSeverity = (smellCount: number): Severity => {
    if (smellCount <= 5) return 'low';
    if (smellCount <= 10) return 'medium';
    return 'high';
  };

  const getSeverityColor = (severity: Severity): string => {
    switch (severity) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      default: return '#757575';
    }
  };

  const buildFileTree = (details: MethodDetail[]) => {
    const root: TreeNode[] = [];
    let nodeId = 0;

    details.forEach(detail => {
      const pathParts = detail.filePath.split('/');
      let currentLevel = root;

      pathParts.forEach((part, index) => {
        const currentPath = pathParts.slice(0, index + 1).join('/');
        let existingNode = currentLevel.find(node => node.path === currentPath);
        
        if (!existingNode) {
          existingNode = {
            id: `node-${nodeId++}`,
            name: part,
            path: currentPath,
            type: index === pathParts.length - 1 ? 'file' : 'directory',
            children: [],
            smells: index === pathParts.length - 1 ? [detail] : undefined,
            expanded: false,
            severity: index === pathParts.length - 1 ? getSeverity(1) : undefined
          };
          currentLevel.push(existingNode);
        } else if (index === pathParts.length - 1) {
          existingNode.smells = existingNode.smells || [];
          existingNode.smells.push(detail);
          existingNode.severity = getSeverity(existingNode.smells.length);
        }

        currentLevel = existingNode.children;
      });
    });

    setFileTree(root);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const paddingLeft = `${level * 20}px`;
    const isExpanded = expandedNodes.has(node.id);
    
    return (
      <div key={node.id}>
        <div 
          className="flex items-center p-2 hover:bg-gray-100 cursor-pointer" 
          style={{ paddingLeft, paddingBottom: '10px' }}
          onClick={() => toggleNode(node.id)}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <Folder className="w-4 h-4 mr-2" />
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
            </>
          )}
          <span>{node.name}</span>
          {node.smells && (
            <>
              <span className="ml-2 text-sm text-gray-500">
                ({node.smells.length} smell{node.smells.length !== 1 ? 's' : ''})
              </span>
              <Chip 
                label={node.severity}
                size="small"
                style={{
                  backgroundColor: getSeverityColor(node.severity!),
                  color: 'white',
                  marginLeft: '8px',
                  textTransform: 'capitalize'
                }}
              />
            </>
          )}
        </div>
        
        {isExpanded && (
          <>
            {node.children.map(child => renderTreeNode(child, level + 1))}
            {node.smells && node.smells.length > 0 && (
              <div style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                <TableContainer component={Paper} className="mt-2 mb-4">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {/* <TableCell>Type</TableCell> */}
                        <TableCell>Line</TableCell>
                        <TableCell>Meessage</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {node.smells.map((smell, index) => (
                        <TableRow key={index}>
                          {/* <TableCell>{smell.type}</TableCell> */}
                          <TableCell>{smell.line}</TableCell>
                          <TableCell>
                            <pre className="whitespace-pre-wrap break-words">
                              {smell.message}
                            </pre>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined" style={{marginRight: '20px'}}
                              onClick={() => handleSuggestRefactoring(smell.filePath, smell.message, 'gpt-3.5')}
                            >
                              Ask gpt-3.5
                            </Button>
                            <Button
                              variant="outlined" style={{marginRight: '20px'}}
                              onClick={() => handleSuggestRefactoring(smell.filePath, smell.message, 'gpt-4')}
                            >
                              Ask gpt-4
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => handleSuggestRefactoring(smell.filePath, smell.message, 'gpt-4o')}
                            >
                              Ask gpt-4o
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const handleSuggestRefactoring = async (filePath: string, codeSnippet: string, model: string) => {
    setLoading(true);
    setDialogOpen(true);

    try {
      const type = 'too-many-functions';
      const response = await fetch('http://localhost:3001/get-refactoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, type, codeSnippet, model }),
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

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSuggestion(null);
  };

  
  const filterBySearchAndSeverity = (node: TreeNode): TreeNode | null => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || node.severity === severityFilter;
    
    if (matchesSearch && (matchesSeverity || node.type === 'directory')) {
      return { ...node, expanded: true };
    }

    if (node.children.length > 0) {
      const filteredChildren = node.children
        .map(child => filterBySearchAndSeverity(child))
        .filter(Boolean) as TreeNode[];

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren, expanded: true };
      }
    }

    return null;
  };

  const filteredTree = fileTree
    .map(node => filterBySearchAndSeverity(node))
    .filter(Boolean) as TreeNode[];

  const filteredMethodDetails = methodDetails.filter(detail =>
    detail.filePath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Stats Section */}
      <Card style={{ borderRadius: '10px', margin: '10px', padding: '20px' }}>
        <CardHeader 
          title={
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">{SMELLS.functions}</h3>
              <h4 className="text-l">There are functions that have duplicate code snippets that are performing the same task.</h4>
              <div className="space-x-2">
                <Button 
                  variant={viewMode === 'tree' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('tree')}
                  size="small"
                  style={{padding: '10px', margin: '10px'}}
                >
                  View by File
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  size="small"
                  style={{padding: '10px', margin: '10px'}}
                >
                  View by Smell
                </Button>
              </div>
            </div>
          }
        />
        </Card>

      {/* Tree/Table View Section */}
      <Card style={{ borderRadius: '10px', margin: '10px', padding: '20px' }}>
        <CardContent>
          <div style={{ padding: '20px', display: 'flex', gap: '16px' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by file name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search className="w-4 h-4 mr-2 text-gray-500" />,
              }}
            />
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
                label="Severity"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="low">Low (1-5)</MenuItem>
                <MenuItem value="medium">Medium (6-10)</MenuItem>
                <MenuItem value="high">High (above 10)</MenuItem>
              </Select>
            </FormControl>
          </div>

          {viewMode === 'tree' ? (
            <div style={{padding: '2px'}}>
              {filteredTree.length > 0 ? (
                filteredTree.map(node => renderTreeNode(node))
              ) : (
                <Typography className="p-4 text-gray-500">
                  No files found matching your search and severity criteria.
                </Typography>
              )}
            </div>
          ) : (
            <TableContainer component={Paper}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
               <TableRow>
                 <TableCell style={{ width: '20%' }}>File Path</TableCell>
                 <TableCell style={{ width: '50%' }}>Message</TableCell>
                 <TableCell style={{ width: '30%' }}><strong>Suggest Edit</strong></TableCell>
                 </TableRow>
                </TableHead>
                <TableBody>
                  {methodDetails
                    .map((detail, index) => (
                      <TableRow key={index}>
                       <TableCell sx={{ width: '30%' }}>
                         <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                         {detail.filePath}: {detail.line}
                         </pre>
                       </TableCell>
                       <TableCell sx={{ width: '30%' }}>
                         <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                           {detail.message}
                         </pre>
                       </TableCell>
                       <TableCell sx={{ width: '10%' }}>
                         <Button
                           variant="outlined" style={{marginRight: '10px'}}
                           onClick={() => handleSuggestRefactoring(detail.filePath, detail.message, 'gpt-3.5')}
                         >
                           Ask gpt-3.5
                         </Button>
                         <Button
                           variant="outlined" style={{marginRight: '10px'}}
                           onClick={() => handleSuggestRefactoring(detail.filePath, detail.message, 'gpt-4')}
                         >
                           Ask gpt-4
                         </Button>
                         <Button
                           variant="outlined"
                           onClick={() => handleSuggestRefactoring(detail.filePath, detail.message, 'gpt-4o')}
                         >
                           Ask gpt-4o
                         </Button>
                       </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Suggestion */}
      <Dialog 
              open={dialogOpen} 
              onClose={handleCloseDialog}
              maxWidth="xl"
              fullWidth={true}
            >
        <DialogTitle>Refactoring Suggestion</DialogTitle>
        <DialogContent>
          {loading ? (
            <div className="flex items-center justify-center">
              <CircularProgress />
            </div>
          ) : (
            <>
              <Typography><strong>Suggestion:</strong></Typography>
              <pre className="whitespace-pre-wrap break-words">
                {suggestion}
              </pre>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
