import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

import type { CardProps } from '@mui/material/Card';
import type { ColorType } from 'src/theme/core/palette';

import { varAlpha, bgGradient } from 'src/theme/styles';

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
