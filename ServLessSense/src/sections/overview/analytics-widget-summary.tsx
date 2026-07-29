import type { CardProps } from '@mui/material/Card';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';

import type { ColorType } from 'src/theme/core/palette';
import type { ChartOptions } from 'src/components/chart';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { fNumber, fPercent, fShortenNumber } from 'src/utils/format-number';

import { varAlpha, bgGradient } from 'src/theme/styles';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  definition: string;
  total: number;
  color?: ColorType;
  imageSrc: string;
};

export function AnalyticsWidgetSummary({
  title,
  definition,
  total,
  color = 'primary',
  imageSrc, // Accept the image source as a prop
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const chartColors = [theme.palette[color].dark];

  const renderTrending = (
    <Box
      sx={{
        top: 16,
        gap: 0.5,
        right: 16,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
      }}
    >
    </Box>
  );

  return (
    <Card
      sx={{
        ...bgGradient({
          color: `135deg, ${varAlpha(
            theme.vars.palette[color].lighterChannel,
            0.48
          )}, ${varAlpha(theme.vars.palette[color].lightChannel, 0.48)}`,
        }),
        p: 3,
        boxShadow: 'none',
        position: 'relative',
        color: `${color}.darker`,
        backgroundColor: 'common.white',
        ...sx,
      }}
      {...other}
      onMouseEnter={() => setIsHovered(true)} // Set hover state on enter
      onMouseLeave={() => setIsHovered(false)} // Reset hover state on leave
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <Box sx={{ typography: 'subtitle2', mr: 1 }}>{title}</Box>
          <img
            src={imageSrc}
            alt="info icon"
            style={{ width: 24, height: 24, minHeight: 70 }}
          />
        </Box>
        {isHovered && (
          <Box
            sx={{
              typography: 'subtitle2',
              backgroundColor: 'background.paper',
              padding: 1,
              borderRadius: 1,
              boxShadow: 2,
            }}
          >
            {definition}
          </Box>
        )}
        <Box sx={{ typography: 'h4' }}>{total}</Box>
      </Box>
    </Card>
  );
  
}
