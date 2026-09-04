/**
 * Variables cargadas desde .env vía react-native-dotenv (@env).
 * Todas son opcionales en runtime: la app degrada a modo local si faltan.
 */
declare module '@env' {
  export const SUPABASE_URL: string | undefined;
  export const SUPABASE_ANON_KEY: string | undefined;
  export const MAPBOX_ACCESS_TOKEN: string | undefined;
  export const OPEN_STREET_VIEW_KEY: string | undefined;
  export const ADMIN_MASTER_HASH: string | undefined;
  export const ADMIN_TEST_HASH: string | undefined;
  export const ADMIN_SUPPORT_HASH: string | undefined;
  export const ADMIN_SALT: string | undefined;
}
