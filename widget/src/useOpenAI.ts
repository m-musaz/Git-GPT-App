import { useState, useEffect, useCallback } from 'react';

// OpenAI Apps SDK Widget interface (2025)
// Reference: https://developers.openai.com/apps-sdk/build/mcp-server/
export interface OpenAIWidget {
  // Data from tool response
  toolOutput?: Record<string, unknown> | null;
  toolInput?: Record<string, unknown> | null;
  toolResponseMetadata?: Record<string, unknown> | null;
  widgetState?: Record<string, unknown> | null;
  
  // Context signals
  theme?: 'light' | 'dark';
  displayMode?: string;
  maxHeight?: number;
  maxWidth?: number;
  safeArea?: { top: number; bottom: number; left: number; right: number };
  view?: string;
  userAgent?: string;
  locale?: string;
  subjectId?: string;
  
  // APIs
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  openExternal?: (options: { href: string }) => void;
  sendFollowUpMessage?: (message: string) => void;
  notifyIntrinsicHeight?: (height: number) => void;
  setWidgetState?: (state: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => void;
  updateWidgetState?: (state: Record<string, unknown>) => void;
  requestDisplayMode?: (mode: string) => void;
  requestModal?: (options: unknown) => void;
  uploadFile?: (file: File) => Promise<unknown>;
  getFileDownloadUrl?: (fileId: string) => Promise<string>;
}

declare global {
  interface Window {
    openai?: OpenAIWidget;
  }
}

export function useOpenAI<T = unknown>() {
  const [openai, setOpenai] = useState<OpenAIWidget | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update state from window.openai
  const updateFromGlobals = useCallback(() => {
    if (window.openai) {
      console.log('[Widget] Updating from globals');
      console.log('[Widget] toolOutput:', window.openai.toolOutput);
      console.log('[Widget] theme:', window.openai.theme);
      
      setOpenai(window.openai);
      setData((window.openai.toolOutput as T) ?? null);
      setTheme(window.openai.theme || 'light');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen for the openai:set_globals event
    // ChatGPT dispatches this event when tool output is ready
    const handleSetGlobals = (event: Event) => {
      console.log('[Widget] Received openai:set_globals event', event);
      updateFromGlobals();
    };

    // Add event listener for when ChatGPT updates the globals
    window.addEventListener('openai:set_globals', handleSetGlobals);

    // Also check immediately in case data is already available
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds max

    const checkOpenAI = () => {
      attempts++;
      
      try {
        if (window.openai) {
          console.log('[Widget] window.openai found (attempt', attempts, ')');
          console.log('[Widget] Keys:', Object.keys(window.openai));
          console.log('[Widget] toolOutput:', window.openai.toolOutput);
          console.log('[Widget] toolInput:', window.openai.toolInput);
          
          // If toolOutput is available, use it
          if (window.openai.toolOutput !== null && window.openai.toolOutput !== undefined) {
            console.log('[Widget] toolOutput available, using it');
            updateFromGlobals();
            return;
          }
          
          // If toolOutput is null, wait for openai:set_globals event
          // But also retry a few times in case it's populated asynchronously
          if (attempts < 15) {
            console.log('[Widget] toolOutput is null, waiting...');
            setTimeout(checkOpenAI, 200);
            return;
          }
          
          // After waiting, use whatever we have
          console.log('[Widget] Using current state after waiting');
          updateFromGlobals();
        } else if (attempts < maxAttempts) {
          setTimeout(checkOpenAI, 100);
        } else {
          console.log('[Widget] Timeout - window.openai not available');
          setError('OpenAI widget context not available');
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[Widget] Error:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    checkOpenAI();

    // Cleanup
    return () => {
      window.removeEventListener('openai:set_globals', handleSetGlobals);
    };
  }, [updateFromGlobals]);

  const callTool = async (name: string, args: Record<string, unknown>) => {
    if (!openai?.callTool) throw new Error('OpenAI not initialized');
    return openai.callTool(name, args);
  };

  const openExternal = (options: { href: string } | string) => {
    const href = typeof options === 'string' ? options : options.href;
    if (openai?.openExternal) {
      // ChatGPT's openExternal expects { href: url } object
      (openai.openExternal as (opt: { href: string }) => void)({ href });
    } else {
      window.open(href, '_blank');
    }
  };

  const sendFollowUp = (message: string) => {
    if (openai?.sendFollowUpMessage) {
      openai.sendFollowUpMessage(message);
    }
  };

  const notifyHeight = () => {
    if (openai?.notifyIntrinsicHeight) {
      openai.notifyIntrinsicHeight(document.body.scrollHeight);
    }
  };

  const setWidgetState = (state: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => {
    if (openai?.setWidgetState) {
      openai.setWidgetState(state);
    } else if (openai?.updateWidgetState && typeof state === 'object') {
      openai.updateWidgetState(state as Record<string, unknown>);
    }
  };

  return {
    openai,
    data,
    theme,
    isLoading,
    error,
    callTool,
    openExternal,
    sendFollowUp,
    notifyHeight,
    setWidgetState,
  };
}
