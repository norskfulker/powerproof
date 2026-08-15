import { Editor, EditorContent } from '@tiptap/react'
import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export const RichTextEditor = ({ editor }: { editor: Editor | null }) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const styles = useMemo(
    () => ({
      root: {
        border: '1px solid hsl(var(--border-default))',
        borderRadius: '10px',
        overflow: 'hidden',
        background: 'hsl(var(--bg-surface))',
      } as const,
      toolbar: {
        display: 'flex',
        gap: '2px',
        padding: '6px 8px',
        flexWrap: 'wrap',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        background: 'hsl(var(--bg-sunken))',
      } as const,
      divider: {
        width: '1px',
        background: 'hsl(var(--border-subtle))',
        margin: '0 4px',
        alignSelf: 'stretch',
      } as const,
      content: {
        minHeight: '140px',
        maxHeight: '320px',
        overflowY: 'auto',
      } as const,
      toolBtn: (active: boolean) =>
        ({
          padding: '4px 8px',
          borderRadius: '5px',
          border: 'none',
          background: active ? 'hsl(var(--primary) / 0.15)' : 'transparent',
          color: active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 400,
          lineHeight: 1,
        }) as const,
    }),
    [],
  )

  if (!editor) return null

  const ToolButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void
    active: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      style={styles.toolBtn(active)}
    >
      {children}
    </button>
  )

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolButton>

        <div style={styles.divider} />

        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          H2
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Sub-heading"
        >
          H3
        </ToolButton>

        <div style={styles.divider} />

        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          • List
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          1. List
        </ToolButton>

        <div style={styles.divider} />

        <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Left">
          ≡L
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
          ≡C
        </ToolButton>

        <div style={styles.divider} />

        <ToolButton
          onClick={() => { setLinkUrl(''); setLinkDialogOpen(true) }}
          active={editor.isActive('link')}
          title="Add link"
        >
          🔗
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().unsetLink().run()} active={false} title="Remove link">
          🔗✕
        </ToolButton>

        <ToolButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
          ↩
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
          ↪
        </ToolButton>
      </div>

      <EditorContent editor={editor} style={styles.content} />

      <style>{`
        .ProseMirror {
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.6;
          color: hsl(var(--foreground));
          outline: none;
          min-height: 140px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          float: left;
          height: 0;
        }
        .ProseMirror h2 { font-size: 16px; font-weight: 400; margin: 8px 0 4px; }
        .ProseMirror h3 { font-size: 14px; font-weight: 400; margin: 8px 0 4px; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin: 4px 0; }
        .ProseMirror li { margin: 2px 0; }
        .ProseMirror a { color: hsl(var(--primary)); text-decoration: underline; }
        .ProseMirror strong { font-weight: 400; }
        .ProseMirror em { font-style: italic; }
      `}</style>

      <Dialog open={linkDialogOpen} onOpenChange={(open) => { if (!open) setLinkDialogOpen(false) }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <input
            type="url"
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm"
            placeholder="https://powerproof.live"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (linkUrl) editor?.chain().focus().setLink({ href: linkUrl }).run()
                setLinkDialogOpen(false)
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => {
              if (linkUrl) editor?.chain().focus().setLink({ href: linkUrl }).run()
              setLinkDialogOpen(false)
            }}>Add link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

