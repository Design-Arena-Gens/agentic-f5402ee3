"use client";

import { useRef, useState, useEffect, useMemo } from 'react'
import { Editor } from '@/components/Editor'

export default function Page() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Product Pic Designer</h1>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.currentTarget.value = ''
            }}
          />
          <button
            className="rounded-md bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload image
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="border rounded-lg overflow-hidden bg-gray-50 min-h-[460px] flex items-center justify-center p-3">
          <Editor imageUrl={imageUrl} />
        </div>
        <div className="border rounded-lg p-4 h-fit sticky top-6 bg-white">
          <Editor.Panel />
        </div>
      </section>

      <footer className="text-xs text-gray-500">
        Works entirely in your browser. No uploads leave your device.
      </footer>
    </main>
  )
}
