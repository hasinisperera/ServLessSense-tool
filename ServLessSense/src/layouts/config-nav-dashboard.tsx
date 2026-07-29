import { SvgColor } from 'src/components/svg-color';
import { SMELLS } from 'src/config-global';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: SMELLS.asyncCalls,
    path: '/async-calls',
    icon: icon('ic-analytics'),
  },
  {
    title: SMELLS.shared,
    path: '/shared-code',
    icon: icon('ic-blog'),
  },
  {
    title: SMELLS.libraries,
    path: '/too-many-libraries',
    icon: icon('ic-cart'),
  },
  {
    title: SMELLS.technologies,
    path: '/too-many-tech',
    icon: icon('ic-disabled'),
  },
  {
    title: SMELLS.functions,
    path: '/too-many-functions',
    icon: icon('ic-user'),
  },
];
