# CamperSites Pro — Test Infrastructure & E2E Validation Framework

## 1. Test Philosophy & Core Methodology

The CamperSites-Pro test infrastructure is engineered under an **opaque-box (black-box / specification-based)**, requirement-driven methodology. Tests interact exclusively with module public interfaces, state persistence contracts, domain services, navigation flows, and rendered UI component trees, never relying on internal private implementation details or fragile implementation mocks.

### Testing Methodologies Applied:
1. **Opaque-Box Verification**: Every test treats modules as black-box systems with observable inputs and deterministic outputs.
2. **Category-Partitioning**: Input spaces are partitioned into mutually exclusive equivalence classes (e.g., valid coordinates, out-of-range latitude/longitude, deadband speeds, active vs background lifecycle states).
3. **Boundary Value Analysis (BVA)**: Precision testing around exact critical boundaries:
   - Speed lock thresholds: `0.0 km/h` (stationary), `1.5 km/h` (legacy false-positive boundary), `2.5 km/h` (deadband lower bound), `3.49 km/h` (sub-threshold), `3.50 km/h` (trip lock activation), `3.51 km/h` (locked state).
   - Vehicle dimension clearance: height `2.8m` vs `3.2m` bridge limits; weight `3.5t` vs `4.2t` tachograph warnings.
   - Coordinate bounding boxes and deep link parameter bounds.
4. **Combinatorial & Pairwise Testing**: Multi-factor state combinations:
   - `[Vehicle Profile: Standard | Camper | Heavy RV]` x `[Satellite Overlay: On | Off]` x `[HUD State: Minibar (48px) | Expanded]` x `[Network: Online Supabase | OfflineSpotVault]`.
5. **Workload & Stress Testing**: High-frequency GPS event streams (10Hz burst ticks), rapid search query keystrokes, and repetitive screen blur/focus cycles to assert memory leak prevention and re-render stability.

---

## 2. Feature Inventory (17 Critical Points)

