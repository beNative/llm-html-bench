import React, { useEffect, useRef, useState } from 'react';

export interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
}

interface IsolatedFrameProps {
  html: string;
  width?: string;
  height?: string;
  zoom?: number;
  reloadKey?: number;
  onConsoleMessage?: (entry: ConsoleEntry) => void;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  syncScrollTop?: number;
  id?: string;
}

export const IsolatedFrame: React.FC<IsolatedFrameProps> = ({
  html,
  width = '100%',
  height = '100%',
  zoom = 1,
  reloadKey = 0,
  onConsoleMessage,
  onScroll,
  syncScrollTop,
  id,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameSrc, setFrameSrc] = useState<string>('');

  useEffect(() => {
    // Interceptor script to safely capture errors & console calls inside iframe
    const interceptor = `
      <script>
        (function() {
          const send = (type, args) => {
            try {
              const msg = args.map(a => {
                if (typeof a === 'object') {
                  try { return JSON.stringify(a); } catch(e) { return String(a); }
                }
                return String(a);
              }).join(' ');
              window.parent.postMessage({
                source: 'llm-html-bench-preview',
                type: type,
                message: msg,
                timestamp: new Date().toLocaleTimeString()
              }, '*');
            } catch(e) {}
          };

          const origLog = console.log;
          const origWarn = console.warn;
          const origError = console.error;
          const origInfo = console.info;

          console.log = function(...args) { origLog.apply(console, args); send('log', args); };
          console.warn = function(...args) { origWarn.apply(console, args); send('warn', args); };
          console.error = function(...args) { origError.apply(console, args); send('error', args); };
          console.info = function(...args) { origInfo.apply(console, args); send('info', args); };

          window.onerror = function(message, source, lineno, colno, error) {
            send('error', [message + ' (line ' + lineno + ':' + colno + ')']);
            return false;
          };

          window.onunhandledrejection = function(event) {
            send('error', ['Unhandled Promise Rejection: ' + (event.reason ? event.reason.message || event.reason : 'unknown')]);
          };

          // Scroll sync listener
          window.addEventListener('scroll', function() {
            try {
              window.parent.postMessage({
                source: 'llm-html-bench-scroll',
                scrollTop: window.scrollY,
                scrollHeight: document.documentElement.scrollHeight
              }, '*');
            } catch(e) {}
          }, { passive: true });

          window.addEventListener('message', function(e) {
            if (e.data && e.data.action === 'syncScroll' && typeof e.data.scrollTop === 'number') {
              window.scrollTo(0, e.data.scrollTop);
            }
          });
        })();
      </script>
    `;

    // Inject interceptor at the start of <head> or prepend to document
    let preparedHtml = html;
    if (preparedHtml.includes('<head>')) {
      preparedHtml = preparedHtml.replace('<head>', `<head>${interceptor}`);
    } else if (preparedHtml.includes('<html>')) {
      preparedHtml = preparedHtml.replace('<html>', `<html><head>${interceptor}</head>`);
    } else {
      preparedHtml = `<!DOCTYPE html><html><head>${interceptor}</head><body>${preparedHtml}</body></html>`;
    }

    const blob = new Blob([preparedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setFrameSrc(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html, reloadKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.source === 'llm-html-bench-preview' && onConsoleMessage) {
        onConsoleMessage({
          type: event.data.type || 'log',
          message: event.data.message || '',
          timestamp: event.data.timestamp || new Date().toLocaleTimeString(),
        });
      }

      if (event.data.source === 'llm-html-bench-scroll' && onScroll) {
        onScroll(event.data.scrollTop, event.data.scrollHeight);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleMessage, onScroll]);

  // Sync scroll from parent
  useEffect(() => {
    if (typeof syncScrollTop === 'number' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ action: 'syncScroll', scrollTop: syncScrollTop }, '*');
    }
  }, [syncScrollTop]);

  const isFluid = width === '100%' && height === '100%';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: isFluid ? 'stretch' : 'center',
        justifyContent: isFluid ? 'stretch' : 'center',
        overflow: 'auto',
        backgroundColor: 'var(--bg-primary)',
        padding: isFluid ? '0' : '12px',
      }}
    >
      <div
        style={{
          width: width,
          height: height,
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          transformOrigin: 'top left',
          transition: 'transform 0.15s ease',
          backgroundColor: '#ffffff',
          borderRadius: isFluid ? '0' : 'var(--radius-md)',
          boxShadow: isFluid ? 'none' : 'var(--shadow-md)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <iframe
          ref={iframeRef}
          id={id}
          src={frameSrc}
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            backgroundColor: '#ffffff',
          }}
          title="LLM Generated HTML Preview"
        />
      </div>
    </div>
  );
};
