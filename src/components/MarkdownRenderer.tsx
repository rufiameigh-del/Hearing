import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines
  const lines = content.split("\n");
  const parsedElements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      parsedElements.push(
        <ul key={`list-${key}`} className="list-disc pl-6 space-y-1.5 my-3 text-slate-700 leading-relaxed text-xs">
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`} dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const parseInlineMarkdown = (text: string) => {
    // Replace **bold** with strong
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-900'>$1</strong>");
    // Replace *italic* with em
    formatted = formatted.replace(/\*(.*?)\*/g, "<em class='italic text-slate-800'>$1</em>");
    // Replace `code` with code styling
    formatted = formatted.replace(/`(.*?)`/g, "<code class='font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200'>$1</code>");
    return formatted;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        inList = true;
      }
      listItems.push(trimmed.substring(2));
      return;
    } else {
      if (inList) {
        flushList(`flush-${index}`);
      }
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      parsedElements.push(
        <h4
          key={`h3-${index}`}
          className="text-sm font-bold text-slate-800 tracking-tight mt-6 mb-3 border-l-4 border-teal-500 pl-2.5 flex items-center gap-1"
          dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed.substring(4)) }}
        />
      );
    } else if (trimmed.startsWith("## ")) {
      parsedElements.push(
        <h3
          key={`h2-${index}`}
          className="text-base font-extrabold text-slate-900 tracking-tight mt-8 mb-4 border-b border-slate-200 pb-1.5"
          dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed.substring(3)) }}
        />
      );
    } else if (trimmed.startsWith("# ")) {
      parsedElements.push(
        <h2
          key={`h1-${index}`}
          className="text-lg font-black text-slate-950 tracking-tight mt-10 mb-5 text-center bg-teal-50/50 py-2 border border-teal-100/50 rounded-lg"
          dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed.substring(2)) }}
        />
      );
    }
    // Blockquote
    else if (trimmed.startsWith("> ")) {
      parsedElements.push(
        <div
          key={`quote-${index}`}
          className="border-l-4 border-amber-400 bg-amber-50/40 p-3.5 my-4 rounded-r-lg text-slate-600 text-xs italic leading-relaxed"
          dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed.substring(2)) }}
        />
      );
    }
    // Paragraph
    else if (trimmed.length > 0) {
      parsedElements.push(
        <p
          key={`p-${index}`}
          className="text-slate-600 text-xs leading-relaxed my-3 text-justify"
          dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(trimmed) }}
        />
      );
    } else {
      // Empty line - just spacing
      parsedElements.push(<div key={`space-${index}`} className="h-1" />);
    }
  });

  // Flush remaining list items
  if (inList) {
    flushList("final");
  }

  return <div className="font-sans text-slate-800 space-y-1">{parsedElements}</div>;
}