| # | Feature | Requirements Tracing | Test Focus | Target Test File |
|---|---------|----------------------|------------|------------------|
| 1 | **Eliminar bucle re-apertura popup** | User explicitly dismisses suggestions / QuickDestinationPicker; subsequent GPS ticks or query edits must NOT trigger re-opening until user explicitly focuses or taps search. | Opaque-box interaction state; verification that closing is persistent across GPS location ticks. | `__tests__/e2e/feature_01_search_popup.test.ts` |
| 2 | **Visualización de ruta GPS & Gálibo** | Map routing displays route line with casing + core (Google Maps / Waze style), clearance alerts (⛔), and alternative routes with distinct styles. | ShapeSource GeoJSON validation, LineLayer styling, clearance hazard alerts matching vehicle height/weight. | `__tests__/e2e/feature_02_route_galibo.test.ts` |
| 3 | **Desplegable Bottom Sheet colapsable** | Destination / cockpit bottom sheet collapses to a 48px minimal bar to avoid obscuring road view; smooth expansion on demand. | Height state transitions (minibar: 48px, mid: 220px, expanded), view occlusion assertion. | `__tests__/e2e/feature_03_bottom_sheet.test.ts` |
| 4 | **Pestaña Explorar Dark Mode Camper** | Dark Mode Camper aesthetic (`#0B1118`, `#121A24`, `#1E293B`, `#F59E0B`); removal of disorganized white/green backgrounds; coupon/ticket styling. | Color token compliance, contrast ratio, coupon layout rendering without raw white/green cards. | `__tests__/e2e/feature_04_explore_dark_mode.test.ts` |
| 5 | **Radar de servicios scroll & tiempo real** | Radar section moved to ListHeaderComponent, updating real-time via `watchPosition` GPS, continuous vertical scroll without clipping. | Scrollable container hierarchy, live distance re-computation on GPS updates, full scroll reach. | `__tests__/e2e/feature_05_radar_scroll.test.ts` |
| 6 | **Estabilidad y memoria (TRIM_MEMORY)** | Eliminate re-render loops and OpenGL memory leak; unmount/pause MapView on screen blur; throttle map markers; memoize vehicle cursor; lazy load heavy modals. | Memory footprint simulation, unmount lifecycle on blur, marker rendering throttle verification. | `__tests__/e2e/feature_06_memory_stability.test.ts` |
| 7 | **Persistencia total del vehículo** | Master vehicle state stored in `@campersites_master_persistence_v2`; no wipe on user logout; `allowBackup=true` compatibility. | AsyncStorage persistence across simulated app restarts, profile updates, and logout scenarios. | `__tests__/e2e/feature_07_vehicle_persistence.test.ts` |
| 8 | **Ampliar catálogo autocaravanas** | 34 models across 13 key European brands (Pilote, Rimor, Morelo, Concorde, Giottiline, Etrusco, Itineo, Laika, Bavaria, Mobilvetta, Frankia, Hobby, Fendt) with complete specs (length, width, height, weight). | Catalog integrity, filter by brand, auto-population of dimensions into vehicle profile. | `__tests__/e2e/feature_08_vehicle_catalog.test.ts` |
| 9 | **Compartir ubicación Google Maps / Waze** | Bidirectional location sharing: generate and parse Google Maps & Waze links; 1-tap coordinate export and navigation launch. | URL generation accuracy, coordinate parsing from external URLs/strings, Linking invocation. | `__tests__/e2e/feature_09_location_sharing.test.ts` |
| 10 | **Desacoplar botones flotantes derecha** | MapControlDock with tool drawer `<220px`; resolve icon overlapping (satellite, 3D, layers, compass); correct z-index stacking. | Dock layout bounds, button z-index hierarchy, tool drawer toggle behavior without HUD overlaps. | `__tests__/e2e/feature_10_floating_controls.test.ts` |
| 11 | **Modo estándar por defecto** | `tachographWarningsEnabled=false` by default on first launch; professional mode deactivated until opted-in. | Fresh install state inspection, initial configuration flag verification in storage. | `__tests__/e2e/feature_11_default_mode.test.ts` |
| 12 | **Autodoc y Amazon en Explorar** | Dedicated affiliate section in Explore tab with camper spare parts, tools, and accessories with affiliate tag tracking. | Affiliate items catalog, category filtering, external link dispatch with proper affiliate tracking query params. | `__tests__/e2e/feature_12_autodoc_amazon.test.ts` |
| 13 | **Central B2B masiva de reservas** | Booking selector connected to Supabase `locations` & `b2b_reservations` with fallback to `OfflineSpotVault` across thousands of EU spots. | Querying partner campsites, filtering by bounding box / availability, offline fallback when disconnected. | `__tests__/e2e/feature_13_b2b_booking.test.ts` |
| 14 | **Simplificar textos de descuento** | Direct display of "20% de Descuento Directo" in banners, coupons, and booking cards without ambiguous wording. | Text string assertion across all discount and booking surfaces. | `__tests__/e2e/feature_14_discount_texts.test.ts` |
| 15 | **Rutas 3D populares (>20 rutas)** | Catalog of 22+ iconic panoramic scenic routes with full waypoints, coordinates, elevations, and descriptions. | Catalog count >= 20, waypoint validation, GeoJSON geometry check, route selector activation. | `__tests__/e2e/feature_15_scenic_routes.test.ts` |
| 16 | **Corregir bloqueo Status Camper** | Prevent false-positive video lock while parked: threshold set to `3.5 km/h` with `2.5 km/h` release deadband. | Speed simulation tests across stationary drift (<2.5 km/h), acceleration (>3.5 km/h), and deceleration. | `__tests__/e2e/feature_16_speed_lock.test.ts` |
| 17 | **Recompensa para afiliados** | Direct bonus (15€ cash + 1000 points) awarded upon confirmed referral purchase of annual premium plan. | Referral code validation, points & cash ledger balance updates, duplicate reward prevention. | `__tests__/e2e/feature_17_affiliate_rewards.test.ts` |

---

## 3. Test Architecture & Runner Configuration

