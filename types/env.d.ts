declare namespace NodeJS {
  interface ProcessEnv {
    MONGODB_URI: string;
    // Add other environment variables here
    [key: string]: string | undefined;
  }
}
