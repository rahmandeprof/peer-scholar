import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

/**
 * Renders markdown content with LaTeX math support.
 * Supports both inline math ($...$) and block math ($$...$$).
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Style paragraphs
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    // Style bold text
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    // Style italics
                    em: ({ children }) => <em className="italic">{children}</em>,
                    // Style code blocks
                    code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        return isInline ? (
                            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={`block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto ${className || ''}`} {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Style lists
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    // Style headers
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export default MarkdownContent;
