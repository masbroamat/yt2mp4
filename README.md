# YouTube Video Downloader

Welcome to the **YouTube Video Downloader** – a fast, free, and easy-to-use web application built with Next.js that lets you download YouTube videos in high quality. This app not only provides direct downloads but also supports a global conversion counter to showcase the total number of successful downloads from users worldwide.

## Built with the following technology stack:

![Cursor AI](https://img.shields.io/badge/Cursor%20AI-FF007F?style=for-the-badge&logo=OpenAI&logoColor=white)
![21st.dev](https://img.shields.io/badge/21st.dev-000000?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## Prior Notes

- For YT Shorts: Video post need to be at least 5 months or older
- For normal YT video: Not sure, tested with 18 hours ago and it works fine

## Features

- **Fast & Free Downloads:**  
  Quickly download your favorite YouTube videos in high quality with no registration required.

- **Global Conversion Counter:**  
  Track and display the total number of successful video conversions made by users globally.

- **Maintenance Announcement:**  
  A fixed announcement bar at the top of the screen informs users about scheduled maintenance (daily from 6:00 AM to 7:00 AM).

- **Responsive Design:**  
  Built with modern UI/UX principles using Next.js and Tailwind CSS for an optimized experience across devices.

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd youtube-oauth-downloader
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### Common Issues

- **Video Quality Options Not Appearing**: Check that yt-dlp is properly installed and accessible in your PATH
- **Download Errors**: Ensure ffmpeg is installed and available in PATH for video processing
- **Shorts URLs Not Working**: Make sure you're using the latest version which supports YouTube Shorts URLs

### Debug Logs

The application creates log files that can help diagnose issues:

- `logs/conversions.log`: Tracks all video conversion attempts
- Terminal output contains detailed logs of command execution

## Docker Deployment

A Dockerfile is included for containerized deployment:

```bash
# Build the Docker image
docker build -t yt2mp4 .

# Run the container
docker run --name yt2mp4 -p 3000:3000 yt2mp4
```
