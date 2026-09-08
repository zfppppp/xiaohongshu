'use client';
import { useEffect, useRef } from 'react';

// Optional browser integration; ordinary browsers use the visible export button.
export function useBriefTool(input: string) {
  const current = useRef(input);
  useEffect(() => {
    current.current = input;
  }, [input]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: object,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'read_current_content_brief',
            title: '读取当前内容简报',
            description:
              '返回当前表单生成的完整简报，保留来源和待补证项；不下载文件或改变输入。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(args: unknown) {
              if (
                !args ||
                typeof args !== 'object' ||
                Array.isArray(args) ||
                Object.keys(args).length
              )
                throw Error('此工具不接受参数');
              return {
                markdown: current.current,
                status: 'user_authored_not_verified',
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional capability unavailable. */
      });
    } catch {
      /* Optional capability unavailable. */
    }
    return () => lifecycle.abort();
  }, []);
}
