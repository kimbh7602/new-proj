"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const proseClasses = [
  "prose prose-invert prose-sm max-w-none",
  // Spacing
  "leading-7",
  "[&_p]:mb-3",
  "[&_li]:mb-1.5",
  "[&_pre]:my-4",
  "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white",
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white",
  "[&_ul]:my-3 [&_ol]:my-3",
  "[&_hr]:my-4 [&_hr]:border-zinc-700",
  // Code blocks
  "[&_pre]:bg-zinc-950 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-[13px] [&_pre]:overflow-x-auto",
  "[&_code]:text-[13px] [&_code]:font-mono",
  "[&_:not(pre)>code]:bg-zinc-800 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:text-blue-400",
  // Tables
  "[&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:my-4",
  "[&_th]:text-left [&_th]:text-zinc-400 [&_th]:font-medium [&_th]:py-2 [&_th]:px-3 [&_th]:border-b [&_th]:border-zinc-700 [&_th]:bg-zinc-900",
  "[&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-zinc-800 [&_td]:text-zinc-300",
  "[&_tr:hover]:bg-zinc-800/30",
  // Blockquotes
  "[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-4 [&_blockquote]:text-zinc-400 [&_blockquote]:my-3",
  // Links
  "[&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2",
  // Strong/bold
  "[&_strong]:text-white [&_strong]:font-semibold",
  // Lists
  "[&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:list-decimal [&_ol]:pl-5",
].join(" ");

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${proseClasses} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
