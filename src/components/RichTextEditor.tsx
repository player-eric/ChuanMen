import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { useNavigate } from 'react-router';
import { useColors } from '@/hooks/useColors';

/* ═══ Types ═══ */
export interface MentionMember {
  id: string;
  name: string;
  avatar?: string;
}

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

/* ═══ Mention Suggestion List ═══ */
interface MentionListProps {
  items: MentionMember[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList(props, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [props.items]);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) props.command({ id: item.id, label: item.name });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % props.items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (props.items.length === 0) return null;

    return (
      <div
        style={{
          background: '#1c1c1f',
          border: '1px solid #333',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          maxHeight: 240,
          overflowY: 'auto',
          minWidth: 180,
        }}
      >
        {props.items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => selectItem(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: index === selectedIndex ? 'rgba(78,154,241,0.15)' : 'transparent',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: item.avatar
                  ? `url(${item.avatar}) center/cover`
                  : `hsl(${item.name.charCodeAt(0) * 37 % 360}, 50%, 45%)`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#fff',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {!item.avatar && (item.name[0] ?? '?')}
            </span>
            <span style={{ fontWeight: 500 }}>{item.name}</span>
          </button>
        ))}
      </div>
    );
  },
);

/* ═══ RichTextEditor ═══ */
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  members?: MentionMember[];
  compact?: boolean;
  editorRef?: React.MutableRefObject<{ clear: () => void; getHTML: () => string } | null>;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  members,
  compact,
  editorRef,
}: RichTextEditorProps) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const membersRef = useRef<MentionMember[]>(members ?? []);

  // Keep ref in sync so the suggestion closure always sees latest members
  useEffect(() => {
    membersRef.current = members ?? [];
  }, [members]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: {
          items: ({ query }: { query: string }) => {
            const q = query.toLowerCase();
            return membersRef.current
              .filter((m) => m.name.toLowerCase().includes(q))
              .slice(0, 8);
          },
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: HTMLDivElement | null = null;

            return {
              onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(MentionList, {
                  props: { items: props.items, command: props.command },
                  editor: props.editor,
                });

                popup = document.createElement('div');
                popup.style.position = 'fixed';
                popup.style.zIndex = '99999';
                document.body.appendChild(popup);
                popup.appendChild(component.element);

                const rect = props.clientRect?.();
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 4}px`;
                }
              },
              onUpdate: (props: SuggestionProps) => {
                component?.updateProps({ items: props.items, command: props.command });
                const rect = props.clientRect?.();
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 4}px`;
                }
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === 'Escape') {
                  popup?.remove();
                  component?.destroy();
                  popup = null;
                  component = null;
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.remove();
                component?.destroy();
                popup = null;
                component = null;
              },
            };
          },
        },
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  // Expose imperative methods to parent
  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = {
        clear: () => editor.commands.clearContent(),
        getHTML: () => editor.getHTML(),
      };
    }
  }, [editor, editorRef]);

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
  const showToolbar = !compact;

  return (
    <div style={{ border: `1px solid ${c.line}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      {showToolbar && (
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
          {!compact && (
            <>
              <TBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} accentBg={accentBg}>H2</TBtn>
              <TBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} accentBg={accentBg}>H3</TBtn>
            </>
          )}
          <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} accentBg={accentBg}>List</TBtn>
          {!compact && (
            <>
              <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} accentBg={accentBg}>1.</TBtn>
              <TBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} accentBg={accentBg}>"</TBtn>
            </>
          )}
          <TBtn active={editor.isActive('link')} onClick={setLink} accentBg={accentBg}>Link</TBtn>
        </div>
      )}

      {/* Editor */}
      <div style={{ position: 'relative' }}>
        <EditorContent
          editor={editor}
          style={{ padding: 0 }}
        />
        <style>{`
          .tiptap.ProseMirror {
            padding: 12px;
            min-height: ${compact ? '48px' : '120px'};
            outline: none;
            font-size: 14px;
            line-height: 1.7;
            color: ${c.text};
          }
          .tiptap.ProseMirror p.is-editor-empty:first-child::before {
            content: "${placeholder?.replace(/"/g, '\\"') ?? ''}";
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
          .tiptap.ProseMirror .mention {
            color: ${c.blue};
            background: ${c.blue}15;
            padding: 1px 4px;
            border-radius: 4px;
            font-weight: 600;
            cursor: default;
          }
        `}</style>
      </div>
    </div>
  );
}

/* ═══ RichTextViewer (read-only) ═══ */
export function RichTextViewer({ html }: { html: string }) {
  const c = useColors();
  const navigate = useNavigate();

  if (!html) return null;

  const handleClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-type="mention"]') as HTMLElement | null;
    if (!el) return;
    const label = el.getAttribute('data-label') || el.textContent?.replace(/^@/, '') || '';
    if (label) navigate(`/members/${encodeURIComponent(label)}`);
  };

  return (
    <div>
      <div
        className="rich-text-viewer"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />
      <style>{`
        .rich-text-viewer {
          font-size: 14px;
          line-height: 1.7;
          color: ${c.text};
        }
        .rich-text-viewer h2 { font-size: 18px; font-weight: 700; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 2px solid ${c.warm}50; }
        .rich-text-viewer h3 { font-size: 16px; font-weight: 700; margin: 14px 0 4px; color: ${c.warm}; }
        .rich-text-viewer ul { padding-left: 20px; margin: 6px 0; list-style: disc; }
        .rich-text-viewer ol { padding-left: 20px; margin: 6px 0; list-style: decimal; }
        .rich-text-viewer li { margin: 2px 0; display: list-item; }
        .rich-text-viewer blockquote {
          border-left: 3px solid ${c.warm};
          padding-left: 12px;
          margin: 8px 0;
          color: ${c.text2};
        }
        .rich-text-viewer a { color: ${c.blue}; text-decoration: underline; }
        .rich-text-viewer p { margin: 4px 0; }
        .rich-text-viewer strong { font-weight: 700; }
        .rich-text-viewer .mention,
        .rich-text-viewer span[data-type="mention"] {
          color: ${c.blue};
          background: ${c.blue}15;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
