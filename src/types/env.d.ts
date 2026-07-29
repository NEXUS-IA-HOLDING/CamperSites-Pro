/**
 * Declaracion de tipos para variables de entorno
 * Cargadas desde .env via react-native-dotenv
 */
declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const MAPBOX_ACCESS_TOKEN: string;
  export const OPEN_STREET_VIEW_KEY: string;
}
