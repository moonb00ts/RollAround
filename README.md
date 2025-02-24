# Welcome to the RollAround app repo 👋

A React Native mobile application for skateboarders to discover and share skate spots.

## Features

- Interactive map of skate spots
- Add and share new spots with the community
- Upload photos of spots
- Event calendar for local skating events
- User authentication and profiles

## Tech Stack

- React Native / Expo
- Firebase Authentication
- MongoDB
- Express.js backend
- Cloudinary for image storage

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI
- MongoDB installed locally (for development)

### Installation

1. Clone the repository
```bash
git clone https://github.com/moonb00ts/RollAround.git
cd RollAround
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
- Copy `.env.example` to `.env`
- Fill in your configuration values

4. Start the development server
```bash
npx expo start
```

## Firebase Setup

To set up Firebase in your local development environment:

1. Obtain the Firebase configuration files from your project administrator
2. Place `google-services.json` in `android/app/`
3. Place `GoogleService-Info.plist` in `ios/RollAround/`
4. Copy `firebase.js.template` to `firebase.js` and fill in your configuration

**Important:** Never commit Firebase configuration files to version control.



