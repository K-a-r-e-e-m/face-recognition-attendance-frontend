# Face Recognition Attendance Frontend

This folder contains the frontend part of the Face Recognition Attendance system.
It is a static web application built with HTML, CSS, and JavaScript that connects to a backend API to perform the following tasks:

- scan a user face from the webcam and mark attendance automatically
- allow new students to register with a captured photo and profile details
- show attendance records, search, and filter through the dashboard

## Overview

The frontend is designed as a lightweight client application with no build step. It uses the browser camera API for face capture and works with a backend service to store students and attendance data.

### Main user flows

1. **Face recognition** (`index.html`)
   - Starts the camera feed
   - captures a webcam frame
   - sends the image to the backend
   - displays recognition status, student name, ID, and time

2. **Dashboard** (`dashboard.html`)
   - loads student list and attendance records from the backend
   - shows summary statistics for total, present, absent, and last update time
   - supports searching by name and filtering by attendance status

3. **Register** (`register.html`)
   - provides a multi-step registration experience
   - captures a new face photo
   - validates student details
   - submits the form and image to the backend for enrollment

## Pages

- `index.html` — face recognition landing page with webcam capture and result UI
- `dashboard.html` — attendance dashboard with summary cards, date selection, search, and table display
- `register.html` — multi-step registration page for new students with live photo capture and confirmation

## Styling

- `css/style.css` — global styles and layout for all pages
- `css/dark.css` — optional dark mode theme rules
- `css/register.css` — registration page specific styles and step flows

## JavaScript

- `js/recognition.js`
  - initializes camera access
  - captures a frame from the video stream
  - sends face image data to `POST /api/v1/attendances`
  - updates the recognition result UI and retry flow

- `js/dashboard.js`
  - fetches `GET /api/v1/students?limit=1000` and `GET /api/v1/attendances`
  - merges student and attendance records
  - renders the dashboard totals and paginated table
  - filters records by search text and attendance status

- `js/register.js`
  - manages the 3-step registration flow
  - opens the camera and captures a photo
  - validates required fields and email format
  - submits image upload to `POST /api/v1/images/upload`
  - creates a student record with `POST /api/v1/students`

## Backend API Contract

The frontend currently expects the backend to expose the following endpoints:

- `GET /api/v1/students?limit=1000` — return student list
- `GET /api/v1/attendances` — return attendance records
- `POST /api/v1/attendances` — submit a captured image for recognition
- `POST /api/v1/images/upload` — upload a registration image
- `POST /api/v1/students` — create a new student with registration details

## Requirements

- Backend API running on `http://localhost:3000`
- Browser camera permission for recognition and registration
- Use a secure context: `http://localhost` or `https`

## Quick Start

1. Start the backend API on `http://localhost:3000`.
2. Serve this folder as static files.
   - Example using Python 3:
     ```bash
     cd face-recognition-attendance-frontend
     python3 -m http.server 8080
     ```
3. Open the app in your browser:
   - `http://localhost:8080/index.html` for face recognition
   - `http://localhost:8080/register.html` to enroll a new user
   - `http://localhost:8080/dashboard.html` to see attendance records

## Usage Notes

- The registration flow requires a photo capture before continuing.
- The dashboard uses fallback/demo logic if the backend is unavailable, but real attendance data requires the API.
- The recognition flow sends the image as `multipart/form-data` and expects the backend to return recognized student details.

## Folder Structure

```
face-recognition-attendance-frontend/
├── assets/          # icon and image assets used by the UI
├── css/             # stylesheets for layout, theme, and registration page
├── js/              # frontend logic for recognition, dashboard, and registration
├── dashboard.html   # attendance dashboard page
├── index.html       # face recognition landing page
├── register.html    # registration flow page
└── README.md        # documentation file
```

---

Prepared by: Kareem Hany
