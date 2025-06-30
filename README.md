# Luminaires Gallery

A modern web application for managing and displaying a collection of designer luminaires.

## Features

- 🏛️ Gallery view with filtering and search
- 👨‍🎨 Designer profiles and collections
- 📱 Responsive design
- 🔐 Authentication with Firebase
- 📊 MongoDB database
- 🖼️ Image management with GridFS
- 📈 Timeline view
- 📤 CSV import/export

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with GridFS
- **Authentication**: Firebase Auth
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Firebase project

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd luminaires-gallery
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables
\`\`\`bash
cp .env.example .env.local
\`\`\`

Fill in your MongoDB and Firebase configuration.

4. Start the development server
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000)

## Docker Setup

See [README.Docker.md](README.Docker.md) for Docker deployment instructions.

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── luminaires/        # Luminaires pages
│   ├── designers/         # Designers pages
│   └── ...
├── components/            # React components
├── lib/                   # Utility functions
├── contexts/              # React contexts
└── public/               # Static assets
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.
