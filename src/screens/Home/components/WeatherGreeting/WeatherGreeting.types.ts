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
  /** First name shown as the visual hero of the page, e.g. "Paval". */
  firstName: string;
  /**
   * Weather condition for the Lottie icon. Drives the chip's
   * background scene + foreground glyph.
   *
   * The chip is drawn ONLY when there is a snapshot behind it (see
   * `weather`) — a tinted placeholder for weather that does not exist
   * is a lie the screen tells on every fresh install.
   */
  condition: WeatherCondition;
  /**
   * Structured weather detail for the ONE weather line under the name.
   *
   * Pass `null` when there is no snapshot yet — and then the page
   * draws NO line and NO chip. There is no "Fetching…" row: the
   * greeting says the salutation and the name, and the weather
   * arrives when it arrives.
   */
  weather?: WeatherDetail | null;
  /**
   * True while the very first fetch is in flight and there is no
   * cached snapshot to show.
   *
   * V2: the component reads the SNAPSHOT, not this flag, so this
   * prop is accepted for call compatibility and draws nothing. It
   * exists so a caller does not have to know that.
   */
  isFetching?: boolean;
}
