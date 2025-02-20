# Relocation Image Feature

The system provides a multi-agentic AI-powered chat interface to assist users in their relocation process. The first feature of this prototype is object detection from user-uploaded photos to generate an estimated cost for each detected item. The system will utilize v0, cursor, huggingface, and web3 technologies to create a modern, efficient, and secure platform. For prototyping, all data is stored in a JSON object—no external databases are required.

## Getting started
Used [Ansh & Riley's  Full-Stack Template](https://github.com/ansh/template-2) to create a chat interface. Followed their template in `/paths/chat.md` to scaffold the project. Then I updated the functionality to use `imageUpload.tsx` to allow the user to submit a photo from their desktop into the chat interface. 


## Technologies used
This doesn't really matter, but is useful for the AI to understand more about this project. We are using the following technologies
- React with Next.js 14 App Router
- TailwindCSS
- Firebase Auth, Storage, and Database
- Multiple AI endpoints including OpenAI, Anthropic, and Replicate using Vercel's AI SDK
