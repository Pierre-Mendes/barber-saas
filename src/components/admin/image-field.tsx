"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ImageFieldProps {
  label: string
  /** Campo do arquivo (`logoFile`, `bannerFile`…). */
  fileName: string
  /** Campo com a URL atual (`logoUrl`…): mantém, troca ou remove a imagem. */
  urlName: string
  currentUrl?: string | null
  /** Upload habilitado (storage configurado). Sem isso, o campo vira uma URL digitada. */
  uploadEnabled: boolean
  aspect?: "square" | "wide" | "round"
  hint?: string
}

/**
 * Imagem com pré-visualização. Com storage (MinIO/S3), a pessoa só anexa um arquivo do
 * computador ou celular; a URL atual vai num campo oculto (vazio = remover).
 */
export function ImageField({ label, fileName, urlName, currentUrl, uploadEnabled, aspect = "square", hint }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [url, setUrl] = useState(currentUrl ?? "")
  const [fileLabel, setFileLabel] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  function remove() {
    setUrl("")
    setPreview(null)
    setFileLabel(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!uploadEnabled}
          onClick={() => inputRef.current?.click()}
          aria-label={`Escolher ${label.toLowerCase()}`}
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden border bg-background transition enabled:cursor-pointer enabled:hover:border-primary",
            aspect === "square" && "size-20 rounded-lg",
            aspect === "round" && "size-20 rounded-full",
            aspect === "wide" && "h-20 w-36 rounded-lg",
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          {uploadEnabled ? (
            <>
              <input
                ref={inputRef}
                type="file"
                name={fileName}
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    setPreview(URL.createObjectURL(file))
                    setFileLabel(file.name)
                  }
                }}
              />
              <input type="hidden" name={urlName} value={url} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                  <UploadIcon /> {preview ? "Trocar imagem" : "Anexar imagem"}
                </Button>
                {preview && (
                  <Button type="button" variant="ghost" size="sm" onClick={remove}>
                    <Trash2Icon /> Remover
                  </Button>
                )}
              </div>
              {fileLabel && <p className="truncate text-xs text-muted-foreground">{fileLabel} · salva ao enviar o formulário</p>}
            </>
          ) : (
            <Input
              name={urlName}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value)
                setPreview(event.target.value || null)
              }}
              placeholder="https://…"
              className="h-8 text-xs"
            />
          )}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
