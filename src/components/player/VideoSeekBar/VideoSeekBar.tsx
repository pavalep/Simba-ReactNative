/**
 * VideoSeekBar — video-specific seek bar with chapter markers.
 *
 * Re-exports the generic SeekBar which already supports gold fill,
 * white thumb, chapter markers, and time labels.
 */
import SeekBar from '../SeekBar/SeekBar';
export type {SeekBarProps as VideoSeekBarProps} from '../SeekBar/SeekBar';
export default SeekBar;
