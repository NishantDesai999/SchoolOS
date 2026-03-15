import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Upload, FileText, X } from 'lucide-react'
import { govtOcrApi } from '../../api/govtocr'

export default function CircularUpload() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const uploadMutation = useMutation({
    mutationFn: (formData) => govtOcrApi.upload(formData),
    onSuccess: (result) => {
      toast.success('Circular uploaded and OCR processing started')
      const id = result?.id || result?.data?.id
      if (id) navigate(`/govtocr/${id}`)
      else navigate('/govtocr')
    },
    onError: (err) => toast.error(err.message || 'Upload failed'),
  })

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  const handleUpload = () => {
    if (!file) return toast.error('Please select a file first')
    const fd = new FormData()
    fd.append('file', file)
    uploadMutation.mutate(fd)
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Upload Government Circular</h1>
      <p className="text-sm text-gray-500">
        Upload a government circular (image or PDF) to extract text using OCR.
      </p>

      <div className="card space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
            file
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 cursor-pointer hover:border-primary-400 hover:bg-primary-50'
          }`}
        >
          {file ? (
            <>
              <FileText className="h-10 w-10 text-green-600" />
              <p className="text-sm font-medium text-green-900">{file.name}</p>
              <p className="text-xs text-green-700">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-400">PNG, JPG, PDF supported</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {preview && (
          <div className="relative inline-block">
            <img src={preview} alt="Preview" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
            <button
              onClick={clearFile}
              className="absolute -top-2 -right-2 rounded-full bg-red-100 p-0.5 text-red-600 hover:bg-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {file && !preview && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={clearFile} className="text-gray-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex gap-3">
          {file && (
            <button onClick={clearFile} className="btn-secondary">
              {tc('buttons.clear')}
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending}
            className="btn-primary flex-1 justify-center"
          >
            {uploadMutation.isPending ? 'Uploading & Processing...' : tc('buttons.upload')}
          </button>
        </div>
      </div>
    </div>
  )
}
