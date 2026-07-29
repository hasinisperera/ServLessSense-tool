import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { SMELLS } from 'src/config-global';
import { useEffect, useState } from 'react';

import { _tasks, _posts, _timeline } from 'src/_mock';
import { DashboardContent } from 'src/layouts/dashboard';
import { useNavigate } from 'react-router-dom';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { HeatMap, ResponsiveHeatMap } from '@nivo/heatmap';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';

// ----------------------------------------------------------------------

type MethodDetail = {
  filePath: string;
  line: number;
  type: 'async' | 'promise' | 'sync';
  code: string;
};

type SmellDetail = {
  filePath: string;
};

type SmellType = 'Sync & Async Calls' | 'Too Many Libraries' | 'Too Many Functions' | 'Shared Code' | 'Too Many Technologies';

interface HeatmapDataPoint {
  x: string;
  y: number;
}

interface HeatmapItem {
  id: string;
  data: HeatmapDataPoint[];
}

interface SmellGroup {
  smellType: string;
  data: HeatmapItem[];
}

interface SmellData {
  id: string;
  'Sync & Async Calls': number;
  'Too Many Libraries': number;
  'Too Many Functions': number;
  'Shared Code': number;
  'Too Many Technologies': number;
  [key: string]: string | number;
}

interface TransformedDataItem {
  id: string;
  data: Array<{ x: SmellType; y: number }>;
}

interface RawSmellData {
  filePath: string;
  [key: string]: any;
}

