// Configuration des variables d'environnement avec fallbacks
function getEnvVar(key: string, fallback?: string): string {
  // Essayer d'abord process.env (variables système ou .env.local)
  const value = process.env[key]
  if (value) {
    return value
  }

  if (fallback !== undefined) {
    return fallback
  }

  // Pour les variables critiques, ne pas utiliser de fallback
  if (key.includes("FIREBASE") && key.includes("PUBLIC")) {
    console.error(`❌ Missing critical environment variable: ${key}`)
    return ""
  }

  return ""
}

export const env = {
  // Variables MongoDB
  MONGODB_URI: getEnvVar("MONGODB_URI", "mongodb://admin:admin123@localhost:27017/luminaires?authSource=admin"),

  // Variables Firebase (critiques - pas de fallback)
  NEXT_PUBLIC_FIREBASE_API_KEY: getEnvVar("NEXT_PUBLIC_FIREBASE_API_KEY"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: getEnvVar("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: getEnvVar("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: getEnvVar("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getEnvVar("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  NEXT_PUBLIC_FIREBASE_APP_ID: getEnvVar("NEXT_PUBLIC_FIREBASE_APP_ID"),

  // Variables NextAuth
  NEXTAUTH_URL: getEnvVar("NEXTAUTH_URL", "http://localhost:3000"),
  NEXTAUTH_SECRET: getEnvVar("NEXTAUTH_SECRET", "development-secret-change-in-production"),

  // Variables application
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  PORT: getEnvVar("PORT", "3000"),
  MAX_FILE_SIZE: getEnvVar("MAX_FILE_SIZE", "10485760"), // 10MB
  UPLOAD_DIR: getEnvVar("UPLOAD_DIR", "./uploads"),

  // Variables MongoDB Docker
  MONGO_INITDB_ROOT_USERNAME: getEnvVar("MONGO_INITDB_ROOT_USERNAME", "admin"),
  MONGO_INITDB_ROOT_PASSWORD: getEnvVar("MONGO_INITDB_ROOT_PASSWORD", "admin123"),
  MONGO_INITDB_DATABASE: getEnvVar("MONGO_INITDB_DATABASE", "luminaires"),

  // Variables Mongo Express
  ME_CONFIG_MONGODB_ADMINUSERNAME: getEnvVar("ME_CONFIG_MONGODB_ADMINUSERNAME", "admin"),
  ME_CONFIG_MONGODB_ADMINPASSWORD: getEnvVar("ME_CONFIG_MONGODB_ADMINPASSWORD", "admin123"),
  ME_CONFIG_BASICAUTH_USERNAME: getEnvVar("ME_CONFIG_MONGODB_ADMINUSERNAME", "admin"),
  ME_CONFIG_BASICAUTH_PASSWORD: getEnvVar("ME_CONFIG_MONGODB_ADMINPASSWORD", "admin123"),
} as const

// Validation simple au démarrage (côté serveur uniquement)
if (typeof window === "undefined") {
  console.log("🔧 Environment configuration:")
  console.log("- NODE_ENV:", env.NODE_ENV)
  console.log("- MongoDB URI:", env.MONGODB_URI ? "✅ Configured" : "❌ Missing")
  console.log("- Firebase API Key:", env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ Configured" : "❌ Missing")
  console.log("- Firebase Project:", env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "❌ Missing")
}

// Export simple pour compatibilité
export const isConfigured = {
  mongodb: !!env.MONGODB_URI,
  firebase: !!env.NEXT_PUBLIC_FIREBASE_API_KEY && !!env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}
