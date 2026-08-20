# Wave 2 API Audit — Initial Findings

## Sources reviewed

1. Internet Archive About Search: https://archive.org/help/aboutsearch.htm
2. Internet Archive Item Metadata API: https://archive.org/developers/metadata.html
3. Podcast Index API documentation: https://podcastindex-org.github.io/docs-api/

## Internet Archive

The Advanced Search API is `https://archive.org/advancedsearch.php`. The documented JSON shape uses a `response` object containing `docs` and `numFound`, matching the app’s current mapper shape. Query syntax is Lucene-like, and `q`, `fl[]`, `rows`, `page`, `output=json`, and optional `sort[]` are valid concepts. Sorted paged results are limited to the first 10,000 results. The Archive also provides a cursor-based scraping API at `https://archive.org/services/search/v1/scrape`, using `q`, comma-delimited `fields`, comma-delimited `sorts`, `count`, and `cursor`; it is intended for deep paging and uses a minimum count of 100.

The current app’s Internet Archive movie/audio searches use Advanced Search with `page`/`rows`, which is valid for normal screen pagination. The API audit must still verify the exact field names used by each sort option and decide whether local category filters should be represented as collection/subject/mediatype query clauses rather than client-only labels. Item details are retrieved through `/metadata/{identifier}`, which is the correct metadata endpoint family for playable files, subtitles, and track discovery.

## Podcast Index

The official documentation identifies the API base as `https://api.podcastindex.org/api/1.0/` and requires authenticated request headers. The docs expose search operations including `search/byterm`, `search/bytitle`, and search by person; podcast operations include lookup by feed ID, feed URL, title ID, GUID, tag, and medium; episode operations include lookup by feed ID, feed URL, podcast GUID, title ID, episode ID, GUID, live status, and other identifiers.

The current Podcasts screen must be reconciled against the official operation names and parameter contracts. In particular, the audit must confirm whether the app is using a real category-list operation or a hard-coded local category list, and whether the selected filter is being translated to the API’s supported category/tag/medium parameters. The docs must also be checked for pagination fields (`max`, `offset`, or operation-specific equivalents), ordering semantics, and the result fields used by `PodcastRow`.

## Immediate implementation implications

- Do not invent a category endpoint or assume the Podcast Index API supports server-side sorting unless the official operation contract confirms it.
- Keep category labels and category IDs separate from display strings.
- Keep `max`/`offset` or equivalent pagination state in the provider rather than inside list rows.
- Keep API response normalization in service/provider boundaries, not in presentational components.
- Record any API key/header or package requirement in the repository tracker before changing runtime behavior.

## Verified Podcast Index contract details

The official docs confirm that `search/byterm` searches feed title, author, or owner and accepts `q`; `max` is an integer with documented minimum 1 and maximum 1000. The response includes `feeds`, and each feed’s `categories` is an object whose keys are category IDs and values are category names. The documentation explicitly states that all category numbers and names are returned by the `categories/list` endpoint. This confirms that the app’s hard-coded `PODCAST_CATEGORIES` list should be treated as a fallback/cache only, and Wave 2 should add an API-backed category-list service path if the endpoint is available under the repository’s API version.

The official docs also expose `search/bytitle` as a distinct operation; this should be used for title-specific search if the product requires it, rather than sending every search through `byterm`. Search `max` is a window size, not an offset. The provider’s current doubling-window strategy is compatible with this contract only if the API returns a stable prefix and the client deduplicates by feed ID; it should be documented as a compatibility workaround, not called true page pagination.

Podcast Index authentication requires `User-Agent`, `X-Auth-Date`, `X-Auth-Key`, and `Authorization` headers. The current service generates these headers with a SHA-1 signature and a project User-Agent. The API documentation states `X-Auth-Date` is a current UTC Unix epoch value within a three-minute window.

The app’s current `RawFeed` type is incomplete relative to the documented search response: it omits fields such as `id`-adjacent GUID/link/description variants, `medium`, `newestItemPublishTime`, and other metadata. Wave 2 should not copy every API field into UI models, but the service boundary should preserve fields required for category filters, media-type filtering, detail pages, and follow/bookmark decisions.

## OpenAPI confirmation

The official OpenAPI 3.0.2 document (`https://podcastindex-org.github.io/docs-api/pi_api.json`, version 1.12.1) contains the following operation paths:

- `/search/byterm`
- `/search/bytitle`
- `/podcasts/byfeedid`
- `/podcasts/trending`
- `/episodes/byfeedid`
- `/categories/list`

`/categories/list` is an authenticated GET operation with no required business parameter other than the standard auth headers and an optional `pretty` flag. Its documented purpose is to return all possible categories supported by the index. The current app does not call this endpoint; adding it is a valid Wave 2 implementation item.

The search operations reference `q`, `val`, `max`, `clean`, `fulltext`, `pretty`, and `similar` as applicable. There is no `offset` parameter in the official search operation contract inspected here. Therefore the current doubling `max` window must remain explicitly documented as a prefix-expansion strategy, and the provider must deduplicate returned feed IDs.

## Internet Archive metadata contract confirmation

The official Item Metadata API documentation confirms that `/metadata/{identifier}` is a valid single-item read endpoint family and that each request requires one unique item identifier. The repository’s metadata resolution flow is therefore conceptually correct. The service must continue treating the metadata response as potentially distributed/partial and should keep its existing retry behavior as an implementation safeguard; that behavior is not an API endpoint requirement but addresses the Archive’s distributed data nodes.

## Repository observations requiring Wave 2 changes

The Movies browse UI currently emits `recent`, `popular`, and `az`, while the hook maps `newest`, `oldest`, `az`, `za`, and `rating`. This is a real contract mismatch: `recent` is not mapped and therefore falls through to the API default, and `popular` is mapped but the UI/API semantics need a documented label. Wave 2 must normalize one typed sort contract across browse config, hook, service, and tracker.

The Podcasts browse UI exposes `recent` and `az`, but the provider ignores sort selections. The official Podcast Index search contract does not expose an arbitrary sort parameter, so the app must not pretend that server-side sorting exists. Wave 2 should either remove unsupported sort options from the Podcast Index browse surface or implement a clearly labeled client-side sort only after the fetch window is complete and the UX can explain its scope. Category filtering is the stronger missing integration because `/categories/list` is officially available.

The repository tracker currently labels Home/local media as Wave 2 and Movies/Podcasts as Wave 3. The conversation calls the current work Wave 2. For manager-facing clarity, the documentation should retain the program’s canonical wave numbering and add an explicit execution alias such as `Execution Wave 2 = tracker Wave 3 / W3-P16–P17`, rather than renumbering historical phases silently.

## References

[1]: https://archive.org/help/aboutsearch.htm "Internet Archive Advanced Search"
[2]: https://archive.org/developers/metadata.html "Internet Archive Item Metadata API"
[3]: https://podcastindex-org.github.io/docs-api/ "Podcast Index API Documentation"
[4]: https://podcastindex-org.github.io/docs-api/pi_api.json "Podcast Index OpenAPI Definition"
[5]: https://github.com/Podcastindex-org/podcast-namespace/blob/main/categories.json "Podcast Namespace Category Definitions"

The implementation changes in this Wave 2 pass are limited to existing dependencies. No new package is required: the API client, React hooks, navigation, and React Native list primitives already provide the necessary runtime capabilities. A new package should be considered only if the later local-file picker phase confirms that platform folder permissions cannot be supported by the current dependency set.