export function OverviewAnalyticsView() {
  const navigate = useNavigate();
  const [view, setView] = useState('projectHeatmap');
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [smellGroupedData, setSmellGroupedData] = useState<any>(null);
  
  const [asyncCalls, setAsyncCallsDetails] = useState<MethodDetail[]>([]);
  const [sharedCodes, setSharedCodesDetail] = useState<SmellDetail[]>([]);
  const [libraries, setLibrariesDetails] = useState<MethodDetail[]>([]);
  const [technologies, setTechnologiesDetails] = useState<MethodDetail[]>([]);
  const [functions, setFunctionsDetails] = useState<MethodDetail[]>([]);
  const [projectName, setProjectName] = useState('project');

  useEffect(() => {
    // Fetch data from the JSON file
    const fetchProjectName = async () => {
      try {
        const projectname = await fetch('/src/scripts/project-details/project-name.json');
        const data = await projectname.json();
        setProjectName(data.projectName);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchProjectName();
  }, []);

  useEffect(() => {
    // Fetch data from the JSON file
    const fetchAsyncCalls = async () => {
      try {
        const asyncalls = await fetch('/src/scripts/lint-results/serverless-smells/async-calls.json');
        const data = await asyncalls.json();
        setAsyncCallsDetails(data);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchAsyncCalls();
  }, []);

  useEffect(() => {
    // Fetch data from the JSON file
    const fetchSharedCode = async () => {
      try {
        const response = await fetch('/src/scripts/lint-results/serverless-smells/shared-code-blocks.json');
        const data = await response.json();
        setSharedCodesDetail(data);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchSharedCode();
  }, []);
  
  useEffect(() => {
    // Fetch data from the JSON file
    const fetchLibraries = async () => {
      try {
        const response = await fetch('/src/scripts/lint-results/serverless-smells/too-many-libraries.json');
        const data = await response.json();
        setLibrariesDetails(data);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchLibraries();
  }, []);
  
  useEffect(() => {
    // Fetch data from the JSON file
    const fetchTechnologies = async () => {
      try {
        const response = await fetch('/src/scripts/lint-results/serverless-smells/too-many-tech.json');
        const data = await response.json();
        setTechnologiesDetails(data);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchTechnologies();
  }, []);
  
  useEffect(() => {
    // Fetch data from the JSON file
    const fetchFunctions = async () => {
      try {
        const response = await fetch('/src/scripts/lint-results/serverless-smells/too-many-functions.json');
        const data = await response.json();
        setFunctionsDetails(data);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    fetchFunctions();
  }, []);
  
  const totalCounts = asyncCalls.reduce(
    (totals, method) => {
      totals[method.type] += 1;
      return totals;
    },
    { sync: 0, async: 0, promise: 0 }
  );
  
  const [treeData, setTreeData] = useState<any>(null);

  useEffect(() => { 
  const fetchData = async () => {
    try {
      // Define the smells configuration
      const smellsConfig = [
        { url: '/src/scripts/lint-results/serverless-smells/async-calls.json', type: 'Sync & Async Calls' },
        { url: '/src/scripts/lint-results/serverless-smells/too-many-libraries.json', type: 'Too Many Libraries' },
        { url: '/src/scripts/lint-results/serverless-smells/too-many-functions.json', type: 'Too Many Functions' },
        { url: '/src/scripts/lint-results/serverless-smells/shared-code-blocks.json', type: 'Shared Code' },
        { url: '/src/scripts/lint-results/serverless-smells/too-many-tech.json', type: 'Too Many Technologies' }
      ] as const;
  
      // Fetch all data with error handling for each file
      const responses = await Promise.all(
        smellsConfig.map(async ({ url, type }) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Failed to fetch ${type} data: ${response.statusText}`);
              return { type, data: [] };
            }
            const data = await response.json();
            return { type, data };
          } catch (error) {
            console.warn(`Error fetching ${type} data:`, error);
            return { type, data: [] };
          }
        })
      );
  
      // Process data for each smell type
      const processData = (rawData: RawSmellData[], smellType: SmellType): Map<string, SmellData> => {
        const fileMap = new Map<string, SmellData>();
        
        rawData.forEach((entry) => {
          if (!entry.filePath) return; // Skip invalid entries
          
          const fileName = entry.filePath.split('\\').pop() || entry.filePath;
          if (!fileName) return; // Skip if filename extraction fails
          
          const existingData = fileMap.get(fileName) || {
            id: fileName,
            'Sync & Async Calls': 0,
            'Too Many Libraries': 0,
            'Too Many Functions': 0,
            'Shared Code': 0,
            'Too Many Technologies': 0
          };
          
          fileMap.set(fileName, {
            ...existingData,
            [smellType]: (existingData[smellType] as number || 0) + 1
          });
        });
        
        return fileMap;
      };
  
      // Create a master map of all files
      const masterFileMap = new Map<string, SmellData>();
  
      // Process each smell type and add to master map
      responses.forEach(({ type, data }) => {
        const processedData = processData(data, type as SmellType);
        processedData.forEach((value, key) => {
          const existing = masterFileMap.get(key) || {
            id: key,
            'Sync & Async Calls': 0,
            'Too Many Libraries': 0,
            'Too Many Functions': 0,
            'Shared Code': 0,
            'Too Many Technologies': 0
          };
          masterFileMap.set(key, { ...existing, ...value });
        });
      });
  
      // Transform the data into the final format
      const heatmapData: TransformedDataItem[] = Array.from(masterFileMap.values()).map(file => ({
        id: file.id,
        data: [
          { x: 'Sync & Async Calls', y: file['Sync & Async Calls'] },
          { x: 'Too Many Libraries', y: file['Too Many Libraries'] },
          { x: 'Too Many Functions', y: file['Too Many Functions'] },
          { x: 'Shared Code', y: file['Shared Code'] },
          { x: 'Too Many Technologies', y: file['Too Many Technologies'] }
        ]
      }));
  
      setHeatmapData(heatmapData);
  
    } catch (error) {
      console.error('Error in data processing:', error);
      setHeatmapData([]); // Set empty data in case of error
    }
  };
    fetchData();
  }, []);

  useEffect(() => {
    const transformToSmellGrouped = () => {
      if (!heatmapData) return;

      const smellTypes = ['Sync & Async Calls', 'Too Many Libraries', 'Too Many Functions', 'Shared Code', 'Too Many Technologies'];
      const groupedData: SmellGroup[] = smellTypes.map(smellType => {
        const data = heatmapData
          .filter((item: HeatmapItem) => 
            item.data.some(d => d.x === smellType && d.y > 0)
          )
          .map((item: HeatmapItem) => ({
            id: item.id,
            data: [{ 
              x: smellType, 
              y: item.data.find(d => d.x === smellType)?.y || 0 
            }]
          }));
        
        return {
          smellType,
          data
        };
      });

      setSmellGroupedData(groupedData);
    };

    transformToSmellGrouped();
  }, [heatmapData]);

  if (!heatmapData || !smellGroupedData) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Project name: {projectName}
      </Typography>
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Smells:
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={2.4}
        onClick={() => navigate('async-calls')}
        style={{ cursor: 'pointer' }}>
          <AnalyticsWidgetSummary
            title={SMELLS.asyncCalls}
            definition="There is a high usage of synchronous function calls instead of asynchronous functions."
            // percent={2.6}
            total={totalCounts.sync}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid xs={12} sm={6} md={2.4}
        onClick={() => navigate('shared-code')}
        style={{ cursor: 'pointer' }}>
          <AnalyticsWidgetSummary
            title={SMELLS.shared}
            definition="There is code shared across multiple functions making a strong coupling between microservices and tying new releases together."
            // percent={-0.1}
            total={sharedCodes.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid xs={12} sm={6} md={2.4}
        onClick={() => navigate('too-many-libraries')}
        style={{ cursor: 'pointer' }}>
          <AnalyticsWidgetSummary
            title={SMELLS.libraries}
            definition="There are libraries imported but are not being used or only a small part of a large library is being used."
            // percent={2.8}
            total={libraries.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid xs={12} sm={6} md={2.4}
        onClick={() => navigate('too-many-tech')}
        style={{ cursor: 'pointer' }}>
          <AnalyticsWidgetSummary
            title={SMELLS.technologies}
            definition="There is a large number of technologies that are not being used."
            // percent={3.6}
            total={technologies.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>
        
        <Grid xs={12} sm={6} md={2.4}
        onClick={() => navigate('too-many-functions')}
        style={{ cursor: 'pointer' }}>
          <AnalyticsWidgetSummary
            title={SMELLS.functions}
            definition="There are functions that have duplicate code snippets that are performing the same task."
            // percent={3.6}
            total={functions.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

      <Grid xs={12} md={12} lg={12}>
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          Select View:
        </Typography>
        <Select value={view} onChange={(e) => setView(e.target.value)}>
          <MenuItem value="projectHeatmap">Heatmap of smells for the project</MenuItem>
          <MenuItem value="smellHeatmaps">Heatmap by smell</MenuItem>
        </Select>
      </Grid>

      {view === 'projectHeatmap' && (
        <Grid xs={12} md={6} lg={8}>
          <Typography variant="h4">
            Distribution of smells
          </Typography>
          <div style={{height: 2000}}>
            <ResponsiveHeatMap
              data={heatmapData}
              margin={{ top: 100, right: 90, bottom: 60, left: 90 }}
              valueFormat=">-.2s"
              axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Smell Types',
                legendPosition: 'middle',
                legendOffset: -80
              }}
              axisRight={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Files',
                legendPosition: 'middle',
                legendOffset: 70
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Files',
                legendPosition: 'middle',
                legendOffset: -72
              }}
              colors={{
                type: 'sequential',
                scheme: 'reds'
              }}
              emptyColor="#eeeeee"
              enableLabels={true}
              labelTextColor={{
                from: 'color',
                modifiers: [['darker', 3]]
              }}
              annotations={[]}
            />
          </div>
        </Grid>
      )}

      {view === 'smellHeatmaps' && (
        <Grid xs={12} md={12} lg={12}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '20px',
            justifyContent: 'center' 
          }}>
            {smellGroupedData.map((group: SmellGroup) => (
              group.data.length > 0 && (
                <div key={group.smellType} style={{ width: 'calc(50% - 10px)', minWidth: '400px' }}>
                  <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
                    {group.smellType}
                  </Typography>
                  <div style={{height: 1000}}>
                    <ResponsiveHeatMap
                      data={group.data}
                      margin={{ top: 100, right: 120, bottom: 60, left: 120 }}
                      valueFormat=">-.2s"
                      axisTop={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: group.smellType,
                        legendPosition: 'middle',
                        legendOffset: -80
                      }}
                      axisRight={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Files',
                        legendPosition: 'middle',
                        legendOffset: 100
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Files',
                        legendPosition: 'middle',
                        legendOffset: -100
                      }}
                      colors={{
                        type: 'sequential',
                        scheme: 'reds'
                      }}
                      emptyColor="#eeeeee"
                      enableLabels={true}
                      labelTextColor={{
                        from: 'color',
                        modifiers: [['darker', 3]]
                      }}
                      annotations={[]}
                    />
                  </div>
                </div>
              )
            ))}
          </div>
        </Grid>
      )}
      </Grid>
    </DashboardContent>
  );
}
