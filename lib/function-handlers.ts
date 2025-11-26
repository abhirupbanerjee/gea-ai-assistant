/**
 * Function Call Handlers for OpenAI Assistant
 */

import { FunctionCallResult, PageContext } from './types';

// ============================================================================
// Configuration
// ============================================================================

const GEA_PORTAL_API = process.env.GEA_PORTAL_URL || 'https://gea.abhirup.app';

// ============================================================================
// Individual Function Handlers
// ============================================================================

/**
 * Handle get_page_context function call
 * Fetches page context information from GEA Portal API
 */
async function handleGetPageContext(args: { route: string }): Promise<FunctionCallResult> {
  try {
    const { route } = args;

    // Validate route parameter
    if (!route) {
      console.error('[Function] Missing route parameter');
      return {
        success: false,
        error: 'Route parameter is required',
      };
    }

    // Normalize route (ensure it starts with /)
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

    // Build API URL
    const url = `${GEA_PORTAL_API}/api/content/page-context?route=${encodeURIComponent(normalizedRoute)}`;

    console.log(`[Function] Fetching page context for: ${normalizedRoute}`);
    console.log(`[Function] API URL: ${url}`);

    // Fetch from GEA Portal API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes to reduce API calls
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`[Function] API error: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: `Failed to fetch page context: HTTP ${response.status}`,
      };
    }

    const data: PageContext = await response.json();

    console.log(`[Function] Successfully fetched context for: ${data.title}`);
    console.log(`[Function] Audience: ${data.audience}, Steps: ${data.steps?.length || 0}, Tips: ${data.tips?.length || 0}`);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[Function] Error fetching page context:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to fetch page context',
    };
  }
}

// ============================================================================
// Main Function Call Router
// ============================================================================

/**
 * Main function call handler - routes to specific function handlers
 * @param functionName - Name of the function to execute
 * @param functionArgs - Arguments for the function
 * @returns Function execution result
 */
export async function handleFunctionCall(
  functionName: string,
  functionArgs: any
): Promise<FunctionCallResult> {
  console.log(`[Function] Handling function call: ${functionName}`);
  console.log(`[Function] Arguments:`, JSON.stringify(functionArgs, null, 2));

  switch (functionName) {
    case 'get_page_context':
      return handleGetPageContext(functionArgs);

    default:
      console.error(`[Function] Unknown function: ${functionName}`);
      return {
        success: false,
        error: `Unknown function: ${functionName}`,
      };
  }
}

// ============================================================================
// Result Formatting
// ============================================================================

/**
 * Format function result for submission to OpenAI
 * @param result - Function call result
 * @returns JSON string for OpenAI
 */
export function formatFunctionResult(result: FunctionCallResult): string {
  if (result.success && result.data) {
    // Return successful result as formatted JSON
    return JSON.stringify(result.data, null, 2);
  }

  // Return error information
  return JSON.stringify({
    error: result.error || 'Function call failed',
    success: false,
  });
}