### Invocation Commands
- Primary: `npm test` (executes `jest --no-watchman`)
- Focused run: `npx jest --no-watchman __tests__/e2e/smoke.test.ts`
- Full suite with coverage: `npx jest --no-watchman --coverage`

### Directory Layout
```
__tests__/
├── setup.ts                           # Global Jest test environment setup & polyfills
├── securityAndConfig.test.ts          # Core security and configuration tests
├── smartAssistantFeatures.test.ts     # Route optimization and assistant tests
└── e2e/
    ├── helpers/
    │   ├── testMocks.ts               # In-memory stateful mocks (AsyncStorage, Geolocation, MapLibre, Supabase, etc.)
    │   ├── envMock.ts                 # Mock @env configuration
    │   └── vectorIconsMock.js         # React Native Vector Icons mock component
    ├── smoke.test.ts                  # Comprehensive infrastructure smoke test
    └── [feature suites...]            # Feature-specific end-to-end test suites
```

### Pass / Fail Semantics
- **Pass (Exit Code 0)**: 100% of test suites and assertions pass. No uncaught exceptions, no unresolved promises, no open handles.
- **Fail (Exit Code 1)**: Any assertion failure, unhandled promise rejection, timeout, or compilation failure.

---

## 4. Coverage Thresholds & Test Tiers

To ensure comprehensive quality assurance across all layers, the test suite is partitioned into four rigorous tiers:

| Tier | Focus | Minimum Target | Verification Scope |
|------|-------|----------------|---------------------|
| **Tier 1** | Unit & Component Behavior | **>= 85 tests** | Validation logic, service calculations, formatting, color tokens, coordinate parsers, deadband filters. |
| **Tier 2** | Integration & Contract Tests | **>= 85 tests** | Service-to-service contracts (VehiclePersistence ↔ Storage, LocationSharing ↔ Linking, B2B Engine ↔ Supabase). |
| **Tier 3** | E2E User Journeys | **>= 17 tests** | Full multi-step user workflows (1 per critical feature), verifying end-to-end outcome. |
| **Tier 4** | Workload, Stress & Memory | **>= 9 tests** | Rapid GPS ticks (10Hz burst), repetitive map mounting/unmounting, high-frequency state persistence. |
| **TOTAL** | Complete Test Suite | **>= 196 tests** | All suites passing with 100% success rate. |

---

## 5. In-Memory Mock Specifications

All test mocks maintain **genuine in-memory state** rather than static facade return values:

1. **AsyncStorage (`mockAsyncStorage`)**:
   - Internal `Map<string, string>` backing store.
   - Genuine `getItem`, `setItem`, `removeItem`, `clear`, `getAllKeys`, `multiGet`, `multiSet`, `multiRemove`.
   - Inspection helper `_dump()` and seeding helper `_seed(entries)`.

2. **Geolocation (`mockGeolocation`)**:
   - Genuine watch registry: `watchPosition` returns unique `watchId` and registers listener callbacks.
   - `emitPosition(coords)`: dispatches position updates to all active watchers.
   - `emitSpeed(kmh)`: helper converting km/h to m/s and triggering watchers.
   - `clearWatch(id)` and `clearAllWatches()`.

3. **MapLibre Native (`mockMapLibre`)**:
   - Mock components for `MapView`, `Camera`, `ShapeSource`, `LineLayer`, `PointAnnotation`, `Callout`.
   - Stateful camera controller capturing `setCamera`, `fitBounds`, `moveTo`.
   - ShapeSource stores attached GeoJSON feature collections for assertion.

4. **Linking & Share (`mockLinking`, `mockShare`)**:
   - `mockLinking`: maintains `openedUrls` array, mockable URL schemes support.
   - `mockShare`: maintains `sharedContents` history.

5. **Supabase Client (`mockSupabase`)**:
   - In-memory relational tables: `locations`, `b2b_reservations`, `user_profiles`, `scenic_routes`.
   - Chainable query builder supporting `select`, `insert`, `upsert`, `update`, `delete`, `eq`, `neq`, `in`, `order`, `limit`, `single`, `maybeSingle`.
   - `auth` mock maintaining active simulated user session.
