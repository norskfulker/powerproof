import { useState, useRef } from 'react'; 
import { supabase } from '@/lib/supabase'; 
import { toast } from '@/components/ui/sonner'
 
interface Props { 
  value:    string | null; 
  onChange: (url: string | null) => void; 
  bucket?:  string; 
  folder?:  string; 
  label?:   string; 
  hint?:    string; 
  aspect?:  'square' | 'hero' | 'any'; 
} 
 
function isSupabaseUrl(url: string): boolean { 
  return url.includes('/storage/v1/object/public/'); 
} 
 
function isValidUrl(url: string): boolean { 
  try { new URL(url); return true; } catch { return false; } 
} 

function isBrokenUndefinedUrl(url: string): boolean {
  return url.startsWith('undefined/') || url.includes('://undefined/')
}
 
function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) return null
  const marker = `/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length).trim()
  return path ? path : null
}

export function ImageUploader({ 
  value, onChange, 
  bucket = 'opportunity-images', 
  folder = 'general', 
  label  = 'Image', 
  hint, 
  aspect = 'any', 
}: Props) { 
  const [uploading, setUploading] = useState(false); 
  const [uploadError, setUploadError] = useState<string | null>(null); 
  const [imgError, setImgError]       = useState(false); 
  const inputRef = useRef<HTMLInputElement>(null); 
 
  const prevValue = useRef(value); 
  if (prevValue.current !== value) { 
    prevValue.current = value; 
    setImgError(false); 
  } 

  const safeValue = value && isBrokenUndefinedUrl(value) ? null : value
 
  async function handleFile(file: File) { 
    if (!file) return; 
    if (file.size > 5 * 1024 * 1024) { 
      setUploadError('File too large — max 5MB'); return; 
    } 
    setUploading(true); 
    setUploadError(null); 
    setImgError(false); 

    const existingPath = extractStoragePath(safeValue, bucket)
    if (existingPath) {
      await supabase.storage.from(bucket).remove([existingPath])
    }
 
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'; 
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`; 
 
    const { error } = await supabase.storage 
      .from(bucket) 
      .upload(path, file, { upsert: true, contentType: file.type }); 
 
    if (error) { 
      setUploadError(error.message); 
      toast.error('Upload failed', { description: error.message })
      setUploading(false); 
      return; 
    } 
 
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    onChange(data.publicUrl ?? null); 
    setUploading(false); 
  } 
 
  async function handleRemove() { 
    if (!safeValue) return; 
    if (isSupabaseUrl(safeValue)) { 
      const path = extractStoragePath(safeValue, bucket)
      if (path) await supabase.storage.from(bucket).remove([path]); 
    } 
    onChange(null); 
    setImgError(false); 
  } 
 
  const previewDimensions: Record<string, React.CSSProperties> = { 
    square: { width: '72px',  height: '72px',  borderRadius: '10px' }, 
    hero:   { width: '100%',  height: '160px', borderRadius: '10px' }, 
    any:    { width: '100%',  height: '120px', borderRadius: '10px' }, 
  }; 
 
  const hasValue     = Boolean(safeValue); 
  const isExternal   = hasValue && safeValue! && !isSupabaseUrl(safeValue!); 
  const canPreview   = hasValue && isSupabaseUrl(safeValue!); 
  const showExternal = hasValue && isExternal; 
 
  return ( 
    <div style={{ marginBottom: '20px' }}> 
 
      {label && ( 
        <div style={{ 
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', 
          textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', 
          marginBottom: '4px', fontFamily: 'var(--font-sans)', 
        }}> 
          {label} 
        </div> 
      )} 
      {hint && ( 
        <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px', opacity: 0.75 }}> 
          {hint} 
        </div> 
      )} 
 
      {canPreview && !imgError && ( 
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px', width: aspect === 'square' ? 'auto' : '100%' }}> 
          <img 
            src={safeValue!} 
            alt="Preview" 
            style={{ ...previewDimensions[aspect], objectFit: 'cover', border: '1px solid hsl(var(--border-default))', display: 'block' }} 
            onError={() => setImgError(true)} 
          /> 
          <button onClick={handleRemove} style={{ 
            position: 'absolute', top: '-8px', right: '-8px', 
            width: '22px', height: '22px', borderRadius: '50%', 
            background: 'hsl(var(--destructive))', color: '#fff', 
            border: 'none', cursor: 'pointer', fontSize: '11px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontWeight: 700, 
          }}>✕</button> 
        </div> 
      )} 
 
      {showExternal && ( 
        <div style={{ 
          marginBottom: '8px', padding: '10px 12px', 
          background: 'hsl(var(--bg-sunken))', 
          border: '1px solid hsl(var(--border-default))', 
          borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', 
        }}> 
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '8px', 
            overflow: 'hidden', flexShrink: 0, 
            border: '1px solid hsl(var(--border-subtle))', 
            background: 'hsl(var(--background))', 
          }}> 
            <img 
              src={safeValue!} 
              alt="" 
              crossOrigin="anonymous" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => { 
                (e.target as HTMLImageElement).style.display = 'none'; 
              }} 
            /> 
          </div> 
          <div style={{ flex: 1, minWidth: 0 }}> 
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '2px' }}> 
              External image URL 
            </div> 
            <div style={{ 
              fontSize: '11px', color: 'hsl(var(--muted-foreground))', 
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
              fontFamily: 'monospace', 
            }}> 
              {safeValue} 
            </div> 
          </div> 
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}> 
            <a href={safeValue!} target="_blank" rel="noopener noreferrer" 
              style={{ 
                fontSize: '12px', padding: '5px 10px', borderRadius: '7px', 
                background: 'hsl(var(--bg-surface))', color: 'hsl(var(--primary))', 
                border: '1px solid hsl(var(--border-default))', 
                textDecoration: 'none', fontWeight: 500, 
              }}> 
              View ↗ 
            </a> 
            <button onClick={handleRemove} style={{ 
              fontSize: '12px', padding: '5px 10px', borderRadius: '7px', 
              background: 'transparent', color: 'hsl(var(--destructive))', 
              border: '1px solid hsl(var(--red-100))', 
              cursor: 'pointer', fontWeight: 500, 
            }}> 
              Remove 
            </button> 
          </div> 
        </div> 
      )} 
 
      <div 
        onClick={() => !uploading && inputRef.current?.click()} 
        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--primary))'; }} 
        onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border-default))'; }} 
        onDrop={e => { 
          e.preventDefault(); 
          (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border-default))'; 
          const file = e.dataTransfer.files[0]; 
          if (file) handleFile(file); 
        }} 
        style={{ 
          border: `2px dashed ${uploading ? 'hsl(var(--primary))' : 'hsl(var(--border-default))'}`, 
          borderRadius: '10px', padding: '14px', 
          textAlign: 'center', cursor: uploading ? 'wait' : 'pointer', 
          transition: 'border-color 0.15s ease', 
          background: 'hsl(var(--background))', 
        }} 
      > 
        <div style={{ fontSize: '18px', marginBottom: '4px' }}> 
          {uploading ? '⏳' : '📁'} 
        </div> 
        <div style={{ fontSize: '13px', color: 'hsl(var(--foreground))', fontWeight: 500 }}> 
          {uploading ? 'Uploading...' : 'Upload from device'} 
        </div> 
        <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}> 
          JPG, PNG, WebP, SVG — max 5MB — uploaded to Supabase Storage 
        </div> 
      </div> 
 
      <input 
        ref={inputRef} 
        type="file" 
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml" 
        style={{ display: 'none' }} 
        onChange={e => { 
          const f = e.target.files?.[0]; 
          if (f) handleFile(f); 
          e.target.value = ''; 
        }} 
      /> 
 
      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}> 
        <input 
          type="url" 
          placeholder="Or paste an image URL..." 
          value={(!canPreview && hasValue) ? safeValue! : ''} 
          onChange={e => { 
            const v = e.target.value.trim(); 
            setImgError(false); 
            onChange(v || null); 
          }} 
          style={{ 
            flex: 1, height: '34px', padding: '0 10px', 
            borderRadius: '8px', 
            border: '1px solid hsl(var(--border-default))', 
            background: 'hsl(var(--background))', 
            fontSize: '12px', fontFamily: 'monospace', 
            color: 'hsl(var(--foreground))', outline: 'none', 
          }} 
          onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }} 
          onBlur={e => { e.currentTarget.style.borderColor = 'hsl(var(--border-default))'; }} 
        /> 
      </div> 
 
      {uploadError && ( 
        <div style={{ fontSize: '12px', color: 'hsl(var(--destructive))', marginTop: '6px' }}> 
          ⚠ {uploadError} 
        </div> 
      )} 
    </div> 
  ); 
} 
