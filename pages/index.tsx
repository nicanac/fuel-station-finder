'use client'

import { useState, useRef } from 'react'
import { Upload, Download, Bike, Fuel, MapPin, AlertCircle } from 'lucide-react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.toLowerCase().endsWith('.gpx')) {
        setFile(selectedFile)
        setError(null)
        setResult(null)
      } else {
        setError('Please select a valid GPX file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('gpxFile', file)

      const response = await fetch('/api/process-gpx', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process GPX file')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!result?.downloadUrl) return

    const link = document.createElement('a')
    link.href = result.downloadUrl
    link.download = result.outputFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bike className="h-12 w-12 text-blue-600" />
            <Fuel className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Fuel Station Finder
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Automatically add fuel stations to your cycling routes. Perfect for long training rides and races.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!result ? (
              <>
                {/* File Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload your GPX route file
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".gpx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">
                      {file ? file.name : 'Click to select or drag and drop your GPX file'}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Choose File
                    </button>
                  </div>
                </div>

                {/* Process Button */}
                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={isProcessing}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing Route...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        Find Fuel Stations
                      </>
                    )}
                  </button>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700">{error}</p>
                  </div>
                )}
              </>
            ) : (
              /* Results Section */
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <Fuel className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Route Enhanced! ⛽
                  </h2>
                  <p className="text-gray-600">
                    Found {result.fuelStations} fuel stations along your {result.totalDistance}km route
                  </p>
                </div>

                {/* Route Stats */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Route Distance</p>
                      <p className="font-semibold">{result.totalDistance}km</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fuel Stations Added</p>
                      <p className="font-semibold">{result.fuelStations}</p>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-4"
                >
                  <Download className="h-5 w-5" />
                  Download Enhanced GPX
                </button>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Process Another Route
                </button>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md text-center">
              <Bike className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Cycling Routes</h3>
              <p className="text-sm text-gray-600">
                Works with GPX files from Garmin, Strava, and all GPS devices
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md text-center">
              <Fuel className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Smart Stations</h3>
              <p className="text-sm text-gray-600">
                Finds stations every 50-80km for optimal fuel planning
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md text-center">
              <MapPin className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">GPS Compatible</h3>
              <p className="text-sm text-gray-600">
                Waypoints work with Garmin, Wahoo, and all cycling GPS devices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}