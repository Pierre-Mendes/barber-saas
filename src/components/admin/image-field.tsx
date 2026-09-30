"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ImageFieldProps {
  label: string
  /** Campo do arquivo (`logoFile`, `bannerFile`…). */
  fileName: string
  /** Campo da URL alternativa (`logoUrl`…). */
  urlName: string
  currentUrl?: string | null
  /** Upload habilitado (storage configurado). Sem isso, só URL. */
  uploadEnabled: boolean
  aspect?: "square" | "wide"
  hint?: string
}

/** Imagem com pré-visualização: envia arquivo (storage S3) ou aceita URL. */
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

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background",
            aspect === "square" ? "size-20" : "h-20 w-36",
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {uploadEnabled && (
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
              <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                <UploadIcon /> {fileLabel ? "Trocar imagem" : "Enviar imagem"}
              </Button>
              {fileLabel && <p className="truncate text-xs text-muted-foreground">{fileLabel}</p>}
            </>
          )}
          <Input
            name={urlName}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              if (!fileLabel) {
                setPreview(event.target.value || null)
              }
            }}
            placeholder={uploadEnabled ? "…ou cole uma URL" : "https://…"}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
