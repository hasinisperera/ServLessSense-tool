export const DATA_PATHS = {
  projectName: '/data/project-name.json',
  smells: {
    asyncCalls: '/data/smells/async-calls.json',
    sharedCode: '/data/smells/shared-code-blocks.json',
    tooManyFunctions: '/data/smells/too-many-functions.json',
    tooManyLibraries: '/data/smells/too-many-libraries.json',
    tooManyTechnologies: '/data/smells/too-many-technologies.json',
  },
} as const;

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const GPT_MODELS = [
  { id: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
  { id: 'gpt-5.2', label: 'GPT-5.2' },
  { id: 'gpt-5.1', label: 'GPT-5.1' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
] as const;

export const DEFAULT_GPT_MODEL = 'gpt-4.1' as const;

export type GptModel = (typeof GPT_MODELS)[number]['id'];
