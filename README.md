# Group Music Signaling Server

WebRTC signaling server for the Group Music App.

## Deployment

This server is designed to be deployed on Render.com for free.

### Render Configuration:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free
- **Environment Variables**: None required (PORT is auto-assigned)

## Endpoints

- `GET /` - Health check
- WebSocket connection for signaling

## Features

- WebRTC signaling for voice chat
- Music state synchronization
- Room management
- CORS enabled for cross-origin requests
