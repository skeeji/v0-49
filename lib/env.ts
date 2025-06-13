// Configuration des variables d'environnement avec fallbacks
export const env = {
  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://admin:admin123@localhost:27017/luminaires?authSource=admin",

  // Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",

  // NextAuth
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",

  // Application
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "3000",

  // Upload
  MAX_FILE_SIZE: Number.parseInt(process.env.MAX_FILE_SIZE || "10485760"),
  UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",

  // MongoDB Docker
  MONGO_INITDB_ROOT_USERNAME: process.env.MONGO_INITDB_ROOT_USERNAME || "admin",
  MONGO_INITDB_ROOT_PASSWORD: process.env.MONGO_INITDB_ROOT_PASSWORD || "admin123",
  MONGO_INITDB_DATABASE: process.env.MONGO_INITDB_DATABASE || "luminaires",

  // Mongo Express
  ME_CONFIG_MONGODB_ADMINUSERNAME: process.env.ME_CONFIG_MONGODB_ADMINUSERNAME || "admin",
  ME_CONFIG_MONGODB_ADMINPASSWORD: process.env.ME_CONFIG_MONGODB_ADMINPASSWORD || "admin123",
  ME_CONFIG_BASICAUTH_USERNAME: process.env.ME_CONFIG_BASICAUTH_USERNAME || "admin",
  ME_CONFIG_BASICAUTH_PASSWORD: process.env.ME_CONFIG_BASICAUTH_PASSWORD || "admin123",
}

// Validation des variables critiques
export function validateEnv() {
  const errors: string[] = []

  if (!env.MONGODB_URI) {
    errors.push("MONGODB_URI is required")
  }

  if (env.NODE_ENV === "production") {
    if (!env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      errors.push("NEXT_PUBLIC_FIREBASE_API_KEY is required in production")
    }
    if (env.NEXTAUTH_SECRET === "dev-secret-change-in-production") {
      errors.push("NEXTAUTH_SECRET must be changed in production")
    }
  }

  if (errors.length > 0) {
    console.warn("⚠️ Environment validation warnings:")
    errors.forEach((error) => console.warn(`  - ${error}`))
  }

  return errors.length === 0
}

// Log de la configuration au démarrage
export function logEnvStatus() {
  console.log("🔧 Environment Configuration:")
  console.log(`  - NODE_ENV: ${env.NODE_ENV}`)
  console.log(`  - MongoDB: ${env.MONGODB_URI ? "✅ Configured" : "❌ Missing"}`)
  console.log(`  - Firebase: ${env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ Configured" : "⚠️ Using defaults"}`)
  console.log(`  - Port: ${env.PORT}`)
  console.log(`  - Upload Dir: ${env.UPLOAD_DIR}`)
}
