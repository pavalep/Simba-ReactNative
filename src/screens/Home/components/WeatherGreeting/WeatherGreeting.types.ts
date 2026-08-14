import type {WeatherCondition} from '../../../../components/utility/WeatherIcon';

export interface WeatherDetail {
  description: string;
  cityName: string;
  temperatureC: number;
}

export interface WeatherGreetingProps {
  /**
   * Time-of-day salutation, e.g. "Good evening". Rendered as a
   * small Cormorant Italic label above the user name.
   */
  text: string;
  /** First name shown as the visual hero of the card, e.g. "Paval". */
  firstName: string;
  /**
   * Weather condition for the Lottie icon. Drives the chip's
   * background scene + foreground glyph. The chip always renders
   * (even before the snapshot lands) so the page has a visual
   * anchor while the network call is in flight.
   */
  condition: WeatherCondition;
  /**
   * Structured weather detail for the right column of the card.
   * v9g: passes temperature + description + city as separate
   * fields so the right column can render them in two stacked
   * lines (large temperature, small description) rather than
   * a single caption string sitting under the name. Pass
   * `null` to show the loading state ("Fetching…") in the
   * right column.
   */
  weather?: WeatherDetail | null;
  /**
   * True while the very first fetch is in flight and we have no
   * cached snapshot to show. When true AND weather is null, the
   * right column renders a muted "Fetching…" line.
   *
   * When false, the weather (if any) renders normally.
   */
  isFetching?: boolean;
}

