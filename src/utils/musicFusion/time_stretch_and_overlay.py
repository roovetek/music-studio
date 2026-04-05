import librosa
from pydub import AudioSegment

def time_stretch_and_overlay(song_a_path, song_b_path, bpm_a, bpm_b, chorus_a, chorus_b, output_path):
    """
    Time-stretch Song A to match the BPM of Song B, then overlay the two tracks starting at their Chorus timestamps.

    Args:
        song_a_path (str): Path to Song A.
        song_b_path (str): Path to Song B.
        bpm_a (float): BPM of Song A.
        bpm_b (float): BPM of Song B.
        chorus_a (float): Chorus timestamp in seconds for Song A.
        chorus_b (float): Chorus timestamp in seconds for Song B.
        output_path (str): Path to save the output file.
    """
    # Load Song A and time-stretch to match BPM of Song B
    y_a, sr_a = librosa.load(song_a_path, sr=None)
    stretch_factor = bpm_b / bpm_a
    y_a_stretched = librosa.effects.time_stretch(y_a, stretch_factor)

    # Save the time-stretched Song A as a temporary file
    temp_a_path = "temp_song_a_stretched.wav"
    librosa.output.write_wav(temp_a_path, y_a_stretched, sr_a)

    # Load the audio files with pydub
    song_a = AudioSegment.from_file(temp_a_path)
    song_b = AudioSegment.from_file(song_b_path)

    # Trim the songs to start at their respective Chorus timestamps
    song_a = song_a[chorus_a * 1000:]
    song_b = song_b[chorus_b * 1000:]

    # Overlay the two tracks with a 4-second crossfade
    output = song_b.overlay(song_a, position=0, crossfade=4000)

    # Export the final mix
    output.export(output_path, format="mp3")
    print(f"Output saved to {output_path}")

# Example usage
# time_stretch_and_overlay("song_a.mp3", "song_b.mp3", 120, 130, 60, 45, "output_mix.mp3")