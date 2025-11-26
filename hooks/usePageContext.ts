'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PageContext, ContextUpdateMessage } from '@/types/page-context';

// ============================================================================
// Configuration
// ============================================================================

// Get allowed origins from environment variable (comma-separated)
// Fallback to default origins if not set
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // Default allowed origins
  return [
    'https://gea.abhirup.app',
    'https://gea.gov.gd',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
};

const ALLOWED_ORIGINS = getAllowedOrigins();

// ============================================================================
// Helper: Thread persistence
// ============================================================================

const THREAD_STORAGE_KEY = 'gea_ai_thread_id';

function getStoredThreadId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(THREAD_STORAGE_KEY);
  } catch (e) {
    console.warn('[PageContext] localStorage not available');
    return null;
  }
}

function storeThreadId(threadId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (threadId) {
      localStorage.setItem(THREAD_STORAGE_KEY, threadId);
    } else {
      localStorage.removeItem(THREAD_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[PageContext] Failed to store thread ID');
  }
}

// ============================================================================
// Hook
// ============================================================================

export function usePageContext() {
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [originError, setOriginError] = useState<string | null>(null);
  const [threadId, setThreadIdState] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Thread ID management with persistence
  // ──────────────────────────────────────────────────────────────────────────

  const setThreadId = useCallback((newThreadId: string | null) => {
    setThreadIdState(newThreadId);
    storeThreadId(newThreadId);
  }, []);

  useEffect(() => {
    // Load thread ID from localStorage on mount
    const stored = getStoredThreadId();
    if (stored) {
      setThreadIdState(stored);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Initialize from URL params (fallback)
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Check if we're in an iframe
    const inIframe = window !== window.parent;
    setIsEmbedded(inIframe);

    // Get initial route from URL parameter
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');

    if (source) {
      setPageContext({
        route: source,
        timestamp: Date.now(),
        changeType: 'navigation',
      });
      console.log('[PageContext] Initialized from URL param:', source);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Listen for context updates via postMessage
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin
      const isAllowedOrigin = ALLOWED_ORIGINS.some(origin =>
        event.origin === origin || event.origin.startsWith(origin)
      );

      if (!isAllowedOrigin) {
        console.log('[PageContext] Ignored message from:', event.origin);
        setOriginError('Unable to connect to the portal. Invalid origin.');
        return;
      }

      // Clear any previous origin errors
      setOriginError(null);

      // Handle context update
      if (event.data?.type === 'CONTEXT_UPDATE') {
        const message = event.data as ContextUpdateMessage;
        setPageContext(message.context);

        console.log('[PageContext] Updated:', message.context.changeType, {
          route: message.context.route,
          modal: message.context.modal?.type,
          edit: message.context.edit?.entityType,
          tab: message.context.tab?.activeTab,
          form: message.context.form?.formName,
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Build context description for AI
  // ──────────────────────────────────────────────────────────────────────────

  const buildContextDescription = useCallback((): string => {
    if (!pageContext) {
      return 'User context not available.';
    }

    const parts: string[] = [];

    // Route
    parts.push(`Current page: ${pageContext.route}`);

    // Modal
    if (pageContext.modal) {
      const modal = pageContext.modal;
      let modalDesc = `\nModal open: ${modal.type}`;

      if (modal.title) {
        modalDesc += ` - "${modal.title}"`;
      }

      if (modal.entityType && modal.entityId) {
        modalDesc += `\nViewing ${modal.entityType}: ${modal.entityName || modal.entityId}`;
      }

      if (modal.data && Object.keys(modal.data).length > 0) {
        modalDesc += `\nModal data:`;
        for (const [key, value] of Object.entries(modal.data)) {
          if (value !== null && value !== undefined) {
            modalDesc += `\n  - ${key}: ${value}`;
          }
        }
      }

      parts.push(modalDesc);
    }

    // Edit mode
    if (pageContext.edit?.isEditing) {
      const edit = pageContext.edit;
      let editDesc = `\nEdit mode active: Editing ${edit.entityType}`;

      if (edit.entityName) {
        editDesc += ` "${edit.entityName}"`;
      } else {
        editDesc += ` (ID: ${edit.entityId})`;
      }

      if (edit.fields && edit.fields.length > 0) {
        editDesc += `\nEditable fields: ${edit.fields.join(', ')}`;
      }

      if (edit.originalData) {
        editDesc += `\nOriginal values:`;
        for (const [key, value] of Object.entries(edit.originalData)) {
          if (value !== null && value !== undefined) {
            editDesc += `\n  - ${key}: ${value}`;
          }
        }
      }

      parts.push(editDesc);
    }

    // Tab
    if (pageContext.tab) {
      const tab = pageContext.tab;
      let tabDesc = `\nActive tab: "${tab.activeTab}" in ${tab.tabGroup}`;

      if (tab.availableTabs.length > 0) {
        tabDesc += `\nAvailable tabs: ${tab.availableTabs.join(', ')}`;
      }

      parts.push(tabDesc);
    }

    // Form
    if (pageContext.form) {
      const form = pageContext.form;
      let formDesc = `\nForm: ${form.formName}`;

      if (form.currentStep && form.totalSteps) {
        formDesc += ` (Step ${form.currentStep} of ${form.totalSteps})`;
      }

      if (form.completedFields && form.completedFields.length > 0) {
        formDesc += `\nCompleted: ${form.completedFields.join(', ')}`;
      }

      if (form.pendingFields && form.pendingFields.length > 0) {
        formDesc += `\nPending: ${form.pendingFields.join(', ')}`;
      }

      if (form.validationErrors && form.validationErrors.length > 0) {
        formDesc += `\nErrors: ${form.validationErrors.join('; ')}`;
      }

      parts.push(formDesc);
    }

    // Custom context
    if (pageContext.custom && Object.keys(pageContext.custom).length > 0) {
      let customDesc = '\nAdditional context:';
      for (const [key, value] of Object.entries(pageContext.custom)) {
        if (value !== null && value !== undefined) {
          customDesc += `\n  - ${key}: ${JSON.stringify(value)}`;
        }
      }
      parts.push(customDesc);
    }

    return parts.join('');
  }, [pageContext]);

  // ──────────────────────────────────────────────────────────────────────────
  // Get short context summary for UI display
  // ──────────────────────────────────────────────────────────────────────────

  const getContextSummary = useCallback((): string => {
    if (!pageContext) return 'Not connected';

    if (pageContext.modal) {
      return `📋 ${pageContext.modal.title || pageContext.modal.type}`;
    }

    if (pageContext.edit?.isEditing) {
      return `✏️ Editing ${pageContext.edit.entityName || pageContext.edit.entityType}`;
    }

    if (pageContext.form) {
      const form = pageContext.form;
      if (form.currentStep && form.totalSteps) {
        return `📝 ${form.formName} (${form.currentStep}/${form.totalSteps})`;
      }
      return `📝 ${form.formName}`;
    }

    if (pageContext.tab) {
      return `📁 ${pageContext.tab.activeTab}`;
    }

    return `📍 ${pageContext.route}`;
  }, [pageContext]);

  // ──────────────────────────────────────────────────────────────────────────
  // Get error message for display
  // ──────────────────────────────────────────────────────────────────────────

  const getErrorMessage = useCallback((): string | null => {
    if (originError && isEmbedded) {
      return 'It seems that I am unable to view the page right now. Please try later or contact DTA Support team.';
    }
    return null;
  }, [originError, isEmbedded]);

  // ──────────────────────────────────────────────────────────────────────────
  // Clear thread ID
  // ──────────────────────────────────────────────────────────────────────────

  const clearThreadId = useCallback(() => {
    setThreadId(null);
  }, [setThreadId]);

  // ──────────────────────────────────────────────────────────────────────────
  // Return hook values
  // ──────────────────────────────────────────────────────────────────────────

  return {
    /** Full page context object */
    pageContext,

    /** Whether the bot is embedded in an iframe */
    isEmbedded,

    /** Whether context has been received */
    hasContext: pageContext !== null,

    /** Current route */
    route: pageContext?.route || null,

    /** Build full context description for AI */
    buildContextDescription,

    /** Get short summary for UI */
    getContextSummary,

    /** Get error message if any */
    getErrorMessage,

    /** Check if modal is open */
    hasModal: pageContext?.modal !== null && pageContext?.modal !== undefined,

    /** Check if in edit mode */
    isEditing: pageContext?.edit?.isEditing || false,

    /** Check if in form */
    hasForm: pageContext?.form !== null && pageContext?.form !== undefined,

    /** Thread ID for OpenAI conversation */
    threadId,

    /** Set thread ID */
    setThreadId,

    /** Clear thread ID */
    clearThreadId,
  };
}
