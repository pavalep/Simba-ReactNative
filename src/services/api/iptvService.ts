// V18: deprecated re-export shim. The real implementation lives in
// `./iptvAdapter`. V18.3.4 / V18.4.4 will delete this file once all
// consumer hooks have migrated to import from the adapter directly.
export * from './iptvAdapter';
