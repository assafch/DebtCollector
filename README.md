# Next.js Firebase Genkit Starter (Project NextN)

This repository contains a starter project built with Next.js, Firebase, and Google's Genkit, designed as a foundation for building modern web applications with integrated AI capabilities. The example application demonstrates features for managing customers, invoices, and a phonebook.

## Features

*   **Next.js 15 App Router**: Leverages the latest Next.js features for routing, server components, and server actions.
*   **Firebase Integration**:
    *   Google Authentication (as seen with `LoginWithGoogleButton`).
    *   Likely uses Firestore/Realtime Database for data storage and other Firebase services (hosting, functions - though specific usage needs further code review).
*   **Genkit AI Integration**:
    *   Uses Google's Genkit framework for integrating AI models and building AI-powered features.
    *   Includes development setup for Genkit flows (`src/ai/dev.ts`, `src/ai/genkit.ts`).
*   **Comprehensive UI Components**:
    *   Built with **Shadcn/ui** (Radix UI primitives + Tailwind CSS) for a rich set of accessible and customizable components.
    *   Includes dashboard elements like charts (`recharts`), data tables, and stat cards.
*   **TypeScript**: Fully typed codebase for better maintainability and developer experience.
*   **Styling**: Tailwind CSS for utility-first styling.
*   **Forms**: Robust form handling with `react-hook-form` and `zod` for validation.
*   **Linting & Formatting**: Configured with ESLint and likely Prettier (though Prettier config not explicitly seen, it's a common pairing).

## Project Structure

Here's a brief overview of the main directories:

*   **`src/app/`**: Contains the core application logic and UI, using the Next.js App Router. Includes pages for different features (e.g., `/customers`, `/invoices`).
*   **`src/components/`**: Houses reusable React components, categorized into `auth`, `dashboard`, `invoices`, `layout`, and a general `ui` set (Shadcn/ui components).
*   **`src/lib/`**: Contains utility functions and library initializations (e.g., `firebase.ts`, `utils.ts`).
*   **`src/ai/`**: Holds the AI integration logic using Genkit, with configurations for development and core Genkit flows.
*   **`public/`**: Static assets.
*   **`pages/api/`**: (If present, not explicitly listed but common for Next.js) For API routes if not solely relying on server actions.

## Key Technologies

*   **Next.js** (v15)
*   **React** (v18)
*   **Firebase** (v11)
*   **Google Genkit** (v1)
*   **Tailwind CSS**
*   **Radix UI** (via Shadcn/ui)
*   **TypeScript**
*   **Recharts**
*   **React Hook Form**
*   **Zod**

## Getting Started

### Prerequisites

*   Node.js (version specified in `.nvmrc` or latest LTS recommended)
*   npm or yarn
*   Firebase project setup and configuration (see `src/lib/firebase.ts` for where to add your credentials, typically via environment variables).
*   Google Cloud project setup for Genkit and Google AI services.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add your Firebase and Google Cloud/Genkit API keys and configuration details. Refer to Firebase and Genkit documentation for the required variables.
    Example:
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    # ... other Firebase config
    GOOGLE_API_KEY=your_google_api_key
    # ... other Genkit/Google AI config
    ```

### Running the Development Server

1.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    This will start the Next.js app, typically on `http://localhost:9002`.

2.  **Start the Genkit development server (in a separate terminal):**
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes
    npm run genkit:watch
    ```
    This will start the Genkit flows, usually on `http://localhost:3400`.

## Available Scripts

*   **`npm run dev`**: Starts the Next.js development server with Turbopack (on port 9002).
*   **`npm run build`**: Builds the Next.js application for production.
*   **`npm run start`**: Starts the Next.js production server.
*   **`npm run lint`**: Lints the codebase using ESLint.
*   **`npm run typecheck`**: Performs a TypeScript type check.
*   **`npm run genkit:dev`**: Starts the Genkit development server.
*   **`npm run genkit:watch`**: Starts the Genkit development server in watch mode.

## Contributing

(Add guidelines for contributing to the project if applicable.)

## License

(Specify the license for the project, e.g., MIT.)
