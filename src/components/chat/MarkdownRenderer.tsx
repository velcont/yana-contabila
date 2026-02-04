import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // Pre-process content to fix common formatting issues
  const processedContent = preprocessMarkdown(content);

  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-foreground mt-5 mb-2 pb-1 border-b border-border/50">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-foreground mt-3 mb-1">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-3 text-foreground last:mb-0">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">
              {children}
            </li>
          ),
          
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-muted-foreground">
              {children}
            </em>
          ),
          
          // Code blocks
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-foreground">
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("block p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto", className)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto">
              {children}
            </pre>
          ),
          
          // Tables - properly styled
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-lg border border-border">
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-foreground">
              {children}
            </td>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-3 bg-primary/5 rounded-r-lg italic">
              {children}
            </blockquote>
          ),
          
          // Horizontal rules
          hr: () => (
            <hr className="my-4 border-t border-border" />
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

// Pre-process markdown to fix common issues
function preprocessMarkdown(content: string): string {
  let processed = content;
  
  // Ensure proper spacing after headers
  processed = processed.replace(/^(#{1,6}\s.+)$/gm, '\n$1\n');
  
  // Fix double asterisks that might break
  processed = processed.replace(/\*\*\*\*/g, '**');
  
  // Ensure lists have proper spacing
  processed = processed.replace(/^([•\-\*]\s)/gm, '- ');
  
  // Fix emoji bullets (• → proper list item)
  processed = processed.replace(/^•\s/gm, '- ');
  
  // Clean up excessive newlines
  processed = processed.replace(/\n{4,}/g, '\n\n\n');
  
  // Ensure proper spacing between sections
  processed = processed.replace(/(\*\*[^*]+\*\*:)\s*\n/g, '$1\n\n');
  
  return processed.trim();
}

export default MarkdownRenderer;
