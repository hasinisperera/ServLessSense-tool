import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'ServLessSense',
  appVersion: packageJson.version,
};

export const SMELLS = {
  asyncCalls: 'Synchronous & Asynchronous Calls',
  shared: 'Shared Code',
  libraries: 'Too Many Libraries',
  technologies: 'Too Many Technologies',
  functions: 'Too Many Functions'
}
