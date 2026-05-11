# ServLessSense

ServLessSense detects five serverless-specific smells. To run the application, run the following commands.

### Go to eslint-plugin-serverless-smells

**Install:** 
``npm install``

**Link Plugin:**
``npm link eslint-plugin-serverless-smells``

### Go to server

Insert OpenAI key in ``server.js``

**Install:** 
``npm install``

**Run Server:**
``node server.js``

### Go to ServLessSense

**Install:** 
``npm install``

**Run Analysis:** 

```
  cd .\src\scripts\
  node run-eslint.cjs <path-to-project>
  node asyncCalls.cjs <path-to-project>
```

**Link ESLint plugin:**
``npm link eslint-plugin-serverless=smells``

**Run Application( in the project root):**
``npm run app``