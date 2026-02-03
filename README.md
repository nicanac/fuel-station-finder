# ⛽ Fuel Station Finder Web App

A beautiful Next.js web app to automatically add fuel stations to your cycling routes. No command line required!

## 🚀 Features

- **Drag & Drop GPX Upload** - Easy file upload interface
- **Automatic Fuel Station Detection** - Finds stations every 50-80km along your route
- **OpenStreetMap Integration** - Uses comprehensive fuel station data
- **GPS Compatible Output** - Works with Garmin, Wahoo, and all cycling GPS devices
- **Beautiful UI** - Clean, modern interface with Tailwind CSS

## 🏃‍♂️ Perfect For

- **Long Training Rides** - Century rides and multi-day adventures
- **XTri/Race Preparation** - Plan fuel stops for competitions like The Ascend
- **Belgium Cycling** - Optimized for European fuel station coverage (Esso, Shell, Q8, Total)
- **GPS Route Enhancement** - Add waypoints to any GPX route

## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Beautiful styling
- **Lucide Icons** - Modern icon set
- **OpenStreetMap API** - Fuel station data

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   cd fuel-station-app
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📋 How to Use

1. **Upload GPX File** - Drag & drop or click to select your GPX route file
2. **Process Route** - Click "Find Fuel Stations" to analyze your route
3. **Download Enhanced GPX** - Get your route with fuel station waypoints added

## 🎯 What Happens

- **Route Analysis** - Parses your GPX and calculates total distance
- **Smart Sampling** - Places fuel stations optimally along the route
- **Station Search** - Queries OpenStreetMap for nearby fuel stations
- **GPX Enhancement** - Adds waypoints with ⛽ icons and station details

## 📊 Example Output

```
Route: 145km total
Fuel Stations Added: 3

Waypoints:
- ⛽ Shell Brussels North - 45km from start
- ⛽ Esso Leuven - 95km from start
- ⛽ Q8 Namur - 135km from start
```

## 🔧 Configuration

The app uses these default settings:
- **Search Radius**: 1km from route
- **Min Interval**: 50km between stations
- **Max Interval**: 80km between stations

## 🌍 API Used

- **OpenStreetMap Overpass API** - Free, comprehensive fuel station database
- **No API keys required** - Works out of the box

## 📱 Compatible Devices

- **Garmin Edge** - All models
- **Wahoo ELEMNT** - All models
- **Lezyne GPS** - All models
- **Any GPX-compatible GPS** - Standard format

## 🚨 Notes

- **Internet Required** - Needs connection for fuel station lookup
- **GPX Format Only** - Currently supports GPX files from Strava, Garmin, etc.
- **Free Service** - No costs or API keys needed

## 🤝 Contributing

Built for cyclists by cyclists. PRs welcome for improvements!

---

**Happy cycling! 🚴‍♂️⛽**