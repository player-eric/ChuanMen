import { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useColors } from '@/hooks/useColors';

/* ═══ Toolbar Button ═══ */
function TBtn({
  active,
  onClick,
  children,
  accentBg,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accentBg: string;
}) {
  const c = useColors();
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        border: `1px solid ${c.line}`,
        background: active ? accentBg : 'transparent',
        color: active ? c.blue : c.text2,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        lineHeight: 1.2,
      }}
    >
      {children}
    </button>
  );
}

/* ═══ RichTextEditor ═══ */
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const c = useColors();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const accentBg = c.blue + '20';

  return (
    <div style={{ border: `1px solid ${c.line}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          padding: '8px 10px',
          borderBottom: `1px solid ${c.line}`,
          background: c.s1,
        }}
      >
        <TBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} accentBg={accentBg}>B</TBtn>
        <TBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} accentBg={accentBg}><i>I</i></TBtn>
        <TBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} accentBg={accentBg}>H2</TBtn>
        <TBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} accentBg={accentBg}>H3</TBtn>
        <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} accentBg={accentBg}>List</TBtn>
        <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} accentBg={accentBg}>1.</TBtn>
        <TBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} accentBg={accentBg}>"</TBtn>
        <TBtn active={editor.isActive('link')} onClick={setLink} accentBg={accentBg}>Link</TBtn>
      </div>

      {/* Editor */}
      <div
        style={{ position: 'relative' }}
      >
        <EditorContent
          editor={editor}
          style={{
            padding: 0,
          }}
        />
        <style>{`
          .tiptap.ProseMirror {
            padding: 12px;
            min-height: 120px;
            outline: none;
            font-size: 14px;
            line-height: 1.7;
            color: ${c.text};
          }
          .tiptap.ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: ${c.text3};
            pointer-events: none;
            height: 0;
            font-style: italic;
          }
          .tiptap.ProseMirror h2 { font-size: 18px; font-weight: 700; margin: 12px 0 6px; }
          .tiptap.ProseMirror h3 { font-size: 16px; font-weight: 700; margin: 10px 0 4px; }
          .tiptap.ProseMirror ul, .tiptap.ProseMirror ol { padding-left: 20px; margin: 6px 0; }
          .tiptap.ProseMirror li { margin: 2px 0; }
          .tiptap.ProseMirror blockquote {
            border-left: 3px solid ${c.warm};
            padding-left: 12px;
            margin: 8px 0;
            color: ${c.text2};
          }
          .tiptap.ProseMirror a { color: ${c.blue}; text-decoration: underline; }
          .tiptap.ProseMirror p { margin: 4px 0; }
        `}</style>
      </div>
    </div>
  );
}

/* ═══ RichTextViewer (read-only) ═══ */
export function RichTextViewer({ html }: { html: string }) {
  const c = useColors();

  if (!html) return null;

  return (
    <div>
      <div
        className="rich-text-viewer"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .rich-text-viewer {
          font-size: 14px;
          line-height: 1.7;
          color: ${c.text};
        }
        .rich-text-viewer h2 { font-size: 18px; font-weight: 700; margin: 12px 0 6px; }
        .rich-text-viewer h3 { font-size: 16px; font-weight: 700; margin: 10px 0 4px; }
        .rich-text-viewer ul, .rich-text-viewer ol { padding-left: 20px; margin: 6px 0; }
        .rich-text-viewer li { margin: 2px 0; }
        .rich-text-viewer blockquote {
          border-left: 3px solid ${c.warm};
          padding-left: 12px;
          margin: 8px 0;
          color: ${c.text2};
        }
        .rich-text-viewer a { color: ${c.blue}; text-decoration: underline; }
        .rich-text-viewer p { margin: 4px 0; }
        .rich-text-viewer strong { font-weight: 700; }
      `}</style>
    </div>
  );
}
