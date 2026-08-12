import type {WeatherCondition} from '../../../../components/utility/WeatherIcon';

export interface WeatherGreetingProps {
  /**
   * Time-of-day salutation, e.g. "Good evening". The greeting is
   * rendered INSIDE the weather card (P66) — not as a standalone
   * h2 above the chip. The h2 variant of the text is the same as
   * the home greeting ("Good <time-of-day>, <name>").
   */
  text: string;
  /** First name to show after the comma, e.g. "Paval". */
  firstName: string;
  /**
   * Weather condition for the Lottie icon. Drives the chip's
   * background scene + foreground glyph. The chip always renders
   * (even before the snapshot lands) so the page has a visual
   * anchor while the network call is in flight.
   */
  condition: WeatherCondition;
  /**
   * Caption shown under the h2, e.g. "Partly cloudy in Mumbai · 28°".
   * Pass `null` (or omit) to show the loading state
   * ("Fetching weather information…") instead.
   */
  caption?: string | null;
  /**
   * True while the very first fetch is in flight and we have no
   * cached snapshot to show. When true AND caption is null, the
   * card renders the chip (tinted, no Lottie) + a muted loading
   * caption so the user always sees a single coherent card.
   *
   * When false, the caption (if any) renders normally.
   */
  isFetching?: boolean;
}
