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

export const GPT_MODELS = ['gpt-3.5', 'gpt-4', 'gpt-4o'] as const;

export type GptModel = (typeof GPT_MODELS)[number];
