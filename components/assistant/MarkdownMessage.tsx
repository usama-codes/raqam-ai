"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// ─── Assistant reply renderer ───────────────────────────────────────────────────
//
// Gemini returns Urdu prose peppered with `**bold**` labels, `-` bullet lists,
// `1.` numbered lists and the occasional table. Rendered as a raw string those
// markers leak through as literal text, so we parse them here.
//
// Two remark plugins:
//   • remark-gfm    — tables, strikethrough, task lists, autolinks
//   • remark-breaks — treat a single newline as a line break. LLMs emit `\n`
//     expecting it to show; without this, soft-wrapped lines collapse together.
//
// Every element is restyled for the RTL Nastaliq reading surface: running text
// keeps the tall `font-reading` line-height, while headings and list rows use a
// tighter leading so they don't drift apart. `ps-*` / `border-s-*` are logical
// properties — they resolve to the right-hand side under `dir="rtl"`.
//
// No `rehype-raw`: embedded HTML in model output stays inert (escaped), so there
// is no injection surface.

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 leading-[2.3] last:mb-0">{children}</p>,

  strong: ({ children }) => (
    <strong className="font-bold text-[#0F5132]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-[#8A9690] line-through">{children}</del>
  ),

  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-[#0F5132] underline underline-offset-2"
    >
      {children}
    </a>
  ),

  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 ps-[1.4em] leading-[2] marker:text-[#0F5132] last:mb-0 [&_ul]:mb-0 [&_ul]:mt-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 ps-[1.5em] leading-[2] marker:text-[#0F5132] last:mb-0 [&_ol]:mb-0 [&_ol]:mt-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="ps-1">{children}</li>,

  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 text-[19px] font-bold leading-[1.9] first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-4 text-[18px] font-bold leading-[1.9] first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-2 mt-3 text-[17px] font-bold leading-[1.85] first:mt-0">
      {children}
    </h5>
  ),
  h4: ({ children }) => (
    <h6 className="mb-1.5 mt-3 text-[16px] font-bold leading-[1.8] first:mt-0">
      {children}
    </h6>
  ),

  blockquote: ({ children }) => (
    <blockquote className="my-3 border-s-[3px] border-[#E8B931] ps-3 text-[#4C5A52]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-[#E7E2D6]" />,

  code: ({ children }) => (
    <code
      dir="ltr"
      className="rounded bg-[#F1EEE4] px-1.5 py-0.5 font-[var(--font-geist-mono)] text-[0.85em]"
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre
      dir="ltr"
      className="my-3 overflow-x-auto rounded-[10px] bg-[#F1EEE4] p-3 text-start text-[13px] leading-[1.7] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13px]"
    >
      {children}
    </pre>
  ),

  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[14px] leading-normal">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[#E7E2D6] bg-[#F7F4EC] px-3 py-2 text-start font-bold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#E7E2D6] px-3 py-2 text-start">{children}</td>
  ),

  input: ({ checked, type }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={checked ?? false}
        readOnly
        className="me-1.5 align-middle accent-[#0F5132]"
      />
    ) : null,
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
