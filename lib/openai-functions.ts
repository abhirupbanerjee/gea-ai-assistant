/**
 * OpenAI Function Definitions for GEA AI Assistant
 */

import { FunctionDefinition, OpenAITool } from './types';

// ============================================================================
// Function Definitions
// ============================================================================

export const functions: FunctionDefinition[] = [
  {
    name: 'get_page_context',
    description: `Get detailed information about a specific page in the GEA Portal.

Use this function when:
- User asks what they can do on the current page
- User needs help with a form or process on the page
- User asks how to complete a task
- User seems confused about where they are or what to do
- You need to provide step-by-step guidance for the current page
- User asks about features available on the page

The function returns:
- Page title and purpose
- Target audience (public, staff, admin)
- Step-by-step instructions (if applicable)
- Helpful tips and warnings
- Available features

Always use this function to provide accurate, page-specific guidance rather than generic responses.`,
    parameters: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          description: 'The page route/path from the GEA Portal, e.g., "/feedback", "/admin/analytics", "/grievance", "/ticket-status"',
        },
      },
      required: ['route'],
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get function definitions in OpenAI tools format
 * @returns Array of OpenAI tool definitions
 */
export function getFunctionDefinitions(): OpenAITool[] {
  return functions.map(fn => ({
    type: 'function' as const,
    function: fn,
  }));
}

/**
 * Get a specific function definition by name
 * @param name - Function name
 * @returns Function definition or undefined
 */
export function getFunctionByName(name: string): FunctionDefinition | undefined {
  return functions.find(fn => fn.name === name);
}
