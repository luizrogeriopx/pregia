import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log('Success:', transcript.slice(0, 5));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
