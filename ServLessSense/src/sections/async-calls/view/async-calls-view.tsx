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
  type: 'async' | 'promise' | 'sync';
  code: string;
};

type Severity = 'low' | 'medium' | 'high';

export function AsyncCallsView() {
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
        const response = await fetch('/src/scripts/lint-results/serverless-smells/async-calls.json');
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
    // const root: TreeNode[] = [];
    // let nodeId = 0;

    // details.forEach(detail => {
    //   const pathParts = detail.filePath.split('/');
    //   let currentLevel = root;

    //   pathParts.forEach((part, index) => {
    //     const currentPath = pathParts.slice(0, index + 1).join('/');
    //     let existingNode = currentLevel.find(node => node.path === currentPath);
        
    //     if (!existingNode) {
    //       existingNode = {
    //         id: `node-${nodeId++}`,
    //         name: part,
    //         path: currentPath,
    //         type: index === pathParts.length - 1 ? 'file' : 'directory',
    //         children: [],
    //         smells: index === pathParts.length - 1 ? [detail] : undefined,
    //         expanded: false,
    //         severity: index === pathParts.length - 1 ? getSeverity(1) : undefined
    //       };
    //       currentLevel.push(existingNode);
    //     } else if (index === pathParts.length - 1) {
    //       existingNode.smells = existingNode.smells || [];
    //       existingNode.smells.push(detail);
    //       existingNode.severity = getSeverity(existingNode.smells.length);
    //     }

    //     currentLevel = existingNode.children;
    //   });
    // });

    // setFileTree(root);

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
            // Only set severity based on sync type methods
            severity: index === pathParts.length - 1 && detail.type === 'sync' ? getSeverity(1) : undefined
          };
          currentLevel.push(existingNode);
        } else if (index === pathParts.length - 1) {
          existingNode.smells = existingNode.smells || [];
          existingNode.smells.push(detail);
          
          // Count only sync methods for severity calculation
          const syncSmellsCount = existingNode.smells.filter(smell => smell.type === 'sync').length;
          existingNode.severity = getSeverity(syncSmellsCount);
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
    const syncSmells = node.smells ? node.smells.filter(smell => smell.type === 'sync') : undefined;
    
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
          {syncSmells && (
            <>
              <span className="ml-2 text-sm text-gray-500">
                ({syncSmells.length} smell{syncSmells.length !== 1 ? 's' : ''})
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
            {syncSmells && syncSmells.length > 0 && (
              <div style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                <TableContainer component={Paper} className="mt-2 mb-4">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Line</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncSmells.map((smell, index) => (
                        <TableRow key={index}>
                          <TableCell>{smell.type}</TableCell>
                          <TableCell>{smell.line}</TableCell>
                          <TableCell>
                            <pre className="whitespace-pre-wrap break-words">
                              {smell.code}
                            </pre>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined" style={{marginRight: '20px'}}
                              onClick={() => handleSuggestRefactoring(smell.filePath, smell.code, 'gpt-3.5')}
                            >
                              Ask gpt-3.5
                            </Button>
                            <Button
                              variant="outlined" style={{marginRight: '20px'}}
                              onClick={() => handleSuggestRefactoring(smell.filePath, smell.code, 'gpt-4')}
                            >
                              Ask gpt-4
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => handleSuggestRefactoring(smell.filePath, smell.code, 'gpt-4o')}
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
      const type = 'async';
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
    // const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
    // const matchesSeverity = severityFilter === 'all' || node.severity === severityFilter;
    const syncSmells = node.smells ? node.smells.filter(smell => smell.type === 'sync') : undefined;
    
    // if (matchesSearch && (matchesSeverity || node.type === 'directory')) {
    //   return { ...node, expanded: true };
    // }

    // if (node.children.length > 0) {
    //   const filteredChildren = node.children
    //     .map(child => filterBySearchAndSeverity(child))
    //     .filter(Boolean) as TreeNode[];

    //   if (filteredChildren.length > 0) {
    //     return { ...node, children: filteredChildren, expanded: true };
    //   }
    // }

    // return null;

    const nodeWithFilteredSmells = {
      ...node,
      smells: syncSmells,
      // If we have smells, update severity based on count of sync smells
      severity: syncSmells && syncSmells.length > 0 ? getSeverity(syncSmells.length) : node.severity
    };
    
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Use syncSmells for severity filtering
    const matchesSeverity = severityFilter === 'all' || 
      (syncSmells && syncSmells.length > 0 && nodeWithFilteredSmells.severity === severityFilter);
    
    // Show files only if they have sync smells and match filters
    if (node.type === 'file' && (!syncSmells || syncSmells.length === 0)) {
      // Skip files with no sync smells
      return null;
    }
    
    if (matchesSearch && (matchesSeverity || node.type === 'directory')) {
      return { ...nodeWithFilteredSmells, expanded: true };
    }
  
    if (node.children.length > 0) {
      const filteredChildren = node.children
        .map(child => filterBySearchAndSeverity(child))
        .filter(Boolean) as TreeNode[];
  
      if (filteredChildren.length > 0) {
        return { ...nodeWithFilteredSmells, children: filteredChildren, expanded: true };
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
              <h3 className="text-xl font-semibold">{SMELLS.asyncCalls}</h3>
              <h4 className="text-l">There is a high usage of synchronous function calls instead of asynchronous functions.</h4>
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
                 <TableCell style={{ width: '10%' }}>Type of Call</TableCell>
                 <TableCell style={{ width: '40%' }}>Code</TableCell>
                  <TableCell sx={{ width: '30%' }}><strong>Suggest Edit</strong></TableCell>
                 </TableRow>
                </TableHead>
                <TableBody>
                  {methodDetails
                    .filter(detail => detail.type === 'sync')
                    .map((detail, index) => (
                      <TableRow key={index}>
                       <TableCell sx={{ width: '10px' }}>
                         <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                         {detail.filePath}: {detail.line}
                         </pre>
                       </TableCell>
                       <TableCell sx={{ width: '20px' }}>{detail.type}</TableCell>
                       <TableCell sx={{ width: '50px' }}>
                         <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                           {detail.code}
                         </pre>
                       </TableCell>
                       <TableCell sx={{ width: '30px' }}>
                         <Button
                           variant="outlined"
                           onClick={() => handleSuggestRefactoring(detail.filePath, detail.code, 'gpt-3.5')}
                            style={{marginRight:'10px'}}
                         >
                           Ask gpt-3.5
                         </Button>
                         <Button
                           variant="outlined"
                           onClick={() => handleSuggestRefactoring(detail.filePath, detail.code, 'gpt-4')}
                           style={{marginRight:'10px'}}
                         >
                           Ask gpt-4
                         </Button>
                         <Button
                           variant="outlined"
                           onClick={() => handleSuggestRefactoring(detail.filePath, detail.code, 'gpt-4o')}
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

export default AsyncCallsView;

