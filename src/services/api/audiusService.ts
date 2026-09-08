// V18: deprecated re-export shim. Only the public service functions
// and the domain type are re-exported — convertor names like
// `trackResultFromRaw` collide across services (audius + jamendo
// both export one) and would clash in `src/services/api/index.ts`'s
// `export *` re-exports. Consumers that need convertors should
// import from the adapter directly. V18.3.4 will delete this file
// once all consumer hooks have migrated.
export {
  searchAudiusTracks,
  getTrendingAudiusTracks,
  getAudiusTrackById,
  type AudiusTrackResult,
} from './audiusAdapter';
