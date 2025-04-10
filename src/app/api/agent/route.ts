import { StreamingTextResponse, LangChainStream } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

export const runtime = 'edge';

const AGENT_SYSTEM_PROMPT = `You are a helpful AI assistant that helps users understand and manage their household items. 
You have access to the following information about detected items:
{items}

Your task is to help users understand their items, provide cost estimates, and give moving advice.
Be conversational, helpful, and precise in your responses.

When users ask to modify items (add, update, or remove), acknowledge the change and show the updated list.
When users ask to see the list, provide a clear summary of all items with their counts and total values.
When users ask about costs, provide detailed cost breakdowns.
When users ask for moving advice, provide specific advice based on the items.

Always format numbers with proper currency symbols and commas for readability.
If you need more information to answer a question, ask for clarification.`;

export async function POST(req: Request) {
  const { messages, items } = await req.json();

  const { stream, handlers } = LangChainStream();

  const prompt = PromptTemplate.fromTemplate(AGENT_SYSTEM_PROMPT);

  const model = new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.7,
    streaming: true,
  });

  // Format the items for better readability
  const formattedItems = items.map((item: any) => ({
    name: item.name,
    count: item.count,
    priceEach: `$${item.priceEach.toLocaleString()}`,
    totalPrice: `$${item.totalPrice.toLocaleString()}`
  }));

  const chain = RunnableSequence.from([
    {
      items: () => JSON.stringify(formattedItems, null, 2),
      question: (input) => {
        // Get the last user message
        const lastUserMessage = input.messages
          .slice()
          .reverse()
          .find((m: any) => m.role === 'user');
        return lastUserMessage?.content || '';
      },
      context: (input) => {
        // Get the conversation context
        return input.messages
          .slice(-5) // Get last 5 messages for context
          .map((m: any) => `${m.role}: ${m.content}`)
          .join('\n');
      }
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  chain.invoke(
    {
      messages,
    },
    {
      callbacks: [handlers],
    }
  );

  return new StreamingTextResponse(stream);
} 