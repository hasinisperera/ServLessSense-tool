import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Unstable_Grid2';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SMELLS } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';
import { useSmellDashboardData } from 'src/sections/smells';
import type { SmellGroup } from 'src/sections/smells/types';

import { AnalyticsWidgetSummary } from '../analytics-widget-summary';

// ----------------------------------------------------------------------

export function OverviewAnalyticsView() {
  const navigate = useNavigate();
  const [view, setView] = useState('projectHeatmap');

  const {
    projectName,
    sharedCodes,
    libraries,
    technologies,
    functions,
    heatmapData,
    smellGroupedData,
    totalCounts,
    loading,
    error,
  } = useSmellDashboardData();

  if (loading || !heatmapData || !smellGroupedData) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Project name: {projectName}
      </Typography>
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Smells:
      </Typography>

      <Grid container spacing={3}>
        <Grid
          xs={12}
          sm={6}
          md={2.4}
          onClick={() => navigate('async-calls')}
          sx={{ cursor: 'pointer' }}
        >
          <AnalyticsWidgetSummary
            title={SMELLS.asyncCalls}
            definition="There is a high usage of synchronous function calls instead of asynchronous functions."
            total={totalCounts.sync}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid
          xs={12}
          sm={6}
          md={2.4}
          onClick={() => navigate('shared-code')}
          sx={{ cursor: 'pointer' }}
        >
          <AnalyticsWidgetSummary
            title={SMELLS.shared}
            definition="There is code shared across multiple functions making a strong coupling between microservices and tying new releases together."
            total={sharedCodes.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid
          xs={12}
          sm={6}
          md={2.4}
          onClick={() => navigate('too-many-libraries')}
          sx={{ cursor: 'pointer' }}
        >
          <AnalyticsWidgetSummary
            title={SMELLS.libraries}
            definition="There are libraries imported but are not being used or only a small part of a large library is being used."
            total={libraries.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid
          xs={12}
          sm={6}
          md={2.4}
          onClick={() => navigate('too-many-tech')}
          sx={{ cursor: 'pointer' }}
        >
          <AnalyticsWidgetSummary
            title={SMELLS.technologies}
            definition="There is a large number of technologies that are not being used."
            total={technologies.length}
            color="primary"
            imageSrc="/assets/icons/glass/ic-glass-message.svg"
          />
        </Grid>

        <Grid
          xs={12}
          sm={6}
          md={2.4}
          onClick={() => navigate('too-many-functions')}
          sx={{ cursor: 'pointer' }}
        >
          <AnalyticsWidgetSummary
            title={SMELLS.functions}
            definition="There are functions that have duplicate code snippets that are performing the same task."
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
            <Typography variant="h4">Distribution of smells</Typography>
            <Box sx={{ height: 2000 }}>
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
                  legendOffset: -80,
                }}
                axisRight={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Files',
                  legendPosition: 'middle',
                  legendOffset: 70,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Files',
                  legendPosition: 'middle',
                  legendOffset: -72,
                }}
                colors={{
                  type: 'sequential',
                  scheme: 'reds',
                }}
                emptyColor="#eeeeee"
                enableLabels
                labelTextColor={{
                  from: 'color',
                  modifiers: [['darker', 3]],
                }}
                annotations={[]}
              />
            </Box>
          </Grid>
        )}

        {view === 'smellHeatmaps' && (
          <Grid xs={12} md={12} lg={12}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2.5,
                justifyContent: 'center',
              }}
            >
              {smellGroupedData.map((group: SmellGroup) =>
                group.data.length > 0 ? (
                  <Box
                    key={group.smellType}
                    sx={{ width: 'calc(50% - 10px)', minWidth: 400 }}
                  >
                    <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
                      {group.smellType}
                    </Typography>
                    <Box sx={{ height: 1000 }}>
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
                          legendOffset: -80,
                        }}
                        axisRight={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Files',
                          legendPosition: 'middle',
                          legendOffset: 100,
                        }}
                        axisLeft={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Files',
                          legendPosition: 'middle',
                          legendOffset: -100,
                        }}
                        colors={{
                          type: 'sequential',
                          scheme: 'reds',
                        }}
                        emptyColor="#eeeeee"
                        enableLabels
                        labelTextColor={{
                          from: 'color',
                          modifiers: [['darker', 3]],
                        }}
                        annotations={[]}
                      />
                    </Box>
                  </Box>
                ) : null
              )}
            </Box>
          </Grid>
        )}
      </Grid>
    </DashboardContent>
  );
}
