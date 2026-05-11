const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { Configuration, OpenAI } = require('openai');
const cors = require('cors');

const app = express();
app.use(bodyParser.json(), cors());

const openai = new OpenAI({apiKey: <APIKey>});

// Endpoint to read file and get refactoring suggestion
app.post('/get-refactoring', async (req, res) => {
  const { filePath, type, codeSnippet, model } = req.body;

  console.log('Received request for refactoring suggestion');
  console.log('Absolute file path received:', filePath);

  try {
    // Security: Validate the filePath to prevent misuse
    if (!path.isAbsolute(filePath)) {
      console.error('Error: Provided path is not absolute');
      return res.status(400).json({ error: 'Provided path is not absolute' });
    }


    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error('Error: File does not exist at the provided path');
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('File found. Reading file content...');
    const code = fs.readFileSync(filePath, 'utf8');
    console.log('Code', code);

    console.log('Sending code to OpenAI API...');
    let messages = [];
    let version = model;
    if (type === 'async') {
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant providing code refactoring suggestions.',
        },
        {
          role: 'user',
          content: `Here is some code:\n\n${code}\n\n Can you go the line with the code ${codeSnippet}? It is a synchronous function. \n\nPlease refactor that synchronous function to an asynchronous function. \n\nPlease suggest two ways to to do this refactoring including the explainations`,
        },        
      ];
    }

    if (type === 'too-many-functions') {
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant providing code refactoring suggestions.',
        },
        {
          role: 'user',
          content: `Here is some code:\n\n${code}\n\n ${codeSnippet} This suggests that the code has too many functions. \n\nPlease suggest two ways refactor this code including the explainations`,
        },        
      ];
    }
    
    const completion = await openai.chat.completions.create({
      model: version,
      messages: messages
    });

    console.log('OpenAI API Response:', completion); // Log the full response
    const suggestion = completion.choices[0].message;
    console.log('Suggestion received from OpenAI:', suggestion);

    res.json({ suggestion: suggestion.content });
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ error: 'Failed to get refactoring suggestions.' });
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
