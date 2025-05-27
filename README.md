# Barista KDS - Kitchen Display System

A React-based Kitchen Display System optimized for 5-inch touchscreens, designed for baristas to manage coffee shop orders from Square.

## Features

- ☕ Touch-optimized interface for 5-inch screens
- 🔄 Auto-refresh order display
- 📱 Portrait-first responsive design
- 🔒 Secure Square API integration
- ⚡ Real-time order status management

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
SQUARE_ACCESS_TOKEN=your_square_access_token_here
SQUARE_LOCATION_ID=your_square_location_id_here
```

### 3. Update Configuration

Edit `lib/config.js` and update the hardcoded values:

```javascript
export const CONFIG = {
  SQUARE_LOCATION_ID_CONFIG: "YOUR_ACTUAL_LOCATION_ID",
  SQUARE_ENVIRONMENT_CONFIG: "sandbox", // or "production"
  REFRESH_INTERVAL_SECONDS_CONFIG: 30,
};
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Usage

- **Orders Display**: Orders automatically refresh every 30 seconds
- **Status Management**: Tap action buttons to update order status
- **Filtering**: Use tabs to filter orders by status
- **Touch Interface**: All elements are optimized for touch interaction

## Architecture

- **Frontend**: React with Next.js framework
- **Backend**: Next.js API routes for Square proxy
- **Styling**: Custom CSS optimized for 5-inch touchscreen
- **API**: Square Connect API v2023-10-18

## Deployment

For production deployment to a 5-inch touchscreen device:

1. Set `SQUARE_ENVIRONMENT_CONFIG` to `"production"`
2. Use your production Square access token
3. Deploy to a hosting service or local device
4. Configure the device browser for kiosk mode

## Browser Recommendations

For optimal performance on 5-inch touchscreen devices:
- Chrome/Chromium in kiosk mode
- Disable browser zoom
- Enable touch events
- Consider using a PWA wrapper for native app-like experience
