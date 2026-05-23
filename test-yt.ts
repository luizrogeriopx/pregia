import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  const videoId = 'dQw4w9WgXcQ';
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    // Transcript
    const transcript = await YoutubeTranscript.fetchTranscript(watchUrl);
    console.log('Transcript Success:', transcript.length, 'lines');
    
    // Metadata via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      console.log('Metadata Success:', {
        title: data.title,
        author: data.author_name
      });
    } else {
      console.error('Metadata Error:', res.status);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
